// 全部数据 mock 在内存 + localStorage；灵基输出是脚本化的。
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
export interface Comment { by: Who; text: string; at: string }
export interface Task {
  id: string; title: string; assignee: Who; creator: Role; state: TState; due?: string
  parentId?: string; kind: Kind; source?: { type: 'steno' | 'item' | 'chat'; ref: string; line?: number; label: string }
  comments: Comment[]; nudged?: boolean; seen?: boolean; rev?: number; ackLingee?: boolean
}
export interface Draft { id: string; title: string; quote: string; line: number; assignee: Who; due: string; keep: boolean; minutes?: boolean }
export interface CalEvent { id: string; day: string; start: number; end: number; title: string; kind: 'meeting' | 'discussion' | 'deadline' | 'next'; taskId?: string }
export interface ApiLog { api: string; status: '现有' | '新增'; note: string; at: number }
export type View = 'calendar' | 'room' | 'end' | 'focus' | 'tasks' | 'yzj' | 'chat'
export type Entry = 'advance' | 'chat' | null
export type LingeePhase = 'idle' | 'thinking' | 'streaming' | 'ready'
export interface ChatMsg { id: string; role: 'user' | 'lingee'; text: string; streaming?: boolean; chips?: string[]; pills?: string[] }
export interface LingeeState {
  open: boolean; phase: LingeePhase; stream: string; quote?: string; pills: string[]; note?: string
}

export const TODAY = '2026-11-03'
export const WEEK = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']
export const STENO_ID = 'st_8842'
export const ADV_ID = 'adv_1201'
export const CHAT_STENO = 'st_chat_01'

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
  role: Role; view: View; step: number; lines: number; recording: boolean
  discussion: { title: string; source?: string; boundTask?: string; fromChat?: boolean } | null
  drafts: Draft[]; minutesOn: boolean; tasks: Task[]; events: CalEvent[]; log: ApiLog[]
  highlight?: number; toast?: string; demo: boolean; minutesDoc?: string[]
  entry: Entry; chat: ChatMsg[]; cmdOpen: boolean; lingee: LingeeState
  pendingSlot?: { day: string; start: number; title: string } | null
}

const seedTasks = (): Task[] => [
  { id: ADV_ID, title: '门店巡检改版', assignee: '张三', creator: '刘洋', state: 'in_progress', due: '2026-11-13', kind: 'task', comments: [] },
  { id: 'adv_1188', title: 'Q4 门店评分口径复核', assignee: '张三', creator: '刘洋', state: 'in_progress', due: '2026-11-03', kind: 'task', comments: [] },
  { id: 'adv_1190', title: '供应商对账异常排查', assignee: '', creator: '刘洋', state: 'suggested', due: '2026-11-06', kind: 'task', comments: [] },
  { id: 'adv_1193', title: '整理 10 月客诉 Top10', assignee: '灵基', creator: '刘洋', state: 'in_progress', kind: 'task', comments: [{ by: '灵基', text: '客诉数据里有 23 条没有门店编号，要不要先排除？', at: '10:12' }] },
  { id: 'adv_1195', title: '巡检 App 崩溃率周报', assignee: '老王', creator: '张三', state: 'suggested', due: '2026-11-05', kind: 'task', comments: [] },
]
const seedEvents = (): CalEvent[] => [
  { id: 'e1', day: '2026-11-02', start: 10, end: 11, title: '周会', kind: 'meeting' },
  { id: 'e2', day: '2026-11-03', start: 15, end: 16, title: '门店巡检改版对齐', kind: 'discussion', taskId: ADV_ID },
  { id: 'e3', day: '2026-11-04', start: 14, end: 15, title: '供应商沟通', kind: 'meeting' },
  { id: 'e4', day: '2026-11-05', start: 9.5, end: 10.5, title: '区域经理例会', kind: 'meeting' },
]

export const initial = (): S => ({
  role: '刘洋', view: 'focus', step: 1, lines: 0, recording: false, discussion: null,
  drafts: [], minutesOn: false, tasks: seedTasks(), events: seedEvents(), log: [], demo: false,
  entry: null, chat: [], cmdOpen: false,
  lingee: {
    open: true, phase: 'ready', stream: '今天可以从「要我定的」进，也可以跟我说一声，我帮你开讨论或约个会。',
    pills: ['拉个讨论 · 门店巡检改版', '约个会', '跟灵基说'], quote: undefined, note: '随时待命',
  },
  pendingSlot: null,
})

