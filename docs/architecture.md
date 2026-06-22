# Firewise — Architecture

## 仓库结构

| 仓库 | 说明 | 本地端口 |
|------|------|----------|
| `firewise-web` | Next.js 前端 | 3002 |
| `firewise-api` | Express 后端 API | 3001 |
| `firewise-findata` | 金融数据服务（价格/汇率） | — |
| `firewise-agents` | AI Agent 服务 | — |

---

## 技术栈

### 前端（firewise-web）

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 / React 19 / TypeScript 5 |
| 认证 | Supabase Auth（Google OAuth）+ `@supabase/ssr` |
| 数据请求 | `fetch` 封装（`src/lib/fire/api.ts`）+ SWR |
| 表单 | react-hook-form + zod |
| 图表 | recharts |
| 日期 | date-fns + react-day-picker |
| 样式 | Tailwind CSS v4（Ledger）/ inline styles（Fire） |
| UI 组件 | shadcn/ui（Ledger）/ 自定义 Fire UI（Fire） |
| Toast | sonner |
| 图标 | lucide-react |

### 后端（firewise-api）

| 类别 | 技术 |
|------|------|
| 框架 | Express 5 / TypeScript 5 |
| 数据库 | Supabase（PostgreSQL）|
| 认证 | Supabase JWT 验证 |
| 邮件 | Resend |
| 安全 | helmet + cors |

---

## 模块分离（严禁混用）

| 模块 | 路由 | UI 系统 | 风格 |
|------|------|---------|------|
| Ledger | `/dashboard/*` | shadcn/ui | 亮色 Tailwind |
| Fire | `/fire/*` | 自定义 Fire UI | 暗色 Linear 风格 |

---

## Fire UI 组件系统

所有 Fire 模块页面必须从以下路径导入：

```tsx
import { colors, Card, Button, Input, Select, Loader, StatCard,
         DateInput, CurrencyCombobox, Tabs, BarChart } from '@/components/fire/ui';
```

### 颜色主题

```ts
colors.bg           // '#0A0A0B' — 页面背景
colors.surface      // '#141415' — 卡片背景
colors.surfaceLight // '#1C1C1E' — 悬浮/高亮
colors.text         // '#EDEDEF' — 主文本
colors.muted        // '#7C7C82' — 次要文本
colors.border       // 'rgba(255,255,255,0.08)' — 边框
colors.accent       // '#5E6AD2' — Linear 紫（CTA）
colors.positive     // '#4ADE80' — 盈利（绿）
colors.negative     // '#F87171' — 亏损（红）
colors.info         // '#60A5FA' — 信息（蓝）
colors.warning      // '#FBBF24' — 警告（黄）
```

### 可用组件

- **布局**：Card、Sidebar、Tabs、Dialog
- **表单**：Button、Input、Select、DateInput、CurrencyCombobox、Label
- **数据展示**：StatCard、Table、Pagination、Loader
- **图表**：BarChart、StackedBarChart、PieChart、ProgressBar
- **特殊**：Amount（支持隐私模式）、Celebration（礼花动画）

### 关键规范

- **DateInput**：Fire 页面严禁使用原生 `<input type="date">`，必须用 `DateInput` 组件
- **Loader**：`<Loader size="md" variant="bar" />` 数据加载；`<Loader size="sm" variant="dots" />` 行内加载
- **多货币**：严禁跨货币直接求和，需转换或标注为近似值

---

## 认证流程

```
1. 用户 Google OAuth 登录 → Supabase Auth → token 存 cookie
2. 前端每次请求：getAuthHeader() 从 Supabase session 取 token
3. 请求头：Authorization: Bearer <token> + x-family-id: <family_id>
4. 后端 authMiddleware：验证 token → req.user.id
5. getViewContext(req)：
   - 读 x-family-id header（验证用户是成员）
   - 无 header 则用用户第一个 personal family
   - 返回 { userId, familyId, belongId }
6. 所有数据查询按 belong_id 隔离
```

**关键**：所有数据操作必须通过 `getViewContext()` 获取 `belongId`，绝不直接用 `userId` 查数据。

---

## 数据库表结构

