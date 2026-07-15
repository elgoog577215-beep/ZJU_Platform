# 仓库治理提案：在不改 master 生产结构前提下沉淀协作架构

## 背景与目标

当前 `master` 是实际生产分支，推送到 `origin/master` 会触发 `.github/workflows/deploy.yml` 的生产部署。我们暂时没有权限修改 GitHub branch protection，也不应重写 `master` 历史或调整生产分支架构。因此，本提案先通过独立 `propose/*` 分支沉淀治理目标和当前可执行的协作方式，不影响生产发布。

本轮目标不是马上改变仓库规则，而是建立一个可讨论、可迭代、可回溯的目标架构：

- 把生产事实源继续留在 `master`。
- 把仓库治理目标放入 `propose/master-governance-architecture`。
- 把普通功能开发继续放在 `feat/*`。
- 把紧急生产修复识别为 `hotfix/*`。
- 在获得权限前，不通过文档假装已经启用保护规则、必需检查或发布流程。

## 当前约束

当前仓库存在以下客观约束和风险点：

- `master` 同时承担生产发布、日常开发合入、协作同步和历史记录职责，边界较混杂。
- `.github/workflows/deploy.yml` 监听 `master`，是真实生产部署入口；任何直接进入 `origin/master` 的提交都可能触发生产部署。
- `.github/workflows/ci-cd.yml` 仍保留 `main`、`develop`、`release` 等模板化入口，与当前生产分支事实不一致，不能作为当前有效治理规则理解。
- 本地曾出现功能分支直接 tracking `origin/master` 的情况，容易造成“功能分支”和“生产分支”语义混淆。
- 仓库缺少稳定发布 tag，线上版本回溯主要依赖提交历史和 Actions 记录。
- 当前没有权限启用或修改 GitHub branch protection，因此不能依赖“禁止直接 push”“必需 PR review”“必需 CI check”等平台强约束。

在这些约束下，本提案遵守三条边界：

- 不改 `.github/workflows/deploy.yml`，避免误触生产部署机制。
- 不强推、不重写 `master` 历史、不迁移生产分支。
- 不把未来希望启用的权限型规则写成当前已经生效的规则。

## 可实现方案

### 1. 使用 propose 分支承载治理目标

`propose/*` 分支只用于架构、流程、治理、迁移方案和风险说明。它不承担生产发布职责，也不直接改变部署入口。

当前提案分支：

```text
propose/master-governance-architecture
```

该分支的作用是：

- 保存当前仓库治理问题画像。
- 保存权限受限阶段的可执行协作方式。
- 保存未来获得权限后的升级路线。
- 作为后续 PR、讨论或评审的统一上下文。

### 2. 保持 master 为生产事实源

在权限和生产架构没有变化前，`master` 继续是唯一生产事实源。任何会进入 `master` 的改动都应被视为可能触发生产部署。

因此，当前阶段不建议把实验性治理、CI 重构、发布策略草稿或大范围流程调整直接提交到 `master`。

### 3. 功能开发继续使用 feat 分支

普通功能和修复仍使用 `feat/*` 或更具体的主题分支。分支应尽量从最新 `origin/master` 或团队约定的当前基点拉出，但不要把功能分支的语义写成生产分支语义。

建议命名：

```text
feat/wechat-mp-daily-ingest
feat/security-upload-registration-hardening
feat/project-ui
```

每个功能分支至少应在提交前确认：

- 当前分支名不是 `master`。
- `git status --short --branch` 中没有无关改动。
- stage 范围只包含当前任务相关文件。
- 涉及前端、后端、i18n、部署或数据库时已运行对应检查。

### 4. 生产紧急修复使用 hotfix 分支

线上紧急修复建议使用 `hotfix/*` 命名，明确其目标是最小化修复生产问题，而不是夹带普通功能。

建议命名：

```text
hotfix/production-health-check
hotfix/wechat-ingest-deploy-error
```

当前没有 branch protection 时，`hotfix/*` 的主要约束来自团队自律：

- 只包含修复线上问题所需的最小改动。
- 提交前运行与问题直接相关的验证。
- 合入或推送前明确说明风险、验证结果和回滚方式。

## 推荐工作流

### 治理提案

```text
origin/master
  -> propose/master-governance-architecture
  -> docs/architecture/repository-governance-proposal.md
```

适用场景：

- 仓库治理方案。
- CI/CD 整理方案。
- 分支协作约定。
- 发布与回滚策略。
- 权限受限阶段的过渡方案。