export type A =
  | { type: 'role'; role: Role } | { type: 'view'; view: View } | { type: 'reset' }
  | { type: 'startDiscussion'; title: string; source?: string; boundTask?: string; fromChat?: boolean }
  | { type: 'line' } | { type: 'end' } | { type: 'toggleMinutes' }
  | { type: 'keep'; id: string } | { type: 'editDraft'; id: string; title: string } | { type: 'draftAssignee'; id: string; who: Who }
  | { type: 'dispatch' }
  | { type: 'setState'; id: string; state: TState; by?: Who }
  | { type: 'accept'; id: string } | { type: 'return'; id: string }
  | { type: 'assign'; id: string; who: Who } | { type: 'ack'; id: string }
  | { type: 'lingeeSubmit'; id: string }
  | { type: 'sendConfirm'; id: string } | { type: 'confirm'; id: string } | { type: 'object'; id: string; text: string }
  | { type: 'revised'; id: string } | { type: 'nudge'; id: string }
  | { type: 'jumpSource'; line: number } | { type: 'demo'; on: boolean } | { type: 'toast'; text?: string }
  | { type: 'cmd'; open: boolean }
  | { type: 'chatSend'; text: string }
  | { type: 'lingeeTick'; stream?: string; phase?: LingeePhase; quote?: string; pills?: string[]; note?: string }
  | { type: 'lingeeToggle' }
  | { type: 'scheduleMeeting'; day: string; start: number; title: string }
  | { type: 'chatDraftDispatch' }
  | { type: 'pill'; pill: string }

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
        if (p.kind === 'minutes') { p.state = 'done'; log(s, `PATCH /items/${p.id} done`, '现有', '确认收齐，纪要任务自动完成') }
        else { p.state = 'in_review'; s.step = 7; log(s, `PATCH /items/${p.id} in_review`, '现有', '子任务全部完成 → 父任务进待验收') }
        changed = true
      }
    }
  }
}

function setLingee(s: S, partial: Partial<LingeeState>) {
  s.lingee = { ...s.lingee, ...partial }
}

function respondChat(s: S, text: string) {
  const t = text.trim()
  s.chat.push({ id: nid('u'), role: 'user', text: t })
  s.entry = 'chat'
  s.view = 'chat'
  s.cmdOpen = false
  setLingee(s, { phase: 'thinking', stream: '', note: '思考中…', pills: [], quote: undefined })
  log(s, 'POST /lingee/chat', '新增', `闲聊入口：「${t.slice(0, 24)}」`)

  const wantMeet = /约|开会|会议|碰一下|对齐会/.test(t)
  const wantDiscuss = /讨论|对齐|开一场|拉个/.test(t)
  const wantTask = /任务|待办|记下|帮我|起草|巡检|拍照|看板|培训/.test(t)

  if (wantMeet && !wantDiscuss) {
    s.pendingSlot = { day: '2026-11-04', start: 16, title: '临时对齐会' }
    s.chat.push({
      id: nid('l'), role: 'lingee',
      text: '好，我帮你约一场会。建议明天下午 16:00–17:00，会议室可随时进。确认后我写进日历，并开速记。',
      chips: ['明天下午 16:00', '临时对齐会'],
      pills: ['确认时段并开会', '换个时间', '改成讨论（绑任务）'],
    })
    setLingee(s, {
      phase: 'ready', stream: '已草拟日历时段。点「确认时段并开会」即可进入会议室。',
      note: '约个会', pills: ['确认时段并开会', '换个时间'], quote: t,
    })
    log(s, 'calendar.suggestSlot', '新增', '闲聊约会 · 建议时段')
    return
  }

  if (wantDiscuss || wantMeet) {
    s.chat.push({
      id: nid('l'), role: 'lingee',
      text: '可以。我帮你开一场「门店巡检改版对齐」讨论，绑到现有推进「门店巡检改版」。速记只记录，结束后我起草任务给你留/丢。',
      chips: ['门店巡检改版', 'item:adv_1201'],
      pills: ['进入讨论室', '不绑任务 · 空开一场', '顺便约周五复盘会'],
    })
    setLingee(s, {
      phase: 'ready',
      stream: '讨论草稿已就绪。可直接进会议室，或先约周五复盘时段。',
      note: '从闲聊开讨论', pills: ['进入讨论室', '不绑任务 · 空开一场', '约个会'],
      quote: t,
    })
    return
  }

  if (wantTask) {
    s.chat.push({
      id: nid('l'), role: 'lingee',
      text: '我边听边起草了 3 件，都还没派出去——你可以改一句、换负责人，或让我开一场讨论再落推进。',
      chips: ['巡检表精简到 12 项', '拍照上传改必填', '看板加整改率'],
      pills: ['落成推进草稿', '约个会对齐', '继续说'],
    })
    setLingee(s, {
      phase: 'ready',
      stream: '已从闲聊抽出 3 条任务草稿。确认后可直接落推进，或先约会对齐。',
      note: '边聊边起草', pills: ['落成推进草稿', '约个会'], quote: t,
    })
    // seed chat-side drafts into drafts for later dispatch if user picks 落成推进草稿
    s.drafts = [
      { id: 'cd1', title: '巡检表字段精简到 12 项', quote: t, line: 0, assignee: '阿炜', due: '2026-11-06', keep: true },
      { id: 'cd2', title: '拍照上传改为必填', quote: t, line: 0, assignee: '老王', due: '2026-11-07', keep: true },
      { id: 'cd3', title: '区域经理看板加整改率', quote: t, line: 0, assignee: '张三', due: '2026-11-10', keep: true },
    ]
    log(s, 'POST /drafts {from:chat}', '新增', '闲聊边聊边起草 3 件')
    return
  }

  s.chat.push({
    id: nid('l'), role: 'lingee',
    text: '我在。你可以让我「开一场讨论」「约个会」，或直接口述要办的事，我边聊边起草任务。',
    pills: ['开一场讨论', '约个会', '帮我记下几件事'],
  })
  setLingee(s, {
    phase: 'ready', stream: '试试说「帮我开一场门店巡检讨论」或「约明天下午的会」。',
    note: '待命', pills: ['开一场讨论', '约个会', '帮我记下几件事'],
  })
}

