#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const CONFIG_PATH = process.env.ZJU_CLI_CONFIG || path.join(os.homedir(), '.zju-community.json');
const ENTRY_FILES = ['README.md', 'README.markdown', 'index.md', 'tutorial.md'];
const CHANNELS = new Set(['tech', 'news']);

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
};

const usage = () => {
  console.log(`拓途浙享 AI 社区 CLI

用法:
  zju login --server https://tuotuzj.com --username alice
  zju whoami
  zju preview ./tutorial.md --channel tech
  zju publish ./tutorial.md --channel tech --tags "AI,教程"
  zju publish ./news.pdf --channel news --source-url https://example.com/news
  zju status --mine
  zju logout

栏目:
  tech   技术分享
  news   新闻热点，必须提供 --source-url

环境变量:
  ZJU_SERVER      默认服务器地址
  ZJU_USERNAME    登录用户名
  ZJU_PASSWORD    登录密码
  ZJU_CLI_CONFIG  自定义 token 配置文件路径
`);
};

const parseArgs = (argv) => {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      args._.push(item);
      continue;
    }

    const equalIndex = item.indexOf('=');
    if (equalIndex > -1) {
      args[item.slice(2, equalIndex)] = item.slice(equalIndex + 1);
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
};

const readConfig = async () => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const writeConfig = async (config) => {
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
};

const removeConfig = async () => {
  try {
    await fs.unlink(CONFIG_PATH);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const normalizeServer = (value = '') => {
  const server = String(value || '').trim().replace(/\/+$/, '');
  if (!server) return '';
  return /^https?:\/\//i.test(server) ? server : `https://${server}`;
};

const apiUrl = (server, endpoint) => `${normalizeServer(server)}${endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`}`;

const fail = (message, code = 1) => {
  console.error(message);
  process.exit(code);
};

const requestJson = async ({ server, endpoint, token, method = 'GET', body, formData }) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const response = await fetch(apiUrl(server, endpoint), {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    const detail = data?.error || data?.message || data?.errors?.[0]?.msg || `HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    error.body = data;
    throw error;
  }

  return data;
};

const promptValue = async (question, fallback = '') => {
  if (!process.stdin.isTTY) return fallback;
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer || fallback;
};

const promptPassword = async (question = '密码: ') => {
  if (process.env.ZJU_PASSWORD) return process.env.ZJU_PASSWORD;
  if (!process.stdin.isTTY) return '';

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let password = '';

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };

    const onData = (char) => {
      if (char === '\u0003') {
        cleanup();
        process.exit(130);
      }
      if (char === '\r' || char === '\n') {
        stdin.off('data', onData);
        cleanup();
        resolve(password);
        return;
      }
      if (char === '\u007f') {
        password = password.slice(0, -1);
        return;
      }
      password += char;
    };

    stdin.on('data', onData);
  });
};

const resolveInputFile = async (target) => {
  if (!target) fail('请提供要上传的文件或教程文件夹。');
  const absolute = path.resolve(target);
  const stats = await fs.stat(absolute).catch(() => null);
  if (!stats) fail(`文件不存在: ${absolute}`);

  if (!stats.isDirectory()) return absolute;

  for (const entry of ENTRY_FILES) {
    const candidate = path.join(absolute, entry);
    const entryStats = await fs.stat(candidate).catch(() => null);
    if (entryStats?.isFile()) return candidate;
  }

  fail(`目录中没有找到入口文件: ${ENTRY_FILES.join(', ')}`);
};

const askChannel = async (current) => {
  const channel = String(current || '').trim().toLowerCase();
  if (CHANNELS.has(channel)) return channel;
  if (!process.stdin.isTTY) fail('请用 --channel tech|news 选择栏目。');

  const answer = await promptValue('请选择栏目，输入 tech 技术分享 或 news 新闻热点: ');
  const normalized = String(answer || '').trim().toLowerCase();
  if (!CHANNELS.has(normalized)) fail('栏目无效，请使用 tech 或 news。');
  return normalized;
};

const appendCommonFields = (form, options, channel) => {
  form.append('channel', channel);
  const fieldMap = {
    title: 'title',
    excerpt: 'excerpt',
    summary: 'summary',
    tags: 'tags',
    cover: 'cover',
    status: 'status',
    'source-url': 'source_url',
    'source-name': 'source_name',
  };

  for (const [option, field] of Object.entries(fieldMap)) {
    if (options[option] !== undefined && options[option] !== true) {
      form.append(field, String(options[option]));
    }
  }
};

