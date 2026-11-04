import { useEffect, useReducer, useRef, useState } from 'react'
import { A, ADV_ID, initial, reduce, ROLES, S, STATE_CN, Task, TODAY, TRANSCRIPT, WEEK, focusRows, FocusRow, Who, TState, STENO_ID } from './store'

const KEY = 'advance-flow-v1'
type H = { cur: S; past: S[] }
function hreduce(h: H, a: A | { type: 'undo' }): H {
  if (a.type === 'undo') return h.past.length ? { cur: { ...h.past[0], toast: '已撤销' }, past: h.past.slice(1) } : h
  const next = reduce(h.cur, a)
  const silent = ['line', 'toast', 'demo', 'view', 'role'].includes(a.type)
  return { cur: next, past: silent ? h.past : [h.cur, ...h.past].slice(0, 30) }
}
const load = (): H => { try { const v = localStorage.getItem(KEY); if (v) return { cur: { ...JSON.parse(v), demo: false }, past: [] } } catch {} return { cur: initial(), past: [] } }

export const STEPS: { n: number; name: string; apis: [string, '现有' | '新增'][] }[] = [
  { n: 1, name: '日历 · 发起讨论', apis: [['GET /calendar/week', '现有'], ['calendar.bindTask', '新增'], ['POST /discussions {source:item:<advanceId>}', '新增']] },
  { n: 2, name: '讨论室 · 速记只记录', apis: [['steno.start', '现有'], ['meeting:<userId>:<stenoId>', '现有']] },
  { n: 3, name: '结束 · 灵基起草', apis: [['GET /steno/:id/transcript', '现有'], ['POST /drafts', '新增'], ['dispatch-batch', '现有']] },
  { n: 4, name: '要我定的 · 聚焦', apis: [['GET /focus?role=', '现有'], ['PATCH /items/:id', '现有'], ['undo', '现有']] },
  { n: 5, name: '推进 · 执行', apis: [['PATCH /items/:id/state', '现有'], ['lingee.submitReview', '现有']] },
  { n: 6, name: '正式纪要 · 确认', apis: [['POST /minutes/:id/confirm', '新增'], ['POST /items/:id/comments', '现有'], ['lingee.autoDispatch(修改纪要)', '新增']] },
  { n: 7, name: '收口 · 验收', apis: [['POST /items/:id/accept', '现有'], ['POST /items/:id/return', '现有']] },
  { n: 8, name: '回流 · 日历/原话/云之家', apis: [['calendar.writeback', '新增'], ['source → steno#line', '新增'], ['GET /yzj/advance 只读', '现有']] },
]

const avOf = (w: Who) => ROLES.find(r => r.name === w)?.av ?? 'violet'
const Av = ({ who, s = '' }: { who: Who; s?: string }) => <span className={`av ${s}`} data-av={who === '灵基' ? 'lingee' : avOf(who)}>{who === '灵基' ? '✦' : who ? who.slice(-1) : '?'}</span>
const Tag = ({ api, st }: { api: string; st: '现有' | '新增' }) => <code className={`api ${st === '新增' ? 'new' : 'old'}`}>{api}<i>{st}</i></code>

