---
openspec-change: mobile-me-and-news-fullscreen
created: 2026-04-17
---

# Plan: 移动端 "我的" 分流 + 新闻入口全屏化

## Overview

修两条移动端 UX 真实坑：
1. `MobileNavbar.jsx:27` 未登录态硬编码 `/me` → 404。改为 dispatch `open-auth-modal` 事件，触发全站 AuthModal。
2. `AICommunity.jsx:160-194` 新闻入口 bottom-sheet 抽屉 → 改为全屏覆盖 modal，右上角 X + `useBackClose` 返回键关闭。

**关键前置发现（/plan 阶段已验证）：**
- AuthContext **不**暴露 `openAuthModal`，但 `Navbar.jsx:159-163` 已监听 `window` 上的 `"open-auth-modal"` 自定义事件，Navbar 在移动端仍挂载（仅内部 DOM 用 `md:hidden` 隐藏），AuthModal 组件始终在 DOM 中可唤起 → **不改 AuthContext**，MobileNavbar 直接 dispatch 事件。
- `useBackClose(isOpen, onClose)` 签名是 **两参**，内部用 `useId()` 生成唯一 hash；不需要传 key。已内置 `setTimeout(0)` 防 StrictMode double-mount race。
- `AICommunity` 的 `isMobileNewsOpen` state 已经支持深链（`searchParams.get('news')` → `setIsMobileNewsOpen(true)`）。

## Files

### Modify
- `src/components/MobileNavbar.jsx` — "我的" 分流（Link vs button）
- `src/components/AICommunity.jsx` — 新闻 drawer → 全屏 modal + useBackClose

### Test (手动 E2E)
- Chrome DevTools iPhone 16 Pro 预设
- StrictMode dev 环境（`<React.StrictMode>` 已在 `src/main.jsx`）
- iOS Safari 响应式设计模式（100dvh 兼容性）

### NOT Create
- ❌ 不新建 `/me` 路由页
- ❌ 不改 `AuthContext.jsx`（用 window event 绕开）
- ❌ 不改 `CommunityNewsRail.jsx` 内部结构
- ❌ 不改桌面 `Navbar.jsx`

## Rollback

动工前打 tag `pre-mobile-ux-v1`。改动全在前端且无 DB 迁移，回滚即 `git reset --hard pre-mobile-ux-v1`。

---

## Task 0: Rollback Checkpoint

### Step 0.1: 工作区确认 + 打 tag

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
git status                              # 应该是 clean，或明确待 commit 的改动
git tag pre-mobile-ux-v1               # 打锚点
git tag | grep pre-mobile-ux-v1        # 验证 tag 存在
```

若工作区非 clean：先 `git stash` 或 commit，参考上一轮 `unify-notification-content` 的 Task 0 流程。

---

## Task 1: MobileNavbar "我的" 分流

**Files**:
- Modify: `src/components/MobileNavbar.jsx`

### Step 1.1: `navItems` path 去硬编码 `/me`

**File**: `src/components/MobileNavbar.jsx:22-28`

**替换前（line 22-28）：**
```jsx
const navItems = [
  { key: "home", path: "/", icon: Home, label: t("nav.home", "首页") },
  { key: "events", path: "/events", icon: Calendar, label: t("nav.events", "活动") },
  { key: "articles", path: "/articles", icon: FileText, label: t("nav.articles", "AI社区") },
  { key: "music", path: "/music", icon: Music, label: t("nav.music", "播客") },
  { key: "me", path: user ? `/user/${user.id}` : "/me", icon: UserCircle, label: t("nav.profile", "我的") },
];
```

**替换后：**
```jsx
const navItems = [
  { key: "home", path: "/", icon: Home, label: t("nav.home", "首页") },
  { key: "events", path: "/events", icon: Calendar, label: t("nav.events", "活动") },
  { key: "articles", path: "/articles", icon: FileText, label: t("nav.articles", "AI社区") },
  { key: "music", path: "/music", icon: Music, label: t("nav.music", "播客") },
  { key: "me", path: user ? `/user/${user.id}` : null, icon: UserCircle, label: t("nav.profile", "我的") },
];
```

### Step 1.2: `isItemActive` 去掉 `/me` 分支

**File**: `src/components/MobileNavbar.jsx:30-35`

**替换前：**
```jsx
const isItemActive = (path, key) => {
  if (key === "me") {
    return location.pathname === "/me" || location.pathname.startsWith("/user/");
  }
  return location.pathname === path;
};
```

**替换后：**
```jsx
const isItemActive = (path, key) => {
  if (key === "me") {
    return location.pathname.startsWith("/user/");
  }
  return location.pathname === path;
};
```

### Step 1.3: 渲染侧条件分支 Link vs button

**File**: `src/components/MobileNavbar.jsx:47-70`（`navItems.map` 内部）

**策略**：提取内部视觉块（motion.div 内容）为一个 const，再根据 `item.key === 'me' && !user` 在外层渲染 `<button>` 而不是 `<Link>`。

**替换前（line 47-70，完整 `return (<Link ...>...</Link>)` 块）：**
```jsx
return (
  <Link
    key={item.key}
    to={item.path}
    aria-label={item.label}
    className={`relative flex flex-col items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isActive ? (isDayMode ? "text-slate-900" : "text-white") : isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`}
  >
    <motion.div
      whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
      className="flex flex-col items-center gap-1"
    >
      <div
        className={`rounded-xl p-1.5 transition-all duration-300 ${isActive ? "bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.28)]" : ""}`}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span
        className={`text-[10px] transition-all ${isActive ? "font-semibold opacity-100" : "font-medium opacity-75"}`}
      >
        {item.label}
      </span>
    </motion.div>
  </Link>
);
```

**替换后：**
```jsx
const sharedClassName = `relative flex flex-col items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isActive ? (isDayMode ? "text-slate-900" : "text-white") : isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`;

