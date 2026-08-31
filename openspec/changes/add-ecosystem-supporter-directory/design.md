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

### 3. About 以四个用户分组进入名录

About 的“资源与合作”区域使用校内支持、企业合作、资本合作、组织合作四块叙事卡片；企业合作同时容纳技术企业与行业企业，避免把同属企业侧的资源拆成两个弱入口。“查看全部支持方”进入未筛选的 `/about/partners`。名录页采用 Read 模式：首屏说明支持网络、提供四个用户分组和搜索，正文仍按五类正式数据标识具体支持方。

### 4. 支持方卡片使用渐进详情跳转

卡片首先展示名称、Logo、类别、合作方向和简短说明。存在 `profile_handle` 时进入 `/org/:handle`；没有组织主页但存在安全 `link_url` 时打开官方网站；两者都不存在时保持非链接信息卡。所有可点击卡片使用真实链接语义、键盘焦点和可理解的目标提示。

### 5. 迁移只补字段并保守回填

SQLite migration 新增 `support_category` 列并按旧 `category` 回填默认分类；已明确的行业企业和资本记录可以由幂等迁移写入正确分类。未知 enterprise 默认归为 technology_enterprise，后台可重新分类，不删除或覆盖名称、说明、Logo、链接和合作层级。

### 6. UI 延续 About 的既有视觉系统

页面使用 About 已有的冷色公共实验场视觉、主题 token 和真实 Logo。搜索、当前分组、匹配数量与恢复入口保持紧凑；四分组索引直接承担筛选，不再在正文旁重复一套分类侧栏。动效只用于首屏登记册展开与结果切换，并尊重 `prefers-reduced-motion`。

### 7. 首屏使用真实支持方登记册

名录页首屏把校内、企业、资本、组织四个分组组织成一张横向支持方登记册，每个分组显示真实数量、真实支持方名称或 Logo 预览，并可直接筛选；总量入口用于恢复全部支持方。企业分组仍显示技术企业和行业企业的合计数量。首屏视觉峰值来自真实机构阵容、清晰排版和分组之间的规模差，而不是抽象圆环、伪关系连线或巨大装饰标题。正文结果紧随登记册并在常见桌面首屏内开始出现，移动端保持同一信息顺序并改为两列分组。

### 8. 四分组卡片通过深链和共享元素进入详情

About 的校内、企业、资本、组织卡片分别进入 `/about/partners?category=college|enterprise|capital|club`，详情页以 query 作为当前展示分组真源；`enterprise` 在筛选时覆盖技术企业与行业企业。已有五类深链继续兼容。在详情内切换分组使用 replace 更新 query，避免筛选行为阻断浏览器返回 About。支持 View Transitions 的浏览器把被点击卡片与详情页对应网络节点作为同一共享元素，返回入口使用同一关系反向过渡。组件预加载保证跨路由动画不会先落到加载屏；减少动态效果、不支持 View Transitions 或低性能环境直接使用正常导航。

## Risks / Trade-offs

- [旧 enterprise 默认归入技术企业可能不完全准确] → 只作兼容默认，不覆盖其他字段；后台暴露支持方分类供运营者逐项修正。
- [支持方名录被误读为官方合作背书] → 只展示 `core_partner`，沿用已审核数据和明确合作方向，不根据 Logo、profile 或活动数量推断关系。
- [About 增加入口后首屏密度上升] → 不新增解释段落和大卡片，只在现有支持区域增加一个次级 CTA。
- [四个展示分组与五类正式数据不一一对应] → 仅在前台把两类企业合并为 `enterprise`，后台、API、条目标签和旧深链继续保留正式五类。
- [Logo 尺寸差异造成视觉跳动] → 使用固定标志容器和 `object-contain`，无 Logo 时使用名称缩写，不生成假 Logo。
- [真实 Logo 数量和比例不一致造成密度失衡] → 分组预览使用固定高度标志槽和名称回退，按真实数量自然形成密度差；不生成假 Logo，也不把预览数量误作全部数量。
- [跨路由动画在懒加载或旧浏览器中中断] → 空闲时预加载名录组件；动画仅为增强层，URL、筛选、返回和内容默认状态不依赖动画成功。
- [接口失败时空白] → 保留现有内置数据作为降级并提供刷新状态；真实空数据与加载状态分别表达。

## Migration Plan

1. 新增 `support_category` 列和索引，按旧主体类别幂等回填。
2. 后端读写和序列化支持该字段，后台表单提供五类选择。
3. 前端 helper 兼容旧响应并提供五类分组。
4. 上线 About 入口和 `/about/partners` 页面。
5. 若需回滚，移除前端入口和路由；新增列及已保存分类可保留，不影响旧代码读取。

## Open Questions

无。本轮按用户确认的四个展示分组、五类正式支持方和现有核心支持方边界实施。
