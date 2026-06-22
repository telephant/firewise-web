# [Tech Debt] SE 市场 Migration 需在 Supabase 执行

## 问题
`firewise-api/supabase/migrations/006_add_se_market.sql` 已创建但尚未在 Supabase 数据库执行。
保存瑞典市场交易时数据库 CHECK 约束会报错。

## 操作
在 Supabase Dashboard SQL Editor 执行：

```sql
ALTER TABLE trades
  DROP CONSTRAINT IF EXISTS trades_market_check,
  ADD CONSTRAINT trades_market_check CHECK (market IN ('US', 'SGX', 'HK', 'CN', 'SE', 'COMMODITY'));

ALTER TABLE dca_plans
  DROP CONSTRAINT IF EXISTS dca_plans_market_check,
  ADD CONSTRAINT dca_plans_market_check CHECK (market IN ('US', 'SGX', 'HK', 'CN', 'SE', 'COMMODITY'));
```
