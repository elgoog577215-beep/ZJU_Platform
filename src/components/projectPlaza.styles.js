export const PROJECT_PLAZA_CSS = `
.ppp-root{position:relative;min-height:100vh;
  --display:"HarmonyOS Sans SC","MiSans","PingFang SC",system-ui,sans-serif;
  --body:"HarmonyOS Sans SC","MiSans","PingFang SC",system-ui,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,monospace;
  --r-card:14px;--r-control:10px;--r-chip:8px;--ease:cubic-bezier(0.16,1,0.3,1);font-family:var(--body);}
.ppp-root[data-variant="cyber"]{
  --ink:#f7f8f2;--ink-2:rgba(247,248,242,0.88);--muted:#a8b0a6;--soft:rgba(199,207,196,0.62);
  --surface:rgba(185,255,24,0.035);--surface-strong:rgba(4,12,7,0.84);--surface-2:rgba(185,255,24,0.08);--surface-soft:rgba(255,255,255,0.045);
  --border:rgba(247,248,242,0.12);--border-strong:rgba(185,255,24,0.44);
  --brand:#b9ff18;--brand-2:#dcff72;--brand-ink:#061006;--brand-soft:rgba(185,255,24,0.12);
  --call-ink:#dfffa0;--call-soft:rgba(185,255,24,0.09);--call-border:rgba(185,255,24,0.28);--call-on:#8fc914;
  --p-idea:#a8b0a6;--p-dev:#b9ff18;--p-live:#52e39d;--p-pause:#f7c86a;
  --sh-sm:0 10px 28px rgba(2,6,23,0.34);--sh-lg:0 28px 62px rgba(2,6,23,0.5);
  --prog-bg:rgba(2,6,23,0.68);--prog-ink:#e2e8f0;--avborder:#0b1220;color:var(--ink-2);
  isolation:isolate;overflow:clip;background:#020806;}
.ppp-root[data-variant="playful"]{
  --ink:#10150e;--ink-2:rgba(16,21,14,0.86);--muted:#596153;--soft:rgba(75,85,70,0.64);
  --surface:#ffffff;--surface-strong:rgba(255,255,255,0.9);--surface-2:#eff5e7;--surface-soft:#f3f6ec;
  --border:rgba(25,40,19,0.14);--border-strong:rgba(63,112,35,0.36);
  --brand:#477b24;--brand-2:#6e9f20;--brand-ink:#ffffff;--brand-soft:rgba(71,123,36,0.12);
  --call-ink:#315f18;--call-soft:#eff8e7;--call-border:rgba(71,123,36,0.28);--call-on:#477b24;
  --p-idea:#7c8777;--p-dev:#477b24;--p-live:#0f8b5c;--p-pause:#b7791f;
  --sh-sm:0 8px 22px rgba(67,56,80,0.06),0 1px 2px rgba(67,56,80,0.04);--sh-lg:0 40px 90px rgba(67,56,80,0.16);
  --prog-bg:rgba(255,255,255,0.94);--prog-ink:#3a3346;--avborder:#fff;color:var(--ink-2);}
.ppp-backdrop{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;}
.ppp-root[data-variant="cyber"] .ppp-backdrop{opacity:1;background:radial-gradient(860px 520px at 76% 8%,rgba(19,137,166,.18),transparent 66%),radial-gradient(720px 520px at 20% 18%,rgba(41,88,143,.14),transparent 68%),linear-gradient(180deg,#06111a 0%,#020806 42%,#020806 100%);}
.ppp-root[data-variant="playful"] .ppp-backdrop{opacity:1;background:radial-gradient(1100px 520px at 88% -4%,rgba(71,123,36,0.10),transparent 60%),radial-gradient(900px 480px at -5% 6%,rgba(185,255,24,0.07),transparent 55%),#f4f6ef;}
.ppp-root[data-event="true"]{isolation:isolate;overflow:clip;background:#020806;}
.ppp-root[data-event="true"][data-variant="playful"]{background:#f4f6ef;}
.ppp-root[data-embedded="true"]{min-height:0;overflow:clip;background:#020806;}
.ppp-root[data-embedded="true"] .ppp-backdrop{position:absolute;display:block;}
.ppp-root[data-embedded="true"] .ppp-wrap{max-width:none;padding:48px clamp(24px,4vw,56px) 104px;}
.ppp-root[data-embedded="true"] .ppx-hero.is-embedded{min-height:0;grid-template-columns:minmax(0,1fr) minmax(280px,.52fr);padding:44px 0 38px;}
.ppp-root[data-embedded="true"] .ppx-hero.is-embedded h1{max-width:16ch;font-size:clamp(2rem,4.6vw,4.2rem);}
.ppp-root[data-embedded="true"] .ppx-workspace{padding-top:16px;}

/* ===== 背景素材：x-field 全模式常驻，海报感的来源 ===== */
.ppp-x-field{position:absolute;z-index:0;inset:0 0 auto;height:980px;overflow:hidden;pointer-events:none;opacity:.5;
  mask-image:linear-gradient(to bottom,#000 0%,#000 44%,transparent 90%);-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 44%,transparent 90%);}
.ppp-x-field img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:saturate(1.08) contrast(1.05);}
.ppp-root[data-variant="cyber"] .ppp-x-field{mix-blend-mode:screen;opacity:.5;}
.ppp-root[data-variant="playful"] .ppp-x-field{mix-blend-mode:multiply;opacity:.22;}
.ppp-root[data-event="true"] .ppp-x-field{opacity:.72;}
.ppp-root[data-event="true"][data-variant="playful"] .ppp-x-field{opacity:.2;}

/* ===== 舞台装饰：仅夜间赛博变体 ===== */
.ppp-stage-grid{position:absolute;z-index:0;inset:0 0 auto;height:920px;pointer-events:none;opacity:0;background:linear-gradient(rgba(103,232,249,.048) 1px,transparent 1px),linear-gradient(90deg,rgba(103,232,249,.042) 1px,transparent 1px);background-size:76px 76px;mask-image:linear-gradient(to bottom,#000 0%,#000 48%,transparent 91%);-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 48%,transparent 91%);}
.ppp-stage-plane{position:absolute;z-index:0;inset:auto -10% -18% -10%;height:46%;pointer-events:none;opacity:0;transform:perspective(720px) rotateX(64deg) scale(1.16);transform-origin:center bottom;background:linear-gradient(rgba(103,232,249,.095) 1px,transparent 1px),linear-gradient(90deg,rgba(103,232,249,.06) 1px,transparent 1px);background-size:76px 76px;mask-image:linear-gradient(to top,rgba(0,0,0,.88),transparent 82%);-webkit-mask-image:linear-gradient(to top,rgba(0,0,0,.88),transparent 82%);}
.ppp-stage-horizon{position:absolute;z-index:0;left:0;right:0;top:46%;height:1px;pointer-events:none;opacity:0;background:linear-gradient(90deg,transparent 0%,rgba(103,232,249,.1) 15%,rgba(185,255,24,.42) 50%,rgba(103,232,249,.1) 85%,transparent 100%);box-shadow:0 0 28px rgba(103,232,249,.18);}
.ppp-stage-word{position:absolute;z-index:0;top:11%;left:-2vw;pointer-events:none;opacity:0;color:rgba(255,255,255,.014);-webkit-text-stroke:1px rgba(103,232,249,.115);font:950 clamp(7rem,18vw,18rem)/.8 var(--mono);letter-spacing:-.105em;mix-blend-mode:screen;}
.ppp-root[data-variant="cyber"] .ppp-stage-grid,.ppp-root[data-variant="cyber"] .ppp-stage-plane,.ppp-root[data-variant="cyber"] .ppp-stage-horizon,.ppp-root[data-variant="cyber"] .ppp-stage-word{opacity:1;}

/* ===== 现场标记 ===== */
.ppp-live-mark{display:inline-flex;align-items:center;gap:7px;margin:0 0 10px;color:var(--brand);font-size:11px;font-weight:950;letter-spacing:.16em;text-transform:uppercase;}
.ppp-live-dot{width:7px;height:7px;border-radius:50%;background:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);animation:ppppulse 2.1s var(--ease) infinite;}
@keyframes ppppulse{0%,100%{box-shadow:0 0 0 3px var(--brand-soft);}50%{box-shadow:0 0 0 7px transparent;}}

/* ===== 项目中心稳定工作区 ===== */
.ppp-wrap{position:relative;z-index:1;margin:0 auto;padding:calc(env(safe-area-inset-top) + 92px) 24px 96px;max-width:min(1380px,100%);}
.ppx-hero{position:relative;min-height:270px;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.48fr);align-items:end;gap:clamp(2rem,6vw,6rem);padding:42px 0 32px;border-bottom:1px solid var(--border-strong);}
.ppx-hero-copy{min-width:0;}
.ppx-kicker{display:block;margin-bottom:12px;color:var(--brand);font:900 11px/1 var(--body);letter-spacing:.12em;}
.ppx-hero h1{max-width:12ch;margin:0;color:var(--ink);font:950 clamp(3rem,6.2vw,5.6rem)/.92 var(--display);letter-spacing:-.04em;text-wrap:balance;text-shadow:0 14px 42px rgba(0,0,0,.34);}
.ppx-hero-copy>p{max-width:62ch;margin:16px 0 0;color:var(--ink-2);font-size:15px;line-height:1.68;}
.ppx-lifecycle{display:flex;align-items:center;gap:9px;margin-top:22px;color:var(--muted);font-size:12px;font-weight:850;}
.ppx-lifecycle svg{color:var(--brand);}
.ppx-hero-side{display:flex;flex-direction:column;align-items:flex-end;gap:20px;}
.ppx-hero-facts{display:flex;justify-content:flex-end;gap:22px;width:100%;}
.ppx-hero-facts span{display:grid;gap:5px;color:var(--muted);font-size:12px;font-weight:750;text-align:right;}
.ppx-hero-facts strong{color:var(--ink);font:900 22px/1 var(--body);}
.ppx-hero-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;width:100%;}
.ppp-newbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 17px;border:1px solid var(--brand);border-radius:var(--r-control);background:var(--brand);color:var(--brand-ink);font:900 13px/1 var(--body);cursor:pointer;transition:transform .18s var(--ease),background .18s var(--ease),border-color .18s var(--ease);}
.ppp-newbtn.ghost{border-color:var(--border-strong);background:rgba(2,8,6,.64);color:var(--ink);}
.ppp-newbtn:hover:not(:disabled){transform:translateY(-1px);}
.ppp-newbtn:focus-visible,.ppx-scope-track button:focus-visible,.ppp-sort button:focus-visible,.ppp-filter-toggle:focus-visible,.ppp-chip:focus-visible,.ppx-results-state button:focus-visible{outline:3px solid color-mix(in srgb,var(--brand) 32%,transparent);outline-offset:2px;}
.ppp-newbtn:disabled{cursor:not-allowed;filter:saturate(.25);opacity:.58;transform:none;}

/* ===== 常驻赛事档案索引 ===== */
.ppx-scope{position:sticky;top:70px;z-index:24;margin:0 -12px 24px;padding:16px 12px 14px;border-bottom:1px solid var(--border);background:rgba(2,8,6,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}
.ppx-scope-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:11px;}
.ppx-scope-heading>div{display:grid;gap:3px;}
.ppx-scope-heading span{color:var(--brand);font-size:11px;font-weight:900;}
.ppx-scope-heading h2{margin:0;color:var(--ink);font-size:16px;line-height:1.2;font-weight:900;}
.ppx-scope-heading p{max-width:44ch;margin:0;color:var(--muted);font-size:12px;line-height:1.5;text-align:right;}
.ppx-scope-track{display:flex;align-items:stretch;gap:8px;max-width:100%;overflow-x:auto;padding:1px 1px 5px;scrollbar-width:thin;scroll-snap-type:x proximity;}
.ppx-scope-track button{display:flex;align-items:center;gap:10px;min-width:190px;min-height:54px;padding:9px 12px;border:1px solid var(--border);border-radius:var(--r-control);background:rgba(255,255,255,.025);color:var(--muted);font-family:var(--body);text-align:left;cursor:pointer;scroll-snap-align:start;transition:background .18s var(--ease),border-color .18s var(--ease),color .18s var(--ease);}
.ppx-scope-track button:hover{border-color:var(--border-strong);color:var(--ink);background:var(--surface-soft);}
.ppx-scope-track button.is-current{border-color:var(--brand);background:var(--brand-soft);color:var(--ink);}
.ppx-scope-icon{display:grid;width:32px;height:32px;place-items:center;flex:none;border:1px solid var(--border);border-radius:8px;background:rgba(2,8,6,.46);color:var(--muted);}
.ppx-scope-track button.is-current .ppx-scope-icon{border-color:var(--brand);background:var(--brand);color:var(--brand-ink);}
.ppx-scope-copy{display:grid;gap:4px;min-width:0;}
.ppx-scope-copy strong{max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit;font-size:12.5px;line-height:1.2;font-weight:900;}
.ppx-scope-copy small{color:var(--muted);font-size:10.5px;line-height:1.2;font-weight:750;}
.ppx-scope-track button.is-current small{color:var(--brand-2);}

/* ===== 当前赛事上下文 ===== */
.ppx-event-context{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(360px,.8fr);gap:24px;margin:0 0 28px;padding:24px;border:1px solid var(--border-strong);border-radius:var(--r-card);background:rgba(5,15,9,.9);}
.ppx-event-main{min-width:0;}
.ppx-event-label{display:block;margin-bottom:8px;color:var(--brand);font-size:11px;font-weight:900;}
.ppx-event-main h2{max-width:22ch;margin:0;color:var(--ink);font:900 clamp(1.65rem,3vw,2.65rem)/1.05 var(--display);letter-spacing:-.03em;text-wrap:balance;}
.ppx-event-main p{max-width:58ch;margin:12px 0 0;color:var(--muted);font-size:13.5px;line-height:1.6;}
.ppx-event-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:0;background:var(--border);}
.ppx-event-facts>div{display:grid;align-content:center;gap:8px;min-height:82px;padding:12px;background:#07110b;}
.ppx-event-facts dt{color:var(--soft);font-size:10.5px;font-weight:800;}
.ppx-event-facts dd{display:flex;align-items:center;gap:6px;margin:0;color:var(--ink);font-size:12px;font-weight:850;}
.ppx-event-facts dd.is-open{color:var(--brand);}
.ppx-event-links{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;padding-top:16px;border-top:1px solid var(--border);}
.ppx-event-links a{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 12px;border:1px solid var(--border);border-radius:var(--r-chip);color:var(--ink-2);font-size:12px;font-weight:850;text-decoration:none;}
.ppx-event-links a:hover{border-color:var(--brand);color:var(--brand);}

/* ===== 发现与结果工作区 ===== */
.ppx-workspace{position:relative;}
.ppx-discovery{display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:8px;align-items:center;padding:8px;border:1px solid var(--border);border-radius:var(--r-card);background:#061009;}
.ppp-search{min-width:220px;display:flex;align-items:center;gap:9px;height:44px;padding:0 12px;border:1px solid var(--border);border-radius:var(--r-control);background:rgba(255,255,255,.035);color:var(--soft);}
.ppp-search:focus-within{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 10%,transparent);}
.ppp-search input{flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;color:var(--ink);font:500 14px/1.4 var(--body);}
.ppp-search input::placeholder{color:var(--soft);}
.ppp-sort{display:inline-flex;align-items:center;gap:2px;padding:3px;border:1px solid var(--border);border-radius:var(--r-control);background:rgba(255,255,255,.035);}
.ppp-sort button{height:36px;padding:0 13px;border:0;border-radius:var(--r-chip);background:transparent;color:var(--muted);font:850 12px/1 var(--body);cursor:pointer;white-space:nowrap;}
.ppp-sort button.on{background:var(--brand);color:var(--brand-ink);}
.ppp-filter-toggle{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 13px;border:1px solid var(--border);border-radius:var(--r-control);background:rgba(255,255,255,.035);color:var(--muted);font:850 12px/1 var(--body);cursor:pointer;}
.ppp-filter-toggle.on{border-color:var(--brand);background:var(--brand-soft);color:var(--brand);}
.ppp-filter-toggle>span{display:grid;min-width:18px;height:18px;place-items:center;border-radius:999px;background:var(--brand);color:var(--brand-ink);font-size:10px;}
.ppx-filter-scope-note{display:inline-flex;align-items:center;min-height:44px;padding:0 13px;border:1px solid var(--border);border-radius:var(--r-control);color:var(--muted);font-size:11.5px;font-weight:800;white-space:nowrap;}
.ppp-filters{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:10px;padding:12px;border-bottom:1px solid var(--border);}
.ppp-filter-group{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap;}
.ppp-flabel{margin-right:2px;color:var(--soft);font-size:12px;font-weight:800;}
.ppp-chip{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 11px;border:1px solid var(--border);border-radius:var(--r-chip);background:transparent;color:var(--ink-2);font:800 12px/1 var(--body);cursor:pointer;}
.ppp-chip:hover{border-color:var(--border-strong);color:var(--ink);}
.ppp-chip.on{border-color:var(--brand);background:var(--brand-soft);color:var(--brand-2);}
.ppp-chip.call.on{border-color:var(--call-on);background:var(--call-on);color:#061006;}
.ppp-cdot{width:7px;height:7px;border-radius:50%;}

.ppx-results-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:34px 0 16px;}
.ppx-results-head>div:first-child{display:grid;gap:5px;}
.ppx-results-head span{color:var(--brand);font-size:11px;font-weight:900;}
.ppx-results-head h2{margin:0;color:var(--ink);font-size:clamp(1.55rem,3vw,2.35rem);line-height:1.08;font-weight:900;letter-spacing:-.025em;}
.ppx-results-state{display:flex;align-items:center;justify-content:flex-end;gap:12px;color:var(--muted);font-size:12px;}
.ppx-results-state strong{color:var(--ink-2);font-weight:850;}
.ppx-results-state button{display:inline-flex;align-items:center;gap:6px;padding:0;border:0;background:transparent;color:var(--brand);font:850 12px/1 var(--body);cursor:pointer;}

/* ===== 空态与加载 ===== */
.ppp-empty{min-height:250px;padding:48px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;border:1px dashed var(--border);border-radius:var(--r-card);background:rgba(255,255,255,.018);color:var(--muted);font-size:13.5px;text-align:center;}
.ppp-empty strong{color:var(--ink);font-size:17px;}
.ppp-empty>span{max-width:52ch;line-height:1.55;}
.ppp-empty-action{margin-top:8px;}
.ppx-skeleton-grid{pointer-events:none;}
.ppx-skeleton{display:grid;gap:11px;padding-bottom:14px;overflow:hidden;border:1px solid var(--border);border-radius:var(--r-card);background:rgba(255,255,255,.025);}
.ppx-skeleton-cover,.ppx-skeleton-line{display:block;background:linear-gradient(100deg,rgba(255,255,255,.035) 20%,rgba(255,255,255,.085) 50%,rgba(255,255,255,.035) 80%);background-size:220% 100%;animation:ppxshimmer 1.3s linear infinite;}
.ppx-skeleton-cover{aspect-ratio:16/9;}
.ppx-skeleton-line{width:70%;height:12px;margin-inline:14px;border-radius:4px;}
.ppx-skeleton-line.wide{width:calc(100% - 28px);height:18px;}
.ppx-skeleton-line.short{width:42%;}
@keyframes ppxshimmer{to{background-position:-220% 0}}

/* ===== 稳定作品目录 ===== */
.ppp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch;}
.ppp-card{position:relative;min-width:0;overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--r-card);background:#061009;cursor:pointer;transition:transform .18s var(--ease),border-color .18s var(--ease),box-shadow .18s var(--ease);}
.ppp-card-open{position:absolute;inset:0;z-index:2;width:100%;height:100%;padding:0;border:0;border-radius:var(--r-card);background:transparent;cursor:pointer;}
.ppp-card-open:focus-visible{outline:3px solid var(--brand);outline-offset:-4px;}
.ppp-card:hover{transform:translateY(-2px);border-color:var(--border-strong);box-shadow:0 16px 34px rgba(0,0,0,.24);}
.ppp-cover{position:relative;aspect-ratio:16/9;overflow:hidden;background:#07100b;}
.ppp-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,6,10,.03),transparent 48%,rgba(2,6,10,.38));pointer-events:none;}
.ppp-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .36s var(--ease);}
.ppp-card:hover .ppp-art{transform:scale(1.02);}
.ppp-noart{display:flex;align-items:center;justify-content:center;background:var(--surface-soft);color:var(--soft);font:850 24px/1 var(--display);}
.ppp-prog{position:absolute;right:10px;top:10px;z-index:3;display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:var(--r-chip);background:var(--prog-bg);color:var(--prog-ink);font-size:11px;font-weight:900;}
.ppp-card .ppp-prog,.ppp-card .ppp-photos,.ppp-card .ppp-score,.ppp-card .ppp-event-badge{pointer-events:none;}
.ppp-d{width:8px;height:8px;border-radius:50%;flex:none;}
.ppp-photos{position:absolute;left:10px;bottom:10px;z-index:3;display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:var(--r-chip);background:rgba(2,6,23,.7);color:#fff;font-size:11px;font-weight:800;}
.ppp-score{position:absolute;left:10px;top:10px;z-index:3;display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:var(--r-chip);background:var(--brand);color:var(--brand-ink);font-size:11px;font-weight:950;}
.ppp-event-badge{position:absolute;left:10px;top:10px;z-index:3;display:inline-flex;align-items:center;gap:6px;max-width:calc(100% - 20px);overflow:hidden;padding:6px 9px;border-radius:var(--r-chip);background:var(--brand);color:var(--brand-ink);font-size:11px;font-weight:950;text-overflow:ellipsis;white-space:nowrap;}
.ppp-body{min-height:220px;padding:15px 15px 13px;display:flex;flex:1;flex-direction:column;}
.ppp-trow{display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;}
.ppp-title{min-height:2.44em;margin:0;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;color:var(--ink);font:850 18px/1.22 var(--display);letter-spacing:-.015em;}
.ppp-arrow{flex:none;margin-top:2px;color:var(--soft);transition:transform .18s var(--ease),color .18s var(--ease);}
.ppp-card:hover .ppp-arrow{transform:translateX(2px);color:var(--brand);}
.ppp-intro{min-height:3em;margin:0 0 10px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;color:var(--muted);font-size:13px;line-height:1.5;}
.ppp-archive-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:9px;}
.ppp-archive-meta span{display:inline-flex;align-items:center;min-height:23px;padding:3px 7px;border:1px solid var(--border);border-radius:var(--r-chip);background:transparent;color:var(--muted);font-size:10.5px;font-weight:800;}
.ppp-archive-meta span:first-child{border-color:var(--border-strong);color:var(--brand);}
.ppp-card-evidence{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
.ppp-card-evidence span{display:inline-flex;align-items:center;gap:5px;color:var(--soft);font-size:10.5px;font-weight:800;}
.ppp-card-evidence span.is-ready{color:#b9d7c5;}
.ppp-card-evidence span+span{padding-left:7px;border-left:1px solid var(--border);}
.ppp-needs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
.ppp-need{padding:4px 8px;border:1px solid var(--call-border);border-radius:var(--r-chip);background:var(--call-soft);color:var(--call-ink);font-size:11.5px;font-weight:900;}
.ppp-tech{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}
.ppp-tag{padding:3px 8px;border:1px solid var(--border);border-radius:var(--r-chip);background:transparent;color:var(--muted);font-size:11.5px;font-weight:700;}
.ppp-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px;border-top:1px solid var(--border);}
.ppp-team{display:flex;align-items:center;gap:7px;min-width:0;}
.ppp-stack{display:flex;}
.ppp-av{display:grid;width:28px;height:28px;place-items:center;flex:none;border:2px solid var(--avborder);border-radius:50%;color:#fff;font-size:12px;font-weight:900;}
.ppp-lbl{overflow:hidden;color:var(--muted);font-size:12.5px;text-overflow:ellipsis;white-space:nowrap;}
.ppp-favrow{position:relative;z-index:3;display:flex;align-items:center;gap:8px;flex:none;}
.ppp-views{display:inline-flex;align-items:center;gap:4px;color:var(--soft);font-size:12px;font-weight:800;white-space:nowrap;}
.ppp-fav{padding:1px 3px;border-radius:var(--r-control);color:var(--muted);}
.ppp-fav span{font-size:12px;font-weight:800;}
.ppp-static-fav{display:inline-flex;align-items:center;gap:4px;color:var(--soft);}
.ppp-fav-modal{flex:none;padding:9px 12px;border:1px solid var(--border);border-radius:var(--r-control);background:var(--surface);color:var(--ink-2);}
/* ===== 详情弹窗 ===== */
.ppp-scrim{position:fixed;inset:0;z-index:150;min-height:100dvh;background:rgba(4,8,20,0.64);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:28px;animation:pppfade .2s var(--ease);}
@keyframes pppfade{from{opacity:0}to{opacity:1}}
.ppp-modal{position:relative;width:100%;max-width:900px;max-height:88vh;overflow:hidden;border:1px solid var(--border-strong);border-radius:var(--r-card);box-shadow:var(--sh-lg);display:grid;grid-template-columns:minmax(310px,0.92fr) minmax(0,1.08fr);animation:ppppop .24s var(--ease);}
.ppp-root[data-variant="cyber"] .ppp-modal{background:rgba(8,14,28,0.97);backdrop-filter:blur(22px);}
.ppp-root[data-variant="playful"] .ppp-modal{background:#ffffff;}
@keyframes ppppop{from{opacity:0;transform:translateY(10px) scale(0.99)}to{opacity:1;transform:none}}
.ppp-x{position:absolute;right:12px;top:12px;z-index:6;width:34px;height:34px;border-radius:var(--r-control);border:1px solid var(--border);cursor:pointer;background:var(--prog-bg);color:var(--prog-ink);display:grid;place-items:center;backdrop-filter:blur(6px);box-shadow:var(--sh-sm);}
.ppp-mgallery{position:relative;background:#0b1220;overflow:hidden;min-height:100%;}
.ppp-mhero{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.ppp-mgallery::after{content:none;}
.ppp-mthumbs{position:absolute;left:14px;right:14px;bottom:14px;display:flex;gap:7px;z-index:2;overflow-x:auto;}
.ppp-t{width:54px;height:40px;border-radius:var(--r-control);border:2px solid rgba(255,255,255,0.46);overflow:hidden;cursor:pointer;padding:0;background:none;flex:none;transition:border-color .15s var(--ease);}
.ppp-t img{width:100%;height:100%;object-fit:cover;display:block;}
.ppp-t.sel{border-color:#fff;box-shadow:0 0 0 3px rgba(103,232,249,0.26);}
.ppp-mbody{padding:24px 24px 18px;display:flex;flex-direction:column;overflow:auto;min-width:0;}
.ppp-kicker{font-size:11px;color:var(--brand);font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px;}
.ppp-mhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.ppp-mtitle{font-weight:900;color:var(--ink);font-size:27px;letter-spacing:0;margin:0;line-height:1.12;}
.ppp-mteam{display:flex;align-items:center;gap:8px;margin:12px 0 10px;}
.ppp-mstrip{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px;}
.ppp-mstrip span{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);background:var(--surface-soft);border-radius:var(--r-chip);padding:5px 9px;color:var(--muted);font-size:12px;font-weight:800;}
.ppp-msummary{margin:0 0 2px;color:var(--ink-2);font-size:14px;line-height:1.65;}
.ppp-mblock{margin-top:16px;}
.ppp-bt{font-size:11px;color:var(--soft);font-weight:900;letter-spacing:.14em;margin-bottom:8px;text-transform:uppercase;}
.ppp-content{font-size:14px;line-height:1.72;color:var(--ink-2);}
.ppp-content p{margin:0 0 10px;}
.ppp-content p:last-child{margin-bottom:0;}
.ppp-mneed{font-size:12px;font-weight:900;color:var(--call-ink);background:var(--call-soft);border:1px solid var(--call-border);padding:5px 10px;border-radius:var(--r-chip);}
.ppp-mtag{font-size:12px;color:var(--ink-2);background:var(--surface-2);border:1px solid var(--border);padding:4px 10px;border-radius:var(--r-chip);font-weight:700;}
.ppp-mcontact{display:flex;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border);position:sticky;bottom:-18px;background:inherit;flex-wrap:wrap;}
.ppp-event-history-list{display:grid;gap:.65rem;}
.ppp-event-history-list article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.8rem;align-items:center;padding:.8rem 0;border-block:1px solid var(--border);}
.ppp-event-history-list article+article{border-top:0;}
.ppp-event-history-list article>div{display:grid;gap:.22rem;}
.ppp-event-history-list article span{color:var(--brand);font:850 .68rem/1.2 var(--mono);}
.ppp-event-history-list article strong{color:var(--ink);font-size:.9rem;}
.ppp-event-history-list article small{color:var(--muted);font-weight:750;}
.ppp-event-history-list nav{display:flex;gap:.4rem;}
.ppp-event-history-list a{padding:.5rem .65rem;border:1px solid var(--border-strong);border-radius:8px;color:var(--brand);font-size:.7rem;font-weight:900;}
.ppp-cbtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:9px 13px;border-radius:var(--r-control);font-size:13px;font-weight:900;cursor:pointer;text-decoration:none;border:0;font-family:var(--body);white-space:nowrap;}
.ppp-cbtn.primary{flex:1;background:var(--brand);color:var(--brand-ink);}
.ppp-root[data-variant="cyber"] .ppp-cbtn.primary{background:#67e8f9;color:#04111f;}
.ppp-root[data-variant="playful"] .ppp-cbtn.primary{background:linear-gradient(135deg,#8b6fd6,#d88bb8);color:#fff;border:1px solid rgba(139,111,214,0.14);}
.ppp-cbtn.ghost{background:var(--surface);border:1px solid var(--border-strong);color:var(--brand);}
.ppp-cbtn.ppp-disabled{opacity:.52;pointer-events:none;}
.ppp-share-trigger{box-shadow:0 8px 22px rgba(103,232,249,0.16);}
.ppp-share-coach{position:fixed;z-index:260;right:12px;top:max(12px,env(safe-area-inset-top));width:min(232px,calc(100vw - 24px));display:grid;grid-template-columns:18px minmax(0,1fr) 28px;align-items:start;gap:9px;padding:13px 9px 13px 13px;border:1px solid rgba(103,232,249,0.72);border-radius:8px;background:#071725;color:#e6fbff;box-shadow:0 16px 34px rgba(2,6,23,0.38);animation:pppcoach .2s var(--ease);}
.ppp-share-coach::before{content:"";position:absolute;right:48px;top:-7px;width:12px;height:12px;border-left:1px solid rgba(103,232,249,0.72);border-top:1px solid rgba(103,232,249,0.72);background:#071725;transform:rotate(45deg);}
.ppp-share-coach>svg{margin-top:2px;color:#67e8f9;}
.ppp-share-coach span{font-size:12.5px;line-height:1.5;}
.ppp-share-coach strong{display:block;color:#67e8f9;font-size:13px;}
.ppp-share-coach button{width:28px;height:28px;border:0;border-radius:6px;background:rgba(255,255,255,0.07);color:#cbd5e1;display:grid;place-items:center;cursor:pointer;}
.miniapp-webview .ppp-share-coach button{position:relative;z-index:1;width:36px;height:36px;margin:-4px 0 -4px -4px;touch-action:manipulation;pointer-events:auto;}
@keyframes pppcoach{from{opacity:0;transform:translateY(-7px)}to{opacity:1;transform:none}}

/* ===== 创建/投稿表单 ===== */
.ppp-cbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border);}
.ppp-back{background:transparent;border:0;color:var(--muted);font-size:13px;font-weight:900;cursor:pointer;font-family:var(--body);padding:6px 0;}
.ppp-back:hover{color:var(--ink);}
.ppp-ctitle{font-weight:900;font-size:22px;color:var(--ink);}
.ppp-create-event{display:inline-flex;align-items:center;gap:.4rem;color:var(--brand);font-size:.75rem;font-weight:900;}
.ppp-cactions{display:flex;gap:8px;}
.ppp-cactions .ppp-cbtn{flex:none;padding:9px 14px;}
.ppp-cactions .ppp-cbtn[disabled]{opacity:.5;pointer-events:none;}
.ppp-cgrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:start;}
.ppp-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;min-width:0;}
.ppp-fsec{display:flex;flex-direction:column;gap:7px;min-width:0;}
.ppp-fsec:nth-child(1),.ppp-fsec:nth-child(4),.ppp-fsec:nth-child(7),.ppp-frow{grid-column:1/-1;}
.ppp-flab{font-size:12.5px;font-weight:900;color:var(--ink);display:flex;align-items:baseline;gap:7px;}
.ppp-flab span{font-size:11px;font-weight:600;color:var(--soft);}
.ppp-finput,.ppp-ftext{width:100%;background:var(--surface-strong);border:1px solid var(--border);border-radius:var(--r-control);color:var(--ink);font-family:var(--body);font-size:14px;padding:11px 12px;outline:none;transition:border-color .15s var(--ease),background .15s var(--ease);}
.ppp-finput:focus,.ppp-ftext:focus{border-color:var(--border-strong);}
.ppp-finput::placeholder,.ppp-ftext::placeholder{color:var(--soft);}
.ppp-ftext{resize:vertical;line-height:1.6;min-height:116px;}
.ppp-frow{display:flex;gap:14px;}
.ppp-fhalf{flex:1;}
.ppp-uploads{display:flex;gap:9px;flex-wrap:wrap;}
.ppp-up{position:relative;width:96px;height:68px;border-radius:var(--r-control);overflow:hidden;border:1px solid var(--border);background:var(--surface-soft);}
.ppp-up img{width:100%;height:100%;object-fit:cover;}
.ppp-upadd{border:1.5px dashed var(--border-strong);background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--muted);cursor:pointer;font-family:var(--body);}
.ppp-upadd small{font-size:10.5px;font-weight:900;}
.ppp-upcover{position:absolute;left:6px;bottom:6px;background:rgba(2,6,23,0.62);color:#fff;font-size:10px;font-weight:900;padding:2px 6px;border-radius:var(--r-chip);}
.ppp-seg{display:inline-flex;flex-wrap:wrap;background:var(--surface-strong);border:1px solid var(--border);border-radius:var(--r-control);padding:4px;gap:2px;}
.ppp-segbtn{display:inline-flex;align-items:center;gap:6px;background:transparent;border:0;cursor:pointer;color:var(--muted);font-family:var(--body);font-size:12.5px;font-weight:900;padding:7px 11px;border-radius:var(--r-chip);transition:all .15s var(--ease);}
.ppp-segbtn.on{background:var(--surface-2);color:var(--ink);}
.ppp-pick{display:flex;flex-wrap:wrap;gap:7px;}
.ppp-pchip{background:var(--surface-strong);border:1px solid var(--border);color:var(--ink-2);font-family:var(--body);font-size:12.5px;font-weight:900;padding:7px 11px;border-radius:var(--r-control);cursor:pointer;transition:all .15s var(--ease);}
.ppp-pchip.on{background:var(--call-soft);border-color:var(--call-border);color:var(--call-ink);}
.ppp-taginput{display:flex;flex-wrap:wrap;gap:7px;align-items:center;background:var(--surface-strong);border:1px solid var(--border);border-radius:var(--r-control);padding:8px 10px;}
.ppp-tg{display:inline-flex;align-items:center;gap:6px;background:var(--surface-2);border:1px solid var(--border);color:var(--ink-2);font-size:12px;font-weight:800;padding:4px 8px;border-radius:var(--r-chip);}
.ppp-tg button{cursor:pointer;color:var(--soft);background:transparent;border:0;padding:0;font:inherit;}
.ppp-taginput input{flex:1;min-width:120px;background:transparent;border:0;outline:none;color:var(--ink);font-family:var(--body);font-size:13.5px;padding:4px;}
.ppp-preview{position:sticky;top:92px;display:flex;flex-direction:column;gap:9px;}
.ppp-pvlab{font-size:11px;color:var(--soft);font-weight:900;letter-spacing:.14em;text-transform:uppercase;}
.ppp-pvcard{cursor:default;}
.ppp-pvcard:hover{transform:none;box-shadow:var(--sh-sm);}
.ppp-pvhint{font-size:11.5px;color:var(--soft);line-height:1.55;}

/* ===== 移动端 ===== */
@media (max-width:1100px){
  .ppp-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  .ppx-event-context{grid-template-columns:1fr;}
}
@media (max-width:980px){
  .ppx-hero{grid-template-columns:1fr;align-items:start;gap:24px;}
  .ppx-hero-side{align-items:stretch;}
  .ppx-hero-facts,.ppx-hero-actions{justify-content:flex-start;}
  .ppp-cgrid{grid-template-columns:1fr;}
  .ppp-preview{position:static;max-width:360px;}
  .ppp-form{grid-template-columns:1fr;}
  .ppp-fsec,.ppp-frow{grid-column:1/-1;}
  .ppp-root[data-embedded="true"] .ppx-hero.is-embedded{grid-template-columns:1fr;}
}
@media (max-width:820px){
  .ppp-wrap{padding:calc(env(safe-area-inset-top) + 72px) 14px var(--mobile-content-bottom-padding);}
  .ppp-x-field{height:610px;}
  .ppp-x-field img{object-position:58% top;}
  .ppx-hero{min-height:0;gap:20px;padding:32px 0 24px;}
  .ppx-hero h1{max-width:10ch;font-size:clamp(2.75rem,13vw,4.4rem);line-height:.94;}
  .ppx-hero-copy>p{max-width:34ch;margin-top:13px;font-size:13.5px;line-height:1.6;}
  .ppx-lifecycle{gap:6px;margin-top:17px;font-size:11px;}
  .ppx-hero-facts{justify-content:space-between;gap:12px;}
  .ppx-hero-facts span{text-align:left;}
  .ppx-hero-actions{display:grid;grid-template-columns:1fr;}
  .ppx-hero-actions .ppp-newbtn{width:100%;white-space:normal;line-height:1.25;}
  .ppx-scope{top:calc(env(safe-area-inset-top) + 56px);margin:0 -14px 18px;padding:13px 14px 10px;}
  .ppx-scope-heading{align-items:start;margin-bottom:9px;}
  .ppx-scope-heading p{display:none;}
  .ppx-scope-track{margin-right:-14px;padding-right:14px;scroll-padding-inline:14px;-webkit-overflow-scrolling:touch;}
  .ppx-scope-track button{min-width:172px;min-height:52px;}
  .ppx-scope-icon{width:30px;height:30px;}
  .ppx-event-context{gap:17px;margin-bottom:18px;padding:18px;}
  .ppx-event-main h2{font-size:clamp(1.55rem,8vw,2.15rem);}
  .ppx-event-facts{grid-template-columns:repeat(2,minmax(0,1fr));}
  .ppx-event-facts>div:last-child{grid-column:1/-1;}
  .ppx-event-facts>div{min-height:72px;padding:10px;}
  .ppx-event-links{display:grid;grid-template-columns:1fr 1fr;padding-top:13px;}
  .ppx-event-links a{justify-content:center;text-align:center;}
  .ppx-discovery{grid-template-columns:minmax(0,1fr) auto;gap:6px;padding:6px;}
  .ppp-search{grid-column:1/-1;width:100%;min-width:0;height:44px;}
  .ppp-sort{min-width:0;overflow-x:auto;}
  .ppp-sort button{height:36px;padding:0 10px;}
  .ppp-filter-toggle{min-height:44px;padding-inline:10px;}
  .ppx-filter-scope-note{grid-column:1/-1;justify-content:center;min-height:38px;white-space:normal;text-align:center;}
  .ppp-filters{margin-inline:-14px;max-width:none;overflow-x:auto;flex-wrap:nowrap;padding:10px 14px 6px;scroll-padding-inline:14px;-webkit-overflow-scrolling:touch;}
  .ppp-filter-group{flex:0 0 auto;flex-wrap:nowrap;}
  .ppp-chip{flex:none;min-height:40px;}
  .ppx-results-head{align-items:flex-start;padding:27px 0 13px;}
  .ppx-results-state{display:grid;justify-items:end;gap:7px;}
  .ppp-grid{grid-template-columns:1fr;gap:12px;}
  .ppp-card{display:grid;grid-template-columns:112px minmax(0,1fr);min-height:166px;}
  .ppp-cover{height:100%;min-height:166px;aspect-ratio:auto;}
  .ppp-body{min-height:0;padding:11px 12px;}
  .ppp-title{min-height:0;font-size:16px;}
  .ppp-intro{min-height:0;margin-bottom:7px;font-size:12px;-webkit-line-clamp:2;}
  .ppp-card .ppp-tech{display:none;}
  .ppp-archive-meta{margin-bottom:7px;}
  .ppp-card-evidence{gap:5px;margin-bottom:7px;}
  .ppp-card-evidence span{font-size:9.5px;}
  .ppp-meta{padding-top:7px;}
  .ppp-event-badge{left:6px;top:6px;max-width:calc(100% - 12px);padding:5px 7px;font-size:9.5px;}
  .ppp-event-badge svg{width:11px;height:11px;}
  .ppx-skeleton{grid-template-columns:112px minmax(0,1fr);grid-template-rows:repeat(3,auto);min-height:150px;padding:12px;}
  .ppx-skeleton-cover{grid-row:1/-1;height:100%;min-height:126px;aspect-ratio:auto;}
  .ppx-skeleton-line{width:70%;margin-inline:0;}
  .ppx-skeleton-line.wide{width:100%;}
  .ppx-skeleton-line.short{width:46%;}
  .ppp-scrim{align-items:stretch;padding:0;}
  .ppp-modal{grid-template-columns:1fr;width:100%;height:100dvh;max-width:none;max-height:none;overflow:hidden;border:0;border-radius:0;}
  .ppp-mgallery{height:210px;min-height:210px;flex:none;}
  .ppp-mbody{padding:20px 18px calc(env(safe-area-inset-bottom) + 18px);overflow:auto;}
  .ppp-mtitle{font-size:23px;}
  .ppp-mcontact{position:static;}
  .ppp-mcontact .ppp-cbtn{flex:1 1 150px;}
  .ppp-event-history-list article{grid-template-columns:1fr;}
  .ppp-event-history-list nav{display:grid;grid-template-columns:1fr 1fr;}
  .ppp-event-history-list a{text-align:center;}
  .ppp-cbar{align-items:stretch;flex-direction:column;}
  .ppp-cactions{display:grid;grid-template-columns:1fr 1fr;}
  .ppp-frow{flex-direction:column;gap:12px;}
  .ppp-preview{max-width:none;}
  .ppp-empty{min-height:190px;}
  .ppp-root[data-variant="cyber"] .ppp-stage-grid{height:620px;background-size:52px 52px;}
  .ppp-root[data-variant="cyber"] .ppp-stage-plane{height:38%;background-size:52px 52px;}
  .ppp-root[data-variant="cyber"] .ppp-stage-horizon{top:43%;}
  .ppp-root[data-variant="cyber"] .ppp-stage-word{top:92px;left:-.7rem;right:auto;font-size:clamp(5rem,24vw,7rem);letter-spacing:-.12em;}
  .ppp-root[data-embedded="true"] .ppp-wrap{padding:30px 16px calc(var(--mobile-content-bottom-padding,0px) + 72px);}
  .ppp-root[data-embedded="true"] .ppx-hero.is-embedded{padding:30px 0 26px;}
  .ppp-root[data-embedded="true"] .ppx-hero.is-embedded h1{font-size:clamp(2.25rem,10.5vw,3.5rem);}
}
.miniapp-webview .ppp-scrim{align-items:flex-start;overflow-y:auto;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;}
@media (max-width:820px){
  .miniapp-webview .ppp-scrim{padding:0;}
  .miniapp-webview .ppp-modal{height:auto;min-height:100dvh;max-height:none;overflow:visible;}
  .miniapp-webview .ppp-mbody{overflow:visible;}
}
@media (prefers-reduced-motion:reduce){.ppp-card,.ppp-newbtn,.ppp-chip,.ppp-art,.ppp-arrow,.ppx-scope-track button{transition:none;}.ppp-scrim,.ppp-modal,.ppx-skeleton-cover,.ppx-skeleton-line{animation:none;}.ppp-live-dot{animation:none;}}

/* ===== share poster ===== */
.ppp-poster-scrim{position:fixed;inset:0;z-index:220;background:rgba(12,10,18,0.66);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:28px;animation:pppfade .2s var(--ease);}
.ppp-poster-modal{position:relative;width:min(100%,940px);max-height:92vh;overflow:auto;background:#fff7f8;color:#23151a;border:1px solid rgba(255,36,66,0.24);border-radius:8px;box-shadow:0 36px 100px rgba(45,20,28,0.32);display:grid;grid-template-columns:minmax(390px,1fr) 292px;gap:22px;padding:24px;}
.ppp-poster-close{position:absolute;right:14px;top:14px;z-index:4;width:34px;height:34px;border:1px solid rgba(35,21,26,0.12);border-radius:6px;background:rgba(255,255,255,0.82);color:#23151a;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 18px rgba(45,20,28,0.08);}
.ppp-poster-preview{display:flex;justify-content:center;align-items:flex-start;min-width:0;padding:8px 0;}
.ppp-poster-card{width:360px;height:480px;overflow:hidden;background:#fffaf4;border-radius:8px;box-shadow:0 18px 48px rgba(45,20,28,0.22);font-family:"Noto Serif SC","Songti SC",Georgia,serif;position:relative;border:1px solid rgba(255,36,66,0.12);display:flex;flex-direction:column;}
.ppp-poster-card,.ppp-poster-card *{box-sizing:border-box;}
.ppp-poster-cover{flex:0 0 174px;position:relative;overflow:hidden;background:#f1f5f9;}
.ppp-poster-cover::after{content:none;}
.ppp-poster-cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.ppp-poster-cover-fallback{position:absolute;inset:0;display:grid;place-items:center;background:
  radial-gradient(circle at 70% 22%,rgba(255,36,66,0.22),transparent 30%),linear-gradient(135deg,#ffe1e7 0%,#ffffff 42%,#d8f7ee 100%);}
.ppp-poster-cover-fallback span{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:#ff2442;color:#fff;font-size:44px;font-weight:900;box-shadow:0 18px 32px rgba(255,36,66,0.24);}
.ppp-poster-topbar{position:absolute;left:14px;right:14px;top:13px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.ppp-poster-site{display:flex;align-items:center;gap:7px;min-width:0;background:rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.74);border-radius:999px;padding:5px 10px 5px 6px;box-shadow:0 8px 18px rgba(35,21,26,0.12);}
.ppp-poster-site img{width:25px;height:25px;object-fit:contain;flex:none;}
.ppp-poster-site div{display:flex;flex-direction:column;gap:1px;min-width:0;}
.ppp-poster-site strong{font:900 10px/1 var(--body);color:#23151a;white-space:nowrap;}
.ppp-poster-site span{font:800 8px/1 var(--body);letter-spacing:.05em;color:#ff2442;white-space:nowrap;}
.ppp-poster-badge{flex:none;background:#ff2442;color:#fff;border-radius:999px;padding:7px 10px;font:900 10px/1 var(--body);box-shadow:0 9px 18px rgba(255,36,66,0.28);}
.ppp-poster-main{flex:1;min-height:0;padding:14px 18px;display:flex;flex-direction:column;background:
  linear-gradient(180deg,#fffaf4 0%,#fff 46%,#f5fff9 100%);}
.ppp-poster-title-block{min-height:102px;}
.ppp-poster-kicker{font:900 10px/1 var(--body);letter-spacing:.08em;color:#ff2442;margin-bottom:7px;}
.ppp-poster-event{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:5px;margin-bottom:7px;color:#477b24;font:900 9px/1.2 var(--body);}
.ppp-poster-event span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ppp-poster-event strong{padding:4px 6px;border-radius:5px;background:#e9f8d5;color:#315f18;white-space:nowrap;font-size:8px;}
.ppp-poster-title{margin:0;color:#23151a;font-size:26px;line-height:1.08;font-weight:900;letter-spacing:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.ppp-poster-intro{margin:8px 0 0;color:#5d4850;font:700 12.2px/1.5 var(--body);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.ppp-poster-meta-row{display:flex;align-items:center;gap:12px;border-top:1px solid rgba(35,21,26,0.1);border-bottom:1px solid rgba(35,21,26,0.1);padding:8px 0;margin-top:2px;}
.ppp-poster-owner{display:flex;align-items:center;gap:9px;min-width:0;flex:1;}
.ppp-poster-avatar{width:35px;height:35px;border-radius:50%;display:grid;place-items:center;background:#ff2442;color:#fff;font:900 14px/1 var(--body);flex:none;overflow:hidden;border:2px solid #fff;box-shadow:0 8px 16px rgba(45,20,28,0.12);}
.ppp-poster-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
.ppp-poster-avatar span{display:grid;place-items:center;width:100%;height:100%;}
.ppp-poster-owner-text{min-width:0;display:flex;flex-direction:column;gap:2px;}
.ppp-poster-owner-text span{font:800 9px/1 var(--body);color:#a16f7b;}
.ppp-poster-owner-text strong{font:900 12px/1.2 var(--body);color:#23151a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:124px;}
.ppp-poster-stats{display:flex;align-items:center;gap:8px;flex:none;}
.ppp-poster-stats div{display:flex;flex-direction:column;align-items:flex-end;gap:1px;}
.ppp-poster-stats strong{font:900 14px/1 var(--body);color:#23151a;}
.ppp-poster-stats span{font:800 8px/1 var(--body);color:#a16f7b;}
.ppp-poster-tags{display:flex;flex-wrap:nowrap;gap:6px;margin-top:8px;min-height:23px;max-height:23px;overflow:hidden;}
.ppp-poster-tag{display:inline-flex;align-items:center;height:23px;border-radius:999px;padding:0 9px;font:900 10px/1 var(--body);border:1px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:86px;}
.ppp-poster-tag.status{background:#23151a;color:#fff;}
.ppp-poster-tag.tech{background:#eafff6;color:#087457;border-color:#a7f3d0;}
.ppp-poster-tag.need{background:#fff0f3;color:#e11d48;border-color:#fecdd3;}
.ppp-poster-footer{display:flex;align-items:center;gap:9px;margin-top:auto;padding-top:8px;border-top:1px dashed rgba(35,21,26,0.14);}
.ppp-poster-footer-brand{width:32px;height:32px;border-radius:8px;background:#fff;display:grid;place-items:center;box-shadow:0 8px 18px rgba(45,20,28,0.08);border:1px solid rgba(35,21,26,0.1);flex:none;}
.ppp-poster-footer-brand img{width:26px;height:26px;object-fit:contain;}
.ppp-poster-cta{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;}
.ppp-poster-cta em{font:900 9px/1 var(--body);letter-spacing:.05em;color:#ff2442;font-style:normal;}
.ppp-poster-cta strong{font:900 13px/1.1 var(--body);color:#23151a;}
.ppp-poster-cta span{font:800 9.5px/1.22 var(--body);color:#7c5b64;max-width:170px;}
.ppp-poster-qr{width:64px;height:64px;background:#fff;border:1px solid rgba(35,21,26,0.12);border-radius:6px;padding:5px;display:grid;place-items:center;box-shadow:0 8px 18px rgba(45,20,28,0.08);flex:none;}
.ppp-poster-qr img{width:100%;height:100%;display:block;}
.ppp-poster-qr span{width:44px;height:44px;border-radius:6px;background:#f1e4e8;display:block;}
.ppp-poster-side{display:flex;flex-direction:column;padding:26px 8px 8px;min-width:0;}
.ppp-poster-side-kicker{font-size:11px;color:#ff2442;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;}
.ppp-poster-side h3{font-family:var(--display);font-size:25px;line-height:1.12;color:#23151a;margin:0 0 10px;font-weight:700;letter-spacing:0;}
.ppp-poster-side p{font-size:13px;line-height:1.65;color:#6f5860;margin:0 0 18px;}
.ppp-poster-actions{display:flex;flex-direction:column;gap:9px;margin-top:4px;}
.ppp-poster-actions .ppp-cbtn{width:100%;min-height:44px;}
.ppp-poster-actions .ppp-cbtn.primary{background:#ff2442;color:#fff;box-shadow:0 12px 24px rgba(255,36,66,0.22);border:1px solid #ff2442;}
.ppp-poster-actions .ppp-cbtn.ghost{background:#fff;color:#23151a;border:1px solid rgba(35,21,26,0.12);}
.ppp-poster-actions .ppp-cbtn[disabled]{opacity:.52;pointer-events:none;}
.ppp-poster-note{margin-top:auto;padding-top:18px;font-size:11.5px;line-height:1.5;color:#8f6f78;}

.ppp-poster-scrim[data-event="true"]{background:rgba(0,4,2,.88);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-modal{background:#030806;color:#f7f8f2;border-color:rgba(185,255,24,.34);box-shadow:0 36px 110px rgba(0,0,0,.68);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-close{background:#0a120d;color:#f7f8f2;border-color:rgba(185,255,24,.34);box-shadow:none;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-card{background:#07100b;border-color:rgba(185,255,24,.36);box-shadow:0 22px 58px rgba(0,0,0,.52);font-family:HarmonyOS Sans SC,MiSans,Inter,system-ui,sans-serif;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),transparent 45%,rgba(3,8,6,.62));pointer-events:none;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-cover-fallback{background:radial-gradient(circle at 72% 20%,rgba(185,255,24,.26),transparent 34%),linear-gradient(135deg,#07100b,#102619);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-cover-fallback span{border-radius:5px;background:#b9ff18;color:#071006;box-shadow:0 18px 34px rgba(185,255,24,.18);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-site{background:rgba(3,8,6,.9);border-color:rgba(185,255,24,.45);border-radius:5px;box-shadow:none;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-site strong{color:#f7f8f2;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-site span{color:#b9ff18;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-badge{background:#b9ff18;color:#071006;border-radius:4px;box-shadow:none;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-main{background:linear-gradient(180deg,#07100b 0%,#0a160e 100%);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-event{color:#b9ff18;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-event strong{background:#b9ff18;color:#071006;border-radius:3px;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-title{color:#f7f8f2;letter-spacing:-.035em;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-intro{color:#b8c2ba;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-meta-row{border-color:rgba(185,255,24,.2);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-avatar{background:#b9ff18;color:#071006;border-color:#b9ff18;border-radius:4px;box-shadow:none;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-owner-text span,.ppp-poster-scrim[data-event="true"] .ppp-poster-stats span{color:#7f9184;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-owner-text strong,.ppp-poster-scrim[data-event="true"] .ppp-poster-stats strong{color:#f7f8f2;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-tag{border-radius:4px;background:transparent;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-tag.need{color:#d7ff80;border-color:rgba(185,255,24,.46);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-tag.tech{color:#99f6e4;border-color:rgba(45,212,191,.4);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-footer{border-color:rgba(185,255,24,.32);}
.ppp-poster-scrim[data-event="true"] .ppp-poster-footer-brand{background:#f7f8f2;border-color:#b9ff18;border-radius:4px;box-shadow:none;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-cta em{color:#b9ff18;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-cta strong{color:#f7f8f2;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-cta span{color:#8fa096;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-qr{border-color:#b9ff18;border-radius:4px;box-shadow:none;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-side-kicker{color:#b9ff18;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-side h3{color:#f7f8f2;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-side p,.ppp-poster-scrim[data-event="true"] .ppp-poster-note{color:#91a096;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-actions .ppp-cbtn.primary{background:#b9ff18;color:#071006;border-color:#b9ff18;box-shadow:none;}
.ppp-poster-scrim[data-event="true"] .ppp-poster-actions .ppp-cbtn.ghost{background:#07100b;color:#f7f8f2;border-color:rgba(185,255,24,.3);}

@media (max-width:820px){
  .ppp-poster-scrim{padding:14px;}
  .ppp-poster-modal{grid-template-columns:1fr;width:100%;max-height:94vh;padding:18px 14px;gap:12px;}
  .ppp-poster-preview{padding-top:26px;}
  .ppp-poster-card{width:300px;height:400px;}
  .ppp-poster-cover{flex-basis:146px;}
  .ppp-poster-main{padding:11px 14px 12px;}
  .ppp-poster-title-block{min-height:84px;}
  .ppp-poster-site img{width:21px;height:21px;}
  .ppp-poster-site strong{font-size:8.5px;}
  .ppp-poster-site span{font-size:7px;}
  .ppp-poster-badge{font-size:8.5px;padding:6px 8px;}
  .ppp-poster-title{font-size:22px;}
  .ppp-poster-intro{font-size:10.8px;margin-top:6px;}
  .ppp-poster-meta-row{padding:7px 0;gap:8px;}
  .ppp-poster-avatar{width:29px;height:29px;font-size:11px;}
  .ppp-poster-owner-text strong{max-width:98px;font-size:10.5px;}
  .ppp-poster-stats{gap:6px;}
  .ppp-poster-stats strong{font-size:11px;}
  .ppp-poster-stats span{font-size:7px;}
  .ppp-poster-tags{gap:5px;margin-top:7px;min-height:19px;max-height:19px;}
  .ppp-poster-tag{height:19px;font-size:8.5px;padding:0 7px;max-width:70px;}
  .ppp-poster-footer{gap:7px;padding-top:7px;}
  .ppp-poster-footer-brand{width:27px;height:27px;}
  .ppp-poster-footer-brand img{width:22px;height:22px;}
  .ppp-poster-cta strong{font-size:11px;}
  .ppp-poster-cta span{font-size:8px;max-width:132px;}
  .ppp-poster-qr{width:52px;height:52px;padding:4px;}
  .ppp-poster-side{padding:0 4px 4px;}
}
`;
