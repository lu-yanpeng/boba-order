# @boba/shared-types

Supabase 数据库类型**单源**。内容由 `supabase gen types --local --lang typescript` 生成，
**不手写、不手工编辑**。

- 产物：`database.types.ts`（入库跟踪）
- 再生成（在仓库根执行；本地栈已起、`apps/admin` 依赖已装）：

  ```bash
  pnpm --dir apps/shared-types run gen:types
  ```

  脚本 `supabase/scripts/gen-types.mjs`：生成 → 仓库 pin 的 oxfmt 格式化
  （`apps/admin/node_modules/.bin/oxfmt`；勿用 `npx oxfmt`，版本不同会改坏形态）→ 成功后才原子写入；
  失败不动现有产物。
- 消费方式：两端（`apps/mp`、`apps/admin/apps/web-tdesign`）经 tsconfig `paths` 别名
  `@boba/shared-types` 指向本文件。