### 普通功能开发

```text
origin/master
  -> feat/<topic>
  -> 验证
  -> 提交
  -> 推送到 origin/feat/<topic>
```

当前阶段如果需要合入生产，应单独确认合入方式、验证状态和生产影响，不默认把功能分支直接等同于可发布版本。

### 紧急生产修复

```text
origin/master
  -> hotfix/<incident-or-risk>
  -> 最小修复
  -> 定向验证
  -> 明确回滚方式
  -> 再考虑进入 master
```

如果后续获得权限，应将 `hotfix/*` 也纳入 PR 和必需检查；在获得权限前，至少通过文档和人工检查保持边界。

## 已落地的当前权限内改动

本提案分支已经先落地不依赖 GitHub 仓库管理权限的部分：

- 将 `.github/workflows/ci-cd.yml` 从旧模板整理为质量检查草案，移除 Docker 发布、占位部署、Slack 通知和关键步骤的 `continue-on-error`。
- 新的质量检查草案统一使用 Node 20，执行依赖安装、lint、前端构建、启动 chunk 检查和平台基础测试。
- 新的质量检查草案不监听 `propose/**` push，避免治理提案分支推送时启动 CI。
- 新增 `docs/guides/repository-collaboration-guide.md`，把当前可执行的 `propose/*`、`feat/*`、`hotfix/*` 工作流写成开发者操作指南。
- 更新 `docs/README.md`，明确 `docs/architecture/` 用于长期架构说明与治理提案。

这些改动都只存在于 `propose/master-governance-architecture` 分支。它们不是已经在 `master` 生效的仓库规则。

## 未来目标

以下目标只有在获得 GitHub 仓库权限、团队确认发布方式，并完成 CI 清理后再推进：

- 为 `master` 启用 branch protection。
- 禁止直接 push 到 `master`。
- 要求 PR review 后才能合入 `master`。
- 要求关键 CI check 通过后才能合入。
- 统一 CI/CD：让质量检查覆盖真实分支模型，移除与当前事实不一致的旧模板入口。
- 建立发布 tag 规则，例如 `prod/YYYYMMDD-HHMM` 或 `vYYYY.MM.DD.N`。
- 为生产部署保留清晰的 release note、验证记录和回滚锚点。

未来理想结构可以演进为：

```text
master        生产事实源，受保护，合入即部署
develop       日常集成分支，可选，适合多人并行开发稳定后再启用
feat/*        普通功能分支
hotfix/*      生产紧急修复分支
propose/*     架构、治理、迁移和流程提案分支
release/*     批量上线候选分支，可选
```

但在当前阶段，`develop`、`release/*` 和 branch protection 都只是未来目标，不作为已生效规则。

## 执行步骤

本提案分支的最小执行步骤：

1. 从最新生产事实源拉取基点：

   ```bash
   git fetch origin master
   ```

2. 从 `origin/master` 创建提案分支：

   ```bash
   git switch -c propose/master-governance-architecture origin/master
   ```

3. 新增治理提案文档和协作指南：

   ```text
   docs/architecture/repository-governance-proposal.md
   docs/guides/repository-collaboration-guide.md
   ```

4. 整理当前权限内可修改的质量检查草案：

   ```text
   .github/workflows/ci-cd.yml
   ```

   该 workflow 不包含生产部署，不监听 `propose/**` push。

5. 验证分支基点来自 `origin/master`：

   ```bash
   git merge-base --is-ancestor origin/master HEAD
   ```

6. 验证没有修改生产部署 workflow：

   ```bash
   git diff --name-only origin/master...HEAD
   ```

   预期不出现 `.github/workflows/deploy.yml`。

7. 提交并推送提案分支：

   ```bash
   git push -u origin propose/master-governance-architecture
   ```

## 验收标准

- `propose/master-governance-architecture` 基于最新 `origin/master` 创建。
- 本分支只修改当前权限内可落地的治理文档、协作指南和质量检查草案。
- 未修改 `.github/workflows/deploy.yml`，不会改变生产部署入口。
- 文档明确包含当前约束、可实现方案、已落地改动、未来目标和执行步骤。
- `.github/workflows/ci-cd.yml` 不监听 `propose/**` push；若推送提案分支后 GitHub Actions 意外运行，应先手动取消再排查触发条件。
- 分支已推送到 `origin/propose/master-governance-architecture`，后续可用于讨论或开 PR。
