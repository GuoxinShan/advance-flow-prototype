// 推进 = system of record。三条并列入口：直接建 / 闲聊落成 / 会后从速记拆。
// 讨论/会议 = 可选证据场景；速记 = 证据层（原话锚点 · 会中笔记/重点 · AI稿+人工稿），无管理门禁。
// 王剑诉求一律走任务：溯源 / 纪要产物+确认子卡 / 反对标哪一条→修改子卡 / 行动闭环回写 / 跨次带未完成 / 目的·共识=任务集字段。
export type Role = '刘洋' | '老王' | '阿炜' | '张三'
export const ROLES: { name: Role; tag: string; av: string }[] = [
  { name: '刘洋', tag: '发起人', av: 'blue' },
  { name: '老王', tag: '运营', av: 'mint' },
  { name: '阿炜', tag: '产品', av: 'violet' },
  { name: '张三', tag: '负责人', av: 'coral' },
]
export type Who = Role | '灵基' | ''
export type TState = 'suggested' | 'in_progress' | 'in_review' | 'done'
export const STATE_CN: Record<TState, string> = { suggested: '待接', in_progress: '进行中', in_review: '待验收', done: '已完成' }
export type Kind = 'task' | 'set' | 'minutes' | 'confirm' | 'revise'
export type Entry = 'direct' | 'chat' | 'steno' | null
export type SourceType = 'steno' | 'item' | 'chat' | 'direct'
export interface Comment { by: Who; text: string; at: string }
export interface Source { type: SourceType; ref: string; line?: number; label: string }
export interface Task {
  id: string; title: string; assignee: Who; creator: Role; state: TState; due?: string
  parentId?: string; kind: Kind; source?: Source
  comments: Comment[]; nudged?: boolean; seen?: boolean; rev?: number; ackLingee?: boolean
  /** 任务集/产物字段（不是会议类型） */
  purpose?: string; consensus?: string[]; product?: string
  /** 异议指向的纪要条 */
  objectTarget?: string
}
export interface Draft {
  id: string; title: string; quote: string; line: number; assignee: Who; due: string; keep: boolean
  minutes?: boolean; from?: Entry
}
export interface CalEvent { id: string; day: string; start: number; end: number; title: string; kind: 'meeting' | 'discussion' | 'deadline' | 'next'; taskId?: string }
export interface ApiLog { api: string; status: '现有' | '新增'; note: string; at: number }
export type View = 'focus' | 'calendar' | 'steno' | 'tasks' | 'yzj'
export type Overlay = null | 'create' | 'chat' | 'room' | 'end'
export type FlowStep = 1 | 2 | 3 | 4 | 5
export const FLOW_STEPS: { n: FlowStep; name: string }[] = [
  { n: 1, name: '直接建' },
  { n: 2, name: '闲聊' },
  { n: 3, name: '讨论拆' },
  { n: 4, name: '确认' },
  { n: 5, name: '验收' },
]
export type LingeePhase = 'idle' | 'thinking' | 'streaming' | 'ready'
export interface ChatMsg { id: string; role: 'user' | 'lingee'; text: string; streaming?: boolean; chips?: string[]; pills?: string[] }
export interface LingeeState {
  open: boolean; phase: LingeePhase; stream: string; quote?: string; pills: string[]; note?: string
}
/** 速记证据层：无确认/分派/催办门禁 */
export interface StenoEvidence {
  notes: string[]
  highlights: { line: number; text: string }[]
  aiDraft: string[]
  humanDraft: string[]
}

export const TODAY = '2026-11-03'
export const WEEK = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']
export const STENO_ID = 'st_8842'
export const ADV_ID = 'adv_1201'
export const CHAT_STENO = 'st_chat_01'
export const SOURCE_KEY = `meeting:u_liuyang:${STENO_ID}`

export const TRANSCRIPT: { who: Role; t: string; text: string }[] = [
  { who: '刘洋', t: '15:00', text: '今天对齐门店巡检改版，主要看表单、拍照和看板三块。' },
  { who: '阿炜', t: '15:02', text: '巡检表现在 31 项太多了，我建议精简到 12 项，周五前我出新版字段。' },
  { who: '老王', t: '15:04', text: '门店那边最常糊弄的就是拍照，拍照上传要改成必填，这个我来推。' },
  { who: '张三', t: '15:06', text: '区域经理最想看的是整改率，看板上要加整改率，我下周二前出。' },
  { who: '刘洋', t: '15:08', text: '那试点呢？先挑 3 家店。' },
  { who: '老王', t: '15:09', text: '下周三前我给 3 家试点店做一次培训。' },
  { who: '刘洋', t: '15:11', text: '好，下周五同一时间再碰一次看试点数据。' },
  { who: '阿炜', t: '15:12', text: '行，那今天的结论最好整理一份纪要让大家确认下。' },
]

export interface S {
  role: Role; view: View; overlay: Overlay; flowStep: FlowStep; step: number; lines: number; recording: boolean
  discussion: { title: string; source?: string; boundTask?: string; fromChat?: boolean } | null
  drafts: Draft[]; minutesOn: boolean; tasks: Task[]; events: CalEvent[]; log: ApiLog[]
  highlight?: number; toast?: string; demo: boolean; minutesDoc?: string[]
  entry: Entry; chat: ChatMsg[]; cmdOpen: boolean; lingee: LingeeState
  pendingSlot?: { day: string; start: number; title: string } | null
  evidence: StenoEvidence
  createForm: { title: string; assignee: Who; due: string; quote: string }
  /** 跨次：同来源未完成任务（进入证据场景时带上） */
  carryIn: Task[]
  /** 从归档深链回来时高亮 */
  returnHint?: string
}

