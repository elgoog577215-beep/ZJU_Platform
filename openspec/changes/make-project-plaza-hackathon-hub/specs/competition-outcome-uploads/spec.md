## MODIFIED Requirements

### Requirement: External users must submit competition outcomes for review

Authenticated non-admin users SHALL be able to submit outcome content to the selected competition, and submitted content SHALL enter the existing review flow before public display. A project work submission SHALL require an owned project, work title, author name, major, summary, GitHub or repository URL, and public consent; a ModelScope deployment URL MAY be supplied separately.

#### Scenario: External user submits stage photo

- **WHEN** an authenticated non-admin user uploads a stage photo from the public outcome page
- **THEN** the system SHALL create a `stage_photo` competition media record with `status = pending`
- **AND** the photo MUST NOT appear on the public outcome page before approval.

#### Scenario: External user submits promo video

- **WHEN** an authenticated non-admin user uploads a competition promo video from the public outcome page
- **THEN** the system SHALL create a `promo_video` competition media record with `status = pending`
- **AND** the video MUST NOT appear on the public outcome page before approval.

#### Scenario: External user submits excellent work

- **WHEN** an authenticated non-admin user submits an excellent work form
- **THEN** the system SHALL require an owned project, work title, author, major, summary, and Git URL
- **AND** SHALL store Git and deployment URLs in separate fields
- **AND** the system SHALL create a competition work record under the selected competition using the existing permission-driven review status
- **AND** the work MUST NOT appear publicly unless its status is approved and public consent is enabled.

#### Scenario: Administrator backfills historical work

- **WHEN** an administrator creates or updates a historical competition work
- **THEN** the work MAY remain without `project_id`
- **AND** the administrator MAY add major, Git URL, ModelScope deployment URL, award and rank
- **AND** the system MUST NOT infer a participant-owned project relation.

## ADDED Requirements

### Requirement: Competition work deployment evidence is public and separate

赛事作品 SHALL 将公开仓库与在线部署作为两种独立证据，并在公共序列化中只返回安全字段。

#### Scenario: Work includes ModelScope deployment

- **WHEN** 作品提交包含有效 HTTPS 魔搭社区部署链接
- **THEN** `deployment_provider` MUST 保存为 `modelscope`
- **AND** `deployment_url` MUST 保存该公开地址
- **AND** 公共作品响应 MUST 返回这两个字段

#### Scenario: Work omits deployment

- **WHEN** 作品没有可用部署链接
- **THEN** 提交 MAY 继续完成
- **AND** 系统 MUST 保持部署字段为空而不是复制 Git URL
