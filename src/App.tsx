import { useEffect, useReducer, useRef, useState, useCallback } from 'react'
import { A, ADV_ID, initial, reduce, ROLES, S, STATE_CN, Task, TODAY, TRANSCRIPT, WEEK, focusRows, FocusRow, Who, TState, STENO_ID } from './store'

const KEY = 'advance-flow-v3'
type H = { cur: S; past: S[] }
function hreduce(h: H, a: A | { type: 'undo' }): H {
  if (a.type === 'undo') return h.past.length ? { cur: { ...h.past[0], toast: '已撤销' }, past: h.past.slice(1) } : h
  const next = reduce(h.cur, a)
  const silent = ['line', 'toast', 'demo', 'view', 'role', 'lingeeTick', 'cmd', 'createForm'].includes(a.type)
  return { cur: next, past: silent ? h.past : [h.cur, ...h.past].slice(0, 30) }
}
const load = (): H => { try { const v = localStorage.getItem(KEY); if (v) return { cur: { ...JSON.parse(v), demo: false }, past: [] } } catch {} return { cur: initial(), past: [] } }

export const STEPS: { n: number; name: string; apis: [string, '现有' | '新增'][] }[] = [
  { n: 1, name: '三条入口 · 推进 SoR', apis: [['POST /items {direct}', '现有'], ['POST /lingee/chat → 落成', '新增'], ['steno → 拆任务', '现有']] },
  { n: 2, name: '可选证据场景 · 速记只采证', apis: [['steno.start', '现有'], ['steno.note / highlight', '现有'], ['跨次未完成带入', '新增']] },
  { n: 3, name: '拆任务 / 落成 · 原话锚点', apis: [['POST /drafts', '新增'], ['dispatch-batch', '现有'], ['目的/共识字段', '新增']] },
  { n: 4, name: '要我定的 · 聚焦', apis: [['GET /focus?role=', '现有'], ['PATCH /items/:id', '现有'], ['undo', '现有']] },
  { n: 5, name: '推进 · 执行', apis: [['PATCH /items/:id/state', '现有'], ['行动闭环回写产物', '新增']] },
  { n: 6, name: '纪要产物 · 确认/反对', apis: [['POST /minutes/:id/confirm', '新增'], ['反对标哪一条 → 修改子卡', '新增']] },
  { n: 7, name: '收口 · 验收', apis: [['POST /items/:id/accept', '现有'], ['POST /items/:id/return', '现有']] },
  { n: 8, name: '回流 · 日历/原话/云之家', apis: [['calendar.writeback', '新增'], ['source → steno#line', '新增'], ['GET /yzj/advance 只读', '现有']] },
]

const ENTRY_CN: Record<string, string> = { direct: '直接建', chat: '闲聊落成', steno: '速记拆任务' }
const avOf = (w: Who) => ROLES.find(r => r.name === w)?.av ?? 'violet'
const Av = ({ who, s = '' }: { who: Who; s?: string }) => <span className={`av ${s}`} data-av={who === '灵基' ? 'lingee' : avOf(who)}>{who === '灵基' ? '✦' : who ? who.slice(-1) : '?'}</span>
const Tag = ({ api, st }: { api: string; st: '现有' | '新增' }) => <code className={`api ${st === '新增' ? 'new' : 'old'}`}>{api}<i>{st}</i></code>

function Typewriter({ text, active }: { text: string; active?: boolean }) {
  const [n, setN] = useState(active ? 0 : text.length)
  useEffect(() => { setN(active ? 0 : text.length) }, [text, active])
  useEffect(() => {
    if (!active || n >= text.length) return
    const t = setTimeout(() => setN(n + 1), 18)
    return () => clearTimeout(t)
  }, [n, text, active])
  return <span className="tw">{text.slice(0, n)}{active && n < text.length && <i className="caret" />}</span>
}