const seedTasks = (): Task[] => [
  {
    id: ADV_ID, title: '门店巡检改版', assignee: '张三', creator: '刘洋', state: 'in_progress', due: '2026-11-13', kind: 'task', comments: [],
    purpose: '把巡检从「填完就算」改成「能追责、能看整改」',
    consensus: ['先试点 3 家店', '表单精简优先'],
  },
  { id: 'adv_1188', title: 'Q4 门店评分口径复核', assignee: '张三', creator: '刘洋', state: 'in_progress', due: '2026-11-03', kind: 'task', comments: [], source: { type: 'steno', ref: SOURCE_KEY, line: 0, label: '来自速记「上周巡检对齐」' } },
  { id: 'adv_1190', title: '供应商对账异常排查', assignee: '', creator: '刘洋', state: 'suggested', due: '2026-11-06', kind: 'task', comments: [] },
  { id: 'adv_1193', title: '整理 10 月客诉 Top10', assignee: '灵基', creator: '刘洋', state: 'in_progress', kind: 'task', comments: [{ by: '灵基', text: '客诉数据里有 23 条没有门店编号，要不要先排除？', at: '10:12' }] },
  { id: 'adv_1195', title: '巡检 App 崩溃率周报', assignee: '老王', creator: '张三', state: 'suggested', due: '2026-11-05', kind: 'task', comments: [], source: { type: 'steno', ref: SOURCE_KEY, line: 2, label: '来自速记「上周巡检对齐」' } },
]

const seedEvents = (): CalEvent[] => [
  { id: 'e1', day: '2026-11-02', start: 10, end: 11, title: '周会', kind: 'meeting' },
  { id: 'e2', day: '2026-11-03', start: 15, end: 16, title: '门店巡检改版对齐', kind: 'discussion', taskId: ADV_ID },
  { id: 'e3', day: '2026-11-04', start: 14, end: 15, title: '供应商沟通', kind: 'meeting' },
  { id: 'e4', day: '2026-11-05', start: 9.5, end: 10.5, title: '区域经理例会', kind: 'meeting' },
]

const emptyEvidence = (): StenoEvidence => ({ notes: [], highlights: [], aiDraft: [], humanDraft: [] })

export const initial = (): S => ({
  role: '刘洋', view: 'focus', overlay: null, flowStep: 1, step: 1, lines: 0, recording: false, discussion: null,
  drafts: [], minutesOn: false, tasks: seedTasks(), events: seedEvents(), log: [], demo: false,
  entry: null, chat: [], cmdOpen: false,
  lingee: {
    open: true, phase: 'ready',
    stream: '大部分工作在「要我定的」看板完成。直接建 / 闲聊 / 讨论拆 都在看板上弹层操作，不必跳页。',
    pills: ['直接建任务', '闲聊落成', '会后从速记拆'], quote: undefined, note: '看板主场',
  },
  pendingSlot: null,
  evidence: emptyEvidence(),
  createForm: { title: '', assignee: '阿炜', due: '2026-11-07', quote: '' },
  carryIn: [],
  returnHint: undefined,
})

export type A =
  | { type: 'role'; role: Role } | { type: 'view'; view: View } | { type: 'overlay'; overlay: Overlay } | { type: 'closeOverlay' } | { type: 'reset' }
  | { type: 'startDiscussion'; title: string; source?: string; boundTask?: string; fromChat?: boolean }
  | { type: 'line' } | { type: 'end' } | { type: 'toggleMinutes' }
  | { type: 'keep'; id: string } | { type: 'editDraft'; id: string; title: string } | { type: 'draftAssignee'; id: string; who: Who }
  | { type: 'dispatch' }
  | { type: 'setState'; id: string; state: TState; by?: Who }
  | { type: 'accept'; id: string } | { type: 'return'; id: string }
  | { type: 'assign'; id: string; who: Who } | { type: 'ack'; id: string }
  | { type: 'lingeeSubmit'; id: string }
  | { type: 'sendConfirm'; id: string } | { type: 'confirm'; id: string } | { type: 'object'; id: string; text: string; target?: string }
  | { type: 'revised'; id: string } | { type: 'nudge'; id: string }
  | { type: 'jumpSource'; line: number } | { type: 'demo'; on: boolean } | { type: 'toast'; text?: string }
  | { type: 'cmd'; open: boolean }
  | { type: 'chatSend'; text: string }
  | { type: 'lingeeTick'; stream?: string; phase?: LingeePhase; quote?: string; pills?: string[]; note?: string }
  | { type: 'lingeeToggle' }
  | { type: 'scheduleMeeting'; day: string; start: number; title: string }
  | { type: 'chatDraftDispatch' }
  | { type: 'pill'; pill: string }
  | { type: 'createForm'; patch: Partial<S['createForm']> }
  | { type: 'createDirect' }
  | { type: 'addNote'; text: string }
  | { type: 'pinHighlight'; line: number }
  | { type: 'editHumanDraft'; text: string }

