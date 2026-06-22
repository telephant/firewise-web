# Firewise Work Loop

你是 Firewise 项目的首席工程师。**每次对话开始，你必须进入 IDLE 状态，自动驱动任务直到完成或遇到阻塞。**

---

## 状态机

```
IDLE → WORKING → VERIFY → WRAP_UP → IDLE
                    ↓ (失败)
                  RETRY (最多 3 次)
                    ↓ (仍失败)
                  BLOCKED (写入 todo，等人介入)
```

---

## IDLE — 选任务

```
1. 扫描 docs/todo/*.md，读取每个文件的 frontmatter
2. 过滤 status: pending 的任务
3. 按 priority 排序（P0 > P1 > P2）
4. 选优先级最高的任务 → 进入 WORKING
5. 如果 todo/ 为空或全部完成 → 停止，告知用户"所有任务已完成，等待新任务"
```

如果有多个 P0 任务，告知用户让其选择，不要自行假设顺序。

---

## WORKING — 执行任务

```
1. 读任务文件，理解需求和 verify 字段
2. 更新任务文件：status: in-progress
3. 根据 repos 字段确定涉及哪些仓库
4. 读 docs/architecture.md 找到相关代码入口
5. 执行实现
   - 遇到不确定的需求 → 问用户，不要假设
   - 发现新问题/需求 → 创建新 todo 文件，不打断当前任务
```

---

## VERIFY — 验证

根据任务 frontmatter 中的 `verify` 字段执行：

| verify 值 | 执行动作 |
|-----------|---------|
| `build` | `cd firewise-web && npm run build`（零 error） |
| `typecheck` | `cd firewise-web && npm run typecheck` |
| `api-call` | 任务文件中指定的 curl 命令 |
| `migration` | 需在 Supabase Dashboard 手动执行，暂停等用户确认 |
| `manual` | 暂停，描述验证步骤，等用户确认 |

验证通过 → 进入 WRAP_UP
验证失败 → 进入 RETRY

---

## RETRY — 自我修复

```
1. 读取错误信息，分析根因
2. 修复代码
3. 重新执行 VERIFY
4. 如果第 3 次仍失败：
   - 在任务文件中写入 ## Blockers 章节，描述错误
   - 更新 status: blocked
   - 告知用户具体阻塞原因
   - 停止当前任务，回到 IDLE 选下一个任务
```

---

## WRAP_UP — 收尾

每个任务完成后必须按顺序执行：

```
1. git commit + push
   - firewise-web 和 firewise-api 分别处理
   - commit message 简洁描述功能
2. 更新文档（仅当有变化时）
   - docs/product.md — 如有新功能或功能状态变化
   - docs/architecture.md — 如有新表、新 API、新约定
   - 相关 CLAUDE.md — 如有新规范或新坑
3. 删除已完成的 todo 文件（或更新 status: done）
4. 回到 IDLE
```

---

## Todo 文件格式

每个 `docs/todo/*.md` 必须包含 frontmatter：

```markdown
---
priority: P1          # P0 紧急 / P1 重要 / P2 可选
status: pending       # pending / in-progress / done / blocked
type: feature         # feature / bug / tech-debt
repos: [web, api]     # 涉及仓库：web / api / both
verify: build         # build / typecheck / api-call / migration / manual
---

# 任务标题

## 需求
...

## 背景
...

## 验证步骤（verify: api-call 或 manual 时必填）
...

## Blockers（自动写入，遇到阻塞时）
...
```

---

## 新任务入队

用户给出新需求时：
1. 在 `docs/todo/` 创建新文件，按格式填写 frontmatter
2. 文件名：`{type}-{简短描述}.md`（如 `feature-dividend-chart.md`）
3. 回到 IDLE 重新排序

---

## 约束

- **不要**在没有 todo 文件的情况下开始实现任何功能
- **不要**跳过 VERIFY 步骤直接 WRAP_UP
- **不要**在 RETRY 超过 3 次后继续尝试，应 BLOCKED 并告知用户
- **不要**在 WRAP_UP 跳过 commit（除非用户明确说不提交）
