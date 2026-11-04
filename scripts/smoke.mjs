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

await shot('01-focus-home')
await click('[data-testid=entry-advance]'); await shot('01b-calendar')
await click('[data-testid=cal-discussion]'); await p.waitForTimeout(4500); await shot('02-room')
await click('[data-testid=end]'); await click('[data-testid=minutes-toggle]')
await p.locator('[data-testid=draft] input[type=checkbox]').nth(3).click(); await p.locator('[data-testid=draft] input[type=checkbox]').nth(3).click()
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
await role('刘洋'); await nav('要我定的'); await shot('09-review-children')
while (await p.locator('[data-testid=act-accept]').count()) { await click('[data-testid=act-accept]') }
await nav('全部任务'); for (let k = 0; k < 4; k++) { const f = p.locator('button.fold:has-text("▸")'); if (await f.count()) await f.first().click() } await shot('10-all-tasks')
await nav('日历'); await shot('11-calendar-writeback')
await nav('全部任务'); await click('button.src'); await shot('12-source-highlight')
await nav('云之家只读'); await shot('13-yzj-readonly')

// 闲聊入口
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400)
await click('[data-testid=cmdk]'); await shot('15-cmdk')
await click('[data-testid=cmd-sug]'); await p.waitForTimeout(600); await shot('16-chat-discuss')
await click('[data-testid=chat-pill]'); await p.waitForTimeout(3500); await shot('17-chat-room')
await click('[data-testid=end]'); await shot('18-chat-end')
await click('[data-testid=dispatch]'); await shot('19-chat-dispatched')
await click('[data-testid=cmdk]')
await p.fill('[data-testid=cmd-input]', '约个会'); await p.keyboard.press('Enter'); await p.waitForTimeout(500)
await shot('20-chat-meet')
const meetPill = p.locator('[data-testid=chat-pill]:has-text("确认时段")')
if (await meetPill.count()) await meetPill.first().click()
else await click('[data-testid=lingee-pill]')
await p.waitForTimeout(2000); await shot('21-meet-room')

const setDone = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('advance-flow-v2')).tasks.filter(t => t.kind === 'set').map(t => t.state) } catch { return [] } })
console.log('task set states:', setDone)

await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300)
await click('[data-testid=demo]'); await p.waitForTimeout(52000); await shot('14-auto-demo-end')
const st = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('advance-flow-v2')) } catch { return null } })
console.log('demo end view:', st?.view, 'step:', st?.step, 'sets:', st?.tasks?.filter(t => t.kind === 'set').map(t => t.state))
console.log('page errors:', errs)
if (errs.length) process.exitCode = 1
await b.close(); srv.kill()