### 用户 & 家庭

**profiles**
- `id` UUID PK (= auth.users.id)
- `email`, `full_name`, `avatar_url`
- `created_at`, `updated_at`

**families**
- `id` UUID PK
- `name`, `owner_id` FK→profiles
- `created_at`, `updated_at`

**family_members**
- `id`, `family_id`, `user_id` FK→profiles
- `role` ('owner' | 'member')
- `joined_at`
- UNIQUE(family_id, user_id)

**family_invitations**
- `id`, `family_id`, `email`
- `token` VARCHAR(64) UNIQUE
- `invited_by`, `created_at`, `expires_at`, `accepted_at`

### Ledger 模块

**ledgers**
- `id`, `name`, `description`
- `created_by`, `default_currency_id` FK→ledger_currencies
- `created_at`, `updated_at`

**ledger_users**
- `id`, `ledger_id`, `user_id`, `role` ('owner'|'member')
- UNIQUE(ledger_id, user_id)

**ledger_currencies**
- `id`, `code` VARCHAR(3), `name`, `ledger_id`
- UNIQUE(ledger_id, code)

**expense_categories**
- `id`, `name`, `ledger_id`, `created_by`

**payment_methods**
- `id`, `name`, `description`, `ledger_id`, `created_by`

**expenses**
- `id`, `name`, `ledger_id`, `category_id`, `payment_method_id`
- `amount` DECIMAL(12,2), `currency_id`, `date`
- `description`, `created_by`, `created_at`, `updated_at`

### Portfolio 模块

**portfolios**
- `id`, `belong_id` UUID（= family_id）
- `name`, `currency` DEFAULT 'USD', `description`
- `created_at`, `updated_at`

**trades**
- `id`, `portfolio_id`
- `ticker`, `market` (US|SGX|HK|CN|SE|COMMODITY)
- `type` (buy|sell), `shares` DECIMAL(18,8), `price` DECIMAL(18,8)
- `currency` DEFAULT 'USD', `date`
- `notes`（DCA 来源写入 `'DCA'`）
- `asset_type` (stock|commodity), `unit`
- `created_at`

**dividends**
- `id`, `portfolio_id`, `ticker`
- `shares_at_exdate`, `amount_per_share`, `total_amount` DECIMAL(18,8)
- `currency`, `tax_rate`, `tax_withheld`
- `ex_date`, `pay_date`, `source` (auto|manual)
- UNIQUE(portfolio_id, ticker, ex_date)

**portfolio_snapshots**（月末自动生成）
- `id`, `portfolio_id`, `snapshot_date` DATE
- `total_value`, `total_cost`, `unrealized_pl`, `realized_pl` DECIMAL(20,2)
- `currency`, `detail` JSONB
- UNIQUE(portfolio_id, snapshot_date)

**price_cache**
- `id`, `ticker`, `date`, `price` DECIMAL(18,8), `currency`
- UNIQUE(ticker, date)

### DCA 模块

**dca_plans**
- `id`, `portfolio_id`, `ticker`, `market`, `currency`
- `frequency` (weekly|biweekly|monthly|quarterly|yearly)
- `mode` (amount|shares), `amount`, `shares` DECIMAL(18,8)
- `next_run_date`, `last_run_date`, `is_active` DEFAULT true
- `price_reference` (open|close|delay), `price_delay_minutes`
- `notes`, `created_at`, `updated_at`

**dca_pending**
- `id`, `dca_plan_id`, `portfolio_id`, `ticker`, `market`, `currency`
- `scheduled_date`, `mode`, `amount`, `shares`
- `suggested_price`, `suggested_shares`
- `status` (pending|confirmed|skipped)
- `confirmed_price`, `confirmed_shares`, `trade_id` FK→trades
- `created_at`

### Savings 模块

**savings_accounts**
- `id`, `belong_id`
- `name`, `bank`, `currency` DEFAULT 'USD'
- `balance` NUMERIC(18,2), `interest_rate` NUMERIC(8,4)
- `compound_frequency` (monthly|quarterly|semi_annual|annual)
- `notes`, `start_date`, `created_at`, `updated_at`

