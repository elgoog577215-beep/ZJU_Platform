# 仓库协作指南

本文描述当前权限下可以执行的仓库协作方式。它不假设已经拥有 GitHub branch protection、必需检查或生产发布规则修改权限。

## 分支用途

- `master`：实际生产分支。推送到 `origin/master` 会触发生产部署，应视为高风险操作。
- `propose/*`：治理方案、架构方案、流程设计和迁移计划。该类分支不承担生产发布职责。
- `feat/*`：普通功能开发或非紧急修复。
- `hotfix/*`：线上紧急修复，要求最小改动、定向验证和明确回滚方式。
- `develop`、`release/*`：未来可选目标。当前没有正式启用，不作为必须流程。

## 当前可执行流程

### 治理或架构提案

```bash
git fetch origin master
git switch -c propose/<topic> origin/master
```

适合存放文档、流程草案、CI 调整草案和后续升级路线。提案分支可以推送到远端用于讨论，但不直接合入生产。

### 普通功能开发

```bash
git fetch origin master
git switch -c feat/<topic> origin/master
```

提交前检查：

```bash
git status --short --branch
git diff --name-only origin/master...HEAD
```

只 stage 当前任务文件，不使用 `git add -A` 扫入无关改动。涉及前端、后端、i18n、部署或数据时，先运行对应验证再提交。

### 紧急生产修复

```bash
git fetch origin master
git switch -c hotfix/<incident> origin/master
```

`hotfix/*` 分支只放线上问题的最小修复。提交说明必须写清：

- 修复了什么线上风险。
- 运行了哪些定向验证。
- 如果异常，如何回滚。

## CI 注意事项

当前提案分支中的 `.github/workflows/ci-cd.yml` 是质量检查草案，不包含生产部署，也不监听 `propose/**` push。

当前触发范围：

- 手动运行：`workflow_dispatch`
- PR 目标分支：`master`、`develop`
- push 分支：`feat/**`、`hotfix/**`

如果推送 `propose/*` 后 GitHub Actions 仍然出现运行，先手动取消该运行，再检查 workflow 触发条件是否被其他文件或远端默认分支规则影响。取消前不要继续追加提交，以免重复排队。

## 提交与推送边界

- 提交信息使用 Conventional Commits，例如 `docs: 更新仓库协作指南`。
- 推送前确认当前分支不是 `master`，除非本轮明确就是生产发布。
- 如果当前分支已有他人或历史未推送提交，推送会一并带上这些提交；最终汇报必须说明实际推送范围。
- 不强推、不重写 `master` 历史、不删除或覆盖未确认的用户改动。

## 未来升级

获得仓库权限后，再逐步推进：

- 保护 `master`。
- 禁止直接 push 到 `master`。
- 要求 PR review。
- 要求关键 CI check 通过。
- 建立发布 tag 和 release note。
- 统一生产部署、质量检查和回滚记录。