export default function App() {
  const [h, d] = useReducer(hreduce, undefined, load)
  const s = h.cur
  const dispatch = useCallback((a: A) => d(a), [])
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(s)) }, [s])
  useEffect(() => { if (s.toast) { const t = setTimeout(() => d({ type: 'toast' }), 3500); return () => clearTimeout(t) } }, [s.toast])
  useEffect(() => { if (s.view === 'room' && s.recording && s.lines < TRANSCRIPT.length) { const t = setTimeout(() => d({ type: 'line' }), s.demo ? 400 : 900); return () => clearTimeout(t) } }, [s.view, s.recording, s.lines, s.demo])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dispatch({ type: 'cmd', open: !s.cmdOpen }) }
      if (e.key === 'Escape' && s.cmdOpen) dispatch({ type: 'cmd', open: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.cmdOpen, dispatch])
  useDemo(s, dispatch)

  return (
    <div className="app" data-entry={s.entry ?? 'none'}>
      <div className="bg-glow" aria-hidden />
      <header className="top glass">
        <div className="brand">
          <b>推进</b>
          <span className="ai-badge"><i className="spark">✦</i> 灵基陪跑</span>
          <span className="sub">真相源 · 三条入口等价 · 速记只采证</span>
        </div>
        <nav>
          {([['focus', '要我定的'], ['calendar', '日历'], ['chat', '跟灵基说'], ['tasks', '全部任务'], ['yzj', '云之家只读']] as const).map(([v, n]) =>
            <button key={v} className={s.view === v || (v === 'chat' && s.cmdOpen) ? 'on' : ''} data-testid={v === 'chat' ? 'nav-chat' : undefined} onClick={() => v === 'chat' ? dispatch({ type: 'cmd', open: true }) : dispatch({ type: 'view', view: v })}>{n}</button>)}
          {s.discussion && <button className={s.view === 'room' || s.view === 'end' ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: s.drafts.length ? 'end' : 'room' })}>证据场景</button>}
        </nav>
        <button className="cmd-trigger" data-testid="cmdk" onClick={() => dispatch({ type: 'cmd', open: true })}>
          <span className="spark">✦</span> 跟灵基说 <kbd>⌘K</kbd>
        </button>
        <div className="roles">{ROLES.map(r => <button key={r.name} data-testid={`role-${r.name}`} className={s.role === r.name ? 'on' : ''} onClick={() => dispatch({ type: 'role', role: r.name })}><Av who={r.name} s="s20" />{r.name}<small>{r.tag}</small></button>)}</div>
        <div className="ctl">
          <button className="ghost" onClick={() => d({ type: 'undo' })} disabled={!h.past.length}>撤销</button>
          <button className="ghost" onClick={() => { localStorage.removeItem(KEY); dispatch({ type: 'reset' }) }}>一键重置</button>
          <button className="primary glow" data-testid="demo" onClick={() => { if (!s.demo) { localStorage.removeItem(KEY); dispatch({ type: 'reset' }) } setTimeout(() => dispatch({ type: 'demo', on: !s.demo }), 50) }}>{s.demo ? '停止演示' : '▶ 自动演示'}</button>
        </div>
      </header>

      <div className="body">
        <main className="glass-panel">
          {s.view === 'focus' && <Focus s={s} dispatch={dispatch} undo={() => d({ type: 'undo' })} />}
          {s.view === 'create' && <CreateDirect s={s} dispatch={dispatch} />}
          {s.view === 'calendar' && <Calendar s={s} dispatch={dispatch} />}
          {s.view === 'chat' && <Chat s={s} dispatch={dispatch} />}
          {s.view === 'room' && <Room s={s} dispatch={dispatch} />}
          {s.view === 'end' && <End s={s} dispatch={dispatch} />}
          {s.view === 'tasks' && <AllTasks s={s} dispatch={dispatch} />}
          {s.view === 'yzj' && <Yzj s={s} />}
        </main>
        {s.lingee.open && <LingeeRail s={s} dispatch={dispatch} />}
        <Chain s={s} />
      </div>

      {s.cmdOpen && <CmdPalette s={s} dispatch={dispatch} onClose={() => dispatch({ type: 'cmd', open: false })} />}
      {s.toast && <div className="toast glass"><span className="spark">✦</span>{s.toast}<button onClick={() => d({ type: 'undo' })}>撤销</button></div>}
    </div>
  )
}

type P = { s: S; dispatch: (a: A) => void }

function LingeeRail({ s, dispatch }: P) {
  const L = s.lingee
  return <aside className="lingee-rail glass-panel" data-testid="lingee-rail">
    <div className="lr-head">
      <span className="av" data-av="lingee">✦</span>
      <div><b>灵基</b><small>{L.note ?? '待命'}</small></div>
      <button className="icon" onClick={() => dispatch({ type: 'lingeeToggle' })} title="收起">✕</button>
    </div>
    <div className={`lr-status ${L.phase}`}>
      {L.phase === 'thinking' && <><i className="spin" />思考中…</>}
      {L.phase === 'streaming' && <><i className="spin" />流式输出</>}
      {L.phase === 'ready' && <><i className="pulse-dot" />就绪</>}
      {L.phase === 'idle' && <>空闲</>}
    </div>
    <div className="lr-stream">
      <Typewriter text={L.stream || '…'} active={L.phase === 'streaming' || L.phase === 'ready'} />
    </div>
    {L.quote && <button className="quote-chip" onClick={() => dispatch({ type: 'jumpSource', line: Math.max(0, TRANSCRIPT.findIndex(t => t.text === L.quote)) })} data-testid="quote-chip">
      <span>原话</span>「{L.quote.slice(0, 36)}{L.quote.length > 36 ? '…' : ''}」
    </button>}
    <div className="pills">{L.pills.map(p => <button key={p} className="pill-btn" data-testid="lingee-pill" onClick={() => {
      if (p === '结束并拆任务' || p === '结束讨论并起草') dispatch({ type: 'end' })
      else if (p === '派出草稿') dispatch({ type: 'dispatch' })
      else if (p === '打开正式纪要') dispatch({ type: 'toggleMinutes' })
      else if (p === '查看要我定的') dispatch({ type: 'view', view: 'focus' })
      else if (p === '切到阿炜') dispatch({ type: 'role', role: '阿炜' })
      else if (p === '切到刘洋') dispatch({ type: 'role', role: '刘洋' })
      else if (p === '发给确认人') { const m = s.tasks.find(t => t.kind === 'minutes' && t.state === 'in_review'); if (m) dispatch({ type: 'sendConfirm', id: m.id }) }
      else dispatch({ type: 'pill', pill: p })
    }}>{p}</button>)}</div>
    <div className="lr-hint">推进是真相源。①直接建 ②闲聊落成 ③会后从速记拆 —— 讨论/会议只是可选证据场景。</div>
  </aside>
}

