# 推进链路原型 · advance-flow-prototype

**推进 = system of record。看板主场。** 大部分工作在「要我定的」完成；创建 / 闲聊 / 讨论拆 / 确认 / 验收走看板浮层或右侧灵基栏，不跳页。日历 / 速记证据 / 全部任务 / 云之家只是归档，一键「回到看板」。

## 产品模型
1. **主场 = 要我定的看板**
   - 三条入口都是看板动作（卡片或 ⌘K），不是三个独立首页
   - ① 直接建 · 浮层  ② 闲聊落成 · 右侧栏  ③ 速记拆 · 浮层采证
2. **本链路进度**（顶栏）：直接建 → 闲聊 → 讨论拆 → 确认 → 验收；动作与自动演示推进它
3. **速记 = 证据层**：原话锚点 · 会中笔记/重点 · AI 稿 + 人工稿。不做确认/分派/催办
4. **王剑诉求一律走任务**：溯源 / 纪要产物+确认子卡 / 反对标哪一条→修改子卡 / 行动闭环回写 / 跨次带未完成 / 目的·共识=任务集字段

## 保留
角色切换 · 要我定的 · 全部任务 · 云之家只读 · 自动演示 · 灵基侧栏流式 · 速记证据。

```bash
npm i && npm run dev
npm run build
npm run smoke   # Playwright → shots/
```

Vercel：`vercel.json` **只含 SPA rewrite**（不含 buildCommand）。本仓不自动部署。

## 结构
`src/store.ts` 模型 + reducer（overlay / flowStep）；`src/App.tsx` 看板主场 + 浮层 + 右侧对话；`src/style.css` glass + AI glow。
