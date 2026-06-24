const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const ROOT = '/Users/yq/Desktop/ZJU_Platform';
const WORK = path.join(ROOT, 'outputs/manual-20260608-sdg-ppt-v2/presentations/light-tech');
const ASSET_DIR = path.join(WORK, 'assets');
const OUT = path.join(ROOT, 'docs/archive/presentations/智享无差-高校AI教育信息平权创业汇报-黑客松亮色科技风.pptx');
fs.mkdirSync(ASSET_DIR, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const shots = {
  hackathon: path.join(ROOT, 'ui-audit-screenshots/current-laptop-final2/2048x1015__hackathon.png'),
  showcase: path.join(ROOT, 'ui-audit-screenshots/current-laptop-final2/2048x1015__hackathon-showcase.png'),
  works: path.join(ROOT, 'ui-audit-screenshots/current-laptop-final2/2048x1015__hackathon-works.png'),
  future: path.join(ROOT, 'ui-audit-screenshots/current-laptop-final2/2048x1015__future-learning.png'),
  events: path.join(ROOT, 'ui-audit-screenshots/current-laptop-final2/2048x1015__events.png'),
  home: path.join(ROOT, 'ui-audit-screenshots/current-laptop-final2/2048x1015__home.png'),
};

const C = {
  bg: 'F6F8FB',
  bg2: 'EFFBFD',
  white: 'FFFFFF',
  ink: '020617',
  slate: '334155',
  muted: '64748B',
  line: 'BDECF2',
  line2: 'D8EAF0',
  cyan: '06B6D4',
  teal: '14B8A6',
  cyanDark: '0E7490',
  softCyan: 'E6FAFD',
  softTeal: 'E8FBF7',
  pale: 'F8FDFF',
  sdg10: 'DD1367',
  sdg4: 'C5192D',
  indigo: '312E81',
};

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = '拓途浙享项目团队';
pptx.company = 'ZJU Platform';
pptx.subject = '创业课程 SDG10 / SDG4 汇报';
pptx.title = '智享无差——高校AI教育信息平权创业汇报';
pptx.lang = 'zh-CN';
pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'zh-CN' };
pptx.margin = 0;

const W = 13.333;
const H = 7.5;
const S = pptx.ShapeType;

function addText(slide, value, x, y, w, h, opts = {}) {
  slide.addText(value, {
    x, y, w, h,
    margin: opts.margin ?? 0,
    fontFace: opts.fontFace || 'Aptos',
    fontSize: opts.fontSize || 14,
    bold: opts.bold || false,
    italic: opts.italic || false,
    color: opts.color || C.ink,
    align: opts.align || 'left',
    valign: opts.valign || 'top',
    fit: opts.fit || 'shrink',
    charSpacing: opts.charSpacing,
    paraSpaceAfterPt: opts.paraSpaceAfterPt,
    breakLine: opts.breakLine,
  });
}

function addPageBg(slide) {
  slide.background = { color: C.bg };
  slide.addShape(S.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.bg }, line: { color: C.bg, transparency: 100 } });
  for (let x = 0; x < W; x += 0.47) {
    slide.addShape(S.line, { x, y: 0, w: 0, h: H, line: { color: C.cyan, transparency: 91, width: 0.25 } });
  }
  for (let y = 0; y < H; y += 0.47) {
    slide.addShape(S.line, { x: 0, y, w: W, h: 0, line: { color: C.cyan, transparency: 92, width: 0.25 } });
  }
  slide.addShape(S.rect, { x: 0, y: 0, w: W, h: 0.018, fill: { color: C.cyan, transparency: 22 }, line: { color: C.cyan, transparency: 100 } });
}

function topBar(slide, active = 'SDG') {
  slide.addShape(S.rect, { x: 0, y: 0, w: W, h: 0.52, fill: { color: C.white, transparency: 4 }, line: { color: C.line2, transparency: 20, width: 0.4 } });
  addText(slide, '拓途浙享', 0.46, 0.16, 0.8, 0.16, { fontSize: 9.2, bold: true, color: C.ink });
  addText(slide, '数字艺术与科技', 0.46, 0.32, 0.95, 0.10, { fontSize: 5.8, color: C.muted });
  const tabs = ['SDG 选题', '问题机制', '平台方案', '产品证据'];
  tabs.forEach((t, i) => {
    const x = 8.15 + i * 1.05;
    const selected = t.includes(active);
    slide.addShape(S.roundRect, { x, y: 0.13, w: 0.88, h: 0.26, rectRadius: 0.04, fill: { color: selected ? C.softCyan : C.white, transparency: selected ? 0 : 100 }, line: { color: selected ? C.line : C.line2, transparency: selected ? 0 : 100, width: 0.5 } });
    addText(slide, t, x + 0.08, 0.205, 0.72, 0.07, { fontSize: 5.5, color: selected ? C.cyanDark : C.slate, bold: selected, align: 'center' });
  });
}