function Chain({ s }: { s: S }) {
  return <aside className="chain glass-panel" data-testid="chain">
    <h3>链路 <small>第 {s.step} 步{s.entry ? ` · ${ENTRY_CN[s.entry]}` : ''}</small></h3>
    <div className="model-chip">推进 SoR · 速记=证据 · 无会议分型</div>
    <ol>{STEPS.map(st => <li key={st.n} className={st.n === s.step ? 'cur' : st.n < s.step ? 'past' : ''}>
      <b>{st.n}</b><div><div className="nm">{st.name}</div>{st.n === s.step && <div className="apis">{st.apis.map(([a, k]) => <Tag key={a} api={a} st={k} />)}</div>}</div></li>)}</ol>
    <h4>调用记录</h4>
    <ul className="log">{s.log.length ? s.log.map((l, i) => <li key={i}><Tag api={l.api} st={l.status} /><span>{l.note}</span></li>) : <li className="weak">还没有调用</li>}</ul>
  </aside>
}

function CmdPalette({ s, dispatch, onClose }: P & { onClose: () => void }) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const go = (text: string) => { dispatch({ type: 'chatSend', text }); onClose() }
  const suggestions = [
    { t: '帮我记下：巡检表精简、拍照必填、看板加整改率', d: '入口② 闲聊落成' },
    { t: '帮我开一场门店巡检讨论', d: '入口③ 证据场景 → 拆任务' },
    { t: '约个会', d: '日历时段 + 可选采证' },
    { t: '直接建任务', d: '入口① 跳过会议' },
  ]
  return <div className="cmd-mask" data-testid="cmd-palette" onClick={onClose}>
    <div className="cmd-box glass" onClick={e => e.stopPropagation()}>
      <div className="cmd-row">
        <span className="spark">✦</span>
        <input ref={ref} data-testid="cmd-input" placeholder="跟灵基说… 落成任务 / 开证据场景 / 口述" value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) go(q.trim()); if (e.key === 'Escape') onClose() }} />
        <kbd>↵</kbd>
      </div>
      <div className="cmd-sugs">
        {suggestions.map(x => <button key={x.t} data-testid="cmd-sug" onClick={() => x.t === '直接建任务' ? (dispatch({ type: 'view', view: 'create' }), onClose()) : go(x.t)}><b>{x.t}</b><small>{x.d}</small></button>)}
      </div>
      {s.chat.length > 0 && <div className="cmd-recent">最近闲聊 {s.chat.filter(m => m.role === 'user').slice(-2).map(m => m.text).join(' · ')}</div>}
    </div>
  </div>
}

function CreateDirect({ s, dispatch }: P) {
  const f = s.createForm
  return <div className="create" data-testid="create-view">
    <div className="vhead"><h2>① 直接建任务</h2><span className="weak">跳过会议 · 可选原话锚点 · 立刻进推进</span></div>
    <div className="create-form glass">
      <label>标题<input data-testid="create-title" value={f.title} onChange={e => dispatch({ type: 'createForm', patch: { title: e.target.value } })} placeholder="例如：巡检表字段精简到 12 项" /></label>
      <label>原话锚点（可选）<input data-testid="create-quote" value={f.quote} onChange={e => dispatch({ type: 'createForm', patch: { quote: e.target.value } })} placeholder="谁说了什么，方便溯源" /></label>
      <div className="create-row">
        <label>负责人<select value={f.assignee} onChange={e => dispatch({ type: 'createForm', patch: { assignee: e.target.value as Who } })}>{['灵基', ...ROLES.map(r => r.name)].map(n => <option key={n}>{n}</option>)}</select></label>
        <label>截止<input type="date" value={f.due} onChange={e => dispatch({ type: 'createForm', patch: { due: e.target.value } })} /></label>
      </div>
      <div className="foot">
        <button className="primary glow" data-testid="create-submit" onClick={() => dispatch({ type: 'createDirect' })}>创建到推进</button>
        <button className="ghost" onClick={() => dispatch({ type: 'view', view: 'focus' })}>取消</button>
        <code className="api old">POST /items {'{'}entry:direct{'}'}<i>现有</i></code>
      </div>
    </div>
    <p className="hint">不做会议类型包。目的/共识写在任务集字段上，不在建会时选「汇报会/对齐会」。</p>
  </div>
}

