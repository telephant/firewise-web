# Firewise — Architecture

## 仓库结构

| 仓库 | 说明 | 端口 |
|------|------|------|
| `firewise-web` | Next.js 前端 | 3002（dev） |
| `firewise-api` | Express 后端 API | 3001 |
| `firewise-findata` | 金融数据服务 | — |
| `firewise-agents` | AI Agent 服务 | — |

## 前端技术栈

- Next.js 16 / React 19 / TypeScript 5
- 两套 UI 系统（**严禁混用**）：
  - Ledger 模块：shadcn/ui + Tailwind（亮色）
  - Fire 模块：自定义 Fire UI（`/components/fire/ui`，暗色 Linear 风格）
- SWR 数据请求
- Supabase Auth（Google OAuth）
- recharts 图表

## 后端技术栈

- Express + TypeScript
- Supabase（PostgreSQL + RLS）
- yfinance / findata 服务拉取实时价格
- JWT 鉴权（Supabase session token）

## 数据库核心表

| 表 | 说明 |
|----|------|
| `portfolios` | 投资组合 |
| `trades` | 交易记录（buy/sell），market 支持 US/SGX/HK/CN/SE/COMMODITY |
| `holdings` | 持仓（由 trades 计算） |
| `dividends` | 股息记录 |
| `portfolio_snapshots` | 月度组合价值快照（每月自动生成） |
| `dca_plans` | DCA 计划 |
| `dca_pending` | 待确认定投，`trade_id` 关联到 trades |
| `savings` | 储蓄账户 |
| `interest_records` | 利息记录 |
| `families` / `family_members` | 家庭共享 |
| `ledgers` / `expenses` | 记账模块 |
| `transactions` | Fire 模块收支记录（月度统计来源） |
| `currency_exchange` | 汇率缓存 |

## API 结构

Base URL：`http://localhost:3001/api`

所有请求需携带：
- `Authorization: Bearer <supabase_access_token>`
- `x-family-id: <family_id>`（可选，不传则使用用户第一个 family）

主要路由前缀：
- `/portfolios` — 组合 CRUD
- `/portfolios/:id/trades` — 交易
- `/portfolios/:id/holdings` — 持仓
- `/portfolios/:id/dividends` — 股息
- `/portfolios/:id/stats` — 统计
- `/portfolios/:id/analytics` — 分析评分
- `/fire/dca` — DCA 计划
- `/fire/savings` — 储蓄
- `/fire/families` — 家庭
- `/fire/snapshots` — 月度快照（**表不存在，返回空数组**）
- `/fire/symbols/ticker-search` — 股票搜索
- `/fire/stock-prices` — 实时价格

## 关键约定

- CORS 已全开（`origin: true`），适合本地开发
- DCA 生成的 trade，`notes` 字段固定为 `'DCA'`，前端用此字段识别
- 市场与默认货币对应：US→USD，SGX→SGD，HK→HKD，CN→CNY，SE→SEK
- `belong_id` = `family_id`（即使是个人用户也有一个 personal family）
- portfolio_snapshots 由后台任务每月自动生成，不是实时计算