function footer(slide, n) {
  addText(slide, '智享无差 · 高校 AI 教育信息平权', 0.56, 7.03, 2.4, 0.12, { fontSize: 6.2, color: C.muted, bold: true });
  addText(slide, String(n).padStart(2, '0'), 12.42, 7.03, 0.36, 0.12, { fontSize: 6.6, color: C.cyanDark, bold: true, align: 'right' });
}

function label(slide, text, x, y, w, opts = {}) {
  slide.addShape(S.rect, { x, y, w, h: opts.h || 0.27, fill: { color: opts.fill || C.white, transparency: opts.transparency ?? 0 }, line: { color: opts.line || C.line, width: 0.55, transparency: opts.lineTrans ?? 0 } });
  addText(slide, text, x + 0.12, y + 0.095, w - 0.24, 0.08, { fontSize: opts.fontSize || 6.3, bold: true, color: opts.color || C.cyanDark, charSpacing: opts.charSpacing ?? 1.2, align: opts.align || 'center' });
}

function button(slide, text, x, y, w, solid = true) {
  slide.addShape(S.rect, { x, y, w, h: 0.42, fill: { color: solid ? C.teal : C.white }, line: { color: solid ? C.teal : C.line2, width: 0.7 } });
  addText(slide, text, x, y + 0.135, w, 0.1, { fontSize: 7.6, bold: true, color: solid ? C.white : C.ink, align: 'center' });
}

function panel(slide, x, y, w, h, opts = {}) {
  slide.addShape(S.rect, {
    x, y, w, h,
    fill: { color: opts.fill || C.white, transparency: opts.transparency ?? 0 },
    line: { color: opts.line || C.line2, width: opts.lineWidth || 0.65, transparency: opts.lineTrans ?? 0 },
    shadow: opts.shadow === false ? undefined : { type: 'outer', color: '0F172A', opacity: opts.shadowOpacity ?? 0.045, blur: 1.2, offset: 1, angle: 45 },
  });
}

function metricBox(slide, value, unit, code, x, y, w, opts = {}) {
  panel(slide, x, y, w, 1.1, { fill: opts.fill || 'F9FEFF', line: C.line, shadow: false });
  addText(slide, value, x + 0.18, y + 0.26, 0.42, 0.32, { fontFace: 'Aptos Display', fontSize: 28, bold: true, color: opts.color || C.cyanDark });
  addText(slide, unit, x + 0.62, y + 0.45, 0.65, 0.17, { fontSize: 13, bold: true, color: C.ink });
  addText(slide, code, x + 0.2, y + 0.82, 0.78, 0.12, { fontSize: 6, color: C.muted, bold: true, charSpacing: 2.1 });
}

function titleHuge(slide, lines, x, y, w, size = 40) {
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((line, i) => addText(slide, line, x, y + i * (size / 72 * 0.95), w, size / 72 * 0.78, { fontFace: 'Aptos Display', fontSize: size, bold: true, color: C.ink, fit: 'shrink' }));
}

function slideTitle(slide, kicker, title, subtitle, n, active='SDG') {
  addPageBg(slide);
  topBar(slide, active);
  label(slide, kicker, 0.74, 0.86, Math.min(2.1, 0.55 + kicker.length * 0.12));
  addText(slide, title, 0.74, 1.28, 7.2, 0.46, { fontFace: 'Aptos Display', fontSize: 24, bold: true, color: C.ink });
  if (subtitle) addText(slide, subtitle, 0.76, 1.82, 7.4, 0.22, { fontSize: 8.8, color: C.muted, fit: 'shrink' });
  footer(slide, n);
}