export default function App() {
  const [h, d] = useReducer(hreduce, undefined, load)
  const s = h.cur
  const dispatch = (a: A) => d(a)
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(s)) }, [s])
  useEffect(() => { if (s.toast) { const t = setTimeout(() => d({ type: 'toast' }), 3500); return () => clearTimeout(t) } }, [s.toast])
  // 速记逐行出现
  useEffect(() => { if (s.view === 'room' && s.recording && s.lines < TRANSCRIPT.length) { const t = setTimeout(() => d({ type: 'line' }), s.demo ? 450 : 1100); return () => clearTimeout(t) } }, [s.view, s.recording, s.lines, s.demo])
  useDemo(s, dispatch)

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><b>推进</b><span>日历 · 讨论 · 速记 · 推进 · 灵基 —— 端到端原型</span></div>
        <nav>
          {([['calendar', '日历'], ['focus', '要我定的'], ['tasks', '全部任务'], ['yzj', '云之家只读']] as const).map(([v, n]) =>
            <button key={v} className={s.view === v ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: v })}>{n}</button>)}
          {s.discussion && <button className={s.view === 'room' || s.view === 'end' ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: s.drafts.length ? 'end' : 'room' })}>讨论室</button>}
        </nav>
        <div className="roles">{ROLES.map(r => <button key={r.name} data-testid={`role-${r.name}`} className={s.role === r.name ? 'on' : ''} onClick={() => dispatch({ type: 'role', role: r.name })}><Av who={r.name} s="s20" />{r.name}<small>{r.tag}</small></button>)}</div>
        <div className="ctl">
          <button className="ghost" onClick={() => d({ type: 'undo' })} disabled={!h.past.length}>撤销</button>
          <button className="ghost" onClick={() => { localStorage.removeItem(KEY); dispatch({ type: 'reset' }) }}>一键重置</button>
          <button className="primary" data-testid="demo" onClick={() => { if (!s.demo) { localStorage.removeItem(KEY); dispatch({ type: 'reset' }) } setTimeout(() => dispatch({ type: 'demo', on: !s.demo }), 50) }}>{s.demo ? '停止演示' : '▶ 自动演示'}</button>
        </div>
      </header>
      <div className="body">
        <main>
          {s.view === 'calendar' && <Calendar s={s} dispatch={dispatch} />}
          {s.view === 'room' && <Room s={s} dispatch={dispatch} />}
          {s.view === 'end' && <End s={s} dispatch={dispatch} />}
          {s.view === 'focus' && <Focus s={s} dispatch={dispatch} undo={() => d({ type: 'undo' })} />}
          {s.view === 'tasks' && <AllTasks s={s} dispatch={dispatch} />}
          {s.view === 'yzj' && <Yzj s={s} />}
        </main>
        <Chain s={s} />
      </div>
      {s.toast && <div className="toast">{s.toast}<button onClick={() => d({ type: 'undo' })}>撤销</button></div>}
    </div>
  )
}
type P = { s: S; dispatch: (a: A) => void }

function Chain({ s }: { s: S }) {
  return <aside className="chain">
    <h3>链路 <small>当前第 {s.step} 步</small></h3>
    <ol>{STEPS.map(st => <li key={st.n} className={st.n === s.step ? 'cur' : st.n < s.step ? 'past' : ''}>
      <b>{st.n}</b><div><div className="nm">{st.name}</div>{st.n === s.step && <div className="apis">{st.apis.map(([a, k]) => <Tag key={a} api={a} st={k} />)}</div>}</div></li>)}</ol>
    <h4>调用记录</h4>
    <ul className="log">{s.log.length ? s.log.map((l, i) => <li key={i}><Tag api={l.api} st={l.status} /><span>{l.note}</span></li>) : <li className="weak">还没有调用</li>}</ul>
  </aside>
}