function Chat({ s, dispatch }: P) {
  const [q, setQ] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [s.chat.length])
  return <div className="chat" data-testid="chat-view">
    <div className="vhead">
      <h2><span className="spark">✦</span> 跟灵基说</h2>
      <span className="weak">入口② 闲聊落成 · 也可转证据场景 · 同样落推进</span>
    </div>
    <div className="chat-stream">
      {s.chat.length === 0 && <div className="chat-empty">
        <div className="orb" /><p>口述几件事，灵基起草后直接落推进；需要采证再开讨论。管理不在速记里。</p>
        <div className="pills">
          {['帮我记下几件事', '帮我开一场门店巡检讨论', '约个会'].map(p =>
            <button key={p} className="pill-btn" data-testid="chat-starter" onClick={() => dispatch({ type: 'chatSend', text: p })}>{p}</button>)}
        </div>
      </div>}
      {s.chat.map(m => <div key={m.id} className={`bubble ${m.role}`}>
        {m.role === 'lingee' && <span className="av" data-av="lingee">✦</span>}
        <div>
          <p>{m.role === 'lingee' ? <Typewriter text={m.text} active /> : m.text}</p>
          {m.chips && <div className="chips">{m.chips.map(c => <span key={c} className="quote-chip">{c}</span>)}</div>}
          {m.pills && <div className="pills">{m.pills.map(p => <button key={p} className="pill-btn" data-testid="chat-pill" onClick={() => dispatch({ type: 'pill', pill: p })}>{p}</button>)}</div>}
        </div>
      </div>)}
      <div ref={bottom} />
    </div>
    <form className="chat-input glass" onSubmit={e => { e.preventDefault(); if (!q.trim()) return; dispatch({ type: 'chatSend', text: q.trim() }); setQ('') }}>
      <span className="spark">✦</span>
      <input data-testid="chat-input" value={q} onChange={e => setQ(e.target.value)} placeholder="继续说，或让灵基落成任务…" />
      <button className="primary sm" type="submit">发送</button>
    </form>
  </div>
}

function Calendar({ s, dispatch }: P) {
  const hours = Array.from({ length: 11 }, (_, i) => 9 + i)
  const evs: import('./store').CalEvent[] = [...s.events, ...s.tasks.filter(t => t.due && t.kind === 'task' && t.parentId && t.state !== 'done' && !s.events.some(e => e.title === `截止 · ${t.title}`)).map(t => ({ id: 'd' + t.id, day: t.due!, start: 18, end: 18.5, title: `截止 · ${t.title}`, kind: 'deadline' as const }))]
  const adv = s.tasks.find(t => t.id === ADV_ID)!
  return <div className="cal">
    <div className="vhead"><h2>日历 · 11 月第 1 周</h2>
      <div className="vacts">
        <button className="ghost" data-testid="blank-discussion" onClick={() => dispatch({ type: 'startDiscussion', title: '临时讨论' })}>＋ 开证据场景</button>
        <button className="ghost" data-testid="cal-meet" onClick={() => dispatch({ type: 'scheduleMeeting', day: '2026-11-04', start: 16, title: '临时对齐会' })}>＋ 约个会</button>
        <button className="primary sm" data-testid="cal-direct" onClick={() => dispatch({ type: 'view', view: 'create' })}>＋ 直接建任务</button>
      </div>
    </div>
    <div className="calwrap">
      <div className="grid">
        <div className="gh" />{WEEK.map(d => <div key={d} className={`gh ${d === TODAY ? 'today' : ''}`}>{'一二三四五六日'[WEEK.indexOf(d)]} <b>{d.slice(8)}</b></div>)}
        {hours.map(hh => <div key={hh} className="row"><div className="hr">{hh}:00</div>{WEEK.map(d => <div key={d} className="cell">
          {evs.filter(e => e.day === d && Math.floor(e.start) === hh).map(e => <div key={e.id} className={`ev ${e.kind}`} data-testid={e.kind === 'discussion' ? 'cal-discussion' : undefined}
            onClick={() => e.kind === 'discussion' && e.taskId && dispatch({ type: 'startDiscussion', title: e.title, source: `item:${e.taskId}`, boundTask: e.taskId })}>
            <b>{e.title}</b>{e.taskId && <small>🔗 绑定 {e.kind === 'next' ? '任务集' : adv.title}</small>}{e.kind === 'deadline' && <small>回写自推进</small>}{e.kind === 'next' && <small>回写自推进</small>}{e.kind === 'discussion' && <small>可选证据场景</small>}</div>)}
        </div>)}</div>)}
      </div>
      <div className="side">
        <h4>本周任务 · 可开证据场景</h4>
        {s.tasks.filter(t => t.kind === 'task' && !t.parentId && t.state !== 'done').map(t => <div key={t.id} className="tcard">
          <div><b>{t.title}</b><small>{t.assignee || '没人接'} · {STATE_CN[t.state]}{t.due ? ` · ${t.due.slice(5)} 截止` : ''}</small>
            {t.purpose && <small className="purpose">目的 · {t.purpose}</small>}
          </div>
          <button className="link" data-testid={t.id === ADV_ID ? 'pull-discussion' : undefined} onClick={() => dispatch({ type: 'startDiscussion', title: `${t.title}对齐`, source: `item:${t.id}`, boundTask: t.id })}>开证据场景</button></div>)}
        <p className="hint">讨论/会议可选。管理在推进；速记只采证。</p>
      </div>
    </div>
  </div>
}

