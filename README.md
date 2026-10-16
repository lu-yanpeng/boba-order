# boba-order

全栈微信奶茶点餐小程序：顾客端小程序（uni-app）＋ 商家后台（Vben Admin）＋ Supabase 后端（本地优先）。

## 仓库结构

```
apps/mp/           顾客端小程序（uni-app 官方模板）
apps/admin/        商家后台（Vben Admin 5.x 子树，web-tdesign 变体）
apps/shared-types/ Supabase 生成类型单源（@boba/shared-types，勿手写）
supabase/          后端定义：declarative schema / 迁移 / 种子 / 配置
supabase/scripts/  基座脚本：冒烟（HTTP 级）＋ 类型再生成（gen-types.mjs）
docs/              台账：Vben 子树同步（vben-sync.md）
```

## 前提

- Docker 运行中（本地栈必须）
- Node.js 24（冒烟脚本用原生 `fetch` 与 `process.loadEnvFile`）
- pnpm 10+
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli)（本仓库实测 2.121.0）

## 起跑：本地后端

```bash
supabase start                                   # 起本地栈（首次会拉取镜像，较慢）
supabase db reset                                # 重建数据库＋灌种子（可重复执行）
supabase status -o env                           # 查看地址与公开密钥，供下一步填 .env
```

> 本地栈绝不可暴露公网（架构 AD-15）。

## 单源配置

后端地址与公开密钥只在**仓库根 `.env`** 定义一处（`.env` 已 gitignore；模板见 `.env.example`），
本地与将来上云只改这一处。首次：复制 `.env.example` 为 `.env`，把值换成 `supabase status -o env` 的实测值。

```bash
cp .env.example .env
# 编辑 .env，填入 supabase status -o env 的值
```

## 生成类型（单源）

类型**一律生成、不手写**，产物入库跟踪。本地栈已起时，在仓库根执行：

```bash
pnpm --dir apps/shared-types run gen:types
```

流程：`supabase gen types --local --lang typescript` 生成 → 仓库 pin 的 oxfmt
（`apps/admin/node_modules/.bin/oxfmt`，故 `apps/admin` 依赖须已安装）格式化 → 成功后才原子写入
`apps/shared-types/database.types.ts`。栈未起、生成失败或 oxfmt 缺失时报错退出、不动现有产物
（勿手改产物；勿用 `npx oxfmt`，版本不同会改坏形态）。

改 `supabase/schemas/` 后的再生成路径：改 schema → `supabase db schema declarative sync --apply` →
上面的 `gen:types`（迁移口径见「迁移风格（声明式，实测）」节）。两端（`apps/mp`、`apps/admin/apps/web-tdesign`）经 tsconfig `paths`
别名 `@boba/shared-types` 消费该产物。

## 冒烟

栈已起、根 `.env` 已填后：

```bash
node supabase/scripts/smoke/base.mjs
```

四项断言：栈可达 / 授权表 `smoke_items` 直读返回一行种子 / 未授权表 `smoke_no_grant` 被拒 /
`smoke_ping` RPC 返回一次。全过时退出码 0。

> 这是 HTTP 级冒烟（走 PostgREST，验的是真实 API 暴露面），**不是** pgTAP；
> 以后要写 SQL 级测试就放 `supabase/tests/database/*.sql`，用 `supabase test db` 跑（CLI 只收 `.pg`/`.sql`，不会误收本脚本）。

## 迁移风格（声明式，实测）

声明式源在 `supabase/schemas/*.sql`：`config.toml` 的 `[experimental.pgdelta] declarative_schema_path`
指向该目录（CLI 2.121 的 pg-delta 引擎据此读取；`[db.migrations] schema_paths` 同指该目录，供 legacy 兼容）。

实测口径（CLI 2.121）：

- `supabase start` / `db reset` **只跑 `supabase/migrations/` 的迁移 ＋ `seed.sql`，不直接读 `supabase/schemas/`**。
- 因此改声明式源后必须先用 `sync` 生成并应用迁移，再 `db reset` 才能复现同一状态。

```bash
# 改 supabase/schemas/*.sql 后：
supabase db schema declarative sync --apply    # 比对声明式树与迁移基线，写出新迁移并应用到本地库
supabase db reset                              # 从迁移＋种子重建，验证可重复
```

声明式链路跑不通时退手写迁移（`supabase migration new`），结论记录在本计划的 Implementation Notes。

## 定时基座（pg_cron，实测）

本地栈**可用**（2026-10-17 实测）：`pg_cron` 1.6.4 随镜像预加载；扩展声明在 `supabase/schemas/cron.sql`
（`create extension if not exists pg_cron`），随重建自动就位；试验作业按分触发、`cron.job_run_details` 留有
`succeeded` 记录，随后撤除（仓库不留作业）。限制与记法：调度时区锁 GMT——门店 0 点＝`0 16 * * *`
（UTC+8 当天 00:00）；作业跑在 `postgres` 库；`db reset` 会清空 `cron.job`（作业是数据、非结构，
重建后需随迁移/种子重排）。

```bash
supabase db query --local "select jobid, jobname, schedule, active from cron.job;"                     # 查当前作业
supabase db query --local "select jobname, status, start_time, return_message from cron.job_run_details join cron.job using (jobid) order by start_time desc limit 5;"  # 查执行记录
```

## 启用 Git hooks（每个克隆一次）

提交信息与分支名规范由 `.githooks/` 提供，需显式启用：

```bash
git config core.hooksPath .githooks
```

> 注意：在 `apps/admin` 内跑 `pnpm install` 会由 Vben 的 `prepare` 脚本（lefthook）重新生成 `.git/hooks/`。
> 本仓库靠 `core.hooksPath=.githooks` 覆盖，Git 直接忽略 `.git/hooks`，可忽略此现象。

## 两端

- 顾客端：`pnpm --dir apps/mp install` 后 `pnpm --dir apps/mp run dev:mp-weixin`，用微信开发者工具打开
  `apps/mp/dist/dev/mp-weixin`，勾选「不校验合法域名」连 `127.0.0.1`。
- 后台：见 `apps/admin`（Vben 子树，workspace 根在 `apps/admin`，dev 端口 5999）；`cd apps/admin && pnpm -F @vben/web-tdesign run dev`。
  子树与上游的同步流程、子树内本地改动清单见 `docs/vben-sync.md`。

> 依赖安装（`pnpm install`）请在本机手动执行（Vben 依赖下载易超时、uni-app 依赖版本由 `npx @dcloudio/uvm@latest` 管理）。