// ───── 1. 日历 ─────
function Calendar({ s, dispatch }: P) {
  const hours = Array.from({ length: 11 }, (_, i) => 9 + i)
  const evs: import('./store').CalEvent[] = [...s.events, ...s.tasks.filter(t => t.due && t.kind === 'task' && t.parentId && t.state !== 'done' && !s.events.some(e => e.title === `截止 · ${t.title}`)).map(t => ({ id: 'd' + t.id, day: t.due!, start: 18, end: 18.5, title: `截止 · ${t.title}`, kind: 'deadline' as const }))]
  const adv = s.tasks.find(t => t.id === ADV_ID)!
  return <div className="cal">
    <div className="vhead"><h2>日历 · 11 月第 1 周</h2>
      <button className="ghost" data-testid="blank-discussion" onClick={() => dispatch({ type: 'startDiscussion', title: '临时讨论' })}>＋ 发起讨论（不绑任务）</button></div>
    <div className="calwrap">
      <div className="grid">
        <div className="gh" />{WEEK.map(d => <div key={d} className={`gh ${d === TODAY ? 'today' : ''}`}>{'一二三四五六日'[WEEK.indexOf(d)]} <b>{d.slice(8)}</b></div>)}
        {hours.map(hh => <div key={hh} className="row"><div className="hr">{hh}:00</div>{WEEK.map(d => <div key={d} className="cell">
          {evs.filter(e => e.day === d && Math.floor(e.start) === hh).map(e => <div key={e.id} className={`ev ${e.kind}`} data-testid={e.kind === 'discussion' ? 'cal-discussion' : undefined}
            onClick={() => e.kind === 'discussion' && e.taskId && dispatch({ type: 'startDiscussion', title: e.title, source: `item:${e.taskId}`, boundTask: e.taskId })}>
            <b>{e.title}</b>{e.taskId && <small>🔗 绑定 {e.kind === 'next' ? '任务集' : adv.title}</small>}{e.kind === 'deadline' && <small>回写自推进</small>}{e.kind === 'next' && <small>回写自速记</small>}</div>)}
        </div>)}</div>)}
      </div>
      <div className="side">
        <h4>本周任务</h4>
        {s.tasks.filter(t => t.kind === 'task' && !t.parentId && t.state !== 'done').map(t => <div key={t.id} className="tcard">
          <div><b>{t.title}</b><small>{t.assignee || '没人接'} · {STATE_CN[t.state]}{t.due ? ` · ${t.due.slice(5)} 截止` : ''}</small></div>
          <button className="link" data-testid={t.id === ADV_ID ? 'pull-discussion' : undefined} onClick={() => dispatch({ type: 'startDiscussion', title: `${t.title}对齐`, source: `item:${t.id}`, boundTask: t.id })}>拉个讨论</button></div>)}
        <p className="hint">点日历里紫色讨论块 = 绑定任务的讨论；任务卡「拉个讨论」= 来源 item:&lt;advanceId&gt;。</p>
      </div>
    </div>
  </div>
}

// ───── 2. 讨论室 ─────
function Room({ s, dispatch }: P) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector('.hl')?.scrollIntoView({ block: 'center' }) }, [s.highlight])
  const n = s.lines
  return <div className="room">
    <div className="vhead"><h2>讨论 · {s.discussion?.title ?? '门店巡检改版对齐'}</h2>
      {s.discussion?.source && <code className="api old">{s.discussion.source}</code>}</div>
    <div className="people">{ROLES.map(r => <span key={r.name}><Av who={r.name} />{r.name}</span>)}</div>
    {s.recording ? <div className="strip"><i className="rec" />速记记录中 · 只记录 <span>meeting:u_liuyang:{STENO_ID}</span><em><span className="spark">✦</span> 灵基 记下 {Math.min(4, TRANSCRIPT.slice(0, n).filter((_, i) => [1, 2, 3, 5].includes(i)).length)} 件</em></div>
      : <div className="strip done">速记已结束 · 原文只读{s.highlight !== undefined && <em>已定位到原话 L{s.highlight}</em>}</div>}
    <div className="tr" ref={ref}>{TRANSCRIPT.slice(0, n).map((l, i) => <div key={i} className={`ln ${s.highlight === i ? 'hl' : ''}`}><Av who={l.who} s="s20" /><b>{l.who}</b><small>{l.t}</small><p>{l.text}</p></div>)}
      {s.recording && n < TRANSCRIPT.length && <div className="typing">…</div>}</div>
    {s.recording && <button className="primary big" data-testid="end" onClick={() => dispatch({ type: 'end' })}>结束讨论</button>}
  </div>
}

