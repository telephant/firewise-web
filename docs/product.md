# Firewise — Product Overview

## 产品定位

Firewise 是一个个人财务管理工具，面向想要实现财务自由（FIRE）的用户。帮助用户追踪支出、管理投资组合、规划储蓄，最终计算出什么时候可以退休。

---

## 模块一：Ledger 记账

路由：`/dashboard/*`

### 账本管理
- 创建/编辑/删除多个账本
- 支持多货币，可设置默认货币
- 邀请成员协作（Owner/Member 角色）
- 成员可查看、添加支出；Owner 可管理成员和删除账本

### 支出管理
- 添加/编辑/删除支出，支持名称、金额、货币、分类、支付方式、描述、日期
- 支出列表无限滚动分页
- 按时间段过滤（全部 / 本月 / 本年 / 自定义范围）
- 按分类过滤
- 月度支出统计图（按分类/支付方式汇总）
- "快速录入"：常用支出一键填充
- "继续添加"：批量录入模式

### 分类管理
- 创建/重命名/删除分类
- 查看每个分类的使用次数

### 支付方式管理
- 创建/编辑/删除支付方式
- 查看每种支付方式的使用次数

### 货币管理
- 账本内添加/删除货币
- 设置默认货币

**状态：完整**

---

## 模块二：Portfolio 投资组合

路由：`/fire/portfolios/*`

### 组合管理
- 创建/编辑/删除多个投资组合，支持多货币
- 组合列表展示：总值、成本、浮盈亏、收益率

### Holdings 持仓（`/fire/portfolios/[id]` → Holdings tab）
- 实时持仓列表：ticker、数量、均价、现价、市值、浮盈亏
- 搜索、排序（ticker / value / 浮盈亏 / %）
- 分页（10条/页）
- 显示下一个除息日
- 一键复制持仓到剪贴板（Tab 分隔，可粘贴到 Excel）
- 点击 "Trades" 查看该 ticker 的历史交易（HoldingTradesPanel）

### Trades 交易（`/fire/portfolios/[id]` → Trades tab 和 `/trades` 页）
- 记录买入/卖出交易（ticker、市场、股数、价格、货币、日期、备注）
- 支持市场：US / SGX / HK / CN / SE（Sweden）/ COMMODITY
- 市场切换自动匹配货币（US→USD，SGX→SGD，HK→HKD，CN→CNY，SE→SEK）
- 交易历史列表，默认时间倒序
- Filter：ticker 搜索、Buy/Sell、Exclude DCA
- 分页（10条/页）
- DCA 来源的交易显示蓝色 DCA badge（通过 `notes = 'DCA'` 识别）
- 删除交易

### Dividends 股息（`/fire/portfolios/[id]` → Dividends tab）
- 手动录入股息（ticker、每股金额、总金额、货币、除息日、支付日）
- 多视图展示（Timeline / Summary）
- 按年/月过滤
- 删除股息记录
- 换算 USD 显示

### Realized P&L 已实现盈亏（→ P&L tab）
- 按 ticker 聚合已实现盈亏
- 显示交易次数

### Analytics 分析（→ Distribution tab）
- Treemap：按市值展示持仓分布
- Pie：按资产类型分布（股票/ETF/商品/加密/基金）
- 投资组合评分（A/B/C/D）：Sharpe、Sortino、波动率、最大回撤、胜率、集中度

### Stats 统计（→ Stats tab）
- 总市值、总成本、浮盈亏、已实现盈亏
- YTD / MTD 股息
- 月度变化（MoM Gain）
- 历史价值趋势图（基于 portfolio_snapshots，每月自动生成）
- Since Inception 收益率

### DCA（→ DCA tab，同时有全局页面 `/fire/dca`）
- 见 DCA 模块

**状态：完整**

---

## 模块三：DCA 定投

路由：`/fire/dca`（全局）+ Portfolio 详情页 DCA tab

