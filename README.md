# 推进链路原型 · advance-flow-prototype

**推进 = system of record。** 三条并列入口落同一份推进模型；讨论/会议只是可选证据场景；速记 = 证据层（无管理门禁）。**不做会议类型包。**

## 产品模型
1. **三条入口（等价）**
   - ① **直接建任务** — 跳过会议，可选原话锚点
   - ② **闲聊落成任务** — ⌘K / 跟灵基说，边聊边起草
   - ③ **会后从速记拆任务** — 可选开证据场景 → 采证 → 拆到推进
2. **速记 = 证据层**：原话锚点 · 会中笔记/重点 · AI 稿 + 人工稿素材。不做确认/分派/催办。
3. **王剑诉求一律走任务**：每条草稿/任务可溯源原话；纪要作产物挂父卡 + 确认子卡；反对标哪一条 → 修改子卡；行动闭环回写产物；跨次带同来源未完成；**目的/共识是任务集字段，不是会议类型**。

## 保留
角色切换 · 要我定的 · 全部任务 · 云之家只读 · 自动演示（①→②→③+确认）· 灵基侧栏流式。

```bash
npm i && npm run dev
npm run build
npm run smoke   # Playwright → shots/
```

Vercel：Framework 选 Vite；`vercel.json` **只含 SPA rewrite**（不含 buildCommand）。本仓不自动部署。

## 结构
`src/store.ts` 模型 + reducer；`src/App.tsx` 视图 + 链路面板 + 三路径自动演示；`src/style.css` glass + AI glow。
