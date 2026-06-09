const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const pptxgen = require('pptxgenjs');

const ROOT = '/Users/yq/Desktop/ZJU_Platform';
const WORK = path.join(ROOT, 'outputs/manual-20260608-sdg-ppt-v2/presentations/light-tech');
const OUT_DIR = path.join(WORK, 'rendered');
const HTML = path.join(WORK, 'deck.html');
const OUT = path.join(ROOT, 'docs/presentations/智享无差-高校AI教育信息平权创业汇报-黑客松亮色科技风.pptx');
fs.mkdirSync(OUT_DIR, { recursive: true });

const img = (name) => path.join(ROOT, 'ui-audit-screenshots/current-laptop-final2', name);
const assets = {
  hack: img('2048x1015__hackathon.png'),
  works: img('2048x1015__hackathon-works.png'),
  future: img('2048x1015__future-learning.png'),
  events: img('2048x1015__events.png'),
  home: img('2048x1015__home.png'),
};

const toUrl = (p) => 'file://' + p.split(path.sep).map(encodeURIComponent).join('/');

const slides = [
  { no: '01', nav:'SDG', cls:'cover', body:`
    <div class="kicker">AI BUILD ARENA × SDG10 / SDG4</div>
    <div class="cover-grid">
      <div>
        <h1>智享无差<br><span>AI 信息平权</span></h1>
        <p class="lead">基于 AI 聚合分发机制，消解高校教育信息与 AI 资源不平等</p>
        <div class="hero-metrics"><div><b>SDG</b><strong>10</strong><span>REDUCED INEQUALITIES</span></div><div><b>SDG</b><strong>4</strong><span>QUALITY EDUCATION</span></div></div>
        <div class="actions"><span class="btn primary">创业课程汇报</span><span class="btn ghost">拓途浙享平台落地项目</span></div>
      </div>
      <div class="shot hero-shot"><img src="${toUrl(assets.hack)}"><div class="shot-caption">用“黑客松式真实入口”重新分配 AI 时代的机会触达</div></div>
    </div>` },
  { no:'02', nav:'SDG', body:`
    <div class="kicker">SDG 选题</div><h2>不平等正在从<br>“资源差”转向“入口差”</h2><p class="sub">高校 AI 教育公平的第一公里，是谁能更早看见机会、理解路径、进入实践。</p>
    <div class="sdg-layout"><div class="sdg-card"><strong>10</strong><span>Reduced<br>Inequalities</span></div><div class="stack">
      ${[['01','信息机会差','学院通知、社团活动、科创资讯散落在多平台，学生不是没有机会，而是经常看不到。'],['02','AI 资源入口差','前沿教程、开源项目、黑客松和实践机会常在私域传播，通道顺畅的人持续积累。'],['03','能力发展分层','信息差最终变成经历差、作品差和能力差，形成新的隐形教育不平等。']].map(x=>`<div class="row-card"><b>${x[0]}</b><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join('')}
    </div></div><div class="dark-strip">项目判断：把公共信息变成可聚合、可识别、可分发的 AI 时代机会入口。</div>` },
  { no:'03', nav:'问题', body:`
    <div class="kicker">问题机制</div><h2>信息碎片化如何<br>固化 AI 学习差距？</h2><p class="sub">不是学生不努力，而是机会入口本身分布不均。</p>
    <div class="flow">${[['信息分散','通知 / 活动 / 赛事'],['机会获取不均','少数人先知道'],['AI 资源分配不均','教程 / 项目 / 实践'],['能力分层固化','作品 / 履历 / 自信']].map((x,i)=>`<div class="flow-node ${i===3?'danger':''}"><b>${String(i+1).padStart(2,'0')}</b><h3>${x[0]}</h3><p>${x[1]}</p></div>${i<3?'<div class="arrow">→</div>':''}`).join('')}</div>
    <div class="callout">这条链路的关键不是“信息发布少”，而是缺少统一归口、结构化沉淀和面向弱势用户的主动触达。</div>` },
  { no:'04', nav:'问题', body:`
    <div class="kicker">用户场景</div><h2>一个普通学生<br>错过 AI 机会的路径</h2><p class="sub">从“没看到”到“不敢参加”，中间缺的是被看见、被解释、被接住的入口。</p>
    <div class="two-col"><div class="shot"><img src="${toUrl(assets.events)}"></div><div class="journey">${[['看不到','活动散落在群聊、公众号和学院通知'],['来不及','看到时已经截止或没有准备时间'],['不敢参加','缺少零基础路径和实践入口'],['差距扩大','少数人持续积累 AI 能力与科创经历']].map((x,i)=>`<div class="journey-row ${i===3?'danger':''}"><b>${String(i+1).padStart(2,'0')}</b><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('')}<div class="btn primary wide">从主动搜寻机会，改为系统公平触达机会</div></div></div>` },
  { no:'05', nav:'平台', body:`
    <div class="kicker">平台方案</div><h2>像黑客松报名页一样，<br>把机会变成清晰入口</h2><p class="sub">拓途浙享不是只做通知聚合，而是做“机会入口”的产品化分发。</p>
    <div class="two-col"><div class="mini-grid">${[['01','全域聚合','自动抓取活动、通知、科创动态，形成统一信息底座。'],['02','画像识别','识别低频获取资源、缺少科创经历、AI 零基础学生。'],['03','精准分发','按兴趣、基础和发展阶段推送 AI 学习与实践机会。'],['04','公益沉淀','沉淀教程、开源项目、黑客松和学习路径，免费开放。']].map((x,i)=>`<div class="mini ${i===2?'active':''}"><b>${x[0]}</b><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join('')}</div><div class="shot"><img src="${toUrl(assets.future)}"><div class="tag">AI RESOURCE ENTRY</div></div></div>` },
  { no:'06', nav:'产品', body:`
    <div class="kicker">产品证据</div><h2>真实平台界面已经具备<br>“机会入口”的产品感</h2><p class="sub">用截图作为证据，但不堆砌页面：只展示与信息平权相关的关键能力。</p>
    <div class="proof-grid"><div><div class="shot"><img src="${toUrl(assets.hack)}"></div><div class="caption"><h3>活动报名入口</h3><p>把复杂赛事信息整理为时间、地点、形式、奖金池等可理解模块。</p></div></div><div><div class="shot"><img src="${toUrl(assets.works)}"></div><div class="caption"><h3>成果与经验沉淀</h3><p>把实践作品、经验分享和优秀案例沉淀为公共学习资源。</p></div></div></div>` },
  { no:'07', nav:'平台', body:`
    <div class="kicker">落地可行</div><h2>已有流量底座，适合做<br>SDG 导向的普惠迭代</h2><p class="sub">技术、资源和模式都不是从零开始，而是在成熟平台上做价值升级。</p>
    <div class="metric-row">${[['2300+','注册用户'],['900+','日均访问'],['700+','沉淀活动资源'],['262','真实索引公共资源']].map((x,i)=>`<div class="metric ${i===3?'pink':''}"><strong>${x[0]}</strong><span>${x[1]}</span></div>`).join('')}</div>
    <div class="pillars">${[['技术可行','信息抓取、多 Agent、用户画像与社区生态均来自自研落地成果。'],['资源可行','已有用户、访问和活动资源，具备真实运营与迭代基础。'],['模式可行','以成熟平台为底座，以 AI 分发为手段，以普惠教育为内核。']].map((x,i)=>`<div><b>${String(i+1).padStart(2,'0')}</b><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('')}</div>` },
  { no:'08', nav:'SDG', cls:'final', body:`
    <div class="kicker">VALUE</div><h2>让每一个学生<br>公平抵达 AI 机会入口</h2><p class="sub big">智享无差以拓途浙享为信息底座，以 AI 聚合分发为机制，推动高校信息平权与 AI 资源平权。</p>
    <div class="roadmap">${[['校内验证','做实弱势用户识别和定向推送闭环'],['模式沉淀','形成高校 AI 信息普惠标准化方案'],['跨校普惠','开源输出平台体系与资源运营模式']].map((x,i)=>`<div><b>${String(i+1).padStart(2,'0')}</b><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('')}</div>
    <div class="sdg-pair"><div><strong>SDG10</strong><span>减少不平等</span></div><div><strong>SDG4</strong><span>优质教育</span></div></div>` },
];

const style = `
@font-face{font-family:Inter;src:local('Inter')}*{box-sizing:border-box}body{margin:0;background:#dfeff2;font-family:Inter,'Aptos','PingFang SC','Microsoft YaHei',sans-serif;color:#020617}.slide{width:1600px;height:900px;position:relative;overflow:hidden;background:#f6f8fb;page-break-after:always;padding:118px 96px 72px}.slide:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(6,182,212,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,.06) 1px,transparent 1px);background-size:56px 56px;opacity:.9;pointer-events:none}.slide:after{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#06b6d4,transparent);opacity:.6}.topbar{position:absolute;left:0;right:0;top:0;height:64px;background:rgba(255,255,255,.86);border-bottom:1px solid #d8eaf0;display:flex;align-items:center;padding:0 44px;z-index:2}.brand b{display:block;font-size:17px}.brand span{font-size:10px;color:#64748b}.nav{margin-left:auto;display:flex;gap:14px}.nav span{font-size:13px;color:#334155;padding:8px 14px;border:1px solid transparent}.nav .active{background:#e6fafd;border-color:#bdecf2;color:#0e7490;font-weight:800}.footer{position:absolute;left:70px;right:70px;bottom:38px;font-size:13px;color:#64748b;font-weight:700;z-index:3}.footer i{float:right;font-style:normal;color:#0e7490}.kicker{display:inline-flex;position:relative;z-index:1;border:1px solid #bdecf2;background:#fff;color:#0e7490;font-weight:900;font-size:14px;letter-spacing:.18em;padding:10px 18px;margin-bottom:28px}h1,h2{position:relative;z-index:1;margin:0;color:#020617;font-weight:950;letter-spacing:-.045em;line-height:.94}h1{font-size:92px}h1 span{color:#0e7490}h2{font-size:66px}.lead,.sub{position:relative;z-index:1;color:#334155;font-size:25px;line-height:1.55;max-width:760px;font-weight:650}.sub{font-size:20px;margin-top:20px}.sub.big{font-size:25px;max-width:760px}.cover-grid{position:relative;z-index:1;display:grid;grid-template-columns:1fr 720px;gap:80px;align-items:center}.hero-metrics{display:flex;gap:20px;margin-top:52px}.hero-metrics div,.metric{border:1px solid #bdecf2;background:#fff;padding:24px 30px;min-width:190px}.hero-metrics b{font-size:30px}.hero-metrics strong{font-size:50px;margin-left:10px;color:#dd1367}.hero-metrics div:nth-child(2) strong{color:#c5192d}.hero-metrics span{display:block;color:#64748b;font-size:12px;letter-spacing:.18em;font-weight:900}.actions{display:flex;gap:16px;margin-top:50px}.btn{display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 28px;border:1px solid #d8eaf0;font-size:17px;font-weight:900}.btn.primary{background:#14b8a6;border-color:#14b8a6;color:white}.btn.ghost{background:#fff;color:#020617}.btn.wide{width:max-content;margin-top:22px}.shot{position:relative;background:#fff;border:1px solid #bdecf2;box-shadow:0 22px 70px rgba(15,23,42,.08);overflow:hidden}.shot img{width:100%;height:100%;object-fit:cover;display:block}.hero-shot{height:520px}.shot-caption{position:absolute;left:36px;right:36px;bottom:32px;background:rgba(255,255,255,.92);border:1px solid #bdecf2;padding:18px;text-align:center;font-weight:900;color:#020617;font-size:20px}.sdg-layout{position:relative;z-index:1;display:grid;grid-template-columns:210px 1fr;gap:56px;margin-top:44px}.sdg-card{border-right:1px solid #d8eaf0;padding-top:10px}.sdg-card strong{font-size:104px;color:#dd1367;display:block;line-height:.8}.sdg-card span{font-size:22px;color:#334155;font-weight:900}.stack{display:grid;gap:20px}.row-card{height:94px;border:1px solid #d8eaf0;background:#fff;display:grid;grid-template-columns:70px 220px 1fr;align-items:center;padding:0 30px}.row-card:nth-child(2){background:#e6fafd}.row-card b,.flow-node b,.journey-row b,.mini b,.pillars b,.roadmap b{color:#0e7490;font-weight:950;letter-spacing:.16em}.row-card h3,.flow-node h3,.journey-row h3,.mini h3,.caption h3,.pillars h3,.roadmap h3{margin:0;color:#020617;font-size:24px;font-weight:950}.row-card p,.flow-node p,.journey-row p,.mini p,.caption p,.pillars p,.roadmap p{margin:0;color:#334155;font-size:16px;line-height:1.45;font-weight:600}.dark-strip{position:relative;z-index:1;margin-top:44px;background:#020617;color:white;font-size:21px;font-weight:900;text-align:center;padding:22px}.flow{position:relative;z-index:1;display:flex;align-items:center;gap:22px;margin-top:78px}.flow-node{width:280px;height:166px;background:#fff;border:1px solid #bdecf2;padding:32px 26px}.flow-node:nth-child(5){background:#e6fafd}.flow-node.danger{border-color:#dd1367;background:#fff7fb}.arrow{font-size:36px;color:#06b6d4;font-weight:900}.callout{position:relative;z-index:1;margin-top:82px;background:#fff;border:1px solid #d8eaf0;text-align:center;padding:28px;color:#334155;font-weight:900;font-size:22px}.two-col{position:relative;z-index:1;display:grid;grid-template-columns:520px 1fr;gap:74px;margin-top:46px}.two-col .shot{height:360px}.journey{display:grid;gap:16px}.journey-row{height:70px;background:#fff;border:1px solid #d8eaf0;display:grid;grid-template-columns:60px 150px 1fr;align-items:center;padding:0 26px}.journey-row.danger{background:#fff7fb;border-color:#f3b4d0}.mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.mini{height:136px;background:#fff;border:1px solid #bdecf2;padding:26px}.mini.active{background:#e6fafd}.tag{position:absolute;left:28px;bottom:28px;background:#e6fafd;border:1px solid #bdecf2;color:#0e7490;font-weight:950;font-size:14px;letter-spacing:.15em;padding:12px 16px}.proof-grid{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:44px}.proof-grid .shot{height:292px}.caption{border:1px solid #bdecf2;background:#fff;margin-top:18px;padding:24px 28px;display:grid;grid-template-columns:180px 1fr;gap:22px}.metric-row{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:58px}.metric{height:146px}.metric strong{display:block;font-size:54px;color:#0e7490;line-height:1;font-weight:950}.metric.pink strong{color:#dd1367}.metric span{display:block;margin-top:20px;color:#334155;font-size:18px;font-weight:850}.pillars,.roadmap{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:42px;margin-top:72px}.pillars div,.roadmap div,.sdg-pair div{background:#fff;border:1px solid #bdecf2;padding:26px 28px}.final h2{font-size:76px;max-width:860px}.roadmap{max-width:980px}.sdg-pair{position:absolute;right:116px;top:185px;width:300px;display:grid;gap:28px}.sdg-pair strong{display:block;color:#dd1367;font-size:38px;font-weight:950}.sdg-pair div:nth-child(2) strong{color:#c5192d}.sdg-pair span{font-size:17px;color:#334155;font-weight:900}.cover .footer,.final .footer{bottom:36px}`;

let html = `<!doctype html><html><head><meta charset="utf-8"><style>${style}</style></head><body>`;
for (const s of slides) {
  html += `<section class="slide ${s.cls||''}" data-no="${s.no}"><div class="topbar"><div class="brand"><b>拓途浙享</b><span>数字艺术与科技</span></div><div class="nav">${['SDG 选题','问题机制','平台方案','产品证据'].map(n=>`<span class="${n.includes(s.nav)?'active':''}">${n}</span>`).join('')}</div></div>${s.body}<div class="footer">智享无差 · 高校 AI 教育信息平权 <i>${s.no}</i></div></section>`;
}
html += `</body></html>`;
fs.writeFileSync(HTML, html);

(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(toUrl(HTML));
  for (let i=0;i<slides.length;i++) {
    const el = page.locator('.slide').nth(i);
    const out = path.join(OUT_DIR, `slide-${String(i+1).padStart(2,'0')}.png`);
    await el.screenshot({ path: out });
    console.log(out);
  }
  await browser.close();

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '拓途浙享项目团队';
  pptx.title = '智享无差——高校AI教育信息平权创业汇报';
  for (let i=0;i<slides.length;i++) {
    const slide = pptx.addSlide();
    slide.background = { color: 'F6F8FB' };
    slide.addImage({ path: path.join(OUT_DIR, `slide-${String(i+1).padStart(2,'0')}.png`), x:0, y:0, w:13.333, h:7.5 });
  }
  await pptx.writeFile({ fileName: OUT });
  console.log('pptx', OUT);
})();
