# 推进链路原型 · advance-flow-prototype

把 **日历 / 讨论（会议室）/ 速记 / 推进 / 灵基** 丝滑串成一条可点击的端到端链路。Vite + React + TypeScript 纯静态 SPA。两条一等入口都落同一份推进模型：

- **从推进出发**：任务卡「拉个讨论」/ 日历讨论块 → 会议室 → 速记只记录 → 结束页留/丢草稿 → dispatch → 要我定的
- **从闲聊出发**：⌘K /「跟灵基说」空开讨论或口述；灵基边聊边起草，也可「约个会」写日历时段；结束后同样落推进

视觉：沿用 super-entry-ref / advance-super-entry-plus 的 lgwk 配色与密度，加 soft glass、subtle motion、灵基紫 glow、流式打字。

```bash
npm i && npm run dev
npm run build
npm run smoke   # Playwright → shots/
```

Vercel：项目 Framework 选 Vite；`vercel.json` 只含 SPA rewrite（不含 buildCommand）。

## 怎么玩
- 首页两张入口卡，或顶栏 ⌘K /「跟灵基说」
- 右上角切角色：刘洋 / 老王 / 阿炜 / 张三
- 右侧 **灵基侧栏**：思考中 / 流式输出 / 原话 chip / 建议下一步 pill
- 再右 **链路** 面板：现有(绿) / 新增(橙) API + 调用记录
- 「▶ 自动演示」走通 **推进 + 闲聊** 两条入口；「一键重置」；「撤销」

## 链路
1. 入口（推进或闲聊）→ 2 讨论室速记 → 3 灵基起草 → 4 要我定的 → 5 推进执行 → 6 纪要确认/异议自动派修改单 → 7 验收 → 8 日历回流 / 原话 / 云之家只读

## 结构
`src/store.ts` 模型 + reducer（含 chat / scheduleMeeting / lingee）；`src/App.tsx` 视图 + ⌘K + 灵基侧栏 + 双路径自动演示；`src/style.css` glass + AI glow。
