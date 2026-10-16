#!/usr/bin/env node
// 类型再生成：supabase gen types → 仓库 pin 的 oxfmt 格式化 → 成功后原子写入。
// 类型不手写、不手工编辑（架构 Consistency Conventions）。
// 用法：在仓库根执行 pnpm --dir apps/shared-types run gen:types（本地栈须已起）。

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TARGET = 'apps/shared-types/database.types.ts';
const OXFMT = 'apps/admin/node_modules/.bin/oxfmt';
const MAX_BUFFER = 64 * 1024 * 1024;

function fail(message, code = 1) {
  console.error(`[gen-types] ${message}`);
  process.exit(code);
}

// 1) 生成（cwd 固定仓库根，CLI 才能找到 supabase/config.toml）
const gen = spawnSync('supabase', ['gen', 'types', '--local', '--lang', 'typescript'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: MAX_BUFFER,
});
if (gen.error) {
  fail(
    `未找到 supabase CLI（${gen.error.message}）。安装见 README「前提」；本地栈用 supabase start 起。`,
  );
}
if (gen.status !== 0) {
  const detail = [gen.stdout, gen.stderr]
    .map((text) => (text || '').trim())
    .filter(Boolean)
    .join('\n');
  fail(
    `supabase gen types 失败（本地栈起了吗？见 README「起跑：本地后端」）${detail ? `：\n${detail}` : '。'}`,
  );
}
const raw = gen.stdout;
if (!raw.includes('export type Json')) {
  fail('gen types 输出异常（未检出类型内容），已放弃写入。');
}

// 2) 格式化：仓库 pin 的 oxfmt（Vben workspace catalog；勿用 npx oxfmt，版本不同会改坏形态）
const oxfmt = join(ROOT, OXFMT);
if (!existsSync(oxfmt)) {
  fail(`缺 ${OXFMT}——先在 apps/admin 里跑 pnpm install（Vben 依赖手动装，见 README「两端」）。`, 2);
}
const fmt = spawnSync(oxfmt, ['--stdin-filepath', TARGET], {
  cwd: ROOT,
  input: raw,
  encoding: 'utf8',
  maxBuffer: MAX_BUFFER,
});
if (fmt.error || fmt.status !== 0) {
  const detail = (fmt.error?.message ?? (fmt.stderr || fmt.stdout || '')).trim();
  fail(`oxfmt 格式化失败${detail ? `：${detail}` : '。'}`);
}
const next = fmt.stdout;
if (!next.includes('export type Json')) {
  fail('oxfmt 输出异常（未检出类型内容），已放弃写入。');
}

// 3) 有变化才原子写入（临时文件＋rename；失败不碰现有产物）
const target = join(ROOT, TARGET);
const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
if (next === current) {
  console.log(`[gen-types] 无变化（逐字节一致）：${TARGET}`);
  process.exit(0);
}
const tmp = `${target}.tmp`;
try {
  writeFileSync(tmp, next);
  renameSync(tmp, target);
} catch (error) {
  rmSync(tmp, { force: true });
  fail(`写入失败：${error.message}`);
}
const lines = next.endsWith('\n') ? next.split('\n').length - 1 : next.split('\n').length;
console.log(`[gen-types] 已更新：${TARGET}（${lines} 行）。产物入库跟踪，请随本次改动一起 review。`);
