# 推进链路原型 · advance-flow-prototype

**推进 = system of record。默认只看「今天要你动手的事」。**

点顶上**蓝色按钮**（上面写着具体动词，比如「新建一条任务」「把讨论拆成任务」「确认纪要」「验收完成」）跟着走。  
右下角 ✦ 是灵基气泡；「更多」里才有日历 / 速记 / 全部任务 / 云之家。  
不会用？看首页提示条；关掉后可在 **更多 → 显示用法** 再打开。英雄区有 **「看一遍怎么用」**。顶栏进度是「建任务 / 闲聊 / 讨论拆 / 确认 / 验收」。

## 模型（没变）
推进是真相源。三条入口都在：直接建 / 闲聊落成 / 会后从速记拆——用蓝色按钮或灵基气泡发现，不并排三张卡。

## 跑
```bash
npm i && npm run dev
npm run build
npm run smoke   # Playwright → shots/
```

不自动部署 Vercel。

## 结构
`src/store.ts` 模型 + reducer；`src/App.tsx` 精简看板；`src/style.css`。
