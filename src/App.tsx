import { useEffect, useReducer, useRef, useState, useCallback } from 'react'
import { A, ADV_ID, FLOW_STEPS, FlowStep, initial, Overlay, reduce, ROLES, S, STATE_CN, Task, TODAY, TRANSCRIPT, WEEK, focusRows, FocusRow, Who, TState, STENO_ID } from './store'

const KEY = 'advance-flow-v7'
type H = { cur: S; past: S[] }
function hreduce(h: H, a: A | { type: 'undo' }): H {
  if (a.type === 'undo') return h.past.length ? { cur: { ...h.past[0], toast: '已撤销' }, past: h.past.slice(1) } : h
  const next = reduce(h.cur, a)
  const silent = ['line', 'toast', 'demo', 'view', 'role', 'lingeeTick', 'cmd', 'createForm', 'overlay', 'closeOverlay'].includes(a.type)
  return { cur: next, past: silent ? h.past : [h.cur, ...h.past].slice(0, 30) }
}
const load = (): H => { try { const v = localStorage.getItem(KEY); if (v) return { cur: { ...JSON.parse(v), demo: false, overlay: null }, past: [] } } catch {} return { cur: initial(), past: [] } }

const avOf = (w: Who) => ROLES.find(r => r.name === w)?.av ?? 'violet'
const Av = ({ who, s = '' }: { who: Who; s?: string }) => <span className={`av ${s}`} data-av={who === '灵基' ? 'lingee' : avOf(who)}>{who === '灵基' ? '✦' : who ? who.slice(-1) : '?'}</span>

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

/** 看板顶栏唯一主按钮：按状态推进链路 */
export function nextStep(s: S): { id: string; label: string; run: (dispatch: (a: A) => void) => void } {
  if (s.overlay === 'create') return { id: 'create', label: '创建到推进', run: d => d({ type: 'createDirect' }) }
  if (s.overlay === 'room' && s.recording) return { id: 'end', label: '结束并拆任务', run: d => d({ type: 'end' }) }
  if (s.overlay === 'end') return { id: 'dispatch', label: `派出 ${s.drafts.filter(x => x.keep).length || ''} 件`.trim(), run: d => d({ type: 'dispatch' }) }

  const rows = focusRows(s, s.role)
  const first = (k: FocusRow['kind']) => rows.find(r => r.kind === k)

  // 派出之后：确认 / 验收 / 接下 优先
  const take = first('派给我')
  if (take && (take.task.kind === 'revise' || take.task.source?.type)) {
    if (take.task.kind === 'revise') return { id: 'revised', label: '改好了，重新发确认', run: d => d({ type: 'revised', id: take.task.id }) }
    if (take.task.parentId) return { id: 'take', label: `接下「${take.task.title.slice(0, 10)}」`, run: d => { d({ type: 'setState', id: take.task.id, state: 'in_progress' }); d({ type: 'toast', text: `已接下「${take.task.title}」` }) } }
  }
  const draft = first('灵基交稿')
  if (draft) return { id: 'sendConfirm', label: '发给确认人', run: d => d({ type: 'sendConfirm', id: draft.task.id }) }
  const conf = first('待确认')
  if (conf) return { id: 'confirm', label: '确认纪要', run: d => d({ type: 'confirm', id: conf.task.id }) }
  const accept = first('待验收')
  if (accept) return { id: 'accept', label: '验收完成', run: d => d({ type: 'accept', id: accept.task.id }) }
  const due = first('到期')
  if (due) return { id: 'due', label: '提交验收', run: d => d({ type: 'setState', id: due.task.id, state: 'in_review' }) }
  const lingeeDoing = s.tasks.find(t => t.assignee === '灵基' && t.kind === 'minutes' && t.state === 'in_progress')
  if (lingeeDoing) return { id: 'lingeeSubmit', label: '生成纪要稿', run: d => d({ type: 'lingeeSubmit', id: lingeeDoing.id }) }

  // 三条入口按链路发现，不并排三张卡
  const hasDirect = s.tasks.some(t => t.source?.type === 'direct')
  const hasStenoSet = s.tasks.some(t => t.kind === 'set' && t.source?.type === 'steno')
  const hasChatSet = s.tasks.some(t => t.kind === 'set' && t.source?.type === 'chat')
  if (!hasDirect) return { id: 'open-create', label: '新建一条任务', run: d => d({ type: 'overlay', overlay: 'create' }) }
  if (!hasChatSet) return { id: 'open-chat', label: '把闲聊落成任务', run: d => { if (!s.lingee.open) d({ type: 'lingeeToggle' }); d({ type: 'cmd', open: true }) } }
  if (!hasStenoSet) return { id: 'open-room', label: '把讨论拆成任务', run: d => d({ type: 'startDiscussion', title: '门店巡检改版对齐', source: `item:${ADV_ID}`, boundTask: ADV_ID }) }

  if (take) return { id: 'take', label: `接下「${take.task.title.slice(0, 10)}」`, run: d => { d({ type: 'setState', id: take.task.id, state: 'in_progress' }); d({ type: 'toast', text: `已接下「${take.task.title}」` }) } }
  const empty = first('没人接')
  if (empty) return { id: 'assign', label: '指派给阿炜', run: d => d({ type: 'assign', id: empty.task.id, who: '阿炜' }) }
  const ack = first('灵基回话')
  if (ack) return { id: 'ack', label: '先排除', run: d => d({ type: 'ack', id: ack.task.id }) }
  return { id: 'open-create2', label: '再建一条任务', run: d => d({ type: 'overlay', overlay: 'create' }) }
}