const buildUploadForm = async (filePath, options, channel) => {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXT[extension] || 'application/octet-stream';
  const buffer = await fs.readFile(filePath);
  const form = new FormData();
  appendCommonFields(form, options, channel);
  form.append('file', new Blob([buffer], { type: mimeType }), path.basename(filePath));
  return form;
};

const requireSession = async () => {
  const config = await readConfig();
  if (!config.server || !config.token) {
    fail('还没有登录，请先运行 zju login。');
  }
  return config;
};

const cmdLogin = async (args) => {
  const config = await readConfig();
  const server = normalizeServer(args.server || process.env.ZJU_SERVER || config.server);
  if (!server) fail('请提供服务器地址，例如 zju login --server https://tuotuzj.com');

  const username = args.username || process.env.ZJU_USERNAME || await promptValue('用户名: ');
  const password = args.password || await promptPassword();
  if (!username || !password) fail('用户名和密码不能为空。');

  const data = await requestJson({
    server,
    endpoint: '/auth/login',
    method: 'POST',
    body: { username, password },
  });

  await writeConfig({
    server,
    token: data.token,
    user: data.user,
    saved_at: new Date().toISOString(),
  });

  console.log(`登录成功：${data.user?.username || username} @ ${server}`);
};

const cmdWhoami = async () => {
  const config = await requireSession();
  const data = await requestJson({
    server: config.server,
    endpoint: '/auth/me',
    token: config.token,
  });
  console.log(`${data.nickname || data.username} (${data.role || 'user'}) @ ${config.server}`);
};

const cmdPreview = async (args) => {
  const config = await requireSession();
  const target = args._[0];
  const channel = await askChannel(args.channel);
  const filePath = await resolveInputFile(target);
  if (channel === 'news' && !args['source-url']) {
    fail('新闻热点必须提供 --source-url。');
  }

  const formData = await buildUploadForm(filePath, args, channel);
  const data = await requestJson({
    server: config.server,
    endpoint: '/cli/import',
    token: config.token,
    method: 'POST',
    formData,
  });

  console.log(`栏目: ${data.channel}`);
  console.log(`标题: ${data.title}`);
  console.log(`摘要: ${data.excerpt}`);
  console.log(`字数: ${data.meta?.charCount || 0}`);
  console.log(`块数: ${data.meta?.blockCount || 0}`);
  console.log('\n正文预览:');
  console.log(String(data.plain_text || '').slice(0, 1200));
};

const cmdPublish = async (args) => {
  const config = await requireSession();
  const target = args._[0];
  const channel = await askChannel(args.channel);
  const filePath = await resolveInputFile(target);
  if (channel === 'news' && !args['source-url']) {
    fail('新闻热点必须提供 --source-url。');
  }

  const formData = await buildUploadForm(filePath, args, channel);
  const data = await requestJson({
    server: config.server,
    endpoint: '/cli/publish',
    token: config.token,
    method: 'POST',
    formData,
  });

  const item = data.submission;
  console.log('发布成功，已提交到平台。');
  console.log(`栏目: ${item.channel}`);
  console.log(`标题: ${item.title}`);
  console.log(`状态: ${item.status}`);
  console.log(`链接: ${normalizeServer(config.server)}${item.url}`);
};

const cmdStatus = async (args) => {
  const config = await requireSession();
  const params = new URLSearchParams();
  if (args.channel) params.set('channel', args.channel);
  if (args.status) params.set('status', args.status);
  const endpoint = `/cli/submissions${params.toString() ? `?${params.toString()}` : ''}`;
  const data = await requestJson({
    server: config.server,
    endpoint,
    token: config.token,
  });

  const items = data.data || [];
  if (!items.length) {
    console.log('暂无投稿。');
    return;
  }
  items.forEach((item) => {
    console.log(`[${item.status}] ${item.channel} #${item.id} ${item.title}`);
    console.log(`  ${normalizeServer(config.server)}${item.url}`);
  });
};

const cmdLogout = async () => {
  await removeConfig();
  console.log('已退出登录。');
};

const main = async () => {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  try {
    switch (command) {
      case 'login':
        await cmdLogin(args);
        break;
      case 'whoami':
        await cmdWhoami(args);
        break;
      case 'preview':
        await cmdPreview(args);
        break;
      case 'publish':
        await cmdPublish(args);
        break;
      case 'status':
        await cmdStatus(args);
        break;
      case 'logout':
        await cmdLogout(args);
        break;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        usage();
        break;
      default:
        fail(`未知命令: ${command}\n运行 zju help 查看用法。`);
    }
  } catch (error) {
    fail(`执行失败：${error.message || error}`);
  }
};

await main();