**interest_records**
- `id`, `account_id` FK→savings_accounts
- `amount` NUMERIC(18,2), `credited_at` DATE
- `notes`, `created_at`

### 全局

**currency_exchange**（全局汇率，1 USD = X 外币）
- `code` VARCHAR(10) PK（小写，如 `usd`, `sgd`）
- `name`, `rate` DECIMAL(38,18), `date`, `updated_at`

**feedback**
- `id`, `user_id`, `type` (missing_stock|bug_report|feature_request|other)
- `content` JSONB, `status` (pending|resolved)
- `created_at`, `updated_at`

---

## API 路由总览

Base URL：`http://localhost:3001/api`

所有请求需携带：
- `Authorization: Bearer <supabase_access_token>`
- `x-family-id: <family_id>`（可选）

### Ledger

```
GET    /ledgers                                  列出账本
POST   /ledgers                                  创建账本
GET    /ledgers/:id                              账本详情
PUT    /ledgers/:id                              更新账本
DELETE /ledgers/:id                              删除账本
GET    /ledgers/:id/expenses                     支出列表
POST   /ledgers/:id/expenses                     创建支出
PUT    /ledgers/:id/expenses/:expId              更新支出
DELETE /ledgers/:id/expenses/:expId              删除支出
GET    /ledgers/:id/categories                   分类列表
POST   /ledgers/:id/categories                   创建分类
PUT    /ledgers/:id/categories/:catId            更新分类
DELETE /ledgers/:id/categories/:catId            删除分类
GET    /ledgers/:id/payment-methods              支付方式列表
POST   /ledgers/:id/payment-methods              创建支付方式
PUT    /ledgers/:id/payment-methods/:pmId        更新支付方式
DELETE /ledgers/:id/payment-methods/:pmId        删除支付方式
GET    /ledgers/:id/currencies                   货币列表
POST   /ledgers/:id/currencies                   添加货币
DELETE /ledgers/:id/currencies/:code             删除货币
GET    /ledgers/:id/stats                        账本统计
```

### Portfolio

```
GET    /portfolios                               组合列表
POST   /portfolios                               创建组合
GET    /portfolios/:id                           组合详情
PUT    /portfolios/:id                           更新组合
DELETE /portfolios/:id                           删除组合
GET    /portfolios/:id/holdings                  持仓列表
GET    /portfolios/:id/trades                    交易列表
POST   /portfolios/:id/trades                    创建交易
PUT    /portfolios/:id/trades/:tradeId           更新交易
DELETE /portfolios/:id/trades/:tradeId           删除交易
GET    /portfolios/:id/dividends                 股息列表
POST   /portfolios/:id/dividends                 创建股息
PUT    /portfolios/:id/dividends/:divId          更新股息
DELETE /portfolios/:id/dividends/:divId          删除股息
GET    /portfolios/:id/stats                     组合统计
GET    /portfolios/:id/snapshots                 历史快照
GET    /portfolios/:id/realized-pl               已实现盈亏
GET    /portfolios/:id/analytics                 分析评分
```

### Fire 模块

