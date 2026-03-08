## Context

`UploadModal.jsx` 中的 `handleParseWeChat` 函数在解析成功后，将 LLM 返回的字段逐一映射到表单状态（title、date、location 等），但没有处理 `eventLink`。用户输入的微信 URL 存在 `wechatUrl` 状态中，解析完成后该值仍然可用，只是没有被用来填充 `eventLink`。

## Goals / Non-Goals

**Goals:**
- 解析成功后，若 `eventLink` 为空，自动将 `wechatUrl` 填入
- 清除解析数据时，同步清空 `eventLink`

**Non-Goals:**
- 不修改后端或 API
- 不改变 LLM prompt 或解析逻辑
- 不在 `eventLink` 已有值时覆盖

## Decisions

**在前端 `handleParseWeChat` 中直接回填，而非后端返回 link 字段**

原始 URL 在前端已经存在（`wechatUrl` state），无需后端参与。后端返回的是解析出的活动信息，原始来源 URL 属于前端上下文，由前端负责回填更合理，也避免了后端改动。

## Risks / Trade-offs

- [风险] 用户可能不希望活动链接被自动填入 → 通过"仅在字段为空时填入"的条件规避，不覆盖已有值
- [风险] 微信 URL 可能含有追踪参数 → 后端已有 `cleanWeChatUrl` 处理，但前端回填的是用户原始输入；可接受，用户可手动修改
