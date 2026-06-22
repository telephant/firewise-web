---
priority: P1
status: pending
type: tech-debt
repos: [api]
verify: migration
---

# [Tech Debt] SE 市场 Migration 需在 Supabase 执行

## 需求
`firewise-api/supabase/migrations/006_add_se_market.sql` 已创建但尚未在 Supabase 数据库执行。
保存瑞典市场交易时数据库 CHECK 约束会报错。

## 验证步骤
在 Supabase Dashboard SQL Editor 执行以下 SQL，无报错即为成功：

```sql
ALTER TABLE trades
  DROP CONSTRAINT IF EXISTS trades_market_check,
  ADD CONSTRAINT trades_market_check CHECK (market IN ('US', 'SGX', 'HK', 'CN', 'SE', 'COMMODITY'));

ALTER TABLE dca_plans
  DROP CONSTRAINT IF EXISTS dca_plans_market_check,
  ADD CONSTRAINT dca_plans_market_check CHECK (market IN ('US', 'SGX', 'HK', 'CN', 'SE', 'COMMODITY'));
```

执行后在 Record Trade 对话框选 SE 市场，尝试保存一笔交易，确认无 DB 报错。