function cropImage(slide, img, x, y, w, h, opts = {}) {
  panel(slide, x, y, w, h, { fill: C.white, line: opts.line || C.line2, shadowOpacity: opts.shadowOpacity ?? 0.06 });
  slide.addImage({ path: img, x: x + 0.05, y: y + 0.05, w: w - 0.1, h: h - 0.1, sizing: { type: opts.sizing || 'cover', x: x + 0.05, y: y + 0.05, w: w - 0.1, h: h - 0.1 } });
}

async function makeAssets() {
  const assets = {};
  for (const [k, p] of Object.entries(shots)) {
    if (!fs.existsSync(p)) throw new Error(`missing ${k}: ${p}`);
  }
  assets.hackHero = path.join(ASSET_DIR, 'hackathon-soft.jpg');
  assets.futureSoft = path.join(ASSET_DIR, 'future-soft.jpg');
  assets.eventsSoft = path.join(ASSET_DIR, 'events-soft.jpg');
  await sharp(shots.hackathon).resize(1700, 844, { fit: 'cover' }).modulate({ brightness: 1.04, saturation: 0.95 }).jpeg({ quality: 88 }).toFile(assets.hackHero);
  await sharp(shots.future).resize(1500, 744, { fit: 'cover' }).modulate({ brightness: 1.04, saturation: 0.92 }).jpeg({ quality: 86 }).toFile(assets.futureSoft);
  await sharp(shots.events).resize(1500, 744, { fit: 'cover' }).modulate({ brightness: 1.04, saturation: 0.92 }).jpeg({ quality: 86 }).toFile(assets.eventsSoft);
  return assets;
}

function s1(a) {
  const s = pptx.addSlide();
  addPageBg(s); topBar(s, 'SDG');
  label(s, 'AI BUILD ARENA × SDG10 / SDG4', 1.18, 1.22, 2.1);
  titleHuge(s, ['智享无差', 'AI 信息平权'], 1.18, 1.72, 4.8, 38);
  addText(s, '基于 AI 聚合分发机制，消解高校教育信息与 AI 资源不平等', 1.22, 3.38, 4.8, 0.28, { fontSize: 12.5, color: C.slate, bold: true });
  metricBox(s, 'SDG', '10', 'REDUCED INEQUALITIES', 1.22, 4.06, 1.65, { color: C.sdg10, fill: 'FFF7FB' });
  metricBox(s, 'SDG', '4', 'QUALITY EDUCATION', 3.05, 4.06, 1.65, { color: C.sdg4, fill: 'FFF8F8' });
  button(s, '创业课程汇报', 1.22, 5.58, 1.38, true);
  button(s, '拓途浙享平台落地项目', 2.72, 5.58, 1.95, false);
  cropImage(s, a.hackHero, 6.08, 1.18, 5.78, 4.68, { line: C.line, shadowOpacity: 0.08 });
  panel(s, 7.0, 5.54, 4.05, 0.58, { fill: C.white, line: C.line, shadowOpacity: 0.05 });
  addText(s, '用“黑客松式真实入口”重新分配 AI 时代的机会触达', 7.25, 5.76, 3.5, 0.12, { fontSize: 8.4, bold: true, color: C.ink, align: 'center' });
  footer(s, 1);
}

function s2() {
  const s = pptx.addSlide();
  slideTitle(s, 'SDG 选题', '不平等正在从“资源差”转向“入口差”', '高校 AI 教育公平的第一公里，是谁能更早看见机会、理解路径、进入实践。', 2, 'SDG');
  addText(s, '10', 0.86, 2.42, 1.12, 0.82, { fontFace: 'Aptos Display', fontSize: 58, bold: true, color: C.sdg10 });
  addText(s, 'Reduced\nInequalities', 0.92, 3.37, 1.18, 0.38, { fontSize: 10, bold: true, color: C.slate });
  const blocks = [
    ['01', '信息机会差', '学院通知、社团活动、科创资讯散落在多平台，学生不是没有机会，而是经常看不到。'],
    ['02', 'AI 资源入口差', '前沿教程、开源项目、黑客松和实践机会常在私域传播，通道顺畅的人持续积累。'],
    ['03', '能力发展分层', '信息差最终变成经历差、作品差和能力差，形成新的隐形教育不平等。'],
  ];
  blocks.forEach((b, i) => {
    const y = 2.28 + i * 1.05;
    panel(s, 2.72, y, 8.95, 0.76, { fill: i === 1 ? C.softCyan : C.white, line: C.line2, shadow: false });
    addText(s, b[0], 3.0, y + 0.22, 0.34, 0.12, { fontSize: 9.4, bold: true, color: C.cyanDark });
    addText(s, b[1], 3.56, y + 0.18, 1.5, 0.16, { fontSize: 11.2, bold: true, color: C.ink });
    addText(s, b[2], 5.45, y + 0.18, 5.75, 0.24, { fontSize: 8.4, color: C.slate, fit: 'shrink' });
  });
  panel(s, 2.72, 5.6, 8.95, 0.48, { fill: C.ink, line: C.ink, shadow: false });
  addText(s, '项目判断：把公共信息变成可聚合、可识别、可分发的 AI 时代机会入口。', 3.05, 5.78, 8.25, 0.1, { fontSize: 8.8, bold: true, color: C.white, align: 'center' });
}