function Room({ s, dispatch }: P) {
  const ref = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState('')
  useEffect(() => { ref.current?.querySelector('.hl')?.scrollIntoView({ block: 'center' }) }, [s.highlight])
  const n = s.lines
  return <div className="room" data-testid="room-view">
    <div className="vhead"><h2>证据场景 · {s.discussion?.title ?? '门店巡检改版对齐'}</h2>
      {s.discussion?.source && <code className="api old">{s.discussion.source}</code>}
      {s.discussion?.fromChat && <span className="ai-badge">来自闲聊</span>}
      <span className="ai-badge">速记 = 证据层 · 无管理门禁</span>
    </div>
    <div className="people">{ROLES.map(r => <span key={r.name}><Av who={r.name} />{r.name}</span>)}</div>
    {s.carryIn.length > 0 && <div className="carry" data-testid="carry-in">
      <b>跨次带入 · 同来源未完成 {s.carryIn.length} 件</b>
      {s.carryIn.map(t => <span key={t.id} className="carry-chip">{t.title}<i>{STATE_CN[t.state]}</i></span>)}
    </div>}
    {s.recording ? <div className="strip"><i className="rec" />速记采证中 · 只记录 <span>meeting:u_liuyang:{STENO_ID}</span><em><span className="spark">✦</span> AI 稿 {s.evidence.aiDraft.length} · 重点 {s.evidence.highlights.length}</em></div>
      : <div className="strip done">速记已结束 · 原文只读{s.highlight !== undefined && <em>已定位到原话 L{s.highlight}</em>}</div>}
    <div className="room-grid">
      <div className="tr" ref={ref}>{TRANSCRIPT.slice(0, n).map((l, i) => <div key={i} className={`ln ${s.highlight === i ? 'hl' : ''} ${s.evidence.highlights.some(h => h.line === i) ? 'pinned' : ''}`}>
        <Av who={l.who} s="s20" /><b>{l.who}</b><small>{l.t}</small>
        <p>{l.text}{s.recording && <button className="pin" data-testid="pin-hl" onClick={() => dispatch({ type: 'pinHighlight', line: i })} title="钉为重点">📌</button>}</p>
      </div>)}
        {s.recording && n < TRANSCRIPT.length && <div className="typing"><i className="spin" /> 转写中…</div>}</div>
      <aside className="evidence" data-testid="evidence-panel">
        <h4>证据层</h4>
        <section>
          <h5>会中笔记 / 重点</h5>
          <ul>{s.evidence.notes.map((x, i) => <li key={i}>{x}</li>)}
            {s.evidence.highlights.map(h => <li key={'h' + h.line} className="hl-li">L{h.line} · {h.text.slice(0, 28)}…</li>)}
            {!s.evidence.notes.length && !s.evidence.highlights.length && <li className="weak">还没有笔记/重点</li>}
          </ul>
          {s.recording && <form className="note-form" onSubmit={e => { e.preventDefault(); if (!note.trim()) return; dispatch({ type: 'addNote', text: note }); setNote('') }}>
            <input data-testid="note-input" value={note} onChange={e => setNote(e.target.value)} placeholder="随手记一条…" />
            <button className="ghost sm" type="submit">记</button>
          </form>}
        </section>
        <section>
          <h5>AI 稿素材</h5>
          <ol>{s.evidence.aiDraft.length ? s.evidence.aiDraft.map((x, i) => <li key={i}>{x.slice(0, 36)}…</li>) : <li className="weak">听着长出来</li>}</ol>
        </section>
        <section>
          <h5>人工稿素材</h5>
          <ul>{s.evidence.humanDraft.map((x, i) => <li key={i}>{x}</li>)}
            {!s.evidence.humanDraft.length && <li className="weak">结束时可补</li>}
          </ul>
        </section>
        <p className="hint">这里没有确认 / 分派 / 催办。那些都在推进。</p>
      </aside>
    </div>
    {s.recording && <button className="primary big glow" data-testid="end" onClick={() => dispatch({ type: 'end' })}>结束并拆任务</button>}
  </div>
}

