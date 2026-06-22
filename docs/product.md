# Firewise — Product Overview

## 产品定位

Firewise 是一个个人财务管理工具，面向想要实现财务自由（FIRE）的用户。帮助用户追踪支出、管理投资组合、规划储蓄，最终计算出什么时候可以退休。

## 功能模块

### 1. Ledger（记账）
路由：`/dashboard/*`
- 创建多个账本（Ledger）
- 记录日常支出，按分类/支付方式管理
- 多货币支持
- 账本可关联到 Fire 模块（支出数据同步）
- 状态：**完整**

### 2. Portfolio（投资组合）
路由：`/fire/portfolios/*`
- 创建多个投资组合，支持多货币
- 持仓管理（Holdings）：实时价格、浮盈亏、下次除息日
- 交易记录（Trades）：买入/卖出，支持市场 US / SGX / HK / CN / SE
- 股息管理（Dividends）：手动录入，多视图展示
- 已实现盈亏（Realized P&L）：按 ticker 汇总
- 投资组合分析（Analytics）：Sharpe、Sortino、波动率、最大回撤、胜率等
- 资产分布（Treemap + Pie）
- 月度价值趋势（portfolio_snapshots，每月自动生成）
- 交易历史页（`/trades`）：分页、filter（ticker / buy/sell / exclude DCA）
- DCA 计划管理（在 Portfolio 详情页 DCA tab）
- 家族共享支持
- 状态：**完整**

### 3. DCA（定投）
路由：`/fire/dca`
- 全局 DCA 计划列表（跨 portfolio）
- 待确认定投记录（Pending）：确认价格和数量后自动生成 trade，notes 写入 `DCA`
- 支持频率：weekly / biweekly / monthly / quarterly / yearly
- 支持模式：按金额 / 按股数
- 状态：**完整**

### 4. Savings（储蓄）
路由：`/fire/savings`
- 多货币储蓄账户管理
- 利率、复利频率设置
- 利息记录（手动录入）
- 利息预测
- 利息趋势图（月度）
- 状态：**完整**

### 5. Fire Dashboard（财务自由总览）
路由：`/fire`
- 总资产（Portfolio + Savings 汇总，统一换算 USD）
- 被动收入月度趋势图
- 股息日历（当年各月预期股息）
- 下一笔股息提醒
- FIRE 进度（被动收入 / 目标 $2000/月）
- 月度净资产快照（`monthly_financial_snapshots` 表，**目前未实现，接口返回空数组**）
- 状态：**基本完整，月度快照未实现**

### 6. Family（家庭共享）
路由：`/fire/family`
- 创建家庭，邀请成员（邮件邀请）
- 家庭成员共享 Portfolio / Savings 数据
- 支持切换视图（个人 / 家庭）
- 状态：**完整**

## 已知问题 / 技术债

- `monthly_financial_snapshots` 表不存在（重构时被 DROP），接口 `/fire/snapshots` 返回空数组作为 workaround
- DCA 生成的 trade 通过 `notes = 'DCA'` 标识，trades 表本身无 `dca_plan_id` 字段
- SE 市场（瑞典）刚加入，需在 Supabase 执行 migration `006_add_se_market.sql` 才能保存