function s3() {
  const s = pptx.addSlide();
  slideTitle(s, '问题机制', '信息碎片化如何固化 AI 学习差距？', '不是学生不努力，而是机会入口本身分布不均。', 3, '问题');
  const nodes = [
    ['信息分散', '通知 / 活动 / 赛事'],
    ['机会获取不均', '少数人先知道'],
    ['AI 资源分配不均', '教程 / 项目 / 实践'],
    ['能力分层固化', '作品 / 履历 / 自信'],
  ];
  nodes.forEach((n, i) => {
    const x = 0.92 + i * 3.02;
    panel(s, x, 2.55, 2.35, 1.35, { fill: i === 2 ? C.softCyan : C.white, line: i === 3 ? C.sdg10 : C.line, shadow: false, lineWidth: i === 3 ? 1.1 : 0.7 });
    addText(s, String(i + 1).padStart(2, '0'), x + 0.18, 2.83, 0.42, 0.12, { fontSize: 7.5, bold: true, color: i === 3 ? C.sdg10 : C.cyanDark, charSpacing: 1.2 });
    addText(s, n[0], x + 0.18, 3.15, 1.5, 0.18, { fontSize: 12.8, bold: true, color: C.ink });
    addText(s, n[1], x + 0.2, 3.52, 1.58, 0.12, { fontSize: 7.4, color: C.muted, bold: true });
    if (i < nodes.length - 1) {
      s.addShape(S.line, { x: x + 2.45, y: 3.22, w: 0.48, h: 0, line: { color: C.cyan, width: 1.1, transparency: 5, endArrowType: 'triangle' } });
    }
  });
  panel(s, 1.1, 4.8, 10.9, 0.82, { fill: 'F9FEFF', line: C.line2, shadow: false });
  addText(s, '这条链路的关键不是“信息发布少”，而是缺少统一归口、结构化沉淀和面向弱势用户的主动触达。', 1.52, 5.08, 10.05, 0.17, { fontSize: 10.2, color: C.slate, bold: true, align: 'center' });
}

function s4(a) {
  const s = pptx.addSlide();
  slideTitle(s, '用户场景', '一个普通学生错过 AI 机会的路径', '从“没看到”到“不敢参加”，中间缺的是被看见、被解释、被接住的入口。', 4, '问题');
  cropImage(s, a.eventsSoft, 0.82, 2.16, 4.55, 3.0, { line: C.line2, shadowOpacity: 0.055 });
  const steps = [
    ['看不到', '活动散落在群聊、公众号和学院通知'],
    ['来不及', '看到时已经截止或没有准备时间'],
    ['不敢参加', '缺少零基础路径和实践入口'],
    ['差距扩大', '少数人持续积累 AI 能力与科创经历'],
  ];
  steps.forEach((st, i) => {
    const y = 2.1 + i * 0.78;
    panel(s, 6.02, y, 5.55, 0.5, { fill: i === 3 ? 'FFF7FB' : C.white, line: i === 3 ? 'F3B4D0' : C.line2, shadow: false });
    addText(s, String(i + 1).padStart(2, '0'), 6.25, y + 0.19, 0.3, 0.08, { fontSize: 6.8, bold: true, color: i === 3 ? C.sdg10 : C.cyanDark });
    addText(s, st[0], 6.78, y + 0.16, 1.0, 0.12, { fontSize: 9.8, bold: true, color: C.ink });
    addText(s, st[1], 8.08, y + 0.16, 3.05, 0.13, { fontSize: 7.7, color: C.slate, fit: 'shrink' });
  });
  button(s, '从主动搜寻机会，改为系统公平触达机会', 6.02, 5.45, 3.7, true);
}