function End({ s, dispatch }: P) {
  const [edit, setEdit] = useState<string | null>(null)
  const entryLabel = s.entry === 'chat' ? '② 闲聊落成' : '③ 会后从速记拆任务'
  return <div className="end" data-testid="end-view">
    <div className="vhead"><h2><span className="spark">✦</span> {entryLabel} · {s.drafts.filter(d => !d.minutes).length} 件</h2><code className="api new">POST /drafts<i>新增</i></code></div>
    <p className="weak">只决定「要不要变成任务」。每条带原话锚点。负责人/截止之后在推进里改。</p>
    <div className="parent">任务集 · {s.discussion?.title}
      <small>父任务 · 刘洋发起{s.discussion?.boundTask ? ` · 挂在「门店巡检改版」下` : ''}{s.entry === 'chat' ? ' · 闲聊落成' : ' · 速记拆'}</small>
      <div className="fields">
        <span>目的 · 把讨论结论落成可追责的任务</span>
        <span>共识 · 表单精简 / 拍照必填 / 整改率 / 试点 3 家（字段，非会议类型）</span>
      </div>
    </div>
    {s.drafts.map(d => <div key={d.id} className={`draft ${d.keep ? '' : 'drop'}`} data-testid="draft">
      <label className="chk"><input type="checkbox" checked={d.keep} onChange={() => dispatch({ type: 'keep', id: d.id })} />{d.keep ? '要' : '不要'}</label>
      <div className="dm">{edit === d.id ? <input autoFocus defaultValue={d.title} onBlur={e => { dispatch({ type: 'editDraft', id: d.id, title: e.target.value }); setEdit(null) }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        : <b onClick={() => setEdit(d.id)} title="点击改一句">{d.title} <span className="pen">✎</span></b>}
        <blockquote onClick={() => d.line > 0 && dispatch({ type: 'jumpSource', line: d.line })}>原话{d.line > 0 ? ` L${d.line}` : ''}：「{d.quote}」</blockquote></div>
      <select value={d.assignee} onChange={e => dispatch({ type: 'draftAssignee', id: d.id, who: e.target.value as Who })}>{['灵基', ...ROLES.map(r => r.name)].map(n => <option key={n}>{n}</option>)}</select>
      <span className="due">{d.due.slice(5)}</span></div>)}
    <label className="toggle"><input type="checkbox" data-testid="minutes-toggle" checked={s.minutesOn} onChange={() => dispatch({ type: 'toggleMinutes' })} /> 纪要作产物挂父卡，并建确认子卡（老王、阿炜）</label>
    <div className="foot"><button className="primary glow" data-testid="dispatch" onClick={() => dispatch({ type: 'dispatch' })}>派出 {s.drafts.filter(d => d.keep).length} 件到推进</button><code className="api old">dispatch-batch<i>现有</i></code></div>
  </div>
}

const DOT: Record<string, string> = { 派给我: 'me', 到期: 'time', 没人接: 'other', 灵基回话: 'lingee', 灵基交稿: 'lingee', 待确认: 'me', 待验收: 'me', '没人动·催一下': 'time' }
const OBJ_TARGETS = ['第 1 条 · 巡检表精简到 12 项', '第 2 条 · 拍照上传改为必填', '第 3 条 · 看板加整改率', '第 4 条 · 试点 3 家店']

function Focus({ s, dispatch, undo }: P & { undo: () => void }) {
  const rows = focusRows(s, s.role)
  const [open, setOpen] = useState<string | null>(null)
  const [obj, setObj] = useState('')
  const [objTarget, setObjTarget] = useState(OBJ_TARGETS[1])
  const lingeeDoing = s.tasks.filter(t => t.assignee === '灵基' && t.state === 'in_progress')
  const due = rows.filter(r => r.kind === '到期').length
  return <div className="focus">
    <div className="vhead"><h2>要我定的 · {s.role}</h2><span className="weak">{TODAY} · 推进是真相源</span></div>
    <div className="entry-cards three">
      <button className="entry glass" data-testid="entry-direct" onClick={() => dispatch({ type: 'view', view: 'create' })}>
        <b>① 直接建任务</b><span>跳过会议 · 可选原话 · 立刻进推进</span>
      </button>
      <button className="entry glass ai" data-testid="entry-chat" onClick={() => dispatch({ type: 'cmd', open: true })}>
        <b><span className="spark">✦</span> ② 闲聊落成任务</b><span>⌘K 口述 · 带原话锚点 · 不经会议</span>
      </button>
      <button className="entry glass" data-testid="entry-steno" onClick={() => dispatch({ type: 'view', view: 'calendar' })}>
        <b>③ 会后从速记拆任务</b><span>可选证据场景 · 采证后拆 · 管理在推进</span>
      </button>
    </div>
    <div className="brief"><span className="spark">✦</span> <Typewriter text={`今天 ${rows.length} 件在等${s.role}${due ? `，先处理 ${due} 件今天到期的` : ''}。`} active /></div>
    {rows.length === 0 && <div className="empty">今天清空了 🎉 <small>灵基还在做 {lingeeDoing.length} 件</small></div>}
    {rows.map(r => <div key={r.key} className={`frow ${open === r.key ? 'open' : ''}`} data-testid="frow" data-kind={r.kind} onClick={() => setOpen(r.key)}>
      <i className={`dot ${DOT[r.kind]}`} /><span className="kind">{r.kind}</span>
      <b>{r.task.title}</b><span className="line">{r.line}</span>
      {r.task.source && <button className="src" onClick={e => { e.stopPropagation(); dispatch({ type: 'jumpSource', line: r.task.source!.line ?? 0 }) }}>{r.task.source.label}</button>}
      <span className="acts" onClick={e => e.stopPropagation()}>{actions(r, s, dispatch, obj, setObj, objTarget, setObjTarget)}</span>
      {open === r.key && r.kind === '灵基交稿' && s.minutesDoc && <div className="doc"><h5>纪要产物（AI 稿 + 人工稿）</h5><ol>{s.minutesDoc.map((m, i) => <li key={i}>{m}</li>)}</ol></div>}
      {open === r.key && r.kind === '待确认' && s.minutesDoc && <div className="doc"><h5>纪要产物 · 反对请标哪一条</h5><ol>{s.minutesDoc.map((m, i) => <li key={i}>{m}</li>)}</ol>
        <div className="obj-row"><label>反对哪一条 <select data-testid="obj-target" value={objTarget} onChange={e => setObjTarget(e.target.value)}>{OBJ_TARGETS.map(t => <option key={t}>{t}</option>)}</select></label></div>
      </div>}
    </div>)}
    {lingeeDoing.length > 0 && <div className="lingee-doing"><h4><span className="spark">✦</span> 灵基在做</h4>{lingeeDoing.map(t => <div key={t.id} className="ld"><span>{t.title}{t.product ? ` · ${t.product}` : ''}</span>
      {t.kind === 'minutes' && <button className="ghost sm" data-testid="lingee-submit" onClick={() => dispatch({ type: 'lingeeSubmit', id: t.id })}>（模拟）灵基写完 → 提交验收</button>}</div>)}</div>}
    <p className="hint">处理掉的行会消失；可「撤销」。<button className="link" onClick={undo}>撤销上一步</button></p>
  </div>
}
function actions(r: FocusRow, s: S, dispatch: (a: A) => void, obj: string, setObj: (v: string) => void, objTarget: string, setObjTarget: (v: string) => void) {
  const t = r.task
  switch (r.kind) {
    case '派给我': return t.kind === 'revise' ? <button className="primary sm" data-testid="act-revised" onClick={() => dispatch({ type: 'revised', id: t.id })}>改好了 · 重新发确认</button>
      : <button className="primary sm" data-testid="act-take" onClick={() => { dispatch({ type: 'setState', id: t.id, state: 'in_progress' }); dispatch({ type: 'toast', text: `已接下「${t.title}」` }) }}>接下</button>
    case '到期': return <button className="primary sm" onClick={() => dispatch({ type: 'setState', id: t.id, state: 'in_review' })}>提交验收</button>
    case '没人接': return <select className="sm" defaultValue="" onChange={e => dispatch({ type: 'assign', id: t.id, who: e.target.value as Who })}><option value="" disabled>指派给…</option>{ROLES.map(x => <option key={x.name}>{x.name}</option>)}</select>
    case '灵基回话': return <button className="primary sm" onClick={() => dispatch({ type: 'ack', id: t.id })}>先排除</button>
    case '灵基交稿': return <button className="primary sm" data-testid="act-send-confirm" onClick={() => dispatch({ type: 'sendConfirm', id: t.id })}>发给 老王、阿炜 确认</button>
    case '待确认': return <><button className="primary sm" data-testid="act-confirm" onClick={() => dispatch({ type: 'confirm', id: t.id })}>确认无误</button>
      <input className="sm" placeholder="异议说明" value={obj} onChange={e => setObj(e.target.value)} data-testid="obj-input" />
      <button className="ghost sm" data-testid="act-object" onClick={() => { dispatch({ type: 'object', id: t.id, text: obj || '拍照必填要分门店类型，便利店先不强制', target: objTarget }); setObj('') }}>反对这条</button></>
    case '待验收': return <><button className="primary sm" data-testid="act-accept" onClick={() => dispatch({ type: 'accept', id: t.id })}>验收</button><button className="ghost sm" onClick={() => dispatch({ type: 'return', id: t.id })}>退回</button></>
    case '没人动·催一下': return <button className="ghost sm" onClick={() => dispatch({ type: 'nudge', id: t.id })}>催一下</button>
  }
}

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
        {t.purpose && <span className="field-chip" title={t.purpose}>目的</span>}
        {t.consensus && <span className="field-chip" title={t.consensus.join(' · ')}>共识</span>}
        {t.product && <span className="field-chip product" title={t.product}>产物</span>}
        <span className={`pill ${t.state}`}>{STATE_CN[t.state]}</span><Av who={t.assignee} s="s20" /><span className="weak">{t.assignee || '没人接'}</span>
        {t.due && <span className={`due ${t.due <= TODAY && t.state !== 'done' ? 'over' : ''}`}>{t.due.slice(5)}</span>}
        {t.source && <button className="src" onClick={() => dispatch({ type: 'jumpSource', line: t.source!.line ?? 0 })}>来源 L{t.source.line ?? '—'}</button>}
        <span className="acts">{stateBtns(t, s, dispatch)}</span>
      </div>
      {!isFold && t.kind === 'set' && (t.purpose || t.consensus) && <div className="set-meta" style={{ paddingLeft: 34 + depth * 22 }}>
        {t.purpose && <div>目的 · {t.purpose}</div>}
        {t.consensus && <div>共识 · {t.consensus.join(' · ')}</div>}
        {t.product && <div>产物 · {t.product}</div>}
      </div>}
      {!isFold && kids.map(k => row(k, depth + 1))}
    </div>
  }
  const tl = [...s.events.filter(e => e.kind !== 'meeting' && e.kind !== 'deadline'), ...s.tasks.filter(t => t.due && t.state !== 'done').map(t => ({ id: t.id, day: t.due!, title: `截止 · ${t.title}`, kind: 'deadline' }))].sort((a, b) => a.day.localeCompare(b.day))
  return <div className="all">
    <div className="vhead"><h2>全部任务</h2><span className="weak">目的/共识/产物是任务集字段 · 不是会议类型</span></div>
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

