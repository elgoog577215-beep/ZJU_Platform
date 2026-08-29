## Context

当前 About 的“资源与合作”区域以四个叙事卡片和部分企业 Logo 说明生态支持网络，`/profiles` 则枚举公开主体。两者不能互相替代：支持方是经过确认的合作关系，公开主体只是组织身份。现有 `ecosystem_partners` 已通过 `partner_scope` 区分核心支持方与普通活动提供方，但 `category` 同时承担 profile 主体类型和前台支持方分类，只有 `school / organization / enterprise` 三类，无法表达学院、技术企业、行业企业、资本、社团五类支持方。

## Goals / Non-Goals

**Goals:**

- 让 About 保持代表性叙事，同时提供清晰的“查看全部支持方”路径。
- 建立只展示公开核心支持方的五类名录，并呈现合作方向和可信详情入口。
- 保持支持关系、组织身份和活动主办关系各自的正式真源。
- 为后台提供可维护的支持方分类，兼容既有数据。
- 延续现有 About 的日夜主题、动效、响应式与无障碍规则。

**Non-Goals:**

- 不把 `/profiles` 改为支持方目录，也不删除通用 profile 路由。
- 不把普通活动提供方、活动主办方或存在 profile 的组织自动认定为核心支持方。
- 不在本次改造中建立多标签合作权益系统；支持内容继续使用既有 `cooperation_direction` 和说明字段表达。
- 不编造合作方 Logo、链接、合作结果或组织主页。

## Decisions

### 1. 将主体类型与支持方分类分开

`ecosystem_partners.category` 继续保存 `school / organization / enterprise`，用于同步 profile 主体类型；新增 `support_category` 保存 `college / technology_enterprise / industry_enterprise / capital / club`。这样资本机构仍可拥有 enterprise profile，学院仍可拥有 school profile，同时前台按用户理解的五类支持方组织。

备选方案是直接扩展 `category`。该方案会把 profile 类型、后台筛选和支持方目录绑在一起，迁移风险更高，因此不采用。

### 2. 核心支持关系仍由 `partner_scope` 决定

完整名录只读取 `enabled = true` 且 `partner_scope = core_partner` 的记录。`activity_provider` 继续服务活动页组织筛选，不进入支持方名录。前端兼容缺少 `support_category` 的旧响应：school 映射到 college、organization 映射到 club、enterprise 映射到 technology_enterprise。

### 3. About 是入口，名录页是次级阅读页

About 的“资源与合作”区域保留现有四块叙事和代表性 Logo，只增加一个明确的“查看全部支持方”行动，进入 `/about/partners`。新名录页采用 Read 模式：首屏说明支持网络、提供五类切换和搜索，正文按真实数据展示支持方，而不是再做一页品牌宣传。

### 4. 支持方卡片使用渐进详情跳转

卡片首先展示名称、Logo、类别、合作方向和简短说明。存在 `profile_handle` 时进入 `/org/:handle`；没有组织主页但存在安全 `link_url` 时打开官方网站；两者都不存在时保持非链接信息卡。所有可点击卡片使用真实链接语义、键盘焦点和可理解的目标提示。

### 5. 迁移只补字段并保守回填

SQLite migration 新增 `support_category` 列并按旧 `category` 回填默认分类；已明确的行业企业和资本记录可以由幂等迁移写入正确分类。未知 enterprise 默认归为 technology_enterprise，后台可重新分类，不删除或覆盖名称、说明、Logo、链接和合作层级。

### 6. UI 延续 About 的既有视觉系统

页面使用 About 已有的冷色公共实验场视觉、主题 token 和真实 Logo。目录在桌面使用左侧分类索引与右侧内容流，移动端将分类收为可横向滚动的同一层工具栏；搜索、筛选、计数在一行内尽量合并。动效仅用于入场和筛选过渡，并尊重 `prefers-reduced-motion`。

## Risks / Trade-offs

- [旧 enterprise 默认归入技术企业可能不完全准确] → 只作兼容默认，不覆盖其他字段；后台暴露支持方分类供运营者逐项修正。
- [支持方名录被误读为官方合作背书] → 只展示 `core_partner`，沿用已审核数据和明确合作方向，不根据 Logo、profile 或活动数量推断关系。
- [About 增加入口后首屏密度上升] → 不新增解释段落和大卡片，只在现有支持区域增加一个次级 CTA。
- [Logo 尺寸差异造成视觉跳动] → 使用固定标志容器和 `object-contain`，无 Logo 时使用名称缩写，不生成假 Logo。
- [接口失败时空白] → 保留现有内置数据作为降级并提供刷新状态；真实空数据与加载状态分别表达。

## Migration Plan

1. 新增 `support_category` 列和索引，按旧主体类别幂等回填。
2. 后端读写和序列化支持该字段，后台表单提供五类选择。
3. 前端 helper 兼容旧响应并提供五类分组。
4. 上线 About 入口和 `/about/partners` 页面。
5. 若需回滚，移除前端入口和路由；新增列及已保存分类可保留，不影响旧代码读取。

## Open Questions

无。本轮按用户确认的五类支持方和现有核心支持方边界实施。