function s5(a) {
  const s = pptx.addSlide();
  slideTitle(s, '平台方案', '像黑客松报名页一样，把机会变成清晰入口', '拓途浙享不是只做通知聚合，而是做“机会入口”的产品化分发。', 5, '平台');
  const layers = [
    ['01', '全域聚合', '自动抓取活动、通知、科创动态，形成统一信息底座。'],
    ['02', '画像识别', '识别低频获取资源、缺少科创经历、AI 零基础学生。'],
    ['03', '精准分发', '按兴趣、基础和发展阶段推送 AI 学习与实践机会。'],
    ['04', '公益沉淀', '沉淀教程、开源项目、黑客松和学习路径，免费开放。'],
  ];
  layers.forEach((l, i) => {
    const x = 0.82 + (i % 2) * 3.42;
    const y = 2.18 + Math.floor(i / 2) * 1.42;
    panel(s, x, y, 3.02, 1.0, { fill: i === 2 ? C.softCyan : C.white, line: C.line, shadow: false });
    addText(s, l[0], x + 0.22, y + 0.22, 0.36, 0.1, { fontSize: 7.2, bold: true, color: C.cyanDark, charSpacing: 1.2 });
    addText(s, l[1], x + 0.72, y + 0.2, 1.1, 0.16, { fontSize: 11.2, bold: true, color: C.ink });
    addText(s, l[2], x + 0.24, y + 0.58, 2.35, 0.2, { fontSize: 7.3, color: C.slate, fit: 'shrink' });
  });
  cropImage(s, a.futureSoft, 7.55, 2.08, 4.35, 3.25, { line: C.line, shadowOpacity: 0.05 });
  label(s, 'AI RESOURCE ENTRY', 8.0, 5.56, 1.5, { fill: C.softCyan, color: C.cyanDark });
  addText(s, '从信息触达到能力提升，形成可进入、可实践、可积累的公平通道。', 9.7, 5.65, 2.1, 0.16, { fontSize: 7.5, color: C.slate, fit: 'shrink' });
}

function s6() {
  const s = pptx.addSlide();
  slideTitle(s, '产品证据', '真实平台界面已经具备“机会入口”的产品感', '用截图作为证据，但不堆砌页面：只展示与信息平权相关的关键能力。', 6, '产品');
  cropImage(s, shots.hackathon, 0.82, 2.1, 5.45, 2.45, { line: C.line, shadowOpacity: 0.05 });
  cropImage(s, shots.works, 6.62, 2.1, 5.45, 2.45, { line: C.line, shadowOpacity: 0.05 });
  const caps = [
    ['活动报名入口', '把复杂赛事信息整理为时间、地点、形式、奖金池等可理解模块。'],
    ['成果与经验沉淀', '把实践作品、经验分享和优秀案例沉淀为公共学习资源。'],
  ];
  caps.forEach((c, i) => {
    const x = i === 0 ? 0.82 : 6.62;
    panel(s, x, 4.78, 5.45, 0.66, { fill: i === 0 ? C.softCyan : C.white, line: C.line, shadow: false });
    addText(s, c[0], x + 0.28, 5.02, 1.4, 0.14, { fontSize: 9.4, bold: true, color: C.ink });
    addText(s, c[1], x + 1.78, 4.98, 3.2, 0.18, { fontSize: 7.3, color: C.slate, fit: 'shrink' });
  });
}

