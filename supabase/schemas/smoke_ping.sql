-- 冒烟试验田：`smoke_ping()` RPC
-- 供冒烟脚本 POST `rpc/smoke_ping` 调用一次并断言返回值。真实域函数落地时退役。

create or replace function public.smoke_ping()
returns text
language sql
security invoker
as $$
  select 'pong'::text;
$$;

grant execute on function public.smoke_ping() to anon, authenticated;