// ───── 3. 结束页 ─────
function End({ s, dispatch }: P) {
  const [edit, setEdit] = useState<string | null>(null)
  return <div className="end">
    <div className="vhead"><h2><span className="spark">✦</span> 灵基从速记里起草了 {s.drafts.filter(d => !d.minutes).length} 件</h2><code className="api new">POST /drafts<i>新增</i></code></div>
    <p className="weak">只决定「要不要变成任务」。负责人和时间是建议，之后可在行里改。</p>
    <div className="parent">任务集 · {s.discussion?.title}<small>父任务 · 刘洋发起{s.discussion?.boundTask ? ` · 挂在「门店巡检改版」下` : ''}</small></div>
    {s.drafts.map(d => <div key={d.id} className={`draft ${d.keep ? '' : 'drop'}`} data-testid="draft">
      <label className="chk"><input type="checkbox" checked={d.keep} onChange={() => dispatch({ type: 'keep', id: d.id })} />{d.keep ? '要' : '不要'}</label>
      <div className="dm">{edit === d.id ? <input autoFocus defaultValue={d.title} onBlur={e => { dispatch({ type: 'editDraft', id: d.id, title: e.target.value }); setEdit(null) }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        : <b onClick={() => setEdit(d.id)} title="点击改一句">{d.title} <span className="pen">✎</span></b>}
        <blockquote onClick={() => dispatch({ type: 'jumpSource', line: d.line })}>原话 L{d.line}：「{d.quote}」</blockquote></div>
      <select value={d.assignee} onChange={e => dispatch({ type: 'draftAssignee', id: d.id, who: e.target.value as Who })}>{['灵基', ...ROLES.map(r => r.name)].map(n => <option key={n}>{n}</option>)}</select>
      <span className="due">{d.due.slice(5)}</span></div>)}
    <label className="toggle"><input type="checkbox" data-testid="minutes-toggle" checked={s.minutesOn} onChange={() => dispatch({ type: 'toggleMinutes' })} /> 整理正式纪要并请人确认（老王、阿炜）</label>
    <div className="foot"><button className="primary" data-testid="dispatch" onClick={() => dispatch({ type: 'dispatch' })}>派出 {s.drafts.filter(d => d.keep).length} 件</button><code className="api old">dispatch-batch<i>现有</i></code></div>
  </div>
}

// ───── 4. 要我定的 ─────
const DOT: Record<string, string> = { 派给我: 'me', 到期: 'time', 没人接: 'other', 灵基回话: 'lingee', 灵基交稿: 'lingee', 待确认: 'me', 待验收: 'me', '没人动·催一下': 'time' }
function Focus({ s, dispatch, undo }: P & { undo: () => void }) {
  const rows = focusRows(s, s.role)
  const [open, setOpen] = useState<string | null>(null)
  const [obj, setObj] = useState('')
  const lingeeDoing = s.tasks.filter(t => t.assignee === '灵基' && t.state === 'in_progress')
  const due = rows.filter(r => r.kind === '到期').length
  return <div className="focus">
    <div className="vhead"><h2>要我定的 · {s.role}</h2><span className="weak">{TODAY}</span></div>
    <div className="brief"><span className="spark">✦</span> 今天 {rows.length} 件在等{s.role}{due ? `，先处理 ${due} 件今天到期的` : ''}。</div>
    {rows.length === 0 && <div className="empty">今天清空了 🎉 <small>灵基还在做 {lingeeDoing.length} 件</small></div>}
    {rows.map(r => <div key={r.key} className={`frow ${open === r.key ? 'open' : ''}`} data-testid="frow" data-kind={r.kind} onClick={() => setOpen(r.key)}>
      <i className={`dot ${DOT[r.kind]}`} /><span className="kind">{r.kind}</span>
      <b>{r.task.title}</b><span className="line">{r.line}</span>
      {r.task.source && <button className="src" onClick={e => { e.stopPropagation(); dispatch({ type: 'jumpSource', line: r.task.source!.line ?? 0 }) }}>{r.task.source.label}</button>}
      <span className="acts" onClick={e => e.stopPropagation()}>{actions(r, s, dispatch, obj, setObj)}</span>
      {open === r.key && r.kind === '灵基交稿' && s.minutesDoc && <div className="doc"><h5>讨论纪要（灵基稿）</h5><ol>{s.minutesDoc.map((m, i) => <li key={i}>{m}</li>)}</ol></div>}
      {open === r.key && r.kind === '待确认' && s.minutesDoc && <div className="doc"><h5>讨论纪要 · 每条带原话</h5><ol>{s.minutesDoc.map((m, i) => <li key={i}>{m}</li>)}</ol></div>}
    </div>)}
    {lingeeDoing.length > 0 && <div className="lingee-doing"><h4><span className="spark">✦</span> 灵基在做</h4>{lingeeDoing.map(t => <div key={t.id} className="ld"><span>{t.title}</span>
      {t.kind === 'minutes' && <button className="ghost sm" data-testid="lingee-submit" onClick={() => dispatch({ type: 'lingeeSubmit', id: t.id })}>（模拟）灵基写完 → 提交验收</button>}</div>)}</div>}
    <p className="hint">处理掉的行会消失；顶部或 toast 里可「撤销」。<button className="link" onClick={undo}>撤销上一步</button></p>
  </div>
}
function actions(r: FocusRow, s: S, dispatch: (a: A) => void, obj: string, setObj: (v: string) => void) {
  const t = r.task
  switch (r.kind) {
    case '派给我': return t.kind === 'revise' ? <button className="primary sm" data-testid="act-revised" onClick={() => dispatch({ type: 'revised', id: t.id })}>改好了 · 重新发确认</button>
      : <button className="primary sm" data-testid="act-take" onClick={() => { dispatch({ type: 'setState', id: t.id, state: 'in_progress' }); dispatch({ type: 'toast', text: `已接下「${t.title}」` }) }}>接下</button>
    case '到期': return <button className="primary sm" onClick={() => dispatch({ type: 'setState', id: t.id, state: 'in_review' })}>提交验收</button>
    case '没人接': return <select className="sm" defaultValue="" onChange={e => dispatch({ type: 'assign', id: t.id, who: e.target.value as Who })}><option value="" disabled>指派给…</option>{ROLES.map(x => <option key={x.name}>{x.name}</option>)}</select>
    case '灵基回话': return <button className="primary sm" onClick={() => dispatch({ type: 'ack', id: t.id })}>先排除</button>
    case '灵基交稿': return <button className="primary sm" data-testid="act-send-confirm" onClick={() => dispatch({ type: 'sendConfirm', id: t.id })}>发给 老王、阿炜 确认</button>
    case '待确认': return <><button className="primary sm" data-testid="act-confirm" onClick={() => dispatch({ type: 'confirm', id: t.id })}>确认无误</button>
      <input className="sm" placeholder="有异议？写一句" value={obj} onChange={e => setObj(e.target.value)} data-testid="obj-input" />
      <button className="ghost sm" data-testid="act-object" onClick={() => { dispatch({ type: 'object', id: t.id, text: obj || '拍照必填要分门店类型，便利店先不强制' }); setObj('') }}>有异议</button></>
    case '待验收': return <><button className="primary sm" data-testid="act-accept" onClick={() => dispatch({ type: 'accept', id: t.id })}>验收</button><button className="ghost sm" onClick={() => dispatch({ type: 'return', id: t.id })}>退回</button></>
    case '没人动·催一下': return <button className="ghost sm" onClick={() => dispatch({ type: 'nudge', id: t.id })}>催一下</button>
  }
}

// ───── 5. 全部任务 ─────
function AllTasks({ s, dispatch }: P) {
  const [fold, setFold] = useState<Record<string, boolean>>({})
  const tops = s.tasks.filter(t => !t.parentId || !s.tasks.some(p => p.id === t.parentId))
  const row = (t: Task, depth: number): JSX.Element => {
    const kids = s.tasks.filter(k => k.parentId === t.id)
    const done = kids.filter(k => k.state === 'done').length
    const isFold = fold[t.id] ?? (t.kind === 'set')
    return <div key={t.id}>
      <div className={`trow st-${t.state}`} style={{ paddingLeft: 12 + depth * 22 }} data-testid="trow">
        {kids.length ? <button className="fold" onClick={() => setFold({ ...fold, [t.id]: !isFold })}>{isFold ? '▸' : '▾'}</button> : <span className="fold" />}
        <b>{t.title}</b>{kids.length > 0 && <span className="cnt">{t.kind === 'minutes' ? '确认' : '完成'} {done}/{kids.length}</span>}
        <span className={`pill ${t.state}`}>{STATE_CN[t.state]}</span><Av who={t.assignee} s="s20" /><span className="weak">{t.assignee || '没人接'}</span>
        {t.due && <span className={`due ${t.due <= TODAY && t.state !== 'done' ? 'over' : ''}`}>{t.due.slice(5)}</span>}
        {t.source && <button className="src" onClick={() => dispatch({ type: 'jumpSource', line: t.source!.line ?? 0 })}>来源 L{t.source.line}</button>}
        <span className="acts">{stateBtns(t, s, dispatch)}</span>
      </div>
      {!isFold && kids.map(k => row(k, depth + 1))}
    </div>
  }
  const tl = [...s.events.filter(e => e.kind !== 'meeting' && e.kind !== 'deadline'), ...s.tasks.filter(t => t.due && t.state !== 'done').map(t => ({ id: t.id, day: t.due!, title: `截止 · ${t.title}`, kind: 'deadline' }))].sort((a, b) => a.day.localeCompare(b.day))
  return <div className="all">
    <div className="vhead"><h2>全部任务</h2><span className="weak">状态：待接 → 进行中 → 待验收 → 已完成；灵基只能提交验收，人来流转</span></div>
    <div className="allwrap"><div className="list">{tops.map(t => row(t, 0))}</div>
      <div className="timeline"><h4>时间线</h4>{tl.map(e => <div key={e.id + e.title} className={`tl ${e.kind}`}><span>{e.day.slice(5)}</span>{e.title}</div>)}</div></div>
  </div>
}
function stateBtns(t: Task, s: S, dispatch: (a: A) => void) {
  const me = s.role
  if (t.state === 'done' || t.kind === 'set') return null
  if (t.state !== 'in_review' && s.tasks.some(k => k.parentId === t.id && k.state !== 'done')) return <span className="weak">等子任务</span>
  if (t.assignee === '灵基') return t.state === 'in_progress' ? <button className="ghost sm" onClick={() => dispatch(t.kind === 'minutes' ? { type: 'lingeeSubmit', id: t.id } : { type: 'setState', id: t.id, state: 'in_review', by: '灵基' })}>灵基提交验收</button>
    : t.state === 'in_review' && t.creator === me && t.kind !== 'minutes' ? <button className="primary sm" onClick={() => dispatch({ type: 'accept', id: t.id })}>验收</button> : null
  const go = (st: TState, label: string, id?: string) => <button className="ghost sm" data-testid={id} onClick={() => dispatch({ type: 'setState', id: t.id, state: st })}>{label}</button>
  if (t.assignee === me && t.state === 'suggested' && t.kind === 'task') return go('in_progress', '接下')
  if (t.assignee === me && t.state === 'in_progress' && t.kind === 'task') return go('in_review', '提交验收', 'submit-review')
  if (t.creator === me && t.state === 'in_review') return <><button className="primary sm" onClick={() => dispatch({ type: 'accept', id: t.id })}>验收</button><button className="ghost sm" onClick={() => dispatch({ type: 'return', id: t.id })}>退回</button></>
  return null
}

// ───── 8. 云之家只读 ─────
function Yzj({ s }: { s: S }) {
  return <div className="yzj">
    <div className="vhead"><h2>云之家 · 推进（只读）</h2><code className="api old">GET /yzj/advance<i>现有</i></code></div>
    <div className="phone"><div className="ph">推进 · {s.role}</div>
      {s.tasks.filter(t => t.kind !== 'confirm').map(t => <div key={t.id} className="yrow"><b>{t.title}</b><small>{t.assignee || '没人接'} · {STATE_CN[t.state]}{t.due ? ` · ${t.due.slice(5)}` : ''}</small>{t.source && <small className="weak">{t.source.label} · 原话 L{t.source.line}</small>}</div>)}
      <div className="ro">只读：在云之家里只看，不改。改动请回推进。</div></div>
  </div>
}

// ───── 自动演示：一步步走完整条链 ─────
function useDemo(s: S, dispatch: (a: A) => void) {
  const ref = useRef(s); ref.current = s
  useEffect(() => {
    if (!s.demo) return
    let alive = true
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
    const st = () => ref.current
    const find = (f: (t: Task) => boolean) => st().tasks.find(f)!
    const steps: [string, () => void, number][] = [
      ['1 日历：点绑定任务的讨论块', () => dispatch({ type: 'view', view: 'calendar' }), 1500],
      ['2 进入讨论室，速记只记录', () => dispatch({ type: 'startDiscussion', title: '门店巡检改版对齐', source: `item:${ADV_ID}`, boundTask: ADV_ID }), 4500],
      ['3 结束讨论，灵基起草', () => dispatch({ type: 'end' }), 1500],
      ['3 打开「整理正式纪要」', () => dispatch({ type: 'toggleMinutes' }), 1200],
      ['3 改一句、去掉一件再加回', () => { dispatch({ type: 'editDraft', id: 'd4', title: '下周三前给 3 家试点店培训' }) }, 1200],
      ['3 dispatch-batch 派出', () => dispatch({ type: 'dispatch' }), 1800],
      ['4 切到阿炜：派给我 → 接下', () => dispatch({ type: 'role', role: '阿炜' }), 1500],
      ['4 阿炜接下', () => dispatch({ type: 'setState', id: find(t => t.title.startsWith('巡检表')).id, state: 'in_progress' }), 1200],
      ['5 灵基写完纪要 → 只提交验收', () => { dispatch({ type: 'role', role: '刘洋' }); dispatch({ type: 'lingeeSubmit', id: find(t => t.kind === 'minutes').id }) }, 1800],
      ['6 刘洋：发给老王、阿炜确认', () => dispatch({ type: 'sendConfirm', id: find(t => t.kind === 'minutes').id }), 1500],
      ['6 老王：有异议', () => { dispatch({ type: 'role', role: '老王' }) }, 1300],
      ['6 老王写异议', () => dispatch({ type: 'object', id: find(t => t.kind === 'confirm' && t.assignee === '老王').id, text: '拍照必填要分门店类型，便利店先不强制' }), 1500],
      ['6 阿炜：确认无误', () => { dispatch({ type: 'role', role: '阿炜' }); dispatch({ type: 'confirm', id: find(t => t.kind === 'confirm' && t.assignee === '阿炜').id }) }, 1500],
      ['6 刘洋收到灵基派的修改纪要', () => dispatch({ type: 'role', role: '刘洋' }), 1500],
      ['6 改好了，重新发老王确认', () => dispatch({ type: 'revised', id: find(t => t.kind === 'revise').id }), 1300],
      ['6 老王确认第 2 版', () => { dispatch({ type: 'role', role: '老王' }); dispatch({ type: 'confirm', id: find(t => t.kind === 'confirm' && t.assignee === '老王').id }) }, 1500],
      ['5 各负责人推进 → 提交验收', () => {
        dispatch({ type: 'view', view: 'tasks' })
        for (const t of st().tasks.filter(t => t.kind === 'task' && t.parentId?.startsWith('set') && t.state !== 'done')) {
          if (t.state === 'suggested') dispatch({ type: 'setState', id: t.id, state: 'in_progress', by: t.assignee })
          dispatch({ type: 'setState', id: t.id, state: 'in_review', by: t.assignee })
        }
      }, 1800],
      ['7 刘洋逐件验收', () => { dispatch({ type: 'role', role: '刘洋' }); dispatch({ type: 'view', view: 'tasks' }); for (const t of st().tasks.filter(t => t.kind === 'task' && t.state === 'in_review')) dispatch({ type: 'accept', id: t.id }) }, 1800],
      ['7 整组进待验收 → /accept', () => { dispatch({ type: 'view', view: 'focus' }) }, 1800],
      ['7 验收任务集', () => dispatch({ type: 'accept', id: find(t => t.kind === 'set').id }), 1500],
      ['8 日历：截止日和下次讨论已回写', () => dispatch({ type: 'view', view: 'calendar' }), 2000],
      ['8 来源跳回原话', () => dispatch({ type: 'jumpSource', line: 2 }), 2000],
      ['8 云之家只读同一份数据', () => dispatch({ type: 'view', view: 'yzj' }), 1800],
    ]
    ;(async () => {
      await wait(300)
      for (const [label, fn, ms] of steps) {
        if (!alive || !ref.current.demo) return
        fn(); dispatch({ type: 'toast', text: `自动演示 · ${label}` }); await wait(ms)
      }
      dispatch({ type: 'demo', on: false }); dispatch({ type: 'toast', text: '自动演示完成：整条链走完' })
    })()
    return () => { alive = false }
  }, [s.demo])
}