export default function App() {
  const [h, d] = useReducer(hreduce, undefined, load)
  const s = h.cur
  const dispatch = useCallback((a: A) => d(a), [])
  const [moreOpen, setMoreOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [chainOpen, setChainOpen] = useState(false)
  const [tipOn, setTipOn] = useState(() => {
    try { return localStorage.getItem('advance-flow-tip-v1') !== '1' } catch { return true }
  })
  const dismissTip = () => { try { localStorage.setItem('advance-flow-tip-v1', '1') } catch {} setTipOn(false) }
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(s)) }, [s])
  useEffect(() => { if (s.toast) { const t = setTimeout(() => d({ type: 'toast' }), 3500); return () => clearTimeout(t) } }, [s.toast])
  useEffect(() => { if (s.overlay === 'room' && s.recording && s.lines < TRANSCRIPT.length) { const t = setTimeout(() => d({ type: 'line' }), s.demo ? 400 : 900); return () => clearTimeout(t) } }, [s.overlay, s.recording, s.lines, s.demo])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dispatch({ type: 'cmd', open: !s.cmdOpen }) }
      if (e.key === 'Escape') {
        if (s.cmdOpen) dispatch({ type: 'cmd', open: false })
        else if (s.overlay) dispatch({ type: 'closeOverlay' })
        else { setMoreOpen(false); setRoleOpen(false); setChainOpen(false) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.cmdOpen, s.overlay, dispatch])
  useDemo(s, dispatch)

  const step = nextStep(s)
  const archives = [
    ['focus', '要我定的'] as const,
    ['calendar', '日历'] as const,
    ['steno', '速记证据'] as const,
    ['tasks', '全部任务'] as const,
    ['yzj', '云之家'] as const,
  ]

  return (
    <div className="app simple" data-entry={s.entry ?? 'none'} data-overlay={s.overlay ?? 'none'}>
      <div className="bg-glow" aria-hidden />
      <header className="top glass">
        <div className="brand">
          <b>推进</b>
          <span className="ai-badge"><i className="spark">✦</i> 灵基</span>
        </div>
        <FlowDots flowStep={s.flowStep} />
        <button className="primary glow next-cta" data-testid="next-step" onClick={() => step.run(dispatch)}>{step.label || '新建一条任务'}</button>
        <div className="top-right">
          <div className="menu-wrap">
            <button className="ghost sm" data-testid="more-btn" onClick={() => { setMoreOpen(v => !v); setRoleOpen(false) }}>更多</button>
            {moreOpen && <div className="menu glass" data-testid="more-menu">
              {archives.filter(([v]) => v !== 'focus').map(([v, n]) =>
                <button key={v} data-testid={`nav-${v}`} onClick={() => { dispatch({ type: 'view', view: v }); setMoreOpen(false) }}>{n}</button>)}
              <button data-testid="chain-toggle" onClick={() => { setChainOpen(v => !v); setMoreOpen(false) }}>{chainOpen ? '收起链路' : '看链路细节'}</button>
              {!tipOn && <button data-testid="show-tip" onClick={() => { try { localStorage.removeItem('advance-flow-tip-v1') } catch {} setTipOn(true); setMoreOpen(false) }}>显示用法</button>}
              <button onClick={() => { d({ type: 'undo' }); setMoreOpen(false) }} disabled={!h.past.length}>撤销</button>
              <button onClick={() => { localStorage.removeItem(KEY); dispatch({ type: 'reset' }); setMoreOpen(false) }}>一键重置</button>
            </div>}
          </div>
          <div className="menu-wrap role-wrap">
            <span className="role-label">当前身份</span>
            <button className="ghost sm role-btn" data-testid="role-menu" onClick={() => { setRoleOpen(v => !v); setMoreOpen(false) }}>
              <Av who={s.role} s="s20" />{s.role}
            </button>
            <span className="role-hint" data-testid="role-hint">切换身份可看确认/验收</span>
            {roleOpen && <div className="menu glass" data-testid="role-menu-panel">
              <p className="role-tip">演示切换身份，才能看到确认 / 验收</p>
              {ROLES.map(r => <button key={r.name} data-testid={`role-${r.name}`} className={s.role === r.name ? 'on' : ''} onClick={() => { dispatch({ type: 'role', role: r.name }); setRoleOpen(false) }}><Av who={r.name} s="s20" />{r.name}<small>{r.tag}</small></button>)}
            </div>}
          </div>
        </div>
      </header>

      {tipOn && (
        <div className="tip-banner" data-testid="first-run-tip" role="status">
          <span>用法：点蓝色按钮做当前这一步；右边 ✦ 是跟灵基说话；更多里是日历/归档（关掉后可在「更多 → 显示用法」找回）。</span>
          <button className="ghost sm" data-testid="tip-dismiss" onClick={dismissTip} aria-label="关闭提示">知道了</button>
        </div>
      )}

      <div className="body">
        <main className="glass-panel board-main">
          {s.view !== 'focus' && (
            <div className="back-bar" data-testid="back-bar">
              <button className="primary sm" data-testid="back-board" onClick={() => dispatch({ type: 'view', view: 'focus' })}>← 回到看板</button>
            </div>
          )}
          {s.view === 'focus' && <Focus s={s} dispatch={dispatch} undo={() => d({ type: 'undo' })} canUndo={h.past.length > 0} />}
          {s.view === 'calendar' && <Calendar s={s} dispatch={dispatch} />}
          {s.view === 'steno' && <StenoArchive s={s} dispatch={dispatch} />}
          {s.view === 'tasks' && <AllTasks s={s} dispatch={dispatch} />}
          {s.view === 'yzj' && <Yzj s={s} />}
        </main>
        {s.lingee.open && <LingeeRail s={s} dispatch={dispatch} />}
        {!s.lingee.open && (
          <button className="lingee-fab" data-testid="lingee-open" onClick={() => dispatch({ type: 'lingeeToggle' })}>
            <span className="spark">✦</span>
          </button>
        )}
        {chainOpen && <Chain s={s} onClose={() => setChainOpen(false)} />}
      </div>

      {s.overlay && s.overlay !== 'chat' && (
        <OverlayShell title={overlayTitle(s.overlay)} onClose={() => dispatch({ type: 'closeOverlay' })} wide={s.overlay === 'room' || s.overlay === 'end'} primary={
          s.overlay === 'create' ? { label: '创建到推进', testid: 'create-submit', onClick: () => dispatch({ type: 'createDirect' }) }
            : s.overlay === 'room' && s.recording ? { label: '结束并拆任务', testid: 'end', onClick: () => dispatch({ type: 'end' }) }
              : s.overlay === 'end' ? { label: `派出 ${s.drafts.filter(x => x.keep).length} 件`, testid: 'dispatch', onClick: () => dispatch({ type: 'dispatch' }) }
                : undefined
        }>
          {s.overlay === 'create' && <CreateDirect s={s} dispatch={dispatch} />}
          {s.overlay === 'room' && <Room s={s} dispatch={dispatch} />}
          {s.overlay === 'end' && <End s={s} dispatch={dispatch} />}
        </OverlayShell>
      )}

      {s.cmdOpen && <CmdPalette s={s} dispatch={dispatch} onClose={() => dispatch({ type: 'cmd', open: false })} />}
      {s.toast && <div className="toast glass"><span className="spark">✦</span>{s.toast}<button onClick={() => d({ type: 'undo' })}>撤销</button></div>}
    </div>
  )
}