function s7() {
  const s = pptx.addSlide();
  slideTitle(s, '落地可行', '已有流量底座，适合做 SDG 导向的普惠迭代', '技术、资源和模式都不是从零开始，而是在成熟平台上做价值升级。', 7, '平台');
  const metrics = [
    ['2300+', '注册用户', C.cyanDark],
    ['900+', '日均访问', C.teal],
    ['700+', '沉淀活动资源', C.cyanDark],
    ['262', '真实索引公共资源', C.sdg10],
  ];
  metrics.forEach((m, i) => {
    const x = 0.82 + i * 3.0;
    panel(s, x, 2.32, 2.45, 1.25, { fill: i === 3 ? 'FFF7FB' : C.white, line: i === 3 ? 'F3B4D0' : C.line, shadow: false });
    addText(s, m[0], x + 0.22, 2.62, 1.05, 0.38, { fontFace: 'Aptos Display', fontSize: 28, bold: true, color: m[2] });
    addText(s, m[1], x + 0.24, 3.18, 1.7, 0.14, { fontSize: 8.1, bold: true, color: C.slate });
  });
  const pillars = [
    ['技术可行', '信息抓取、多 Agent、用户画像与社区生态均来自自研落地成果。'],
    ['资源可行', '已有用户、访问和活动资源，具备真实运营与迭代基础。'],
    ['模式可行', '以成熟平台为底座，以 AI 分发为手段，以普惠教育为内核。'],
  ];
  pillars.forEach((p, i) => {
    const x = 1.1 + i * 3.72;
    label(s, String(i + 1).padStart(2, '0'), x, 4.56, 0.42, { fill: C.softCyan, fontSize: 6.2 });
    addText(s, p[0], x + 0.62, 4.58, 1.2, 0.15, { fontSize: 10.6, bold: true, color: C.ink });
    addText(s, p[1], x, 4.98, 2.75, 0.28, { fontSize: 7.4, color: C.slate, fit: 'shrink' });
  });
}

function s8() {
  const s = pptx.addSlide();
  addPageBg(s); topBar(s, 'SDG');
  label(s, 'VALUE', 1.08, 1.08, 0.78);
  titleHuge(s, ['让每一个学生', '公平抵达 AI 机会入口'], 1.08, 1.62, 7.2, 36);
  addText(s, '智享无差以拓途浙享为信息底座，以 AI 聚合分发为机制，推动高校信息平权与 AI 资源平权。', 1.13, 3.36, 6.1, 0.32, { fontSize: 11.2, color: C.slate, bold: true, fit: 'shrink' });
  const roadmap = [
    ['校内验证', '做实弱势用户识别和定向推送闭环'],
    ['模式沉淀', '形成高校 AI 信息普惠标准化方案'],
    ['跨校普惠', '开源输出平台体系与资源运营模式'],
  ];
  roadmap.forEach((r, i) => {
    const x = 1.1 + i * 3.45;
    panel(s, x, 4.58, 2.75, 0.9, { fill: i === 1 ? C.softCyan : C.white, line: C.line, shadow: false });
    addText(s, String(i + 1).padStart(2, '0'), x + 0.22, 4.84, 0.34, 0.09, { fontSize: 6.8, bold: true, color: C.cyanDark });
    addText(s, r[0], x + 0.72, 4.8, 1.1, 0.15, { fontSize: 10.2, bold: true, color: C.ink });
    addText(s, r[1], x + 0.24, 5.18, 2.15, 0.15, { fontSize: 7.1, color: C.slate, fit: 'shrink' });
    if (i < 2) s.addShape(S.line, { x: x + 2.95, y: 5.04, w: 0.28, h: 0, line: { color: C.cyan, width: 1, endArrowType: 'triangle' } });
  });
  panel(s, 8.92, 1.42, 2.62, 1.55, { fill: C.white, line: C.line, shadowOpacity: 0.04 });
  addText(s, 'SDG10', 9.2, 1.82, 1.0, 0.28, { fontSize: 20, bold: true, color: C.sdg10 });
  addText(s, '减少不平等', 9.22, 2.3, 0.95, 0.12, { fontSize: 8, bold: true, color: C.slate });
  panel(s, 8.92, 3.25, 2.62, 1.55, { fill: C.white, line: C.line, shadowOpacity: 0.04 });
  addText(s, 'SDG4', 9.2, 3.65, 1.0, 0.28, { fontSize: 20, bold: true, color: C.sdg4 });
  addText(s, '优质教育', 9.22, 4.13, 0.95, 0.12, { fontSize: 8, bold: true, color: C.slate });
  button(s, '以技术推动教育公平', 8.92, 5.44, 2.12, true);
  footer(s, 8);
}

(async () => {
  const a = await makeAssets();
  s1(a); s2(); s3(); s4(a); s5(a); s6(); s7(); s8();
  await pptx.writeFile({ fileName: OUT });
  console.log(OUT);
})();
