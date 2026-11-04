import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
mkdirSync('shots', { recursive: true })
const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 2800))
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 980 } })
const errs = []; p.on('pageerror', e => errs.push(e.message))
const shot = n => p.screenshot({ path: `shots/${n}.png`, fullPage: true })
const click = async sel => { await p.locator(sel).first().click(); await p.waitForTimeout(350) }
const role = r => click(`[data-testid=role-${r}]`)
const nav = t => click(`nav button:has-text("${t}")`)
await p.goto('http://localhost:4173/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400)

// 看板主场 + 本链路进度
await shot('01-focus-home')
await p.locator('[data-testid=flow-stepper]').waitFor()

// ① 直接建 · 浮层 · 不跳页
await click('[data-testid=entry-direct]'); await shot('01a-create-direct')
await p.fill('[data-testid=create-title]', '巡检表字段精简到 12 项')
await p.fill('[data-testid=create-quote]', '阿炜说周五前出新版字段')
await click('[data-testid=create-submit]'); await shot('01b-direct-landed')
// 应仍在看板
const afterCreate = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('advance-flow-v4')); return { view: s.view, overlay: s.overlay, flowStep: s.flowStep } })
console.log('after create', afterCreate)

// ③ 证据场景 · 看板浮层
await click('[data-testid=entry-steno]'); await p.waitForTimeout(4500); await shot('02-room-evidence')
await click('[data-testid=end]'); await click('[data-testid=minutes-toggle]')
await shot('03-end-drafts')
await click('[data-testid=dispatch]'); await shot('04-focus-liuyang')
await role('阿炜'); await shot('05-focus-awei'); await click('[data-testid=act-take]')
await role('刘洋'); await click('[data-testid=lingee-submit]'); await p.locator('[data-kind=灵基交稿]').click(); await shot('06-lingee-draft')
await click('[data-testid=act-send-confirm]'); await shot('07-nudge')
await role('老王'); await p.fill('[data-testid=obj-input]', '拍照必填要分门店类型，便利店先不强制'); await click('[data-testid=act-object]')
await role('阿炜'); await click('[data-testid=act-confirm]')
await role('刘洋'); await shot('08-revise-dispatched'); await click('[data-testid=act-revised]')
await role('老王'); await click('[data-testid=act-confirm]')
for (const r of ['阿炜', '老王', '张三']) { await role(r); await nav('全部任务')
  for (let k = 0; k < 4; k++) { const f = p.locator('button.fold:has-text("▸")'); if (await f.count()) await f.first().click() }
  for (let i = 0; i < 10; i++) { const take = p.locator('[data-testid=trow] button:has-text("接下")'); if (await take.count()) await take.first().click(); const sub = p.locator('[data-testid=submit-review]'); if (await sub.count()) await sub.first().click(); await p.waitForTimeout(80) } }
await role('刘洋'); await click('[data-testid=back-board]'); await shot('09-review-children')
while (await p.locator('[data-testid=act-accept]').count()) { await click('[data-testid=act-accept]') }
await nav('全部任务'); for (let k = 0; k < 4; k++) { const f = p.locator('button.fold:has-text("▸")'); if (await f.count()) await f.first().click() } await shot('10-all-tasks')
await click('[data-testid=back-board]')
await nav('日历'); await shot('11-calendar-writeback')
await click('[data-testid=back-board]')
await nav('全部任务'); const src = p.locator('button.src'); if (await src.count()) await src.first().click(); await shot('12-source-highlight')
await click('[data-testid=back-board]')
await nav('云之家'); await shot('13-yzj-readonly')
await click('[data-testid=back-board]')

// 入口② 闲聊 · 右侧栏，不跳独立对话页
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400)
await click('[data-testid=cmdk]'); await shot('15-cmdk')
await click('[data-testid=cmd-sug]'); await p.waitForTimeout(600); await shot('16-chat-land')
const chatState = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('advance-flow-v4')); return { view: s.view, overlay: s.overlay, chat: s.chat.length } })
console.log('after cmdk chat', chatState)
await click('[data-testid=chat-pill]'); await p.waitForTimeout(500); await shot('17-chat-end')
await click('[data-testid=dispatch]'); await shot('18-chat-dispatched')

// 闲聊 → 证据场景浮层
await click('[data-testid=cmdk]')
await p.fill('[data-testid=cmd-input]', '帮我开一场门店巡检讨论'); await p.keyboard.press('Enter'); await p.waitForTimeout(500)
await shot('19-chat-discuss')
const evidPill = p.locator('[data-testid=chat-pill]:has-text("进入证据"), [data-testid=lingee-pill]:has-text("进入证据")')
if (await evidPill.count()) await evidPill.first().click()
else {
  const any = p.locator('[data-testid=chat-pill], [data-testid=lingee-pill]')
  if (await any.count()) await any.first().click()
}
await p.waitForTimeout(3500); await shot('20-steno-room')
await click('[data-testid=end]'); await shot('21-steno-end')

const setDone = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('advance-flow-v4')).tasks.filter(t => t.kind === 'set').map(t => t.state) } catch { return [] } })
console.log('task set states:', setDone)

await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300)
await click('[data-testid=demo]'); await p.waitForTimeout(48000); await shot('14-auto-demo-end')
const st = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('advance-flow-v4')) } catch { return null } })
console.log('demo end view:', st?.view, 'overlay:', st?.overlay, 'flowStep:', st?.flowStep, 'step:', st?.step, 'entry:', st?.entry, 'sets:', st?.tasks?.filter(t => t.kind === 'set').map(t => ({ state: t.state, purpose: !!t.purpose, consensus: t.consensus?.length })))
console.log('page errors:', errs)
if (errs.length) process.exitCode = 1
if (afterCreate.view !== 'focus' || afterCreate.overlay !== null) { console.error('FAIL: create should stay on board'); process.exitCode = 1 }
if (chatState.view !== 'focus') { console.error('FAIL: chat should stay on board view=focus'); process.exitCode = 1 }
await b.close(); srv.kill()
