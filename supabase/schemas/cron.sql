-- 定时基座：`pg_cron` 扩展（AD-12）
-- 声明式源：随重建自动就位——`db reset` 只跑迁移，声明在此才会每次重建自动安装；
-- 两条固定作业（每分钟 tick、每日门店 0 点批量完成）归 E5/E8，本文件不含作业。
-- 本地实测（2026-10-17）：可用，口径见 README「定时基座（pg_cron，实测）」节。

create extension if not exists pg_cron;