```
GET    /fire/snapshots?limit=2                   月度净资产快照（表不存在，返回[]）
GET    /fire/dividend-calendar?year=YYYY         股息日历
GET    /fire/next-dividend                       下一笔股息
GET    /fire/dca/plans                           DCA 计划列表
POST   /fire/dca/plans                           创建 DCA 计划
PUT    /fire/dca/plans/:id                       更新 DCA 计划
DELETE /fire/dca/plans/:id                       删除 DCA 计划
GET    /fire/dca/pending                         待确认 DCA 列表
POST   /fire/dca/pending/:id/confirm             确认执行
POST   /fire/dca/pending/:id/skip                跳过执行
GET    /fire/savings                             储蓄账户列表
POST   /fire/savings                             创建储蓄账户
PUT    /fire/savings/:id                         更新储蓄账户
DELETE /fire/savings/:id                         删除储蓄账户
GET    /fire/savings/:id/interest                利息记录 + 预测
POST   /fire/savings/:id/interest                添加利息记录
DELETE /fire/savings/:id/interest/:recordId      删除利息记录
GET    /fire/savings/interest-trend?year=YYYY    年度利息趋势
POST   /fire/families/ensure-personal            创建 personal family
GET    /fire/families/me                         我的家庭列表
POST   /fire/families                            创建家庭
PUT    /fire/families/:id                        更新家庭
POST   /fire/families/:id/invite                 邀请成员
DELETE /fire/families/:id/members/:userId        移除成员
POST   /fire/families/:id/leave                  离开家庭
GET    /fire/families/:id/invitations            邀请列表
POST   /fire/families/:id/invitations/:invId/resend  重发邀请
DELETE /fire/families/:id/invitations/:invId     取消邀请
GET    /fire/invitations/:token                  邀请详情（无需认证）
POST   /fire/invitations/:token/accept           接受邀请
GET    /fire/stock-prices?symbols=AAPL,MSFT      实时股价
GET    /fire/symbols/ticker-search?q=apple       股票搜索
GET    /fire/commodities                         商品列表
GET    /fire/feedback                            反馈
POST   /fire/feedback                            提交反馈
GET    /exchange-rates?base=USD&codes=SGD,HKD    汇率
GET    /health                                   健康检查
```

---

## 多货币处理

### 存储原则
- 每笔交易按实际货币存储，不做转换
- `currency_exchange` 表存储 `1 USD = X 外币`
- Portfolio stats 统一换算为 USD 返回

### 转换函数（`src/utils/currency-conversion.ts`）
```ts
// 外币 → USD：amount / rate
// USD → 外币：amount * rate
convertAmount(amount, fromCurrency, toCurrency, rateMap)
```

### 汇率缓存
- 每日由 `update-currency` 任务从 findata 服务更新
- 内存级缓存（当天有效），避免重复查询

### 市场与货币默认对应
| Market | Currency |
|--------|----------|
| US | USD |
| SGX | SGD |
| HK | HKD |
| CN | CNY |
| SE | SEK |
| COMMODITY | 各自货币 |

---

## 后台任务

任务入口：`tasks/index.ts`，通过工厂模式注册。

| 任务 | 频率 | 功能 |
|------|------|------|
| `update-currency` | 每日 01:00 | 从 findata 拉取汇率，更新 currency_exchange 表 |
| `process-dca` | 每日 01:00 | 生成到期的 dca_pending 记录，更新 next_run_date |
| `dividend-sync` | 每日 01:00 | 从 yfinance 同步股息数据（source='auto'） |
| `price-cache-cleanup` | 每周日 02:00 | 清理 7 天前的 price_cache 记录 |
| `portfolio-snapshot` | 每月 1 日 03:00 | 生成月末 portfolio_snapshots 快照 |

### portfolio-snapshot 生成逻辑
1. 遍历所有 portfolios
2. 计算各 ticker 持仓（computePositions from trades）
3. 获取当前股价，换算 USD
4. 写入 `portfolio_snapshots`（UNIQUE: portfolio_id + snapshot_date，已存在则跳过）

### 手动执行
```bash
cd firewise-api
npm run task update-currency
npm run task process-dca
npm run task portfolio-snapshot
```

---

## 环境变量

### firewise-web
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### firewise-api
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # 后端用 supabaseAdmin bypass RLS
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=              # 邮件服务（邀请邮件）
FROM_EMAIL=                  # 发件人地址
```

---

## 已知问题 / 技术债

| 问题 | 影响 | 说明 |
|------|------|------|
| `monthly_financial_snapshots` 表不存在 | `/fire/snapshots` 返回空数组 | 重构时 DROP，接口已做 fallback 处理 |
| `trades.dca_plan_id` 字段不存在 | DCA 来源靠 `notes='DCA'` 识别 | 低优先级 |
| SE 市场 migration 未执行 | 瑞典股票无法保存 | 需在 Supabase 执行 `006_add_se_market.sql` |
| Fire Dashboard 多货币总计 | 不同币种直接相加不精确 | 已知，显示为近似值 |
| FIRE 目标 $2000/月 硬编码 | 无法自定义 | 在 `fire/page.tsx` 的 `FIRE_TARGET_MONTHLY` |
