## Why

活动页已经提供了搜索、标签和多维筛选，但当活动数量变多、标签体系变杂时，用户仍然需要自己把模糊需求翻译成一组具体筛选条件。这让“我想找适合我的活动”这件事依旧偏费劲，尤其是在用户只知道大概偏好而不知道该点哪些筛选项的时候。

现在需要一个足够轻、足够稳的活动 AI 助手，帮助用户用自然语言表达需求，并快速看到少量相关活动。这个能力应优先降低筛选门槛，而不是引入一个开放式、权限过大的聊天 agent。

## What Changes

- 在活动页面新增一个轻量 AI 助手入口，支持用户用自然语言描述活动需求。
- 新增受限推荐流程：系统先构建默认候选池，再让 AI 在候选池摘要内进行理解、澄清和推荐，而不是直接访问全量活动内容。
- 助手默认仅面向公开、未删除、未开始的活动进行推荐；当默认候选池为空时，明确告知当前暂无未开始活动。
- 助手在必要时最多进行一轮澄清，再返回 3-5 个推荐活动，并为每个结果提供简短理由。
- 用户只有在继续追问时，助手才可放宽范围，进一步查看进行中或历史已结束活动。
- 推荐结果需要与现有活动详情交互衔接，支持用户点开活动详情继续判断。

## Capabilities

### New Capabilities
- `event-ai-assistant`: Provide a lightweight natural-language recommendation assistant for the events page using a restricted candidate pool, one-turn clarification, and short recommendation reasons.

### Modified Capabilities
- None.

## Impact

- Affected frontend area: [src/components/Events.jsx](/Users/littlefairy/projects/sqtp1/ZJU_Platform/src/components/Events.jsx) and related activity-page UI components.
- Likely affected backend area: event query / recommendation endpoints under [server/src/routes/api.js](/Users/littlefairy/projects/sqtp1/ZJU_Platform/server/src/routes/api.js) and event data access in [server/src/controllers/resourceController.js](/Users/littlefairy/projects/sqtp1/ZJU_Platform/server/src/controllers/resourceController.js).
- AI integration should reuse the existing server-side LLM configuration pattern rather than granting the frontend direct model access.
- Security-sensitive areas include candidate-pool scoping, prompt-injection resistance from activity content, and preserving visibility boundaries for approved/public events only.
