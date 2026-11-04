# 推进链路原型 · advance-flow-prototype

**推进 = system of record。默认只看「要我定的」。**

点顶上 **「下一步」** 跟着走：新建 → 闲聊 → 讨论拆 → 确认 → 验收。  
右下角 ✦ 是灵基气泡；「更多」里才有日历 / 速记 / 全部任务 / 云之家。  
不会用？点 **「看一遍怎么用」**。

## 模型（没变）
推进是真相源。三条入口都在：直接建 / 闲聊落成 / 会后从速记拆——用「下一步」或灵基气泡发现，不并排三张卡。

## 跑
```bash
npm i && npm run dev
npm run build
npm run smoke   # Playwright → shots/
```

不自动部署 Vercel。

## 结构
`src/store.ts` 模型 + reducer；`src/App.tsx` 精简看板；`src/style.css`。
