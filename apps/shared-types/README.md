# @boba/shared-types

Supabase 数据库类型**单源**。内容由 `supabase gen types --local --lang typescript` 生成，
**不手写、不手工编辑**。

- 产物：`database.types.ts`（入库跟踪）
- 生成命令（在仓库根、本地栈已起时）：

  ```bash
  supabase gen types --local --lang typescript > apps/shared-types/database.types.ts
  ```

- 消费方式：两端（`apps/mp`、`apps/admin/apps/web-tdesign`）经 tsconfig `paths` 别名
  `@boba/shared-types` 指向本文件。正式的脚本入口与再生成流程归条目 4。
- 生成物默认未格式化；如需统一风格，用仓库 pin 的 oxfmt：
  `./apps/admin/node_modules/.bin/oxfmt apps/shared-types/database.types.ts`
  （Vben workspace 的 catalog `oxfmt: ^0.51.0`；勿用 `npx oxfmt`，会拉到不同版本、产出不一致）。