### 计划管理
- 创建 DCA 计划：ticker、市场、货币、频率、模式、金额/股数、开始日期
- 频率：weekly / biweekly / monthly / quarterly / yearly
- 模式：按金额 / 按股数
- 价格参考：open / close / delay（延迟分钟数）
- 暂停/恢复计划（is_active toggle）
- 编辑/删除计划

### 待确认执行
- 到期后自动生成 Pending 记录
- 展示建议价格和建议股数
- 确认：输入实际价格和股数，自动创建 trade（notes 写入 `'DCA'`）
- 跳过：跳过本次执行

**状态：完整**

---

## 模块四：Savings 储蓄

路由：`/fire/savings`

### 账户管理
- 创建/编辑/删除储蓄账户
- 字段：名称、银行、货币、余额、利率、复利频率、开始日期、备注
- 复利频率：monthly / quarterly / semi-annual / annual
- 多货币支持（USD、SGD、AED 等）

### 利息管理
- 手动录入利息到账记录（金额、日期、备注）
- 查看利息历史
- 删除利息记录

### 预测与统计
- 未来 12 期利息预测（基于当前利率和余额）
- YTD 总利息
- 所有时间累计利息
- 下次到账日期和金额
- 年度利息趋势图（月度）

**状态：完整**

---

## 模块五：Fire Dashboard 财务自由总览

路由：`/fire`

### 资产总览
- 总资产 = 所有 Portfolio 市值 + 所有 Savings 余额（统一换算 USD）
- 投资组合总值 / 储蓄总值分项展示
- 总收益率（ROI）
- 月度资产变化（MoM）

### 被动收入统计
- YTD 股息（所有组合汇总）
- YTD 利息（所有储蓄汇总）
- YTD 被动收入总计
- 月均被动收入
- FIRE 进度条：月均被动收入 / 目标 $2000（硬编码）

### 全年预测
- 预计全年股息
- 预计全年利息
- 预计全年总被动收入
- 距离目标缺口

### 资产分布
- Donut 图：投资 vs 储蓄占比
- 各 Portfolio 列表（市值 + 占比）
- 各储蓄账户列表（余额 + 利率 + 占比）

### 月度被动收入趋势
- 股息 + 利息分层堆叠图（全年12个月）
- 历史实际数据 vs 预测数据区分显示
- 月度明细表（股息/利息/合计）

### 其他
- 下一笔股息提醒（ticker、金额、日期，区分实际/预测）
- 隐私模式（一键遮蔽所有金额）
- 月度净资产快照（**未实现**，表不存在，接口返回空数组）

**状态：基本完整，月度净资产快照未实现**

---

## 模块六：Family 家庭共享

路由：`/fire/family`

### 家庭管理
- 首次访问自动创建 personal family
- 支持加入多个家庭，可切换
- 重命名家庭（Owner）

### 成员管理
- 通过邮件邀请成员
- 查看成员列表（Owner / Member 角色）
- 移除成员（Owner）
- 离开家庭（Member）

### 邀请管理
- 查看待接受邀请列表
- 重新发送邀请邮件
- 取消邀请
- 通过 token 链接接受邀请（`/fire/invite/[token]`）

### 数据隔离
- 所有数据按 `belong_id`（= `family_id`）隔离
- 家庭成员共享该家庭下的所有 Portfolio / Savings 数据

**状态：完整**

---

## 已知问题 / 技术债

| 问题 | 影响 | 状态 |
|------|------|------|
| `monthly_financial_snapshots` 表不存在 | Fire Dashboard 无月度净资产历史 | 待实现（见 todo） |
| DCA trade 通过 `notes='DCA'` 识别，非专用字段 | 如果用户手动填写 notes='DCA' 会误判 | 已知，低优先级 |
| SE 市场 migration 未在 Supabase 执行 | 无法保存瑞典股票交易 | 待执行（见 todo） |
| 多货币总计在 Dashboard 显示为近似值 | 不同币种直接相加不精确 | 已知，低优先级 |
| FIRE 目标 $2000/月 硬编码 | 无法自定义 | 待改进 |