const inner = (
  <motion.div
    whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
    className="flex flex-col items-center gap-1"
  >
    <div
      className={`rounded-xl p-1.5 transition-all duration-300 ${isActive ? "bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.28)]" : ""}`}
    >
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
    </div>
    <span
      className={`text-[10px] transition-all ${isActive ? "font-semibold opacity-100" : "font-medium opacity-75"}`}
    >
      {item.label}
    </span>
  </motion.div>
);

// 未登录态的 "me" 渲染为 button，dispatch 全站 AuthModal 事件
if (item.key === "me" && !user) {
  return (
    <button
      key={item.key}
      type="button"
      aria-label={item.label}
      onClick={() => window.dispatchEvent(new Event("open-auth-modal"))}
      className={sharedClassName}
    >
      {inner}
    </button>
  );
}

return (
  <Link
    key={item.key}
    to={item.path}
    aria-label={item.label}
    className={sharedClassName}
  >
    {inner}
  </Link>
);
```

### Step 1.4: 本地验证 Task 1

- DevTools iPhone 16 Pro 预设 + 未登录（清空 localStorage 的 `token`）→ 点底部"我的" → AuthModal 弹出，URL 不变
- localStorage 塞一个 token → 重新登录 → 点"我的" → 跳 `/user/${id}`
- 键盘 Tab 到"我的" → focus-visible ring 可见（button 和 Link 两路径一致）

### Step 1.5: Commit

```bash
git add src/components/MobileNavbar.jsx
git commit -m "feat(mobile): route mobile profile tab through AuthModal when logged out

