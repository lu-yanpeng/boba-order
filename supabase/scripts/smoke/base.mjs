#!/usr/bin/env node
// 本地栈基座冒烟（条目 3）：四项断言。
//   1. 栈可达（PostgREST 根）
//   2. 授权表直读：GET smoke_items → 2xx ＋ 至少一行种子
//   3. 未授权表直读：GET smoke_no_grant → 被拒（实测返回码，见下）
//   4. 冒烟 RPC：POST rpc/smoke_ping → 返回一次预期值
//
// 用法（仓库根、栈已起、根 .env 已填）：
//   node supabase/scripts/smoke/base.mjs
//
// 配置单源＝仓库根 .env（见 .env.example）；两个键：SUPABASE_URL ＋ 公开 key
// （`SUPABASE_PUBLISHABLE_KEY` 优先，`SUPABASE_ANON_KEY` 兼容旧格式，二者按名识别）。
// 不引第三方依赖，只用 node 原生 fetch ＋ process.loadEnvFile（node 24）。

import { existsSync } from 'node:fs';
import process from 'node:process';

// 未授权表直读的实测返回码（CLI 2.121 / Postgres 17）：PostgREST 对无权限表返回 401。
const EXPECTED_NO_GRANT_STATUS = 401;

const rootEnvUrl = new URL('../../../.env', import.meta.url);
if (!existsSync(rootEnvUrl)) {
  console.error(`[smoke] 找不到根 .env（${rootEnvUrl.pathname}）；可从 .env.example 复制后填入 supabase status -o env 的值。`);
  process.exit(2);
}
process.loadEnvFile(rootEnvUrl);

const supabaseUrl = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const publicKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  '';

if (!supabaseUrl || !publicKey) {
  console.error('[smoke] 根 .env 缺少 SUPABASE_URL 或公开 key（SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY）。');
  process.exit(2);
}

const headers = {
  apikey: publicKey,
  authorization: `Bearer ${publicKey}`,
};

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function main() {
  // 1. 栈可达
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, { headers });
    record('栈可达（GET /rest/v1/）', res.status === 200, `HTTP ${res.status}`);
  } catch (error) {
    record('栈可达（GET /rest/v1/）', false, `请求失败：${error.message}`);
  }

  // 2. 授权表直读：2xx ＋ 至少一行种子
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/smoke_items?select=id,label`, { headers });
    let rows = [];
    if (res.ok) {
      rows = await res.json();
    }
    const ok = res.status === 200 && Array.isArray(rows) && rows.length >= 1;
    record('授权表直读（smoke_items）', ok, `HTTP ${res.status}，行数 ${Array.isArray(rows) ? rows.length : 'n/a'}`);
  } catch (error) {
    record('授权表直读（smoke_items）', false, `请求失败：${error.message}`);
  }

  // 3. 未授权表直读：被拒（实测返回码）
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/smoke_no_grant?select=id,label`, { headers });
    const ok = res.status === EXPECTED_NO_GRANT_STATUS;
    record('未授权表被拒（smoke_no_grant）', ok, `HTTP ${res.status}（期望 ${EXPECTED_NO_GRANT_STATUS}）`);
  } catch (error) {
    record('未授权表被拒（smoke_no_grant）', false, `请求失败：${error.message}`);
  }

  // 4. 冒烟 RPC：返回一次预期值
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/smoke_ping`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: '{}',
    });
    let value;
    if (res.ok) {
      value = await res.json();
    }
    const ok = res.status === 200 && value === 'pong';
    record('冒烟 RPC（rpc/smoke_ping）', ok, `HTTP ${res.status}，返回 ${JSON.stringify(value)}`);
  } catch (error) {
    record('冒烟 RPC（rpc/smoke_ping）', false, `请求失败：${error.message}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n[smoke] ${results.length - failed.length}/${results.length} 通过`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
