const fs = require('fs/promises');
const path = require('path');

const {
  GENERATED_SPEC_PATH,
  buildAgentSpecMarkdown,
  getAgentDefinitions,
  validateAgentRegistry,
} = require('../src/services/aiAgentRegistryService');

const rootDir = path.resolve(__dirname, '..', '..');

const main = async () => {
  const validation = validateAgentRegistry();
  if (!validation.ok) {
    throw new Error(`Agent registry is invalid:\n${validation.errors.join('\n')}`);
  }

  const outputPath = path.join(rootDir, GENERATED_SPEC_PATH);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buildAgentSpecMarkdown().replace(/\n{2,}$/u, '\n'), 'utf8');

  console.log(JSON.stringify({
    ok: true,
    output: GENERATED_SPEC_PATH,
    agentCount: getAgentDefinitions().length,
    dimensionCount: validation.dimensionCount,
  }, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
