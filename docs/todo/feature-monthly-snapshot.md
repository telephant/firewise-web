---
priority: P2
status: pending
type: feature
repos: [web, api]
verify: manual
---

# [Feature] 月度净资产快照

## 需求
Fire Dashboard 需要展示每月净资产历史趋势，目前 `/fire/snapshots` 接口返回空数组。

## 背景
`monthly_financial_snapshots` 表在重构时被 DROP（见 `remove_old_tables.sql`），Migration 在 `migrations_archive/056` 中。数据来源应该是 `transactions` 表（收支）+ `portfolio_snapshots`（资产）+ `savings`（储蓄）的月末聚合。

## 涉及仓库
- `firewise-api`：重建表（新 migration）+ 写入逻辑（月末定时任务或手动触发 API）
- `firewise-web`：Fire Dashboard 展示月度净资产趋势图

## 参考
- 旧表 schema：`supabase/migrations_archive/056_create_monthly_snapshots.sql`
- 接口：`GET /api/fire/snapshots?limit=2`
- 前端类型：`MonthlySnapshot` in `src/lib/fire/api.ts`

## 验证步骤
1. 在 Supabase 执行新 migration，确认表创建成功
2. 调用写入接口（或等定时任务触发），确认有数据写入
3. 访问 Fire Dashboard，确认月度净资产趋势图有数据显示