function Yzj({ s }: { s: S }) {
  return <div className="yzj">
    <div className="vhead"><h2>云之家 · 推进（只读）</h2><code className="api old">GET /yzj/advance<i>现有</i></code></div>
    <div className="phone"><div className="ph">推进 · {s.role}</div>
      {s.tasks.filter(t => t.kind !== 'confirm').map(t => <div key={t.id} className="yrow"><b>{t.title}</b><small>{t.assignee || '没人接'} · {STATE_CN[t.state]}{t.due ? ` · ${t.due.slice(5)}` : ''}</small>
        {t.purpose && <small className="weak">目的 · {t.purpose}</small>}
        {t.product && <small className="weak">产物 · {t.product}</small>}
        {t.source && <small className="weak">{t.source.label}{t.source.line != null ? ` · 原话 L${t.source.line}` : ''}</small>}
      </div>)}
      <div className="ro">只读：在云之家里只看，不改。改动请回推进。</div></div>
  </div>
}

function useDemo(s: S, dispatch: (a: A) => void) {
  const ref = useRef(s); ref.current = s
  useEffect(() => {
    if (!s.demo) return
    let alive = true
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
    const st = () => ref.current
    const find = (f: (t: Task) => boolean) => st().tasks.find(f)!
    // 自动演示：①直接建 → ②闲聊落成 → ③讨论+速记拆任务+确认
    const steps: [string, () => void, number][] = [
      ['① 直接建任务', () => dispatch({ type: 'view', view: 'create' }), 1000],
      ['① 填标题与原话', () => {
        dispatch({ type: 'createForm', patch: { title: '巡检表字段精简到 12 项', quote: '阿炜说周五前出新版字段', assignee: '阿炜', due: '2026-11-06' } })
      }, 900],
      ['① 创建到推进', () => dispatch({ type: 'createDirect' }), 1400],
      ['② 闲聊落成', () => { dispatch({ type: 'view', view: 'chat' }); dispatch({ type: 'chatSend', text: '帮我记下：拍照必填、看板加整改率' }) }, 1600],
      ['② 落成推进任务', () => dispatch({ type: 'pill', pill: '落成推进任务' }), 1200],
      ['② 派出闲聊草稿', () => dispatch({ type: 'dispatch' }), 1400],
      ['③ 开证据场景（日历）', () => dispatch({ type: 'view', view: 'calendar' }), 1000],
      ['③ 进入速记采证', () => dispatch({ type: 'startDiscussion', title: '门店巡检改版对齐', source: `item:${ADV_ID}`, boundTask: ADV_ID }), 3800],
      ['③ 钉重点 + 笔记', () => { dispatch({ type: 'pinHighlight', line: 2 }); dispatch({ type: 'addNote', text: '便利店拍照先不强制（会中笔记）' }) }, 900],
      ['③ 结束并拆任务', () => dispatch({ type: 'end' }), 1200],
      ['③ 打开纪要产物', () => dispatch({ type: 'toggleMinutes' }), 900],
      ['③ 派出到推进', () => dispatch({ type: 'dispatch' }), 1400],
      ['阿炜接下', () => { dispatch({ type: 'role', role: '阿炜' }); const t = find(x => x.title.startsWith('巡检表') && x.kind === 'task' && x.state === 'suggested'); if (t) dispatch({ type: 'setState', id: t.id, state: 'in_progress' }) }, 1100],
      ['灵基交纪要产物', () => { dispatch({ type: 'role', role: '刘洋' }); const m = find(t => t.kind === 'minutes'); if (m) dispatch({ type: 'lingeeSubmit', id: m.id }) }, 1300],
      ['发给确认子卡', () => { const m = find(t => t.kind === 'minutes'); if (m) dispatch({ type: 'sendConfirm', id: m.id }) }, 1100],
      ['老王反对第 2 条', () => { dispatch({ type: 'role', role: '老王' }); dispatch({ type: 'object', id: find(t => t.kind === 'confirm' && t.assignee === '老王').id, text: '拍照必填要分门店类型，便利店先不强制', target: '第 2 条 · 拍照上传改为必填' }) }, 1400],
      ['阿炜确认', () => { dispatch({ type: 'role', role: '阿炜' }); dispatch({ type: 'confirm', id: find(t => t.kind === 'confirm' && t.assignee === '阿炜').id }) }, 1100],
      ['刘洋改好重发', () => { dispatch({ type: 'role', role: '刘洋' }); dispatch({ type: 'revised', id: find(t => t.kind === 'revise').id }) }, 1100],
      ['老王确认第 2 版', () => { dispatch({ type: 'role', role: '老王' }); dispatch({ type: 'confirm', id: find(t => t.kind === 'confirm' && t.assignee === '老王').id }) }, 1100],
      ['推进执行并验收', () => {
        dispatch({ type: 'view', view: 'tasks' })
        for (const t of st().tasks.filter(t => t.kind === 'task' && t.parentId?.startsWith('set') && t.state !== 'done')) {
          if (t.state === 'suggested') dispatch({ type: 'setState', id: t.id, state: 'in_progress', by: t.assignee })
          dispatch({ type: 'setState', id: t.id, state: 'in_review', by: t.assignee })
        }
      }, 1300],
      ['刘洋验收', () => { dispatch({ type: 'role', role: '刘洋' }); for (const t of st().tasks.filter(t => t.kind === 'task' && t.state === 'in_review')) dispatch({ type: 'accept', id: t.id }); dispatch({ type: 'view', view: 'focus' }) }, 1300],
      ['验收任务集', () => { const set = find(t => t.kind === 'set' && t.state === 'in_review'); if (set) dispatch({ type: 'accept', id: set.id }) }, 1100],
      ['收口：日历回流', () => dispatch({ type: 'view', view: 'calendar' }), 1200],
      ['收口：云之家只读', () => dispatch({ type: 'view', view: 'yzj' }), 1400],
    ]
    ;(async () => {
      await wait(300)
      for (const [label, fn, ms] of steps) {
        if (!alive || !ref.current.demo) return
        fn(); dispatch({ type: 'toast', text: `自动演示 · ${label}` }); await wait(ms)
      }
      dispatch({ type: 'demo', on: false }); dispatch({ type: 'toast', text: '自动演示完成：直接建 → 闲聊落成 → 速记拆+确认' })
    })()
    return () => { alive = false }
  }, [s.demo])
}