const log = (s: S, api: string, status: '现有' | '新增', note: string) => { s.log = [{ api, status, note, at: Date.now() }, ...s.log].slice(0, 40) }
let seq = 0
const nid = (p: string) => `${p}_${Date.now().toString(36).slice(-4)}${seq++}`

function rollup(s: S) {
  let changed = true
  while (changed) {
    changed = false
    for (const p of s.tasks) {
      const kids = s.tasks.filter(t => t.parentId === p.id)
      if (!kids.length || p.state === 'done' || p.state === 'in_review') continue
      if (kids.every(k => k.state === 'done')) {
        if (p.kind === 'minutes') { p.state = 'done'; log(s, `PATCH /items/${p.id} done`, '现有', '确认收齐 → 纪要产物闭环') }
        else { p.state = 'in_review'; s.step = Math.max(s.step, 7); log(s, `PATCH /items/${p.id} in_review`, '现有', '子任务全部完成 → 父任务进待验收') }
        changed = true
      }
    }
  }
}

function setLingee(s: S, partial: Partial<LingeeState>) {
  s.lingee = { ...s.lingee, ...partial }
}

/** 跨次：同来源未完成任务带进证据场景 */
export function unfinishedSameSource(tasks: Task[], ref: string): Task[] {
  return tasks.filter(t => t.source?.ref === ref && t.state !== 'done' && t.kind === 'task')
}

function bumpFlow(s: S, n: FlowStep) { s.flowStep = Math.max(s.flowStep, n) as FlowStep }

function respondChat(s: S, text: string) {
  const t = text.trim()
  s.chat.push({ id: nid('u'), role: 'user', text: t })
  s.entry = 'chat'
  s.overlay = 'chat'
  s.view = 'focus'
  s.cmdOpen = false
  s.lingee.open = true
  bumpFlow(s, 2)
  setLingee(s, { phase: 'thinking', stream: '', note: '思考中…', pills: [], quote: undefined })
  log(s, 'POST /lingee/chat', '新增', `闲聊入口：「${t.slice(0, 24)}」`)

  const wantMeet = /约|开会|会议|碰一下|对齐会/.test(t)
  const wantDiscuss = /讨论|对齐|开一场|拉个|速记拆/.test(t)
  const wantTask = /任务|待办|记下|帮我|起草|巡检|拍照|看板|培训|落成/.test(t)

  if (wantMeet && !wantDiscuss) {
    s.pendingSlot = { day: '2026-11-04', start: 16, title: '临时对齐会' }
    s.chat.push({
      id: nid('l'), role: 'lingee',
      text: '可以约一场。讨论只是可选证据场景——日历写好后进速记采证，会后拆任务仍落推进。',
      chips: ['明天下午 16:00', '临时对齐会'],
      pills: ['确认时段并开会', '换个时间', '直接落成任务（不进会）'],
    })
    setLingee(s, {
      phase: 'ready', stream: '已草拟时段。确认后进证据场景；或跳过会议直接落成任务。',
      note: '闲聊 · 约个会', pills: ['确认时段并开会', '直接落成任务（不进会）'], quote: t,
    })
    log(s, 'calendar.suggestSlot', '新增', '闲聊约会 · 建议时段（证据场景可选）')
    return
  }

  if (wantDiscuss || wantMeet) {
    s.chat.push({
      id: nid('l'), role: 'lingee',
      text: '可以开一场讨论当证据场景，绑到推进「门店巡检改版」。速记只采证（原话/笔记/重点），管理都在推进。',
      chips: ['门店巡检改版', 'item:adv_1201'],
      pills: ['进入证据场景', '不绑任务 · 空开一场', '改成闲聊落成（不进会）'],
    })
    setLingee(s, {
      phase: 'ready',
      stream: '讨论 = 可选证据场景。进速记采证，或改走闲聊落成。',
      note: '闲聊 → 证据场景', pills: ['进入证据场景', '改成闲聊落成（不进会）'],
      quote: t,
    })
    return
  }

  if (wantTask) {
    s.chat.push({
      id: nid('l'), role: 'lingee',
      text: '我边听边起草了 3 件，都带你的原话锚点——还没派。确认后直接落进推进（闲聊落成，不经会议）。',
      chips: ['巡检表精简到 12 项', '拍照上传改必填', '看板加整改率'],
      pills: ['落成推进任务', '先开讨论采证', '继续说'],
    })
    setLingee(s, {
      phase: 'ready',
      stream: '闲聊落成：草稿已带原话。确认即进推进，不必开会。',
      note: '入口② 闲聊落成', pills: ['落成推进任务', '先开讨论采证'], quote: t,
    })
    s.drafts = [
      { id: 'cd1', title: '巡检表字段精简到 12 项', quote: t, line: 0, assignee: '阿炜', due: '2026-11-06', keep: true, from: 'chat' },
      { id: 'cd2', title: '拍照上传改为必填', quote: t, line: 0, assignee: '老王', due: '2026-11-07', keep: true, from: 'chat' },
      { id: 'cd3', title: '区域经理看板加整改率', quote: t, line: 0, assignee: '张三', due: '2026-11-10', keep: true, from: 'chat' },
    ]
    log(s, 'POST /drafts {from:chat}', '新增', '闲聊落成 · 3 件草稿（原话锚点）')
    return
  }

  s.chat.push({
    id: nid('l'), role: 'lingee',
    text: '我在。三条入口都行：直接建任务、闲聊落成、或开讨论从速记拆。管理都在推进。',
    pills: ['直接建任务', '帮我记下几件事', '开一场讨论采证'],
  })
  setLingee(s, {
    phase: 'ready', stream: '推进是真相源。说「帮我记下…」就走闲聊落成。',
    note: '待命', pills: ['直接建任务', '帮我记下几件事', '开一场讨论采证'],
  })
}

