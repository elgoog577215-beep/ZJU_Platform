## ADDED Requirements

### Requirement: Event media is available inside the hackathon workspace

系统 SHALL 在浙客松赛事工作区的“赛事影像”环节展示所选赛事关联的公开图片与视频，同时 SHALL 保留 `/media`、`/gallery` 和 `/videos` 的兼容访问。

#### Scenario: Visitor opens event media stage

- **WHEN** 访问者打开 `/hackathon?event=<eventKey>&view=media`
- **THEN** 页面展示该赛事的图片直播、精选照片和公开视频
- **AND** 页面不再渲染第二套历届赛事选择器
- **AND** 最新/精选子状态使用独立 URL 参数，不覆盖工作区环节参数。

#### Scenario: Visitor opens legacy media route

- **WHEN** 访问者打开 `/media?event=<competitionSlug>`
- **THEN** 系统继续展示对应赛事影像档案
- **AND** 已有图片、视频和灯箱深链保持可访问。