export function reduce(prev: S, a: A): S {
  const s: S = structuredClone(prev)
  const T = (id: string) => s.tasks.find(t => t.id === id)!
  switch (a.type) {
    case 'role': s.role = a.role; if (s.view !== 'yzj' && s.view !== 'calendar' && s.view !== 'tasks' && s.view !== 'chat' && s.view !== 'room' && s.view !== 'end') s.view = 'focus'; break
    case 'view':
      s.view = a.view
      if (a.view === 'yzj' || (a.view === 'calendar' && s.step >= 6)) s.step = Math.max(s.step, 8)
      s.highlight = undefined
      if (a.view === 'yzj') log(s, 'GET /yzj/advance (只读)', '现有', '云之家读同一份数据')
      if (a.view === 'chat') { s.entry = 'chat'; s.cmdOpen = false }
      break
    case 'reset': return initial()
    case 'cmd': s.cmdOpen = a.open; if (a.open) s.view = s.view === 'room' || s.view === 'end' ? s.view : 'chat'; break
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
    case 'pill': {
      const p = a.pill
      if (p.includes('进入讨论室') || p.includes('拉个讨论')) {
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
      if (p.includes('帮我记下') || p.includes('继续说')) {
        return reduce(s, { type: 'chatSend', text: '帮我记下：巡检表精简、拍照必填、看板加整改率' })
      }
      if (p.includes('落成推进')) {
        return reduce(s, { type: 'chatDraftDispatch' })
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
      log(s, 'calendar.createSlot', '新增', `${a.day} ${a.start}:00 · ${a.title}`)
      s.toast = `已写入日历 · ${a.day.slice(5)} ${a.start}:00`
      return reduce(s, { type: 'startDiscussion', title: a.title, fromChat: true })
    }
    case 'chatDraftDispatch': {
      if (!s.drafts.length) {
        s.drafts = [
          { id: 'cd1', title: '巡检表字段精简到 12 项', quote: '闲聊口述', line: 0, assignee: '阿炜', due: '2026-11-06', keep: true },
          { id: 'cd2', title: '拍照上传改为必填', quote: '闲聊口述', line: 0, assignee: '老王', due: '2026-11-07', keep: true },
          { id: 'cd3', title: '区域经理看板加整改率', quote: '闲聊口述', line: 0, assignee: '张三', due: '2026-11-10', keep: true },
        ]
      }
      s.discussion = { title: '闲聊起草 · 门店巡检', fromChat: true, source: 'chat:session' }
      s.view = 'end'
      s.step = 3
      setLingee(s, {
        phase: 'ready', stream: '这是从闲聊抽出的草稿。逐条留/丢后派出，就落进推进。',
        note: '闲聊 → 推进', pills: [], quote: '来自闲聊',
      })
      log(s, 'POST /drafts {from:chat} → end', '新增', '闲聊草稿进入结束页')
      break
    }
    case 'startDiscussion':
      s.discussion = { title: a.title, source: a.source, boundTask: a.boundTask, fromChat: a.fromChat }
      s.entry = a.fromChat ? 'chat' : 'advance'
      s.view = 'room'; s.step = 2; s.lines = 0; s.recording = true; s.cmdOpen = false
      if (a.source) log(s, `POST /discussions {source:"${a.source}"}`, '新增', '任务卡拉讨论，绑定来源')
      else if (a.fromChat) log(s, 'POST /discussions {source:"chat"}', '新增', '闲聊空开讨论')
      log(s, `steno.start → meeting:${'u_liuyang'}:${STENO_ID}`, '现有', '速记开始记录（只记录）')
      setLingee(s, {
        phase: 'streaming', stream: '', note: '速记中 · 只记录',
        pills: ['结束讨论并起草'], quote: undefined,
      })
      break
    case 'line':
      if (s.lines < TRANSCRIPT.length) {
        s.lines++
        const last = TRANSCRIPT[s.lines - 1]
        if (last && [1, 2, 3, 5].includes(s.lines - 1)) {
          setLingee(s, {
            phase: 'streaming',
            stream: `记下第 ${[1, 2, 3, 5].filter(i => i < s.lines).length} 件：${last.text.slice(0, 28)}…`,
            quote: last.text,
            note: '边听边记',
            pills: s.lines >= TRANSCRIPT.length - 1 ? ['结束讨论并起草'] : ['继续听'],
          })
        }
      }
      break
    case 'end': {
      s.recording = false; s.lines = TRANSCRIPT.length; s.view = 'end'; s.step = 3
      log(s, `GET /steno/${STENO_ID}/transcript`, '现有', '灵基读速记全文')
      log(s, 'POST /drafts', '新增', '灵基起草：1 个任务集 + 4 件子任务草稿')
      s.drafts = [
        { id: 'd1', title: '巡检表字段精简到 12 项', quote: TRANSCRIPT[1].text, line: 1, assignee: '阿炜', due: '2026-11-06', keep: true },
        { id: 'd2', title: '拍照上传改为必填', quote: TRANSCRIPT[2].text, line: 2, assignee: '老王', due: '2026-11-07', keep: true },
        { id: 'd3', title: '区域经理看板加整改率', quote: TRANSCRIPT[3].text, line: 3, assignee: '张三', due: '2026-11-10', keep: true },
        { id: 'd4', title: '3 家试点店培训', quote: TRANSCRIPT[5].text, line: 5, assignee: '老王', due: '2026-11-11', keep: true },
      ]
      setLingee(s, {
        phase: 'ready',
        stream: '我从速记里起草了 4 件。逐条决定要不要变成任务；也可以打开「整理正式纪要」。',
        note: '交稿待确认', pills: ['派出草稿', '打开正式纪要'], quote: TRANSCRIPT[1].text,
      })
      break
    }
    case 'toggleMinutes':
      s.minutesOn = !s.minutesOn
      if (s.minutesOn) s.drafts.push({ id: 'dm', title: '整理纪要并收齐确认', quote: TRANSCRIPT[7].text, line: 7, assignee: '灵基', due: '2026-11-04', keep: true, minutes: true })
      else s.drafts = s.drafts.filter(d => !d.minutes)
      break
    case 'keep': { const d = s.drafts.find(d => d.id === a.id)!; d.keep = !d.keep; break }
    case 'editDraft': s.drafts.find(d => d.id === a.id)!.title = a.title; break
    case 'draftAssignee': s.drafts.find(d => d.id === a.id)!.assignee = a.who; break
    case 'dispatch': {
      const pid = nid('set')
      const src = (line: number) => ({
        type: (s.discussion?.fromChat && !s.discussion?.boundTask ? 'chat' : 'steno') as 'steno' | 'chat',
        ref: `meeting:u_liuyang:${STENO_ID}`, line, label: `来自${s.discussion?.fromChat ? '闲聊/速记' : '速记'}「${s.discussion?.title ?? '讨论'}」`,
      })
      s.tasks.push({ id: pid, title: `${s.discussion?.title ?? '讨论'} · 任务集`, assignee: '刘洋', creator: '刘洋', state: 'in_progress', due: '2026-11-13', kind: 'set', comments: [], source: src(0), parentId: s.discussion?.boundTask })
      for (const d of s.drafts.filter(d => d.keep)) {
        s.tasks.push({ id: nid('adv'), title: d.title, assignee: d.assignee, creator: '刘洋', state: d.minutes ? 'in_progress' : 'suggested', due: d.due, kind: d.minutes ? 'minutes' : 'task', parentId: pid, comments: [], source: src(d.line) })
        if (!d.minutes) s.events.push({ id: nid('ev'), day: d.due, start: 18, end: 18.5, title: `截止 · ${d.title}`, kind: 'deadline' })
      }
      s.events.push({ id: nid('ev'), day: '2026-11-06', start: 15, end: 16, title: '下次讨论 · 看试点数据', kind: 'next', taskId: pid })
      log(s, `dispatch-batch (${s.drafts.filter(d => d.keep).length} 件)`, '现有', '批量派发，父子关系 + 来源')
      log(s, 'calendar.writeback', '新增', '截止日与下次讨论写回日历')
      s.drafts = []; s.view = 'focus'; s.step = 4; s.toast = '已派出，截止日和下次讨论已写回日历'
      setLingee(s, {
        phase: 'ready',
        stream: '已落进推进。你可以切角色看「要我定的」，或让我继续催办/整理纪要。',
        note: '已派发', pills: ['查看要我定的', '切到阿炜'], quote: undefined,
      })
      break
    }
    case 'setState': { const t = T(a.id); t.state = a.state; t.seen = true; s.step = Math.max(s.step, 5); log(s, `PATCH /items/${t.id} → ${a.state}`, '现有', `${a.by ?? s.role} 推进状态`); rollup(s); break }
    case 'lingeeSubmit': {
      const t = T(a.id); t.state = 'in_review'; s.minutesDoc = TRANSCRIPT.filter((_, i) => [1, 2, 3, 5, 6].includes(i)).map(l => l.text); s.step = 6
      log(s, `lingee.submitReview ${t.id}`, '现有', '灵基只提交验收，不自己关单')
      setLingee(s, { phase: 'ready', stream: '纪要交稿了。发给老王、阿炜确认？异议我会自动派修改单给你。', note: '交稿', pills: ['发给确认人'], quote: s.minutesDoc[0] })
      break
    }
    case 'accept': { const t = T(a.id); t.state = 'done'; s.step = Math.max(s.step, 7); log(s, `POST /items/${t.id}/accept`, '现有', '验收通过'); if (t.kind === 'set') s.step = 8; rollup(s); break }
    case 'return': { const t = T(a.id); t.state = 'in_progress'; t.comments.push({ by: s.role, text: '退回：再补充一下', at: '16:30' }); log(s, `POST /items/${t.id}/return`, '现有', '退回给负责人'); break }
    case 'assign': { const t = T(a.id); t.assignee = a.who; log(s, `PATCH /items/${t.id} assignee`, '现有', `指派给 ${a.who}`); break }
    case 'ack': { const t = T(a.id); t.ackLingee = true; t.comments.push({ by: s.role, text: '先排除，单独列出来', at: '16:00' }); log(s, `POST /items/${t.id}/comments`, '现有', '回复灵基'); break }
    case 'sendConfirm': {
      const t = T(a.id); t.state = 'in_progress'; s.step = 6
      for (const who of ['老王', '阿炜'] as Role[]) s.tasks.push({ id: nid('cf'), title: `确认纪要 · ${who}`, assignee: who, creator: '刘洋', state: 'suggested', kind: 'confirm', parentId: t.id, comments: [], source: t.source, due: '2026-11-04', rev: 1 })
      log(s, `POST /minutes/${t.id}/confirm {to:[老王,阿炜]}`, '新增', '建 1:1 确认子任务')
      setLingee(s, { stream: '已发给老王、阿炜。有人异议我会自动派「修改纪要」给你。', note: '等确认', pills: [] })
      break
    }
    case 'confirm': { const t = T(a.id); t.state = 'done'; log(s, `PATCH /items/${t.id} done`, '现有', `${t.assignee} 确认无误`); rollup(s); break }
    case 'object': {
      const t = T(a.id); t.comments.push({ by: t.assignee, text: a.text, at: '16:20' }); t.state = 'in_progress'
      log(s, `POST /items/${t.id}/comments`, '现有', '有异议，写评论')
      s.tasks.push({ id: nid('rv'), title: `修改纪要 · ${t.assignee}的异议`, assignee: '刘洋', creator: '刘洋', state: 'suggested', kind: 'revise', parentId: t.parentId, comments: [{ by: t.assignee, text: a.text, at: '16:20' }], source: t.source, due: TODAY })
      log(s, 'lingee.autoDispatch(修改纪要 → 刘洋)', '新增', '灵基按异议自动派修改单')
      setLingee(s, { phase: 'ready', stream: `收到异议：「${a.text}」。已自动派修改单给刘洋。`, note: '异议 → 修改单', pills: ['切到刘洋'], quote: a.text })
      break
    }
    case 'revised': {
      const r = T(a.id); r.state = 'done'
      const objector = r.comments[0]?.by
      const cf = s.tasks.find(t => t.kind === 'confirm' && t.parentId === r.parentId && t.assignee === objector)
      if (cf) { cf.state = 'suggested'; cf.rev = (cf.rev ?? 1) + 1; cf.comments.push({ by: '灵基', text: '纪要已按你的意见修改，请再确认', at: '16:40' }) }
      if (s.minutesDoc && objector) s.minutesDoc = [...s.minutesDoc, `（第 2 版）补充：${r.comments[0].text}`]
      log(s, `PATCH /items/${cf?.id} reconfirm`, '新增', `改好后重新发给 ${objector} 确认`)
      rollup(s); break
    }
    case 'nudge': { const t = T(a.id); t.nudged = true; log(s, `POST /items/${t.id}/nudge`, '现有', `催一下 ${t.assignee}`); break }
    case 'jumpSource': s.view = 'room'; s.highlight = a.line; s.lines = TRANSCRIPT.length; s.step = 8; log(s, `GET /steno/${STENO_ID}#L${a.line}`, '新增', '来源跳回原话'); break
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
    if (t.kind === 'confirm' && t.assignee === role && t.state === 'suggested') rows.push({ key: t.id, kind: '待确认', task: t, line: `刘洋请你确认讨论纪要${(t.rev ?? 1) > 1 ? '（第 2 版）' : ''}` })
    else if (t.assignee === role && t.state === 'suggested' && t.kind !== 'confirm') rows.push({ key: t.id, kind: '派给我', task: t, line: t.kind === 'revise' ? `灵基按异议派来：${t.comments[0]?.text}` : `${t.creator}派来，${t.due ? t.due.slice(5) + ' 截止' : '无截止'}` })
    else if (t.assignee === role && t.state === 'in_progress' && t.due && t.due <= TODAY && t.kind === 'task') rows.push({ key: t.id, kind: '到期', task: t, line: '今天到期' })
    if (t.creator === role && !t.assignee && t.state !== 'done') rows.push({ key: t.id, kind: '没人接', task: t, line: '还没人接，指派一个人' })
    if (t.creator === role && t.assignee === '灵基' && t.comments.some(c => c.by === '灵基') && !t.ackLingee && t.kind === 'task') rows.push({ key: t.id + 'q', kind: '灵基回话', task: t, line: t.comments.find(c => c.by === '灵基')!.text })
    if (t.creator === role && t.kind === 'minutes' && t.state === 'in_review') rows.push({ key: t.id, kind: '灵基交稿', task: t, line: '灵基整理好了讨论纪要，发给大家确认？' })
    if (t.creator === role && t.state === 'in_review' && t.kind !== 'minutes') rows.push({ key: t.id, kind: '待验收', task: t, line: t.kind === 'set' ? '子任务全部完成，整组待你验收' : `${t.assignee} 提交了验收` })
    if (t.creator === role && t.kind === 'confirm' && t.state === 'suggested' && !t.nudged) rows.push({ key: t.id + 'n', kind: '没人动·催一下', task: t, line: `${t.assignee} 还没确认纪要，到点了` })
  }
  return rows
}