export function reduce(prev: S, a: A): S {
  const s: S = structuredClone(prev)
  const T = (id: string) => s.tasks.find(t => t.id === id)!
  switch (a.type) {
    case 'role': s.role = a.role; break
    case 'view':
      s.view = a.view
      s.overlay = null
      if (a.view === 'yzj' || (a.view === 'calendar' && s.step >= 6)) s.step = Math.max(s.step, 8)
      if (a.view === 'steno') { s.lines = Math.max(s.lines, TRANSCRIPT.length); s.step = Math.max(s.step, 8); log(s, `GET /steno/${STENO_ID}`, '现有', '速记证据归档（只读）') }
      if (a.view !== 'focus') s.returnHint = '回到看板'
      else s.returnHint = undefined
      if (a.view === 'yzj') log(s, 'GET /yzj/advance (只读)', '现有', '云之家读同一份推进')
      break
    case 'overlay':
      s.overlay = a.overlay
      if (a.overlay === 'create') {
        s.entry = 'direct'; s.step = Math.max(s.step, 1); bumpFlow(s, 1)
        setLingee(s, { open: true, phase: 'ready', stream: '直接建：在看板上填标题与原话，创建后立刻回看板。', note: '入口① 直接建', pills: ['创建到推进'], quote: undefined })
      }
      if (a.overlay === 'chat') { s.entry = 'chat'; s.lingee.open = true; bumpFlow(s, 2) }
      break
    case 'closeOverlay':
      s.overlay = null
      s.view = 'focus'
      s.returnHint = undefined
      break
    case 'reset': return initial()
    case 'cmd': s.cmdOpen = a.open; break
    case 'lingeeToggle': s.lingee.open = !s.lingee.open; break
    case 'lingeeTick':
      setLingee(s, {
        phase: a.phase ?? s.lingee.phase,
        stream: a.stream ?? s.lingee.stream,
        quote: a.quote !== undefined ? a.quote : s.lingee.quote,
        pills: a.pills ?? s.lingee.pills,
        note: a.note ?? s.lingee.note,
      })
      break
    case 'chatSend': respondChat(s, a.text); break
    case 'createForm': s.createForm = { ...s.createForm, ...a.patch }; break
    case 'createDirect': {
      s.entry = 'direct'
      const title = s.createForm.title.trim() || '新任务 · 门店巡检跟进'
      const quote = s.createForm.quote.trim()
      const id = nid('adv')
      s.tasks.push({
        id, title, assignee: s.createForm.assignee, creator: s.role, state: 'suggested',
        due: s.createForm.due, kind: 'task', comments: [],
        source: quote
          ? { type: 'direct', ref: `direct:${id}`, line: 0, label: `原话 · 「${quote.slice(0, 18)}」` }
          : { type: 'direct', ref: `direct:${id}`, label: '直接建 · 无原话' },
      })
      if (s.createForm.due) s.events.push({ id: nid('ev'), day: s.createForm.due, start: 18, end: 18.5, title: `截止 · ${title}`, kind: 'deadline' })
      log(s, 'POST /items {entry:direct}', '现有', `直接建任务「${title}」`)
      s.createForm = { title: '', assignee: '阿炜', due: '2026-11-07', quote: '' }
      s.overlay = null; s.view = 'focus'; s.step = 4; bumpFlow(s, 1); s.toast = '已直接建到推进 · 留在看板'
      setLingee(s, { open: true, phase: 'ready', stream: `「${title}」已进推进看板。继续在看板上闲聊或开讨论拆，不必跳页。`, note: '入口① 完成', pills: ['闲聊落成', '会后从速记拆'], quote: quote || undefined })
      break
    }
    case 'addNote': {
      if (!a.text.trim()) break
      s.evidence.notes.push(a.text.trim())
      log(s, `steno.note ${STENO_ID}`, '现有', '会中笔记（证据层 · 无门禁）')
      break
    }
    case 'pinHighlight': {
      const line = TRANSCRIPT[a.line]
      if (!line) break
      if (!s.evidence.highlights.some(h => h.line === a.line)) s.evidence.highlights.push({ line: a.line, text: line.text })
      log(s, `steno.highlight #L${a.line}`, '现有', '会中重点（证据层）')
      setLingee(s, { quote: line.text, stream: `已钉重点 L${a.line}。会后拆任务时优先用原句。`, note: '证据 · 重点' })
      break
    }
    case 'editHumanDraft': {
      s.evidence.humanDraft = a.text.split('\n').map(x => x.trim()).filter(Boolean)
      log(s, `steno.humanDraft ${STENO_ID}`, '新增', '人工稿素材（证据层）')
      break
    }
    case 'pill': {
      const p = a.pill
      if (p.includes('进入证据') || p.includes('进入讨论') || p.includes('拉个讨论') || p.includes('会后从速记')) {
        return reduce(s, { type: 'startDiscussion', title: '门店巡检改版对齐', source: `item:${ADV_ID}`, boundTask: ADV_ID, fromChat: s.entry === 'chat' })
      }
      if (p.includes('不绑任务') || p.includes('空开')) {
        return reduce(s, { type: 'startDiscussion', title: '临时讨论', fromChat: true })
      }
      if (p.includes('确认时段') || (p.includes('约个会') && s.pendingSlot)) {
        const slot = s.pendingSlot ?? { day: '2026-11-04', start: 16, title: '临时对齐会' }
        return reduce(s, { type: 'scheduleMeeting', ...slot })
      }
      if (p === '约个会' || p.includes('约周五') || p.includes('顺便约')) {
        return reduce(s, { type: 'chatSend', text: '帮我约个会' })
      }
      if (p.includes('开一场讨论') || p.includes('跟灵基说')) {
        return reduce(s, { type: 'chatSend', text: '帮我开一场门店巡检讨论' })
      }
      if (p.includes('帮我记下') || p.includes('继续说') || p.includes('闲聊落成') || p.includes('改成闲聊')) {
        return reduce(s, { type: 'chatSend', text: '帮我记下：巡检表精简、拍照必填、看板加整改率' })
      }
      if (p.includes('落成推进') || p.includes('直接落成')) {
        return reduce(s, { type: 'chatDraftDispatch' })
      }
      if (p.includes('直接建')) {
        return reduce(s, { type: 'overlay', overlay: 'create' })
      }
      if (p.includes('创建到推进')) {
        return reduce(s, { type: 'createDirect' })
      }
      if (p.includes('先开讨论')) {
        return reduce(s, { type: 'startDiscussion', title: '门店巡检改版对齐', source: `item:${ADV_ID}`, boundTask: ADV_ID, fromChat: true })
      }
      if (p.includes('换个时间')) {
        s.pendingSlot = { day: '2026-11-05', start: 10, title: '临时对齐会' }
        setLingee(s, { stream: '改成周三 10:00–11:00 可以吗？', pills: ['确认时段并开会'], note: '改时段' })
        s.chat.push({ id: nid('l'), role: 'lingee', text: '那改成周三上午 10:00 吧。', pills: ['确认时段并开会'] })
        break
      }
      break
    }
    case 'scheduleMeeting': {
      s.pendingSlot = null
      s.events.push({ id: nid('ev'), day: a.day, start: a.start, end: a.start + 1, title: a.title, kind: 'discussion' })
      log(s, 'calendar.createSlot', '新增', `${a.day} ${a.start}:00 · ${a.title}（证据场景入口）`)
      s.toast = `已写入日历 · ${a.day.slice(5)} ${a.start}:00`
      return reduce(s, { type: 'startDiscussion', title: a.title, fromChat: true })
    }
    case 'chatDraftDispatch': {
      if (!s.drafts.length) {
        s.drafts = [
          { id: 'cd1', title: '巡检表字段精简到 12 项', quote: '闲聊口述', line: 0, assignee: '阿炜', due: '2026-11-06', keep: true, from: 'chat' },
          { id: 'cd2', title: '拍照上传改为必填', quote: '闲聊口述', line: 0, assignee: '老王', due: '2026-11-07', keep: true, from: 'chat' },
          { id: 'cd3', title: '区域经理看板加整改率', quote: '闲聊口述', line: 0, assignee: '张三', due: '2026-11-10', keep: true, from: 'chat' },
        ]
      }
      s.discussion = { title: '闲聊落成 · 门店巡检', fromChat: true, source: 'chat:session' }
      s.entry = 'chat'
      s.view = 'focus'
      s.overlay = 'end'
      s.step = 3
      bumpFlow(s, 2)
      setLingee(s, {
        open: true, phase: 'ready', stream: '闲聊落成：在看板浮层里逐条留/丢后派出。派出后仍回看板。',
        note: '入口② 闲聊落成', pills: [], quote: '来自闲聊',
      })
      log(s, 'POST /drafts {from:chat} → board overlay', '新增', '闲聊落成 · 看板浮层确认')
      break
    }
    case 'startDiscussion': {
      s.discussion = { title: a.title, source: a.source, boundTask: a.boundTask, fromChat: a.fromChat }
      s.entry = 'steno'
      s.view = 'focus'; s.overlay = 'room'; s.step = 2; bumpFlow(s, 3); s.lines = 0; s.recording = true; s.cmdOpen = false
      s.evidence = emptyEvidence()
      // 跨次：同来源未完成带进
      const ref = SOURCE_KEY
      s.carryIn = unfinishedSameSource(s.tasks, ref)
      if (a.source) log(s, `POST /discussions {source:"${a.source}"}`, '新增', '可选证据场景 · 绑推进来源')
      else if (a.fromChat) log(s, 'POST /discussions {source:"chat"}', '新增', '闲聊空开 · 证据场景')
      log(s, `steno.start → ${SOURCE_KEY}`, '现有', '速记证据层开始（只记录 · 无管理门禁）')
      if (s.carryIn.length) log(s, 'GET /items?source&unfinished', '新增', `跨次带入 ${s.carryIn.length} 件未完成`)
      setLingee(s, {
        phase: 'streaming', stream: s.carryIn.length
          ? `证据场景已开。跨次带入 ${s.carryIn.length} 件同来源未完成，会后一并看。`
          : '证据场景：速记只采证。点原话可钉重点；笔记随便写——这里没有确认/分派门禁。',
        note: '入口③ 证据场景', pills: ['结束并拆任务'], quote: undefined,
      })
      break
    }
    case 'line':
      if (s.lines < TRANSCRIPT.length) {
        s.lines++
        const last = TRANSCRIPT[s.lines - 1]
        if (last && [1, 2, 3, 5].includes(s.lines - 1)) {
          // AI 稿素材随听增长（证据层，不是派发）
          s.evidence.aiDraft = TRANSCRIPT.slice(0, s.lines).filter((_, i) => [1, 2, 3, 5].includes(i)).map(l => l.text)
          setLingee(s, {
            phase: 'streaming',
            stream: `记下候选 ${s.evidence.aiDraft.length} 件（AI 稿素材，未派发）：${last.text.slice(0, 28)}…`,
            quote: last.text,
            note: '证据 · AI 稿',
            pills: s.lines >= TRANSCRIPT.length - 1 ? ['结束并拆任务'] : ['继续听'],
          })
        }
      }
      break
    case 'end': {
      s.recording = false; s.lines = TRANSCRIPT.length; s.view = 'focus'; s.overlay = 'end'; s.step = 3; s.entry = 'steno'; bumpFlow(s, 3)
      log(s, `GET /steno/${STENO_ID}/transcript`, '现有', '读速记全文（证据）')
      log(s, 'POST /drafts {from:steno}', '新增', '会后从速记拆任务 · 草稿+原话锚点')
      s.evidence.aiDraft = TRANSCRIPT.filter((_, i) => [1, 2, 3, 5].includes(i)).map(l => l.text)
      if (!s.evidence.humanDraft.length) s.evidence.humanDraft = ['试点店需含一家便利店（人工补充）']
      if (!s.evidence.notes.length) s.evidence.notes = ['现场：老王强调拍照糊弄严重', '张三要整改率进看板']
      s.drafts = [
        { id: 'd1', title: '巡检表字段精简到 12 项', quote: TRANSCRIPT[1].text, line: 1, assignee: '阿炜', due: '2026-11-06', keep: true, from: 'steno' },
        { id: 'd2', title: '拍照上传改为必填', quote: TRANSCRIPT[2].text, line: 2, assignee: '老王', due: '2026-11-07', keep: true, from: 'steno' },
        { id: 'd3', title: '区域经理看板加整改率', quote: TRANSCRIPT[3].text, line: 3, assignee: '张三', due: '2026-11-10', keep: true, from: 'steno' },
        { id: 'd4', title: '3 家试点店培训', quote: TRANSCRIPT[5].text, line: 5, assignee: '老王', due: '2026-11-11', keep: true, from: 'steno' },
      ]
      setLingee(s, {
        phase: 'ready',
        stream: '会后拆任务：4 件草稿都带原话。可打开「纪要作产物」——确认走子卡，不在速记里管。',
        note: '入口③ 拆任务', pills: ['派出草稿', '打开正式纪要'], quote: TRANSCRIPT[1].text,
      })
      break
    }
    case 'toggleMinutes':
      s.minutesOn = !s.minutesOn
      if (s.minutesOn) s.drafts.push({ id: 'dm', title: '整理纪要并收齐确认', quote: TRANSCRIPT[7].text, line: 7, assignee: '灵基', due: '2026-11-04', keep: true, minutes: true, from: 'steno' })
      else s.drafts = s.drafts.filter(d => !d.minutes)
      break
    case 'keep': { const d = s.drafts.find(d => d.id === a.id)!; d.keep = !d.keep; break }
    case 'editDraft': s.drafts.find(d => d.id === a.id)!.title = a.title; break
    case 'draftAssignee': s.drafts.find(d => d.id === a.id)!.assignee = a.who; break
    case 'dispatch': {
      const pid = nid('set')
      const fromChat = !!(s.discussion?.fromChat && !s.discussion?.boundTask && s.entry === 'chat')
      const srcType: SourceType = fromChat ? 'chat' : (s.entry === 'direct' ? 'direct' : 'steno')
      const src = (line: number): Source => ({
        type: srcType,
        ref: fromChat ? 'chat:session' : SOURCE_KEY,
        line,
        label: fromChat ? '来自闲聊' : `来自速记「${s.discussion?.title ?? '讨论'}」`,
      })
      const purpose = s.discussion?.boundTask
        ? (s.tasks.find(t => t.id === s.discussion!.boundTask)?.purpose ?? '对齐并落成可执行任务')
        : '把讨论结论落成可追责的任务'
      const consensus = [
        '表单精简到 12 项',
        '拍照上传必填',
        '看板加整改率',
        '先试点 3 家店',
      ]
      s.tasks.push({
        id: pid, title: `${s.discussion?.title ?? '讨论'} · 任务集`, assignee: '刘洋', creator: '刘洋',
        state: 'in_progress', due: '2026-11-13', kind: 'set', comments: [], source: src(0),
        parentId: s.discussion?.boundTask, purpose, consensus,
      })
      for (const d of s.drafts.filter(d => d.keep)) {
        s.tasks.push({
          id: nid('adv'), title: d.title, assignee: d.assignee, creator: '刘洋',
          state: d.minutes ? 'in_progress' : 'suggested', due: d.due,
          kind: d.minutes ? 'minutes' : 'task', parentId: pid, comments: [], source: src(d.line),
          product: d.minutes ? '纪要（待生成）' : undefined,
        })
        if (!d.minutes) s.events.push({ id: nid('ev'), day: d.due, start: 18, end: 18.5, title: `截止 · ${d.title}`, kind: 'deadline' })
      }
      s.events.push({ id: nid('ev'), day: '2026-11-06', start: 15, end: 16, title: '下次讨论 · 看试点数据', kind: 'next', taskId: pid })
      log(s, `dispatch-batch (${s.drafts.filter(d => d.keep).length} 件)`, '现有', '批量派发 · 父子 + 原话来源 + 目的/共识字段')
      log(s, 'calendar.writeback', '新增', '截止日与下次讨论写回日历')
      s.drafts = []; s.overlay = null; s.view = 'focus'; s.step = 4; bumpFlow(s, 3); s.toast = '已落进推进 · 留在看板'
      setLingee(s, {
        open: true, phase: 'ready',
        stream: '已落进推进看板。目的/共识是任务集字段。切角色继续在看板上确认/验收。',
        note: '已派发', pills: ['切到阿炜', '闲聊落成'], quote: undefined,
      })
      break
    }
    case 'setState': {
      const t = T(a.id); t.state = a.state; t.seen = true; s.step = Math.max(s.step, 5)
      log(s, `PATCH /items/${t.id} → ${a.state}`, '现有', `${a.by ?? s.role} 推进状态`)
      // 行动项闭环回写产物：子任务 done 时在父集 product 镜像
      if (a.state === 'done' && t.parentId) {
        const parent = s.tasks.find(p => p.id === t.parentId)
        if (parent && parent.kind === 'set') {
          const doneKids = s.tasks.filter(k => k.parentId === parent.id && k.kind === 'task' && (k.state === 'done' || k.id === t.id))
          parent.product = `行动闭环 ${doneKids.length} 件已回写`
          log(s, `PATCH /items/${parent.id}/product`, '新增', '行动项闭环回写产物')
        }
      }
      rollup(s); break
    }
    case 'lingeeSubmit': {
      const t = T(a.id); t.state = 'in_review'
      s.minutesDoc = [
        ...TRANSCRIPT.filter((_, i) => [1, 2, 3, 5, 6].includes(i)).map(l => l.text),
        ...s.evidence.humanDraft.map(h => `（人工）${h}`),
      ]
      t.product = '纪要 v1（AI 稿 + 人工稿）'
      s.step = 6; bumpFlow(s, 4)
      log(s, `lingee.submitReview ${t.id}`, '现有', '纪要作产物交稿 · 灵基不自己关单')
      setLingee(s, { phase: 'ready', stream: '纪要已作产物挂在父卡。发给确认人？异议请标「反对哪一条」——我派修改子卡。', note: '产物交稿', pills: ['发给确认人'], quote: s.minutesDoc[0] })
      break
    }
    case 'accept': { const t = T(a.id); t.state = 'done'; s.step = Math.max(s.step, 7); bumpFlow(s, 5); log(s, `POST /items/${t.id}/accept`, '现有', '验收通过'); if (t.kind === 'set') s.step = 8; rollup(s); break }
    case 'return': { const t = T(a.id); t.state = 'in_progress'; t.comments.push({ by: s.role, text: '退回：再补充一下', at: '16:30' }); log(s, `POST /items/${t.id}/return`, '现有', '退回给负责人'); break }
    case 'assign': { const t = T(a.id); t.assignee = a.who; log(s, `PATCH /items/${t.id} assignee`, '现有', `指派给 ${a.who}`); break }
    case 'ack': { const t = T(a.id); t.ackLingee = true; t.comments.push({ by: s.role, text: '先排除，单独列出来', at: '16:00' }); log(s, `POST /items/${t.id}/comments`, '现有', '回复灵基'); break }
    case 'sendConfirm': {
      const t = T(a.id); t.state = 'in_progress'; s.step = 6; bumpFlow(s, 4)
      for (const who of ['老王', '阿炜'] as Role[]) {
        s.tasks.push({
          id: nid('cf'), title: `确认纪要 · ${who}`, assignee: who, creator: '刘洋', state: 'suggested',
          kind: 'confirm', parentId: t.id, comments: [], source: t.source, due: '2026-11-04', rev: 1,
        })
      }
      log(s, `POST /minutes/${t.id}/confirm {to:[老王,阿炜]}`, '新增', '纪要产物 · 1:1 确认子卡')
      setLingee(s, { stream: '已发确认子卡。有人反对某条，我会按「反对标哪一条」派修改子卡。', note: '等确认', pills: [] })
      break
    }
    case 'confirm': { const t = T(a.id); t.state = 'done'; bumpFlow(s, 4); log(s, `PATCH /items/${t.id} done`, '现有', `${t.assignee} 确认无误`); rollup(s); break }
    case 'object': {
      const t = T(a.id)
      const target = a.target || '第 2 条 · 拍照上传改为必填'
      t.comments.push({ by: t.assignee, text: `反对「${target}」：${a.text}`, at: '16:20' })
      t.state = 'in_progress'
      log(s, `POST /items/${t.id}/comments`, '现有', `异议 · 标哪一条：${target}`)
      s.tasks.push({
        id: nid('rv'), title: `修改纪要 · ${target}`, assignee: '刘洋', creator: '刘洋', state: 'suggested',
        kind: 'revise', parentId: t.parentId,
        comments: [{ by: t.assignee, text: a.text, at: '16:20' }],
        source: t.source, due: TODAY, objectTarget: target,
      })
      log(s, 'lingee.autoDispatch(修改纪要 → 刘洋)', '新增', `反对「${target}」→ 修改子卡`)
      setLingee(s, { phase: 'ready', stream: `收到反对「${target}」：「${a.text}」。已派修改子卡给刘洋。`, note: '反对 → 修改子卡', pills: ['切到刘洋'], quote: a.text })
      break
    }
    case 'revised': {
      const r = T(a.id); r.state = 'done'
      const objector = r.comments[0]?.by
      const cf = s.tasks.find(t => t.kind === 'confirm' && t.parentId === r.parentId && t.assignee === objector)
      if (cf) { cf.state = 'suggested'; cf.rev = (cf.rev ?? 1) + 1; cf.comments.push({ by: '灵基', text: `已按「${r.objectTarget ?? '异议'}」改好，请再确认`, at: '16:40' }) }
      if (s.minutesDoc && objector) s.minutesDoc = [...s.minutesDoc, `（第 2 版 · 针对 ${r.objectTarget}）补充：${r.comments[0].text}`]
      const minutes = s.tasks.find(t => t.id === r.parentId)
      if (minutes) minutes.product = '纪要 v2（已按异议修订）'
      log(s, `PATCH /items/${cf?.id} reconfirm`, '新增', `改好后重新发给 ${objector} · 产物回写 v2`)
      rollup(s); break
    }
    case 'nudge': { const t = T(a.id); t.nudged = true; log(s, `POST /items/${t.id}/nudge`, '现有', `催一下 ${t.assignee}`); break }
    case 'jumpSource':
      s.highlight = a.line; s.lines = TRANSCRIPT.length; s.step = Math.max(s.step, 8)
      if (s.recording || s.overlay === 'room' || s.overlay === 'end') {
        s.overlay = 'room'; s.view = 'focus'
      } else {
        s.view = 'steno'; s.overlay = null; s.returnHint = '回到看板'
      }
      log(s, `GET /steno/${STENO_ID}#L${a.line}`, '新增', '原话溯源 · 归档可回看板')
      break
    case 'demo': s.demo = a.on; break
    case 'toast': s.toast = a.text; break
  }
  return s
}