Replace hardcoded /me fallback with window 'open-auth-modal' event dispatch.
Logged-out users trigger the AuthModal instead of hitting a 404."
```

---

## Task 2: AICommunity 新闻入口全屏化

**Files**:
- Modify: `src/components/AICommunity.jsx`

### Step 2.1: 引入 useBackClose hook

**File**: `src/components/AICommunity.jsx`（顶部 import 区）

在现有 imports 附近加一行：

```jsx
import { useBackClose } from '../hooks/useBackClose';
```

### Step 2.2: 在组件体内调用 useBackClose

**File**: `src/components/AICommunity.jsx`（`isMobileNewsOpen` state 声明后，line 33 附近）

**插入位置**：`useState(false)` 之后、现有 `useEffect(() => { if (searchParams.get('news')) ... })` 之前。

```jsx
const [isMobileNewsOpen, setIsMobileNewsOpen] = useState(false);
useBackClose(isMobileNewsOpen, () => setIsMobileNewsOpen(false));
```

### Step 2.3: 重写覆盖层容器（drawer → full-screen）

**File**: `src/components/AICommunity.jsx:160-195`

**替换前（line 160-195）：**
```jsx
<AnimatePresence>
  {isMobileNewsOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[130] md:hidden ${isDayMode ? 'bg-white/65' : 'bg-black/80'} backdrop-blur-md`}
      onClick={() => setIsMobileNewsOpen(false)}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className={`absolute inset-x-0 bottom-0 max-h-[86vh] rounded-t-3xl border-t p-3 overflow-y-auto ${
          isDayMode ? 'bg-white border-slate-200' : 'bg-[#0f0f0f] border-white/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 pb-2 mb-2 flex items-center justify-between">
          <h3 className={`text-sm font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            {t('community.news_board', '新闻热榜')}
          </h3>
          <button
            type="button"
            onClick={() => setIsMobileNewsOpen(false)}
            className={`p-2 rounded-full border ${isDayMode ? 'bg-white text-slate-700 border-slate-200' : 'bg-white/5 text-white border-white/10'}`}
          >
            <X size={16} />
          </button>
        </div>
        <CommunityNewsRail />
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

**替换后：**
```jsx
<AnimatePresence>
  {isMobileNewsOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`fixed inset-0 z-[130] md:hidden overflow-y-auto ${
        isDayMode ? 'bg-white' : 'bg-[#0f0f0f]'
      }`}
      style={{ minHeight: '100vh', height: '100dvh' }}
    >
      <button
        type="button"
        aria-label={t('common.close', '关闭')}
        onClick={() => setIsMobileNewsOpen(false)}
        className={`absolute top-4 right-4 z-10 p-2 rounded-full border transition-transform hover:rotate-90 ${
          isDayMode
            ? 'bg-white text-slate-700 border-slate-200 shadow-sm'
            : 'bg-white/5 text-white border-white/10'
        }`}
      >
        <X size={24} />
      </button>
      <div className="p-3 pt-16">
        <CommunityNewsRail />
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

**关键变化总览：**
- `inset-x-0 bottom-0` + `max-h-[86vh]` + `rounded-t-3xl` → `inset-0` + `100dvh`（fallback `100vh`）
- `bg-white/65` / `bg-black/80` 半透明 + `backdrop-blur-md` → 不透明 `bg-white` / `bg-[#0f0f0f]`
- `y: '100%'` 滑入 → `opacity + scale 0.98→1` 淡入
- 删除外层 `<h3>新闻热榜</h3>` + X 的 sticky header 容器（`CommunityNewsRail` 自己有标题）
- X 按钮改为 `absolute top-4 right-4`，size 24，`p-2`（热区 ≥ 40×40）
- 删除 backdrop `onClick` 关闭 + 内层 `e.stopPropagation()`（全屏后不再需要）
- 内容外包一层 `p-3 pt-16`，避免 X 按钮压住 CommunityNewsRail 顶部

### Step 2.4: 本地验证 Task 2

- DevTools iPhone 16 Pro + 访问 `/articles` → 点"新闻热榜"入口 → 全屏覆盖，MobileNavbar 视觉消失（被 z-[130] 遮住）
- 点右上角 X → 关闭，MobileNavbar 重回
- DevTools 地址栏输入 `/articles?news=42` → 直接打开时覆盖层自动唤起（深链保留）
- 打开覆盖层后按 DevTools 的"back" 按钮（或真机硬件返回） → 关闭
- StrictMode dev 环境下打开/关闭多次 → 不出现"打开后立即自关"
- 仅一处"新闻热榜"标题（CommunityNewsRail 内部）

### Step 2.5: Commit

```bash
git add src/components/AICommunity.jsx
git commit -m "feat(mobile): convert news drawer to full-screen overlay on mobile

Replace max-h-[86vh] bottom sheet with fixed inset-0 + 100dvh full-screen
modal. Use opaque background so MobileNavbar is fully covered. Remove
duplicate outer title. X button absolute top-right (40x40 touch target).
Integrate useBackClose for hardware back button + StrictMode safety."
```

---

## Task 3: Verification（对照 openspec AC）

逐条 AC 跑通。用 DevTools iPhone 16 Pro 预设 + StrictMode dev 环境。

### AC1: 未登录点"我的" → AuthModal
- localStorage 清空 → 刷新 `/` → 底部点"我的"
- 期望：AuthModal 弹出；`location.pathname` 不变（仍 `/`）

### AC2: 已登录点"我的" → 跳 profile
- 登录成功 → 底部点"我的"
- 期望：`location.pathname === '/user/${user.id}'`；PublicProfile 渲染

### AC3: 登录成功后无缝衔接
- 从 AC1 状态在弹窗内完成登录 → AuthModal 关闭 → 再点"我的"
- 期望：走 `/user/${user.id}` 分支

### AC4: 新闻全屏覆盖
- 访问 `/articles` → 点"新闻热榜"入口
- 期望：全屏不透明覆盖；底部 MobileNavbar 视觉不可见；右上角可见 X；覆盖层显示 `CommunityNewsRail` 内容

### AC5: X 关闭 + URL 清理
- 从 AC4 状态点 X
- 期望：覆盖层关闭；URL 无 `news=` 残留（现有 `updateParams({ tab: currentTab })` 路径已处理）

### AC6: 硬件返回关闭
- 从 AC4 状态按 DevTools 的 back 按钮（或移动真机硬件返回）
- 期望：行为同 AC5（关覆盖层，不回上页）

### AC7: StrictMode double-mount safety
- dev 环境（StrictMode 已启用）
- 期望：打开覆盖层后保持打开，不自关

### AC8: 深链打开
- 直接访问 `/articles?news=123`
- 期望：页面加载完即自动打开覆盖层（现有 `useEffect` 已处理）

### AC9: 标题唯一
- 打开覆盖层
- 期望：视觉上只有 1 处"新闻热榜"标题（来自 `CommunityNewsRail` 内部 `Newspaper` icon 旁）

---

## Execution Strategy

**路由推荐**：**Direct（当前会话直接做）**

- 文件数：2（核心）
- 任务线性依赖：Task 0 → Task 1 → Task 2 → Task 3
- 每个 Task 内部步骤之间也有依赖
- 不适合 subagent 并行（同文件不同段落的改动容易冲突）
- 不需要 worktree（改动小、可控）

单会话顺序执行，每个 Task 完成后立即 commit + 更新 `openspec/changes/mobile-me-and-news-fullscreen/tasks.md` 把对应 checkbox 打钩。
