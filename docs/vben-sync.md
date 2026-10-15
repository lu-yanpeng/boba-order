# Vben 子树同步台账

`apps/admin` 是 [vbenjs/vue-vben-admin](https://github.com/vbenjs/vue-vben-admin) 的 **git subtree**（vendoring，布局 B）——
不是 fork、不是 submodule。本文件是与上游关系的唯一台账：每次引入/同步都写在文末「变更记录」里；
子树内被本地改过的上游文件逐条记在「子树内本地改动」，同步时按它逐条核对。

结论（2026-10-15 定案）：布局 B 落地＝boba-order 为主体仓库，Vben 整树以 `--squash` 落 `apps/admin`；
`apps/mp`、`supabase/`、`apps/shared-types/` 与它平级、各自独立安装。

## 当前基线

| 项 | 值 |
| --- | --- |
| 上游 | `https://github.com/vbenjs/vue-vben-admin.git`（remote 名 `vben`） |
| 基线 tag | `v5.7.0`（引入当日上游最新；2026-10-16 复核仍是最新 tag） |
| 基线 commit | `63a38dce49ba109f61607994e21ba921d8e970e9`（2026-05-21） |
| 本地引入提交 | `1a24bb218689a48e15a95478492af832bafbed5b`（squash 内容）＋ `bc2d48ac344e750561f94c6bd7fda60f440c98b3`（merge） |
| 同步锚点 | `git-subtree-split: 63a38dce4…` 在 `1a24bb218` 的提交 body 里（merge 提交 body 为空）；以后 `subtree pull` 以它为三方合并的基点 |
| 本仓库 tag | 上游 tag 已随 `git fetch vben --tags` 全量落到本地（69 个，与 `git ls-remote --tags --refs vben` 的集合一致）；取最新要按**版本序**（`git tag --sort=v:refname \| tail -1` 或下面同步块里的 `sort -V`），字典序会把 `v5.10.x` 排到 `v5.2.x` 之前 |

## 引入（已完成，2026-10-15）

```bash
git remote add vben https://github.com/vbenjs/vue-vben-admin.git
git fetch vben --tags
git tag -l 'v5.7.0'                      # 取引入当日最新 tag 核对 sha
git subtree add --prefix apps/admin vben v5.7.0 --squash
cd apps/admin && pnpm install
```

- 引入会新增 **两笔提交**（squash 内容 + merge）：**不要 amend / rebase / reset** 它们，`git-subtree-split` 是以后同步的锚点。
- `git fetch` 报 `GnuTLS recv error` 属网络抖动，重跑一次即可（已遇到过一次）。
- `pnpm install` 若 corepack 报版本不匹配：`COREPACK_ENABLE_STRICT=0 pnpm install`（本仓库未遇到，留作兜底）。

## 同步上游（需要时手动做）

```bash
git fetch vben --tags
git ls-remote --tags --refs vben | sed 's#.*refs/tags/##' | sort -V | tail -3   # 看有没有新 tag（必须过 sort -V：refname 默认字典序，v5.10.x 会排在 v5.2.x 之前而被 tail 漏掉）
git subtree pull --prefix apps/admin vben v5.8.0 --squash
cd apps/admin && pnpm install
```

同步纪律（2026-10-15 定案）：

- **只认 tag、不追 main**；只增不减为大方向。
- 改过的上游文件逐条记进本文件「子树内本地改动」；同步后逐条核对，冲突解决完再更新该表。
- 锁文件冲突取上游侧，然后重跑 `pnpm install`。
- 同步后跑一遍冒烟：`dev` 启动 / 登录 / 一个业务页 / `typecheck`。
- 是否先 dry-run 看情况：上游快照即最新时跳过——**首次真实同步即首验**（本次引入当日 `v5.7.0` 已是上游最新 tag，无更新可拉，故首验＝本台账建立本身）。

## 子树内本地改动（同步时可能冲突）

| 文件 | 改动 | 由谁/何时 | 
| --- | --- | --- |
| `apps/web-tdesign/tsconfig.json` | 加 `@boba/shared-types` 别名 → `../../../shared-types/database.types.ts`（类型单源消费） | 1.3 上半（2026-10-15） |
| `apps/web-tdesign/src/types/db.ts` | 新增占位 `import type` re-export（1.8/1.9 接线时替换） | 1.3 上半（2026-10-15） |

（其余文件保持上游原样；`apps/web-tdesign/.env*` 是上游自带并已入库的文件，本地未改。）

## 安装 / 起跑速记

- 工作区根＝`apps/admin`（`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`packageManager: pnpm@10.33.4`、`engines.node ^22.18 || ^24` 都在这里）。
- **必须在 `apps/admin` 目录内调用 pnpm**：从仓库根调用会因 corepack 版本守卫报 `ERR_PNPM_BAD_PM_VERSION`。
- `pnpm install` → `pnpm -F @vben/web-tdesign run dev`（dev 端口 5999）/ `run build`（产物 `dist/` 与 `dist.zip`，都被 gitignore）/ `run typecheck`。
- 注意：在该目录跑 `pnpm install` 会由 Vben 的 `prepare` 脚本（lefthook 2.1.8）重新生成 `.git/hooks/`，并可能在**仓库根**留下示例 `lefthook.yml`。本仓库靠 `core.hooksPath=.githooks` 覆盖，Git 直接忽略 `.git/hooks`；根目录若再出现 `lefthook.yml` 可直接删（不被跟踪）。见 README「启用 Git hooks」。

## 变更记录

| 日期 | 操作 | 上游 | 本地锚点 |
| --- | --- | --- | --- |
| 2026-10-15 | 首次引入：`git subtree add --prefix apps/admin vben v5.7.0 --squash` | `v5.7.0` @ `63a38dce4` | `1a24bb218` ＋ `bc2d48ac3` |
| 2026-10-16 | 建立本台账；复核上游最新 tag 仍为 `v5.7.0`（版本序 `sort -V`，无更新可拉）；两端构建/启动验证通过——mp `build:mp-weixin` 与 dev 编译均 DONE、admin dev :5999 返回 200 ＋ typecheck/build 通过；**mp 的微信开发者工具默认页待人工复验** | `v5.7.0` @ `63a38dce4` | 无新同步 |