export type FocusKind = '派给我' | '到期' | '没人接' | '灵基回话' | '灵基交稿' | '待确认' | '待验收' | '没人动·催一下'
export interface FocusRow { key: string; kind: FocusKind; task: Task; line: string }
export function focusRows(s: S, role: Role): FocusRow[] {
  const rows: FocusRow[] = []
  for (const t of s.tasks) {
    if (t.kind === 'set' && t.state !== 'in_review') continue
    if (t.kind === 'confirm' && t.assignee === role && t.state === 'suggested') rows.push({ key: t.id, kind: '待确认', task: t, line: `刘洋请你确认纪要产物${(t.rev ?? 1) > 1 ? '（第 2 版）' : ''} · 可标反对哪一条` })
    else if (t.assignee === role && t.state === 'suggested' && t.kind !== 'confirm') rows.push({ key: t.id, kind: '派给我', task: t, line: t.kind === 'revise' ? `反对「${t.objectTarget ?? '某条'}」→ 修改：${t.comments[0]?.text}` : `${t.creator}派来，${t.due ? t.due.slice(5) + ' 截止' : '无截止'}` })
    else if (t.assignee === role && t.state === 'in_progress' && t.due && t.due <= TODAY && t.kind === 'task') rows.push({ key: t.id, kind: '到期', task: t, line: '今天到期' })
    if (t.creator === role && !t.assignee && t.state !== 'done') rows.push({ key: t.id, kind: '没人接', task: t, line: '还没人接，指派一个人' })
    if (t.creator === role && t.assignee === '灵基' && t.comments.some(c => c.by === '灵基') && !t.ackLingee && t.kind === 'task') rows.push({ key: t.id + 'q', kind: '灵基回话', task: t, line: t.comments.find(c => c.by === '灵基')!.text })
    if (t.creator === role && t.kind === 'minutes' && t.state === 'in_review') rows.push({ key: t.id, kind: '灵基交稿', task: t, line: '纪要产物已交稿，发给确认子卡？' })
    if (t.creator === role && t.state === 'in_review' && t.kind !== 'minutes') rows.push({ key: t.id, kind: '待验收', task: t, line: t.kind === 'set' ? '子任务全部完成，整组待你验收' : `${t.assignee} 提交了验收` })
    if (t.creator === role && t.kind === 'confirm' && t.state === 'suggested' && !t.nudged) rows.push({ key: t.id + 'n', kind: '没人动·催一下', task: t, line: `${t.assignee} 还没确认纪要，到点了` })
  }
  return rows
}
