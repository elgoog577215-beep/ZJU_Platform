import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to run command
function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true // Important for Windows
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function deploy() {
  try {
    // 1. Lint (Ensure no bugs - at least static analysis)
    console.log('--- Step 1: Linting (Ensure Code Quality) ---');
    try {
        await runCommand('npm', ['run', 'lint']);
    } catch (e) {
        console.error('❌ Linting failed. Please fix errors before deploying.');
        process.exit(1);
    }

    // 2. Build (Generate dist)
    console.log('--- Step 2: Building (Generate dist) ---');
    try {
        await runCommand('npm', ['run', 'build']);
    } catch (e) {
        console.error('❌ Build failed. Please fix errors before deploying.');
        process.exit(1);
    }

    // 3. Git Add
    console.log('--- Step 3: Staging files (Including dist) ---');
    await runCommand('git', ['add', '.']);

    // 4. Git Commit
    console.log('--- Step 4: Committing ---');
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const message = `Auto deploy: ${timestamp}`;
    
    // Check if there are changes to commit
    try {
        // Quote the message for Windows shell compatibility
        await runCommand('git', ['commit', '-m', `"${message}"`]);
    } catch (e) {
        console.log('⚠️ Nothing to commit (or commit failed). Proceeding to push if needed...');
        // We don't exit here because we might want to push previous commits that were not pushed
    }

    // 5. Git Push
    console.log('--- Step 5: Pushing ---');
    await runCommand('git', ['push']);

    console.log('\n✅ Deployment successful! 🚀');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