function overlayTitle(o: Exclude<Overlay, null | 'chat'>) {
  if (o === 'create') return '新建任务'
  if (o === 'room') return '讨论采证'
  return '确认要派的任务'
}

function FlowDots({ flowStep }: { flowStep: FlowStep }) {
  return <div className="flow-dots" data-testid="flow-stepper" aria-label="进度">
    {FLOW_STEPS.map(st => (
      <span key={st.n} className={`flow-step ${st.n === flowStep ? 'cur' : st.n < flowStep ? 'past' : ''}`} data-step={st.n}>
        <i aria-hidden />
        <em>{st.name}</em>
      </span>
    ))}
  </div>
}

type P = { s: S; dispatch: (a: A) => void }

function OverlayShell({ title, onClose, children, wide, primary }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; primary?: { label: string; testid: string; onClick: () => void } }) {
  return <div className="ov-mask" data-testid="overlay" onClick={onClose}>
    <div className={`ov-panel glass ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
      <div className="ov-head">
        <h3>{title}</h3>
        <button className="ghost sm" data-testid="overlay-close" onClick={onClose}>关闭</button>
      </div>
      <div className="ov-body">{children}</div>
      {primary && <div className="ov-foot"><button className="primary big glow" data-testid={primary.testid} onClick={primary.onClick}>{primary.label}</button></div>}
    </div>
  </div>
}

function LingeeRail({ s, dispatch }: P) {
  const L = s.lingee
  const [q, setQ] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [s.chat.length, L.stream])
  return <aside className="lingee-rail glass-panel" data-testid="lingee-rail">
    <div className="lr-head">
      <span className="av" data-av="lingee">✦</span>
      <div><b>灵基</b><small>{L.note ?? '待命'}</small></div>
      <button className="icon" data-testid="lingee-close" onClick={() => dispatch({ type: 'lingeeToggle' })} title="收起">✕</button>
    </div>
    <div className={`lr-status ${L.phase}`}>
      {L.phase === 'thinking' && <><i className="spin" />想一下…</>}
      {L.phase === 'streaming' && <><i className="spin" />写着…</>}
      {L.phase === 'ready' && <><i className="pulse-dot" />在</>}
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

    <div className="lr-chat" data-testid="rail-chat">
      {s.chat.length === 0 && <div className="lr-chat-empty">跟我说一句，我帮你落成任务</div>}
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
    <form className="chat-input glass rail-input" onSubmit={e => { e.preventDefault(); if (!q.trim()) return; dispatch({ type: 'chatSend', text: q.trim() }); setQ('') }}>
      <span className="spark">✦</span>
      <input data-testid="chat-input" value={q} onChange={e => setQ(e.target.value)} placeholder="跟灵基说…" />
      <button className="primary sm" type="submit">发送</button>
    </form>
  </aside>
}

function Chain({ s, onClose }: { s: S; onClose: () => void }) {
  const STEPS = [
    { n: 1, name: '直接建' },
    { n: 2, name: '闲聊落成' },
    { n: 3, name: '速记拆' },
    { n: 4, name: '要我定的' },
    { n: 5, name: '推进执行' },
    { n: 6, name: '确认纪要' },
    { n: 7, name: '验收' },
    { n: 8, name: '回流归档' },
  ]
  return <aside className="chain glass-panel" data-testid="chain">
    <div className="lr-head"><h3 style={{ margin: 0 }}>链路</h3><button className="icon" onClick={onClose}>✕</button></div>
    <ol>{STEPS.map(st => <li key={st.n} className={st.n === s.step ? 'cur' : st.n < s.step ? 'past' : ''}>
      <b>{st.n}</b><div className="nm">{st.name}</div></li>)}</ol>
  </aside>
}

function CmdPalette({ s, dispatch, onClose }: P & { onClose: () => void }) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const go = (text: string) => { dispatch({ type: 'chatSend', text }); onClose() }
  const suggestions = [
    { t: '帮我记下：巡检表精简、拍照必填、看板加整改率', d: '闲聊落成任务' },
    { t: '帮我开一场门店巡检讨论', d: '开讨论采证' },
    { t: '直接建任务', d: '马上建一条' },
  ]
  return <div className="cmd-mask" data-testid="cmd-palette" onClick={onClose}>
    <div className="cmd-box glass" onClick={e => e.stopPropagation()}>
      <div className="cmd-row">
        <span className="spark">✦</span>
        <input ref={ref} data-testid="cmd-input" placeholder="跟灵基说…" value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) go(q.trim()); if (e.key === 'Escape') onClose() }} />
        <kbd>↵</kbd>
      </div>
      <div className="cmd-sugs">
        {suggestions.map(x => <button key={x.t} data-testid="cmd-sug" onClick={() => x.t === '直接建任务' ? (dispatch({ type: 'overlay', overlay: 'create' }), onClose()) : go(x.t)}><b>{x.t}</b><small>{x.d}</small></button>)}
      </div>
      {s.chat.length > 0 && <div className="cmd-recent">最近 · {s.chat.filter(m => m.role === 'user').slice(-2).map(m => m.text).join(' · ')}</div>}
    </div>
  </div>
}

function CreateDirect({ s, dispatch }: P) {
  const f = s.createForm
  return <div className="create" data-testid="create-view">
    <p className="help">写标题，点下面大按钮就进看板。负责人可先空着——会作为「没人接」出现在看板。</p>
    <div className="create-form glass">
      <label>标题<input data-testid="create-title" value={f.title} onChange={e => dispatch({ type: 'createForm', patch: { title: e.target.value } })} placeholder="例如：巡检表字段精简到 12 项" /></label>
      <label>谁说的（可选）<input data-testid="create-quote" value={f.quote} onChange={e => dispatch({ type: 'createForm', patch: { quote: e.target.value } })} placeholder="方便以后回看" /></label>
      <div className="create-row">
        <label>负责人<select value={f.assignee} onChange={e => dispatch({ type: 'createForm', patch: { assignee: e.target.value as Who } })}>{['', '灵基', ...ROLES.map(r => r.name)].map(n => <option key={n || 'none'} value={n}>{n || '先空着（没人接）'}</option>)}</select></label>
        <label>截止<input type="date" value={f.due} onChange={e => dispatch({ type: 'createForm', patch: { due: e.target.value } })} /></label>
      </div>
    </div>
  </div>
}

function Calendar({ s, dispatch }: P) {
  const hours = Array.from({ length: 11 }, (_, i) => 9 + i)
  const evs: import('./store').CalEvent[] = [...s.events, ...s.tasks.filter(t => t.due && t.kind === 'task' && t.parentId && t.state !== 'done' && !s.events.some(e => e.title === `截止 · ${t.title}`)).map(t => ({ id: 'd' + t.id, day: t.due!, start: 18, end: 18.5, title: `截止 · ${t.title}`, kind: 'deadline' as const }))]
  const adv = s.tasks.find(t => t.id === ADV_ID)!
  return <div className="cal">
    <div className="vhead"><h2>日历</h2>
      <div className="vacts">
        <button className="ghost" data-testid="blank-discussion" onClick={() => dispatch({ type: 'startDiscussion', title: '临时讨论' })}>＋ 开讨论</button>
        <button className="primary sm" data-testid="cal-direct" onClick={() => { dispatch({ type: 'view', view: 'focus' }); dispatch({ type: 'overlay', overlay: 'create' }) }}>＋ 新建</button>
      </div>
    </div>
    <div className="calwrap">
      <div className="grid">
        <div className="gh" />{WEEK.map(d => <div key={d} className={`gh ${d === TODAY ? 'today' : ''}`}>{'一二三四五六日'[WEEK.indexOf(d)]} <b>{d.slice(8)}</b></div>)}
        {hours.map(hh => <div key={hh} className="row"><div className="hr">{hh}:00</div>{WEEK.map(d => <div key={d} className="cell">
          {evs.filter(e => e.day === d && Math.floor(e.start) === hh).map(e => <div key={e.id} className={`ev ${e.kind}`} data-testid={e.kind === 'discussion' ? 'cal-discussion' : undefined}
            onClick={() => e.kind === 'discussion' && e.taskId && dispatch({ type: 'startDiscussion', title: e.title, source: `item:${e.taskId}`, boundTask: e.taskId })}>
            <b>{e.title}</b>{e.taskId && <small>🔗 {e.kind === 'next' ? '任务集' : adv.title}</small>}{e.kind === 'deadline' && <small>截止</small>}</div>)}
        </div>)}</div>)}
      </div>
      <div className="side">
        <h4>本周任务</h4>
        {s.tasks.filter(t => t.kind === 'task' && !t.parentId && t.state !== 'done').map(t => <div key={t.id} className="tcard">
          <div><b>{t.title}</b><small>{t.assignee || '没人接'} · {STATE_CN[t.state]}</small></div>
          <button className="link" data-testid={t.id === ADV_ID ? 'pull-discussion' : undefined} onClick={() => dispatch({ type: 'startDiscussion', title: `${t.title}对齐`, source: `item:${t.id}`, boundTask: t.id })}>开讨论</button></div>)}
      </div>
    </div>
  </div>
}

function StenoArchive({ s, dispatch }: P) {
  const n = Math.max(s.lines, s.highlight != null ? s.highlight + 1 : 0, TRANSCRIPT.length)
  return <div className="room" data-testid="steno-archive">
    <div className="vhead"><h2>速记证据</h2></div>
    {s.highlight != null && <div className="strip done">已定位原话 L{s.highlight}</div>}
    <div className="room-grid">
      <div className="tr">{TRANSCRIPT.slice(0, n || TRANSCRIPT.length).map((l, i) => <div key={i} className={`ln ${s.highlight === i ? 'hl' : ''} ${s.evidence.highlights.some(h => h.line === i) ? 'pinned' : ''}`}>
        <Av who={l.who} s="s20" /><b>{l.who}</b><small>{l.t}</small><p>{l.text}</p>
      </div>)}</div>
      <aside className="evidence" data-testid="evidence-panel">
        <h4>证据</h4>
        <section>
          <h5>笔记 / 重点</h5>
          <ul>{s.evidence.notes.map((x, i) => <li key={i}>{x}</li>)}
            {s.evidence.highlights.map(h => <li key={'h' + h.line} className="hl-li">L{h.line} · {h.text.slice(0, 28)}…</li>)}
            {!s.evidence.notes.length && !s.evidence.highlights.length && <li className="weak">还没有</li>}
          </ul>
        </section>
        <button className="primary sm" onClick={() => dispatch({ type: 'startDiscussion', title: '门店巡检改版对齐', source: `item:${ADV_ID}`, boundTask: ADV_ID })}>在看板开讨论</button>
      </aside>
    </div>
  </div>
}

function Room({ s, dispatch }: P) {
  const ref = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState('')
  useEffect(() => { ref.current?.querySelector('.hl')?.scrollIntoView({ block: 'center' }) }, [s.highlight])
  const n = s.lines
  return <div className="room" data-testid="room-view">
    <p className="help">听着记重点。听完点下面「结束并拆任务」。</p>
    <div className="people">{ROLES.map(r => <span key={r.name}><Av who={r.name} />{r.name}</span>)}</div>
    {s.carryIn.length > 0 && <div className="carry" data-testid="carry-in">
      <b>上次没做完 {s.carryIn.length} 件</b>
      {s.carryIn.map(t => <span key={t.id} className="carry-chip">{t.title}</span>)}
    </div>}
    {s.recording ? <div className="strip"><i className="rec" />采证中<em>重点 {s.evidence.highlights.length}</em></div>
      : <div className="strip done">已结束</div>}
    <div className="room-grid">
      <div className="tr" ref={ref}>{TRANSCRIPT.slice(0, n).map((l, i) => <div key={i} className={`ln ${s.highlight === i ? 'hl' : ''} ${s.evidence.highlights.some(h => h.line === i) ? 'pinned' : ''}`}>
        <Av who={l.who} s="s20" /><b>{l.who}</b><small>{l.t}</small>
        <p>{l.text}{s.recording && <button className="pin" data-testid="pin-hl" onClick={() => dispatch({ type: 'pinHighlight', line: i })} title="钉重点">📌</button>}</p>
      </div>)}
        {s.recording && n < TRANSCRIPT.length && <div className="typing"><i className="spin" /> 转写中…</div>}</div>
      <aside className="evidence" data-testid="evidence-panel">
        <h4>证据</h4>
        <section>
          <h5>笔记 / 重点</h5>
          <ul>{s.evidence.notes.map((x, i) => <li key={i}>{x}</li>)}
            {s.evidence.highlights.map(h => <li key={'h' + h.line} className="hl-li">L{h.line} · {h.text.slice(0, 28)}…</li>)}
            {!s.evidence.notes.length && !s.evidence.highlights.length && <li className="weak">还没有</li>}
          </ul>
          {s.recording && <form className="note-form" onSubmit={e => { e.preventDefault(); if (!note.trim()) return; dispatch({ type: 'addNote', text: note }); setNote('') }}>
            <input data-testid="note-input" value={note} onChange={e => setNote(e.target.value)} placeholder="随手记…" />
            <button className="ghost sm" type="submit">记</button>
          </form>}
        </section>
      </aside>
    </div>
  </div>
}

function End({ s, dispatch }: P) {
  const [edit, setEdit] = useState<string | null>(null)
  return <div className="end" data-testid="end-view">
    <p className="help">勾选要派的，点下面大按钮派出去。</p>
    <div className="parent">{s.discussion?.title || '任务集'}</div>
    {s.drafts.map(d => <div key={d.id} className={`draft ${d.keep ? '' : 'drop'}`} data-testid="draft">
      <label className="chk"><input type="checkbox" checked={d.keep} onChange={() => dispatch({ type: 'keep', id: d.id })} />{d.keep ? '要' : '不要'}</label>
      <div className="dm">{edit === d.id ? <input autoFocus defaultValue={d.title} onBlur={e => { dispatch({ type: 'editDraft', id: d.id, title: e.target.value }); setEdit(null) }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        : <b onClick={() => setEdit(d.id)}>{d.title}</b>}
        <blockquote onClick={() => d.line > 0 && dispatch({ type: 'jumpSource', line: d.line })}>「{d.quote}」</blockquote></div>
      <select value={d.assignee} onChange={e => dispatch({ type: 'draftAssignee', id: d.id, who: e.target.value as Who })}>{['灵基', ...ROLES.map(r => r.name)].map(n => <option key={n}>{n}</option>)}</select>
      <span className="due">{d.due.slice(5)}</span></div>)}
    <label className="toggle"><input type="checkbox" data-testid="minutes-toggle" checked={s.minutesOn} onChange={() => dispatch({ type: 'toggleMinutes' })} /> 顺带整理纪要让大家确认</label>
  </div>
}

const DOT: Record<string, string> = { 派给我: 'me', 到期: 'time', 没人接: 'other', 灵基回话: 'lingee', 灵基交稿: 'lingee', 待确认: 'me', 待验收: 'me', '没人动·催一下': 'time' }
const OBJ_TARGETS = ['第 1 条 · 巡检表精简到 12 项', '第 2 条 · 拍照上传改为必填', '第 3 条 · 看板加整改率', '第 4 条 · 试点 3 家店']

function Focus({ s, dispatch, undo, canUndo }: P & { undo: () => void; canUndo: boolean }) {
  const rows = focusRows(s, s.role)
  const [open, setOpen] = useState<string | null>(null)
  const [obj, setObj] = useState('')
  const [objTarget, setObjTarget] = useState(OBJ_TARGETS[1])
  const lingeeDoing = s.tasks.filter(t => t.assignee === '灵基' && t.state === 'in_progress')
  const hasDirect = s.tasks.some(t => t.source?.type === 'direct')
  const heroSub = hasDirect
    ? '下面这些在等你定；顶上蓝色按钮继续当前这一步'
    : '先点顶上蓝色「新建一条任务」；想先看流程，点下面链接'
  return <div className="focus" data-testid="board">
    <div className="board-hero" data-testid="board-hero">
      <h2>今天要你动手的事</h2>
      <p className="hero-sub">{heroSub}</p>
      {!hasDirect && (
        <button className="link hero-demo" data-testid="hero-demo" onClick={() => {
          if (!s.demo) { localStorage.removeItem(KEY); dispatch({ type: 'reset' }) }
          setTimeout(() => dispatch({ type: 'demo', on: !s.demo }), 50)
        }}>{s.demo ? '停止演示' : '看一遍怎么用'}</button>
      )}
      <span className="weak hero-meta">{s.role} · {TODAY}</span>
    </div>
    {rows.length === 0 && <div className="empty" data-testid="board-empty">{hasDirect
      ? <>今天清空了 🎉<div className="empty-hint">点顶上蓝色按钮继续，或右下角 ✦ 跟灵基说</div></>
      : <>还没有要你定的事<div className="empty-hint">点顶上蓝色「新建一条任务」开始；想先看一遍，点上面链接</div></>}</div>}
    {rows.map(r => <div key={r.key} className={`frow ${open === r.key ? 'open' : ''}`} data-testid="frow" data-kind={r.kind} onClick={() => setOpen(r.key)}>
      <i className={`dot ${DOT[r.kind]}`} /><span className="kind">{r.kind}</span>
      {r.task.sample && <span className="sample-tag" data-testid="sample-tag">示例（可忽略）</span>}
      <b>{r.task.title}</b><span className="line">{r.line}</span>
      {r.task.source && <button className="src" onClick={e => { e.stopPropagation(); dispatch({ type: 'jumpSource', line: r.task.source!.line ?? 0 }) }}>{r.task.source.label}</button>}
      <span className="acts" onClick={e => e.stopPropagation()}>{actions(r, s, dispatch, obj, setObj, objTarget, setObjTarget)}</span>
      {open === r.key && r.kind === '灵基交稿' && s.minutesDoc && <div className="doc"><h5>纪要</h5><ol>{s.minutesDoc.map((m, i) => <li key={i}>{m}</li>)}</ol></div>}
      {open === r.key && r.kind === '待确认' && s.minutesDoc && <div className="doc"><h5>纪要 · 反对请标哪一条</h5><ol>{s.minutesDoc.map((m, i) => <li key={i}>{m}</li>)}</ol>
        <div className="obj-row"><label>反对哪一条 <select data-testid="obj-target" value={objTarget} onChange={e => setObjTarget(e.target.value)}>{OBJ_TARGETS.map(t => <option key={t}>{t}</option>)}</select></label></div>
      </div>}
    </div>)}
    {lingeeDoing.length > 0 && <div className="lingee-doing"><h4><span className="spark">✦</span> 灵基在做</h4>{lingeeDoing.map(t => <div key={t.id} className="ld"><span>{t.title}{t.product ? ` · ${t.product}` : ''}</span>
      {t.kind === 'minutes' && <button className="ghost sm" data-testid="lingee-submit" onClick={() => dispatch({ type: 'lingeeSubmit', id: t.id })}>生成纪要稿</button>}</div>)}</div>}
    {canUndo && <p className="hint"><button className="link" onClick={undo}>撤销上一步</button></p>}
  </div>
}
function actions(r: FocusRow, s: S, dispatch: (a: A) => void, obj: string, setObj: (v: string) => void, objTarget: string, setObjTarget: (v: string) => void) {
  const t = r.task
  switch (r.kind) {
    case '派给我': return t.kind === 'revise' ? <button className="primary sm" data-testid="act-revised" onClick={() => dispatch({ type: 'revised', id: t.id })}>改好了</button>
      : <button className="primary sm" data-testid="act-take" onClick={() => { dispatch({ type: 'setState', id: t.id, state: 'in_progress' }); dispatch({ type: 'toast', text: `已接下「${t.title}」` }) }}>接下</button>
    case '到期': return <button className="primary sm" onClick={() => dispatch({ type: 'setState', id: t.id, state: 'in_review' })}>提交验收</button>
    case '没人接': return <select className="sm" defaultValue="" onChange={e => dispatch({ type: 'assign', id: t.id, who: e.target.value as Who })}><option value="" disabled>指派给…</option>{ROLES.map(x => <option key={x.name}>{x.name}</option>)}</select>
    case '灵基回话': return <button className="primary sm" onClick={() => dispatch({ type: 'ack', id: t.id })}>先排除</button>
    case '灵基交稿': return <button className="primary sm" data-testid="act-send-confirm" onClick={() => dispatch({ type: 'sendConfirm', id: t.id })}>发给确认人</button>
    case '待确认': return <><button className="primary sm" data-testid="act-confirm" onClick={() => dispatch({ type: 'confirm', id: t.id })}>确认纪要</button>
      <input className="sm" placeholder="异议" value={obj} onChange={e => setObj(e.target.value)} data-testid="obj-input" />
      <button className="ghost sm" data-testid="act-object" onClick={() => { dispatch({ type: 'object', id: t.id, text: obj || '拍照必填要分门店类型，便利店先不强制', target: objTarget }); setObj('') }}>反对</button></>
    case '待验收': return <><button className="primary sm" data-testid="act-accept" onClick={() => dispatch({ type: 'accept', id: t.id })}>验收完成</button><button className="ghost sm" onClick={() => dispatch({ type: 'return', id: t.id })}>退回</button></>
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
        <span className={`pill ${t.state}`}>{STATE_CN[t.state]}</span><Av who={t.assignee} s="s20" /><span className="weak">{t.assignee || '没人接'}</span>
        {t.due && <span className={`due ${t.due <= TODAY && t.state !== 'done' ? 'over' : ''}`}>{t.due.slice(5)}</span>}
        {t.source && <button className="src" onClick={() => dispatch({ type: 'jumpSource', line: t.source!.line ?? 0 })}>来源</button>}
        <span className="acts">{stateBtns(t, s, dispatch)}</span>
      </div>
      {!isFold && kids.map(k => row(k, depth + 1))}
    </div>
  }
  const tl = [...s.events.filter(e => e.kind !== 'meeting' && e.kind !== 'deadline'), ...s.tasks.filter(t => t.due && t.state !== 'done').map(t => ({ id: t.id, day: t.due!, title: `截止 · ${t.title}`, kind: 'deadline' }))].sort((a, b) => a.day.localeCompare(b.day))
  return <div className="all">
    <div className="vhead"><h2>全部任务</h2></div>
    <div className="allwrap"><div className="list">{tops.map(t => row(t, 0))}</div>
      <div className="timeline"><h4>时间线</h4>{tl.map(e => <div key={e.id + e.title} className={`tl ${e.kind}`}><span>{e.day.slice(5)}</span>{e.title}</div>)}</div></div>
  </div>
}
function stateBtns(t: Task, s: S, dispatch: (a: A) => void) {
  const me = s.role
  if (t.state === 'done' || t.kind === 'set') return null
  if (t.state !== 'in_review' && s.tasks.some(k => k.parentId === t.id && k.state !== 'done')) return <span className="weak">等子任务</span>
  if (t.assignee === '灵基') return t.state === 'in_progress' ? <button className="ghost sm" onClick={() => dispatch(t.kind === 'minutes' ? { type: 'lingeeSubmit', id: t.id } : { type: 'setState', id: t.id, state: 'in_review', by: '灵基' })}>灵基提交</button>
    : t.state === 'in_review' && t.creator === me && t.kind !== 'minutes' ? <button className="primary sm" onClick={() => dispatch({ type: 'accept', id: t.id })}>验收</button> : null
  const go = (st: TState, label: string, id?: string) => <button className="ghost sm" data-testid={id} onClick={() => dispatch({ type: 'setState', id: t.id, state: st })}>{label}</button>
  if (t.assignee === me && t.state === 'suggested' && t.kind === 'task') return go('in_progress', '接下')
  if (t.assignee === me && t.state === 'in_progress' && t.kind === 'task') return go('in_review', '提交验收', 'submit-review')
  if (t.creator === me && t.state === 'in_review') return <><button className="primary sm" onClick={() => dispatch({ type: 'accept', id: t.id })}>验收完成</button><button className="ghost sm" onClick={() => dispatch({ type: 'return', id: t.id })}>退回</button></>
  return null
}

function Yzj({ s }: { s: S }) {
  return <div className="yzj">
    <div className="vhead"><h2>云之家 · 只读</h2></div>
    <div className="phone"><div className="ph">推进 · {s.role}</div>
      {s.tasks.filter(t => t.kind !== 'confirm').map(t => <div key={t.id} className="yrow"><b>{t.title}</b><small>{t.assignee || '没人接'} · {STATE_CN[t.state]}{t.due ? ` · ${t.due.slice(5)}` : ''}</small></div>)}
      <div className="ro">只读。改动请回看板。</div></div>
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
    const steps: [string, () => void, number][] = [
      ['新建任务', () => dispatch({ type: 'overlay', overlay: 'create' }), 900],
      ['填标题', () => {
        dispatch({ type: 'createForm', patch: { title: '巡检表字段精简到 12 项', quote: '阿炜说周五前出新版字段', assignee: '阿炜', due: '2026-11-06' } })
      }, 800],
      ['创建', () => dispatch({ type: 'createDirect' }), 1200],
      ['跟灵基说', () => { dispatch({ type: 'chatSend', text: '帮我记下：拍照必填、看板加整改率' }) }, 1400],
      ['落成', () => dispatch({ type: 'pill', pill: '落成推进任务' }), 1000],
      ['派出', () => dispatch({ type: 'dispatch' }), 1200],
      ['开讨论', () => dispatch({ type: 'startDiscussion', title: '门店巡检改版对齐', source: `item:${ADV_ID}`, boundTask: ADV_ID }), 3600],
      ['钉重点', () => { dispatch({ type: 'pinHighlight', line: 2 }); dispatch({ type: 'addNote', text: '便利店拍照先不强制' }) }, 800],
      ['结束拆任务', () => dispatch({ type: 'end' }), 1000],
      ['打开纪要', () => dispatch({ type: 'toggleMinutes' }), 800],
      ['派出', () => dispatch({ type: 'dispatch' }), 1200],
      ['阿炜接下', () => { dispatch({ type: 'role', role: '阿炜' }); const t = find(x => x.title.startsWith('巡检表') && x.kind === 'task' && x.state === 'suggested'); if (t) dispatch({ type: 'setState', id: t.id, state: 'in_progress' }) }, 1000],
      ['灵基交纪要', () => { dispatch({ type: 'role', role: '刘洋' }); const m = find(t => t.kind === 'minutes'); if (m) dispatch({ type: 'lingeeSubmit', id: m.id }) }, 1100],
      ['发给确认', () => { const m = find(t => t.kind === 'minutes'); if (m) dispatch({ type: 'sendConfirm', id: m.id }) }, 1000],
      ['老王反对', () => { dispatch({ type: 'role', role: '老王' }); dispatch({ type: 'object', id: find(t => t.kind === 'confirm' && t.assignee === '老王').id, text: '拍照必填要分门店类型，便利店先不强制', target: '第 2 条 · 拍照上传改为必填' }) }, 1200],
      ['阿炜确认', () => { dispatch({ type: 'role', role: '阿炜' }); dispatch({ type: 'confirm', id: find(t => t.kind === 'confirm' && t.assignee === '阿炜').id }) }, 1000],
      ['刘洋改好', () => { dispatch({ type: 'role', role: '刘洋' }); dispatch({ type: 'revised', id: find(t => t.kind === 'revise').id }) }, 1000],
      ['老王再确认', () => { dispatch({ type: 'role', role: '老王' }); dispatch({ type: 'confirm', id: find(t => t.kind === 'confirm' && t.assignee === '老王').id }) }, 1000],
      ['推进执行', () => {
        for (const t of st().tasks.filter(t => t.kind === 'task' && t.parentId?.startsWith('set') && t.state !== 'done')) {
          if (t.state === 'suggested') dispatch({ type: 'setState', id: t.id, state: 'in_progress', by: t.assignee })
          dispatch({ type: 'setState', id: t.id, state: 'in_review', by: t.assignee })
        }
      }, 1100],
      ['验收', () => { dispatch({ type: 'role', role: '刘洋' }); for (const t of st().tasks.filter(t => t.kind === 'task' && t.state === 'in_review')) dispatch({ type: 'accept', id: t.id }) }, 1100],
      ['验收任务集', () => { const set = find(t => t.kind === 'set' && t.state === 'in_review'); if (set) dispatch({ type: 'accept', id: set.id }) }, 1000],
      ['回看板', () => dispatch({ type: 'view', view: 'focus' }), 1000],
    ]
    ;(async () => {
      await wait(300)
      for (const [label, fn, ms] of steps) {
        if (!alive || !ref.current.demo) return
        fn(); dispatch({ type: 'toast', text: `看一遍 · ${label}` }); await wait(ms)
      }
      dispatch({ type: 'demo', on: false }); dispatch({ type: 'toast', text: '看完了。平时点蓝色按钮上的动词就行。' })
    })()
    return () => { alive = false }
  }, [s.demo])
}
