export const PROJECT_PLAZA_CSS = `
.ppp-root{position:relative;min-height:100vh;
  --display:"Noto Serif SC","Songti SC",Georgia,serif;
  --body:Inter,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  --r-card:6px;--r-control:5px;--r-chip:4px;--r-pill:5px;--ease:cubic-bezier(0.16,1,0.3,1);font-family:var(--body);}

/* ===== CYBER (赛博蓝黑 · 暗色主题) ===== */
.ppp-root[data-variant="cyber"]{
  --ink:#f1f5f9;--ink-2:rgba(226,232,240,0.86);--muted:#8aa0bd;--soft:rgba(148,163,184,0.66);
  --surface:rgba(255,255,255,0.045);--surface-2:rgba(255,255,255,0.07);--surface-soft:rgba(255,255,255,0.02);
  --border:rgba(255,255,255,0.10);--border-strong:rgba(34,211,238,0.34);
  --brand:#67e8f9;--brand-2:#22d3ee;--brand-ink:#020617;--brand-soft:rgba(34,211,238,0.13);
  --call-ink:#fecdd3;--call-soft:rgba(251,113,133,0.14);--call-border:rgba(251,113,133,0.36);--call-on:#fb7185;
  --p-idea:#94a3b8;--p-dev:#22d3ee;--p-live:#34d399;--p-pause:#fbbf24;
  --sh-sm:0 8px 22px rgba(2,6,23,0.4);--sh-lg:0 40px 90px rgba(2,6,23,0.62);
  --prog-bg:rgba(2,6,23,0.66);--prog-ink:#e2e8f0;--avborder:#0b1220;
  color:var(--ink-2);}

/* ===== PLAYFUL (活泼 · 白天主题) ===== */
.ppp-root[data-variant="playful"]{
  --ink:#171221;--ink-2:rgba(35,28,49,0.86);--muted:#6c6378;--soft:rgba(108,99,120,0.62);
  --surface:#ffffff;--surface-2:#f7f3ff;--surface-soft:#fbf9ff;
  --border:rgba(91,75,110,0.12);--border-strong:rgba(124,58,237,0.26);
  --brand:#047857;--brand-2:#059669;--brand-ink:#ffffff;--brand-soft:rgba(124,58,237,0.10);
  --call-ink:#be123c;--call-soft:#fff1f3;--call-border:rgba(244,63,94,0.28);--call-on:#f43f5e;
  --p-idea:#94a3b8;--p-dev:#7c3aed;--p-live:#10b981;--p-pause:#f59e0b;
  --sh-sm:0 8px 22px rgba(67,56,80,0.06),0 1px 2px rgba(67,56,80,0.04);--sh-lg:0 40px 90px rgba(67,56,80,0.16);
  --prog-bg:rgba(255,255,255,0.92);--prog-ink:#3a3346;--avborder:#fff;
  color:var(--ink-2);}
.ppp-root[data-variant="playful"] .ppp-brand{color:#047857;}

/* shared — page is transparent and sits on the platform's global background
   (dark = BackgroundSystem dynamic scene, day = day-ambient), like AICommunity/Events */
.ppp-wrap{position:relative;z-index:1;max-width:1240px;margin:0 auto;padding:calc(env(safe-area-inset-top) + 90px) 24px 96px;}

.ppp-ph{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.ppp-ph h1{font-family:var(--display);font-weight:600;color:var(--ink);font-size:40px;letter-spacing:-0.02em;margin:0;line-height:1.05;}
.ppp-sub{color:var(--muted);font-size:14.5px;margin-top:11px;max-width:54ch;}
.ppp-brand{font-family:var(--body);font-weight:800;font-size:15px;letter-spacing:.18em;color:var(--brand);opacity:.9;}

.ppp-toolbar{display:flex;gap:12px;align-items:center;margin:26px 0 18px;flex-wrap:wrap;}
.ppp-search{flex:1;min-width:240px;display:flex;align-items:center;gap:9px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-control);padding:0 16px;height:46px;}
.ppp-search input{flex:1;background:transparent;border:0;outline:none;color:var(--ink);font-family:var(--body);font-size:14px;height:100%;}
.ppp-search input::placeholder{color:var(--soft);}
.ppp-newbtn{display:inline-flex;align-items:center;gap:8px;color:#020617;border:0;cursor:pointer;font-family:var(--body);
  padding:0 20px;height:46px;border-radius:var(--r-control);font-size:14.5px;font-weight:700;white-space:nowrap;
  background:#67e8f9;box-shadow:0 12px 28px rgba(34,211,238,0.22);transition:transform .18s var(--ease);}
.ppp-root[data-variant="playful"] .ppp-newbtn{background:#ecfdf5;color:#047857;border:1px solid rgba(16,185,129,0.45);box-shadow:0 12px 28px rgba(16,185,129,0.18);}
.ppp-newbtn:hover{transform:translateY(-2px);}

.ppp-filters{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-bottom:26px;}
.ppp-flabel{font-size:12.5px;color:var(--soft);margin-right:3px;}
.ppp-chip{font-size:13px;color:var(--ink-2);background:var(--surface);border:1px solid var(--border);padding:7px 14px;border-radius:var(--r-pill);cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .16s var(--ease);}
.ppp-chip:hover{border-color:var(--border-strong);}
.ppp-chip.on{background:var(--brand);border-color:var(--brand);color:var(--brand-ink);}
.ppp-chip.call.on{background:var(--call-on);border-color:var(--call-on);color:#fff;}
.ppp-cdot{width:7px;height:7px;border-radius:50%;}
.ppp-sep{width:1px;height:22px;background:var(--border);margin:0 5px;}

.ppp-empty{text-align:center;color:var(--muted);font-size:15px;padding:80px 20px;display:flex;flex-direction:column;align-items:center;}
.ppp-empty-emoji{font-size:40px;margin-bottom:12px;}

.ppp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}

.ppp-card{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-card);overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--sh-sm);cursor:pointer;transition:transform .22s var(--ease),box-shadow .22s var(--ease),border-color .22s var(--ease);}
.ppp-card:hover{transform:translateY(-4px);box-shadow:var(--sh-lg);border-color:var(--border-strong);}
.ppp-cover{position:relative;aspect-ratio:16/10;overflow:hidden;background:#0b1220;}
.ppp-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.ppp-noart{display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:28px;color:var(--soft);background:var(--surface-2);}
.ppp-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,6,23,0.05) 40%,rgba(2,6,23,0.5));pointer-events:none;}
.ppp-prog{position:absolute;right:12px;top:12px;z-index:3;display:inline-flex;align-items:center;gap:7px;background:var(--prog-bg);backdrop-filter:blur(8px);color:var(--prog-ink);font-size:11.5px;font-weight:700;padding:5px 11px 5px 9px;border-radius:var(--r-pill);box-shadow:var(--sh-sm);}
.ppp-d{width:8px;height:8px;border-radius:50%;}
.ppp-photos{position:absolute;left:12px;bottom:12px;z-index:3;display:inline-flex;align-items:center;gap:5px;background:rgba(2,6,23,0.55);backdrop-filter:blur(6px);color:#fff;font-size:11px;padding:4px 9px;border-radius:var(--r-pill);font-weight:600;}

.ppp-body{padding:15px 17px 8px;flex:1;display:flex;flex-direction:column;}
.ppp-trow{display:flex;align-items:center;gap:9px;margin-bottom:6px;}
.ppp-title{font-family:var(--display);font-weight:600;color:var(--ink);font-size:20px;letter-spacing:-0.01em;line-height:1.18;margin:0;text-wrap:balance;}
.ppp-intro{font-size:13px;color:var(--ink-2);margin:0 0 12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5;}
.ppp-needs{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px;}
.ppp-need{font-size:12px;font-weight:700;color:var(--call-ink);background:var(--call-soft);border:1px solid var(--call-border);padding:4px 11px;border-radius:var(--r-chip);}
.ppp-tech{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.ppp-tag{font-size:11.5px;color:var(--muted);background:var(--surface-soft);border:1px solid var(--border);padding:3px 10px;border-radius:var(--r-chip);}
.ppp-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;}
.ppp-team{display:flex;align-items:center;gap:8px;min-width:0;}
.ppp-stack{display:flex;}
.ppp-av{width:38px;height:38px;border-radius:50%;border:2px solid var(--avborder);display:grid;place-items:center;color:#fff;font-size:14px;font-weight:700;flex:none;}
.ppp-lbl{font-size:14px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ppp-favrow{display:flex;align-items:center;gap:13px;flex:none;}
.ppp-views{font-size:15px;color:var(--soft);white-space:nowrap;}
/* FavoriteButton wrapper (events-style heart): heart color follows currentColor,
   Tailwind classes inside handle pink fill/hover; we just set base color + spacing */
.ppp-fav{color:var(--muted);border-radius:var(--r-control);padding:2px 4px;}
.ppp-fav span{font-size:15px;font-weight:600;}
.ppp-fav-modal{flex:none;border:0;padding:11px 15px;border-radius:var(--r-control);color:var(--ink-2);}

/* ===== modal ===== */
.ppp-scrim{position:fixed;inset:0;z-index:50;background:rgba(4,8,20,0.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:28px;animation:pppfade .2s var(--ease);}
@keyframes pppfade{from{opacity:0}to{opacity:1}}
.ppp-modal{position:relative;width:100%;max-width:880px;max-height:88vh;overflow:hidden;border:1px solid var(--border-strong);border-radius:var(--r-card);box-shadow:var(--sh-lg);display:grid;grid-template-columns:1fr 1.05fr;animation:ppppop .26s var(--ease);}
.ppp-root[data-variant="cyber"] .ppp-modal{background:rgba(8,14,28,0.97);backdrop-filter:blur(22px);}
.ppp-root[data-variant="playful"] .ppp-modal{background:#ffffff;}
@keyframes ppppop{from{opacity:0;transform:translateY(12px) scale(0.985)}to{opacity:1;transform:none}}
.ppp-x{position:absolute;right:14px;top:14px;z-index:6;width:34px;height:34px;border-radius:var(--r-control);border:0;cursor:pointer;background:var(--prog-bg);color:var(--prog-ink);font-size:14px;display:grid;place-items:center;backdrop-filter:blur(6px);box-shadow:var(--sh-sm);}
.ppp-mgallery{position:relative;background:#0b1220;overflow:hidden;}
.ppp-mhero{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.ppp-mgallery::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(2,6,23,0.5));pointer-events:none;}
.ppp-mthumbs{position:absolute;left:16px;right:16px;bottom:16px;display:flex;gap:8px;z-index:2;}
.ppp-t{width:56px;height:42px;border-radius:var(--r-control);border:2px solid rgba(255,255,255,0.45);overflow:hidden;cursor:pointer;padding:0;background:none;flex:none;transition:border-color .15s var(--ease);}
.ppp-t img{width:100%;height:100%;object-fit:cover;display:block;}
.ppp-t.sel{border-color:#fff;box-shadow:0 0 0 3px rgba(34,211,238,0.4);}
.ppp-mbody{padding:24px 24px 22px;display:flex;flex-direction:column;overflow:auto;}
.ppp-kicker{font-size:12px;color:var(--brand);font-weight:700;letter-spacing:.03em;margin-bottom:8px;}
.ppp-mhead{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.ppp-mtitle{font-family:var(--display);font-weight:600;color:var(--ink);font-size:28px;letter-spacing:-0.02em;margin:0;line-height:1.12;}
.ppp-mprog2{position:static;flex:none;}
.ppp-mteam{display:flex;align-items:center;gap:9px;margin:12px 0 16px;}
.ppp-mstats{display:flex;gap:22px;padding:14px 0;margin-bottom:6px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);}
.ppp-mstat{display:flex;flex-direction:column;}
.ppp-mstat b{font-family:var(--display);font-size:21px;color:var(--ink);line-height:1;}
.ppp-mstat span{font-size:11px;color:var(--soft);margin-top:5px;}
.ppp-mblock{margin-top:18px;}
.ppp-bt{font-size:11px;color:var(--soft);letter-spacing:.06em;margin-bottom:9px;text-transform:uppercase;}
.ppp-content{font-size:14px;line-height:1.72;color:var(--ink-2);}
.ppp-content p{margin:0 0 12px;}
.ppp-content p:last-child{margin-bottom:0;}
.ppp-mneed{font-size:12.5px;font-weight:700;color:var(--call-ink);background:var(--call-soft);border:1px solid var(--call-border);padding:5px 12px;border-radius:var(--r-chip);}
.ppp-mtag{font-size:12px;color:var(--ink-2);background:var(--surface-2);border:1px solid var(--border);padding:4px 11px;border-radius:var(--r-chip);}
.ppp-mcontact{display:flex;gap:9px;margin-top:22px;padding-top:18px;border-top:1px solid var(--border);position:sticky;bottom:-22px;background:inherit;}
.ppp-cbtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:12px 16px;border-radius:var(--r-control);font-size:13.5px;font-weight:700;cursor:pointer;text-decoration:none;border:0;font-family:var(--body);}
.ppp-cbtn.primary{flex:1;background:#67e8f9;color:#020617;}
.ppp-root[data-variant="playful"] .ppp-cbtn.primary{background:#ecfdf5;color:#047857;border:1px solid rgba(16,185,129,0.45);}
.ppp-cbtn.ghost{background:var(--surface);border:1px solid var(--border-strong);color:var(--brand);}
.ppp-cbtn.ghost.icon{flex:none;padding:12px 14px;}
.ppp-cbtn.ppp-disabled{opacity:.5;pointer-events:none;}

/* ===== create page ===== */
.ppp-cbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:26px;padding-bottom:18px;border-bottom:1px solid var(--border);}
.ppp-back{background:transparent;border:0;color:var(--muted);font-size:14px;font-weight:600;cursor:pointer;font-family:var(--body);padding:6px 4px;}
.ppp-back:hover{color:var(--ink);}
.ppp-ctitle{font-family:var(--display);font-size:22px;font-weight:600;color:var(--ink);}
.ppp-cactions{display:flex;gap:10px;}
.ppp-cactions .ppp-cbtn{flex:none;padding:10px 18px;}
.ppp-cactions .ppp-cbtn[disabled]{opacity:.5;pointer-events:none;}
.ppp-cgrid{display:grid;grid-template-columns:1fr 372px;gap:34px;align-items:start;}
.ppp-form{display:flex;flex-direction:column;gap:22px;min-width:0;}
.ppp-fsec{display:flex;flex-direction:column;gap:9px;}
.ppp-flab{font-size:13px;font-weight:700;color:var(--ink);display:flex;align-items:baseline;gap:8px;}
.ppp-flab span{font-size:11.5px;font-weight:400;color:var(--soft);}
.ppp-finput,.ppp-ftext{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-control);color:var(--ink);font-family:var(--body);font-size:14px;padding:12px 14px;outline:none;transition:border-color .15s var(--ease);}
.ppp-finput:focus,.ppp-ftext:focus{border-color:var(--brand);}
.ppp-finput::placeholder,.ppp-ftext::placeholder{color:var(--soft);}
.ppp-ftext{resize:vertical;line-height:1.65;min-height:130px;}
.ppp-frow{display:flex;gap:16px;}
.ppp-fhalf{flex:1;}
.ppp-uploads{display:flex;gap:12px;flex-wrap:wrap;}
.ppp-up{position:relative;width:108px;height:76px;border-radius:var(--r-control);overflow:hidden;border:1px solid var(--border);background:var(--surface-soft);}
.ppp-up img{width:100%;height:100%;object-fit:cover;}
.ppp-upadd{border:1.5px dashed var(--border-strong);background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--muted);font-size:20px;cursor:pointer;}
.ppp-upadd small{font-size:10.5px;}
.ppp-upcover{position:absolute;left:6px;bottom:6px;background:rgba(2,6,23,0.6);color:#fff;font-size:10px;padding:2px 7px;border-radius:var(--r-chip);}
.ppp-seg{display:inline-flex;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-control);padding:4px;gap:2px;}
.ppp-segbtn{display:inline-flex;align-items:center;gap:7px;background:transparent;border:0;cursor:pointer;color:var(--muted);font-family:var(--body);font-size:13px;font-weight:600;padding:8px 15px;border-radius:var(--r-chip);transition:all .15s var(--ease);}
.ppp-segbtn.on{background:var(--surface-2);color:var(--ink);}
.ppp-pick{display:flex;flex-wrap:wrap;gap:8px;}
.ppp-pchip{background:var(--surface);border:1px solid var(--border);color:var(--ink-2);font-family:var(--body);font-size:13px;font-weight:600;padding:7px 14px;border-radius:var(--r-pill);cursor:pointer;transition:all .15s var(--ease);}
.ppp-pchip.on{background:var(--call-soft);border-color:var(--call-border);color:var(--call-ink);}
.ppp-taginput{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-control);padding:9px 11px;}
.ppp-tg{display:inline-flex;align-items:center;gap:6px;background:var(--surface-2);border:1px solid var(--border);color:var(--ink-2);font-size:12.5px;padding:4px 10px;border-radius:var(--r-chip);}
.ppp-tg i{cursor:pointer;font-style:normal;color:var(--soft);}
.ppp-taginput input{flex:1;min-width:120px;background:transparent;border:0;outline:none;color:var(--ink);font-family:var(--body);font-size:13.5px;padding:4px;}
.ppp-preview{position:sticky;top:92px;display:flex;flex-direction:column;gap:10px;}
.ppp-pvlab{font-size:11px;color:var(--soft);letter-spacing:.06em;text-transform:uppercase;}
.ppp-pvcard{cursor:default;}
.ppp-pvcard:hover{transform:none;box-shadow:var(--sh-sm);}
.ppp-pvhint{font-size:11.5px;color:var(--soft);line-height:1.55;}

/* ===== share poster ===== */
.ppp-poster-scrim{position:fixed;inset:0;z-index:70;background:rgba(12,10,18,0.66);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:28px;animation:pppfade .2s var(--ease);}
.ppp-poster-modal{position:relative;width:min(100%,940px);max-height:92vh;overflow:auto;background:#fff7f8;color:#23151a;border:1px solid rgba(255,36,66,0.24);border-radius:8px;box-shadow:0 36px 100px rgba(45,20,28,0.32);display:grid;grid-template-columns:minmax(390px,1fr) 292px;gap:22px;padding:24px;}
.ppp-poster-close{position:absolute;right:14px;top:14px;z-index:4;width:34px;height:34px;border:1px solid rgba(35,21,26,0.12);border-radius:6px;background:rgba(255,255,255,0.82);color:#23151a;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 18px rgba(45,20,28,0.08);}
.ppp-poster-preview{display:flex;justify-content:center;align-items:flex-start;min-width:0;padding:8px 0;}
.ppp-poster-card{width:360px;height:480px;overflow:hidden;background:#fffaf4;border-radius:8px;box-shadow:0 18px 48px rgba(45,20,28,0.22);font-family:"Noto Serif SC","Songti SC",Georgia,serif;position:relative;border:1px solid rgba(255,36,66,0.12);display:flex;flex-direction:column;}
.ppp-poster-card,.ppp-poster-card *{box-sizing:border-box;}
.ppp-poster-cover{flex:0 0 174px;position:relative;overflow:hidden;background:#f1f5f9;}
.ppp-poster-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(35,21,26,0.06) 0%,rgba(35,21,26,0.08) 46%,rgba(35,21,26,0.46) 100%);pointer-events:none;}
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
@media (max-width:900px){.ppp-cgrid{grid-template-columns:1fr;}.ppp-preview{position:static;max-width:360px;}}

@media (max-width:820px){
  .ppp-wrap{padding:calc(env(safe-area-inset-top) + 90px) 24px calc(env(safe-area-inset-bottom) + 132px);}
  .ppp-modal{grid-template-columns:1fr;max-height:90vh;overflow:auto;}
  .ppp-mgallery{min-height:200px;height:200px;}
  .ppp-mcontact{position:static;flex-wrap:wrap;}
  .ppp-mcontact .ppp-cbtn{flex:1 1 150px;}
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
  .ppp-ph h1{font-size:32px;}
  .ppp-empty{min-height:0;margin-top:-18px;padding:11px 16px 14px;font-size:13.5px;line-height:1.45;}
  .ppp-empty-emoji{display:none;}
  .ppp-empty-action{display:none;}
}
@media (prefers-reduced-motion:reduce){.ppp-card,.ppp-newbtn,.ppp-chip{transition:none;}.ppp-scrim,.ppp-modal{animation:none;}}
`;
