import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
mkdirSync('shots', { recursive: true })
const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 2800))
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', e => errs.push(e.message))
const shot = n => p.screenshot({ path: `shots/${n}.png`, fullPage: true })
const click = async sel => { await p.locator(sel).first().click(); await p.waitForTimeout(350) }
const role = async r => {
  await click('[data-testid=role-menu]')
  await click(`[data-testid=role-${r}]`)
}
const moreNav = async t => {
  await click('[data-testid=more-btn]')
  await click(`[data-testid=nav-${t}]`)
}
await p.goto('http://localhost:4173/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400)

// 默认主场：英雄文案 + 一条示例 + 具体动词 CTA + 首跑提示，无入口墙
await shot('01-focus-home')
await p.locator('[data-testid=flow-stepper]').waitFor()
await p.locator('[data-testid=board-hero]').waitFor()
const heroText = await p.locator('[data-testid=board-hero]').innerText()
if (!heroText.includes('今天要你动手的事') || !heroText.includes('先建一条任务')) {
  console.error('FAIL: hero missing', heroText); process.exitCode = 1
}
await p.locator('[data-testid=first-run-tip]').waitFor()
const tipText = await p.locator('[data-testid=first-run-tip]').innerText()
if (!tipText.includes('蓝色按钮') || !tipText.includes('灵基')) {
  console.error('FAIL: tip copy', tipText); process.exitCode = 1
}
const nextLabel = (await p.locator('[data-testid=next-step]').innerText()).trim()
console.log('home CTA:', nextLabel)
if (nextLabel === '下一步' || /^下一步$/.test(nextLabel)) {
  console.error('FAIL: vague 下一步 alone'); process.exitCode = 1
}
if (!nextLabel.includes('新建')) {
  console.error('FAIL: home CTA should be concrete create verb', nextLabel); process.exitCode = 1
}
const frows = await p.locator('[data-testid=frow]').count()
if (frows !== 1) { console.error('FAIL: expect exactly 1 sample focus row, got', frows); process.exitCode = 1 }
await p.locator('[data-testid=sample-tag]').waitFor()
await p.locator('[data-testid=hero-demo]').waitFor()
const entryWall = await p.locator('[data-testid=entry-direct]').count()
if (entryWall) { console.error('FAIL: entry cards should be gone'); process.exitCode = 1 }
const railOpen = await p.locator('[data-testid=lingee-rail]').count()
if (railOpen) { console.error('FAIL: lingee should start as bubble'); process.exitCode = 1 }
await p.locator('[data-testid=lingee-open]').waitFor()
await click('[data-testid=tip-dismiss]')
if (await p.locator('[data-testid=first-run-tip]').count()) {
  console.error('FAIL: tip should dismiss'); process.exitCode = 1
}

// 下一步 → 新建浮层
await click('[data-testid=next-step]'); await shot('01a-create-direct')
await p.fill('[data-testid=create-title]', '巡检表字段精简到 12 项')
await p.fill('[data-testid=create-quote]', '阿炜说周五前出新版字段')
await click('[data-testid=create-submit]'); await shot('01b-direct-landed')
const afterCreate = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('advance-flow-v6')); return { view: s.view, overlay: s.overlay, flowStep: s.flowStep } })
console.log('after create', afterCreate)
const afterCreateCta = (await p.locator('[data-testid=next-step]').innerText()).trim()
console.log('after create CTA:', afterCreateCta)
if (afterCreateCta === '下一步' || afterCreateCta.startsWith('下一步')) {
  console.error('FAIL: CTA still uses 下一步 prefix', afterCreateCta); process.exitCode = 1
}
const afterRows = await p.locator('[data-testid=frow]').count()
if (afterRows < 2) { console.error('FAIL: created task should appear on board for creator, rows=', afterRows); process.exitCode = 1 }
await shot('01c-create-visible')

// 开讨论：灵基气泡 → 会后从速记拆
await click('[data-testid=lingee-open]')
await p.waitForTimeout(200)
const stenoPill = p.locator('[data-testid=lingee-pill]:has-text("速记")')
if (await stenoPill.count()) await stenoPill.first().click()
else {
  await click('[data-testid=lingee-close]')
  await moreNav('calendar')
  await click('[data-testid=pull-discussion]')
}
await p.waitForTimeout(4500); await shot('02-room-evidence')
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
for (const r of ['阿炜', '老王', '张三']) {
  await role(r); await moreNav('tasks')
  for (let k = 0; k < 4; k++) { const f = p.locator('button.fold:has-text("▸")'); if (await f.count()) await f.first().click() }
  for (let i = 0; i < 10; i++) { const take = p.locator('[data-testid=trow] button:has-text("接下")'); if (await take.count()) await take.first().click(); const sub = p.locator('[data-testid=submit-review]'); if (await sub.count()) await sub.first().click(); await p.waitForTimeout(80) }
}
await role('刘洋'); await click('[data-testid=back-board]'); await shot('09-review-children')
while (await p.locator('[data-testid=act-accept]').count()) { await click('[data-testid=act-accept]') }
await moreNav('tasks'); for (let k = 0; k < 4; k++) { const f = p.locator('button.fold:has-text("▸")'); if (await f.count()) await f.first().click() } await shot('10-all-tasks')
await click('[data-testid=back-board]')
await moreNav('calendar'); await shot('11-calendar-writeback')
await click('[data-testid=back-board]')
await moreNav('tasks'); const src = p.locator('button.src'); if (await src.count()) await src.first().click(); await shot('12-source-highlight')
await click('[data-testid=back-board]')
await moreNav('yzj'); await shot('13-yzj-readonly')
await click('[data-testid=back-board]')

// 闲聊路径
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400)
await click('[data-testid=lingee-open]')
await click('[data-testid=next-step]') // may open create — we want chat
// Reset and go: next opens create; close and force chat via cmd from keyboard
await p.keyboard.press('Escape')
await p.keyboard.press('Meta+k')
await shot('15-cmdk')
await click('[data-testid=cmd-sug]'); await p.waitForTimeout(600); await shot('16-chat-land')
const chatState = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('advance-flow-v6')); return { view: s.view, overlay: s.overlay, chat: s.chat?.length } })
console.log('after cmdk chat', chatState)
await click('[data-testid=chat-pill]'); await p.waitForTimeout(500); await shot('17-chat-end')
await click('[data-testid=dispatch]'); await shot('18-chat-dispatched')

await p.keyboard.press('Meta+k')
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

await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300)
await click('[data-testid=demo]'); await p.waitForTimeout(48000); await shot('14-auto-demo-end')
const st = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('advance-flow-v6')) } catch { return null } })
console.log('demo end view:', st?.view, 'overlay:', st?.overlay, 'flowStep:', st?.flowStep, 'step:', st?.step)
console.log('page errors:', errs)
if (errs.length) process.exitCode = 1
if (afterCreate.view !== 'focus' || afterCreate.overlay !== null) { console.error('FAIL: create should stay on board'); process.exitCode = 1 }
if (chatState.view !== 'focus') { console.error('FAIL: chat should stay on board view=focus'); process.exitCode = 1 }
await b.close(); srv.kill()
