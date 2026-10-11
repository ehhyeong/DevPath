import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { showAuthToast } from '../../lib/auth-toast'
import { projectApiRequest } from '../project/api'
import { aiWorkspaceHref } from './ai-squad-data'
import { emptyInterviewEvidence, proofStyles, resolveInterviewEvidence, taskEvidenceStyles, type InterviewEvidence, type InterviewEvidenceLinks } from './interview-evidence'
import InterviewEvidenceEditor from './InterviewEvidenceEditor'
import InterviewQuestionEditor from './InterviewQuestionEditor'
import { emptyInterviewAnswer, matchedInterviewKeywords, type InterviewAnswer, type InterviewAnswers, type InterviewQuestion } from './interview-practice'
import type { SpeechRecognitionLike, WindowWithSpeechRecognition } from './meeting/meeting-types'

type AnswerTab = 'mine' | 'follow' | 'peer' | 'model'
const answerTabs = [['mine', '내 답변', 'fa-pen'], ['follow', '꼬리 질문', 'fa-level-down-alt'], ['peer', '팀원 답변', 'fa-users'], ['model', '모범 답안', 'fa-magic']] as const
const ratings = [[1, '🥲', '막막해요'], [2, '🤔', '애매해요'], [3, '😎', '자신 있어요']] as const
const template = '[문제 상황]\n[선택한 방법과 이유]\n[구현 — 우리 코드]\n[결과 · 검증] '
const categoryColors: Record<string, string> = {
  '핵심 난제': 'border-purple-100 bg-purple-50 text-purple-600', 성능: 'border-blue-100 bg-blue-50 text-blue-600',
  보안: 'border-red-100 bg-red-50 text-red-600', 설계: 'border-teal-100 bg-teal-50 text-teal-700',
  인프라: 'border-gray-200 bg-gray-50 text-gray-600', 협업: 'border-orange-100 bg-orange-50 text-orange-600',
}

export default function AiInterviewQuestionBank({ questions, workspaceId, answers, setAnswers, focusedId, evidence = emptyInterviewEvidence, onSaveEvidence, onSaveQuestion }: {
  onSaveQuestion?: (question: InterviewQuestion) => Promise<boolean>
  questions: InterviewQuestion[]
  workspaceId: number | null
  answers: InterviewAnswers
  setAnswers: Dispatch<SetStateAction<InterviewAnswers>>
  focusedId?: string
  evidence?: InterviewEvidence
  onSaveEvidence?: (id: string, links: InterviewEvidenceLinks) => Promise<boolean>
}) {
  const [sharedAnswers, setSharedAnswers] = useState<{ questionId: string; userId: number; name: string; text: string }[]>([])
  const [sharing, setSharing] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [questionDraft, setQuestionDraft] = useState<InterviewQuestion | null>(null)
  const editingQuestion = questions.find((question) => question.id === editingId)
  useEffect(() => {
    if (!workspaceId) return
    let ignore = false
    void Promise.resolve(projectApiRequest<typeof sharedAnswers>(`/api/workspaces/${workspaceId}/interview/shared-answers`, {}, 'required')).then((result) => { if (!ignore && Array.isArray(result)) setSharedAnswers(result) }).catch(() => undefined)
    return () => { ignore = true }
  }, [workspaceId])
  async function shareAnswer(id: string) {
    if (!workspaceId || sharing || !answers[id]?.text.trim()) return
    setSharing(true)
    try {
      const result = await projectApiRequest<typeof sharedAnswers>(`/api/workspaces/${workspaceId}/interview/shared-answers`, { method: 'POST', body: JSON.stringify({ questionId: id, text: answers[id].text }) }, 'required')
      setSharedAnswers(result)
      showAuthToast('답변을 팀에 공유했습니다.')
    } catch (error) { showAuthToast({ message: error instanceof Error ? error.message : '답변을 공유하지 못했습니다.', variant: 'error' }) }
    finally { setSharing(false) }
  }
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [state, setState] = useState('all')
  const [sort, setSort] = useState('default')
  const [openCards, setOpenCards] = useState<string[]>(focusedId ? [focusedId] : [])
  useEffect(() => {
    if (focusedId) document.getElementById(focusedId)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [focusedId])
  const [tabs, setTabs] = useState<Record<string, AnswerTab>>({})
  const [feedbackBusy, setFeedbackBusy] = useState<string[]>([])
  const [recordingId, setRecordingId] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  useEffect(() => () => recognitionRef.current?.abort(), [])
  const getAnswer = (id: string) => answers[id] ?? emptyInterviewAnswer
  const changeAnswer = (id: string, patch: Partial<InterviewAnswer>) => setAnswers((current) => ({ ...current, [id]: { ...(current[id] ?? emptyInterviewAnswer), ...patch } }))
  const filtered = questions.filter((question) => {
    const answer = getAnswer(question.id)
    return (category === 'all' || question.category === category)
      && `${question.question} ${question.keywords.join(' ')}`.toLowerCase().includes(search.toLowerCase())
      && (state === 'all' || (state === 'none' && !answer.text.trim()) || (state === 'weak' && answer.rating === 1)
        || (state === 'good' && answer.rating === 3) || (state === 'fav' && answer.favorite))
  }).sort((a, b) => sort === 'level' ? b.level - a.level : sort === 'weak' ? getAnswer(a.id).rating - getAnswer(b.id).rating : 0)

  function dictate(id: string) {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }
    const browser = window as WindowWithSpeechRecognition
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    if (!Recognition) {
      showAuthToast({ message: '이 브라우저는 음성 입력을 지원하지 않습니다.', variant: 'error' })
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const text = event.results[event.resultIndex][0].transcript
      setAnswers((current) => {
        const answer = current[id] ?? emptyInterviewAnswer
        return { ...current, [id]: { ...answer, text: `${answer.text}${answer.text ? ' ' : ''}${text}` } }
      })
    }
    recognition.onend = () => { recognitionRef.current = null; setRecordingId('') }
    recognition.onerror = () => showAuthToast({ message: '음성 입력을 시작하지 못했습니다. 마이크 권한을 확인해 주세요.', variant: 'error' })
    try {
      recognition.start()
      recognitionRef.current = recognition
      setRecordingId(id)
    } catch {
      showAuthToast({ message: '음성 입력을 시작하지 못했습니다.', variant: 'error' })
    }
  }

  async function getFeedback(question: InterviewQuestion) {
    if (!workspaceId || feedbackBusy.includes(question.id)) return
    const answer = getAnswer(question.id).text.trim()
    if (!answer) return
    setFeedbackBusy((ids) => [...ids, question.id])
    try {
      const result = await projectApiRequest<{ answer: string }>(`/api/workspaces/${workspaceId}/ai-assist`, {
        method: 'POST', body: JSON.stringify({
          question: `면접 답변 코치로서 아래 답변의 좋은 점, 보완할 점, 추가로 설명할 근거를 한국어로 피드백해 주세요. 실제 구현 여부를 추측하거나 워크스페이스 변경을 제안하지 마세요.\n질문: ${question.question}\n설계서 모범 답안: ${question.answer}\n핵심 키워드: ${question.keywords.join(', ')}\n내 답변: ${answer}`,
          history: [],
        }),
      }, 'required')
      changeAnswer(question.id, { feedback: result.answer })
    } catch (error) {
      showAuthToast({ message: error instanceof Error ? error.message : 'AI 피드백을 받지 못했습니다.', variant: 'error' })
    } finally {
      setFeedbackBusy((ids) => ids.filter((id) => id !== question.id))
    }
  }

  return <section className="space-y-4">
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center">
      <div className="relative flex-1"><i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-500" /><input aria-label="질문 검색" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-3 pl-8 text-xs outline-none focus:border-brand focus:bg-white" placeholder="질문 · 키워드 검색" /></div>
      <div className="flex flex-wrap gap-1">{['all', ...new Set(questions.map((question) => question.category))].map((value) => <button key={value} type="button" onClick={() => setCategory(value)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${category === value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-500'}`}>{value === 'all' ? '전체' : value}</button>)}</div>
      <select aria-label="연습 상태" value={state} onChange={(event) => setState(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-600"><option value="all">전체 상태</option><option value="none">미연습</option><option value="weak">보강 필요</option><option value="good">자신 있음</option><option value="fav">★ 즐겨찾기</option></select>
      <select aria-label="질문 정렬" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-600"><option value="default">기본 순서</option><option value="weak">약한 질문 먼저</option><option value="level">난이도 높은 순</option></select>
    </div>
    <div className="space-y-3">{filtered.map((question) => {
      const answer = getAnswer(question.id)
      const open = openCards.includes(question.id)
      const tab = tabs[question.id] ?? 'mine'
      const linked = resolveInterviewEvidence(question, evidence)
      const proof = proofStyles[linked.state]
      return <article id={question.id} key={question.id} className={`relative overflow-hidden rounded-2xl border bg-white transition ${open ? 'border-gray-300 shadow-[0_10px_25px_-10px_rgba(0,0,0,.12)]' : 'border-gray-100 shadow-sm'}`}>
        <button type="button" aria-label={`${question.id} ${question.question}`} aria-expanded={open} aria-controls={`answer-${question.id}`} onClick={() => setOpenCards((ids) => open ? ids.filter((id) => id !== question.id) : [...ids, question.id])} className="block w-full cursor-pointer p-5 text-left">
          <span className="mb-2 flex items-center justify-between gap-3">
            <span className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-gray-500">{question.id}</span><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${categoryColors[question.category] ?? 'border-gray-200 bg-gray-50 text-gray-600'}`}>{question.category}</span><span className="rounded border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">{question.source === 'team' ? '팀 추가' : question.source === 'generated' ? 'AI 추가 생성' : 'AI 설계서 질문'}</span><span className="text-[10px] font-bold text-gray-500">{'●'.repeat(question.level)}{'○'.repeat(3 - question.level)}</span>{linked.state !== 'none' ? <span title="작업 현황판 기준" className={`text-[10px] font-bold ${proof.color}`}><i className={`fas ${proof.icon} mr-1`} />{proof.label}</span> : null}</span>
            <span className="flex shrink-0 items-center gap-2"><span className="rounded border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-500">{answer.text.trim() ? '답변 작성' : '미연습'}</span><span className="w-7" /><i aria-hidden="true" className={`fas fa-chevron-down text-xs text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} /></span>
          </span>
          <h3 className="text-[15px] font-bold leading-6 text-gray-900">Q. {question.question}</h3>
          {!open ? <span className="mt-2 flex items-center gap-3 text-[11px] font-medium text-gray-500"><span><i className="fas fa-key mr-1" />키워드 {matchedInterviewKeywords(question, answer).length}/{question.keywords.length}</span>{question.from ? <span>{question.from}</span> : null}</span> : null}
        </button>
        <button type="button" aria-label={`${question.id} 즐겨찾기`} aria-pressed={answer.favorite} onClick={() => changeAnswer(question.id, { favorite: !answer.favorite })} className={`absolute top-4 right-11 flex h-7 w-7 items-center justify-center rounded-lg ${answer.favorite ? 'text-amber-400' : 'text-gray-300 hover:bg-gray-50'}`}><i className={`${answer.favorite ? 'fas' : 'far'} fa-star`} /></button>
        {open ? <div id={`answer-${question.id}`} className="border-t border-gray-100">
          {onSaveQuestion ? <div className="flex justify-end px-5 pt-3"><button type="button" aria-label={`${question.id} 질문·모범답안 수정`} onClick={() => setQuestionDraft(question)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50"><i className="fas fa-pen mr-1" aria-hidden="true" />질문·모범답안 수정</button></div> : null}
          <div role="tablist" aria-label={`${question.id} 답변 탭`} className="flex items-center gap-4 border-b border-gray-100 px-5 text-xs font-bold text-gray-500">{answerTabs.map(([value, label, icon]) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTabs((current) => ({ ...current, [question.id]: value }))} type="button" className={`border-b-2 py-3 text-xs transition hover:text-gray-700 ${tab === value ? 'border-gray-900 text-gray-900' : 'border-transparent'}`}><i className={`fas ${icon} mr-1`} />{label}</button>)}</div>
          <div role="tabpanel" aria-label={`${question.id} ${answerTabs.find(([value]) => value === tab)?.[1]} 패널`} className="p-5">
            {tab === 'mine' ? <>
              {linked.state === 'todo' || linked.state === 'progress' ? <p className={`mb-3 rounded-xl border px-4 py-2.5 text-[11px] leading-relaxed font-medium ${linked.state === 'todo' ? 'border-orange-100 bg-orange-50 text-orange-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}><i className={`fas ${proof.icon} mr-1`} />{linked.state === 'todo' ? `관련 작업 ${linked.tasks.map((task) => '#' + task.id).join(', ')}은 아직 시작 전이에요. 지금은 설계 의도로 답하고, 구현 후 실제 결과로 답변을 업데이트하세요.` : '관련 작업이 진행 중이에요. 구현하며 겪은 문제를 메모하면 좋은 답변 자료가 됩니다.'}</p> : null}
              <div className="overflow-hidden rounded-xl border border-gray-200 transition focus-within:border-brand">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2"><div className="flex gap-1"><button type="button" onClick={() => changeAnswer(question.id, { text: `${answer.text.trim() ? `${answer.text.trim()}\n\n` : ''}${template}` })} className="rounded-md px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-white"><i className="fas fa-stream mr-1" />답변 틀 넣기</button><button type="button" onClick={() => dictate(question.id)} className="rounded-md px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-white"><i className="fas fa-microphone mr-1" />{recordingId === question.id ? '입력 중지' : '말로 답하기'}</button></div><span className="text-[10px] font-bold text-gray-500">{answer.text.length}자 · 약 {Math.round(answer.text.length / 6)}초</span></div>
                <textarea aria-label={`${question.id} 내 답변`} value={answer.text} onChange={(event) => changeAnswer(question.id, { text: event.target.value })} className="custom-scrollbar min-h-[140px] w-full resize-y p-4 text-sm leading-relaxed text-gray-800 outline-none placeholder:text-gray-500" placeholder="실제로 구현한 방식, 겪은 문제, 선택 이유, 결과를 우리 코드 기준으로 적어 보세요." />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-gray-500">{workspaceId ? '작성 내용은 내 연습 기록에 자동 저장됩니다. 팀 공유는 직접 선택할 수 있습니다.' : '작성 내용은 이 브라우저에 자동 저장됩니다.'}</p><div className="flex gap-2"><button type="button" disabled={!answer.text.trim()} onClick={() => changeAnswer(question.id, { versions: [...answer.versions, { text: answer.text, at: new Date().toISOString() }] })} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"><i className="fas fa-code-branch mr-1" />버전 저장</button><button type="button" disabled={!workspaceId || !answer.text.trim() || feedbackBusy.includes(question.id)} onClick={() => void getFeedback(question)} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-black disabled:opacity-40"><i className={`fas ${feedbackBusy.includes(question.id) ? 'fa-circle-notch fa-spin' : 'fa-magic'} mr-1`} />{feedbackBusy.includes(question.id) ? '답변 분석 중...' : 'AI 피드백 받기'}</button></div></div>
              {answer.feedback ? <div className="mt-4 rounded-2xl border border-teal-100 bg-gradient-to-br from-green-50/70 to-teal-50/40 p-5"><p className="mb-3 text-[11px] font-extrabold text-teal-700"><i className="fas fa-magic mr-1" />AI 답변 코치</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{answer.feedback}</p></div> : null}
              {answer.versions.length ? <div className="mt-4"><p className="mb-2 text-[11px] font-extrabold text-gray-500"><i className="fas fa-history mr-1" />답변 버전 기록</p><div className="space-y-1.5">{answer.versions.map((version, index) => <div key={`${version.at}-${index}`} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"><span className="text-[10px] font-black text-gray-500">v{index + 1}</span><span className="flex-1 truncate text-[11px] text-gray-500">{version.text}</span><span className="shrink-0 text-[10px] text-gray-500">{new Date(version.at).toLocaleDateString('ko-KR')}</span><button type="button" onClick={() => changeAnswer(question.id, { text: version.text })} className="shrink-0 text-[10px] font-bold text-gray-500 hover:text-brand">불러오기</button></div>)}</div></div> : null}
            </> : tab === 'model' ? <ModelAnswer question={question} answer={answer} />
              : tab === 'peer' ? <div className="space-y-3">{sharedAnswers.filter((item) => item.questionId === question.id).map((item) => <div key={item.userId} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><p className="text-xs font-bold text-gray-700">{item.name}</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{item.text}</p></div>)}{!sharedAnswers.some((item) => item.questionId === question.id) ? <p className="py-8 text-center text-xs text-gray-500">아직 공유된 팀원 답변이 없습니다.</p> : null}<button type="button" disabled={!workspaceId || sharing || !answer.text.trim()} onClick={() => void shareAnswer(question.id)} className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-xs font-bold text-teal-700 disabled:opacity-40">내 답변을 팀에 공유하기</button></div> : <p className="py-8 text-center text-xs text-gray-500">이 설계서에 등록된 꼬리 질문이 없습니다.</p>}
          </div>
          <div className="flex flex-col justify-between gap-3 px-5 pb-5 md:flex-row md:items-center"><div aria-label={`${question.id} 근거 코드 · 설계`} className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[10px] font-bold text-gray-500">근거 코드 · 설계</span>{linked.tasks.map((task) => <a key={task.id} title={task.title} href={aiWorkspaceHref('/squad-workspace')} className={`rounded border px-2 py-0.5 text-[10px] font-bold ${taskEvidenceStyles[task.status].badge}`}><i aria-hidden="true" className="fas fa-columns mr-1" />#{task.id} {taskEvidenceStyles[task.status].label}</a>)}{linked.apis.map((api) => <a key={api.id} href={`${aiWorkspaceHref('/squad-api')}#${api.id}`} className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold method-${api.method}`}>{api.method} {api.path}</a>)}{linked.table ? <a href={aiWorkspaceHref('/squad-erd')} className="rounded border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700"><i aria-hidden="true" className="fas fa-table mr-1" />{linked.table}</a> : null}{!linked.tasks.length && !linked.apis.length && !linked.table ? <span className="text-[10px] text-gray-500">연결 없음</span> : null}{onSaveEvidence ? <button type="button" aria-label={`${question.id} 근거 연결`} onClick={() => setEditingId(question.id)} className="rounded px-2 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-50 hover:text-teal-700"><i className="fas fa-pen mr-1" />연결 편집</button> : null}</div><div className="flex shrink-0 items-center gap-1"><span className="mr-1 text-[10px] font-bold text-gray-500">자가 평가</span>{ratings.map(([value, emoji, label]) => <button key={value} aria-label={`${question.id} ${label}`} aria-pressed={answer.rating === value} type="button" onClick={() => changeAnswer(question.id, { rating: value })} className={`h-8 w-8 rounded-lg border text-sm ${answer.rating === value ? 'border-gray-900 bg-gray-900' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>{emoji}</button>)}</div></div>
        </div> : null}
      </article>
    })}{!filtered.length ? <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">조건에 맞는 질문이 없습니다.</div> : null}</div>
    {questionDraft && onSaveQuestion ? <InterviewQuestionEditor question={questionDraft} onSave={onSaveQuestion} onClose={() => setQuestionDraft(null)} /> : null}
    {editingQuestion && onSaveEvidence ? <InterviewEvidenceEditor question={editingQuestion} evidence={evidence} onSave={(links) => onSaveEvidence(editingQuestion.id, links)} onClose={() => setEditingId('')} /> : null}
  </section>
}

function ModelAnswer({ question, answer }: { question: InterviewQuestion; answer: InterviewAnswer }) {
  const [revealed, setRevealed] = useState(false)
  const matched = matchedInterviewKeywords(question, answer)
  return <>
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3"><p className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-700"><i className="fas fa-magic" />모범 답안</p>{question.answer ? <span className="text-[10px] text-gray-500">{revealed ? '클릭해서 가리기' : '클릭해서 열기'}</span> : null}</div>
      {question.answer ? <button type="button" aria-label={`${question.id} 모범 답안 ${revealed ? '가리기' : '보기'}`} aria-expanded={revealed} onClick={() => setRevealed((current) => !current)} className="block w-full rounded text-left text-sm leading-relaxed text-gray-700 outline-offset-4 focus-visible:outline-2 focus-visible:outline-teal-500"><span aria-hidden={!revealed} className={`block whitespace-pre-wrap transition-[filter] ${revealed ? '' : 'select-none blur-[5px]'}`}>{question.answer}</span></button> : <p className="text-sm text-gray-500">아직 모범 답안이 없습니다.</p>}
      <div className="mt-3 flex flex-wrap gap-1">{question.keywords.map((keyword) => <span key={keyword} className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${matched.includes(keyword) ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600'}`}>#{keyword}</span>)}</div>
      {answer.text.trim() ? <p className="mt-2 text-[10px] text-gray-500">초록색 키워드는 내 답변에도 들어 있는 키워드입니다.</p> : null}
    </div>
    <p className="mt-3 text-[11px] text-gray-500"><i className="fas fa-lightbulb mr-1 text-yellow-400" />모범 답안을 외우기보다, 우리 코드에서 실제로 한 일로 바꿔 말하는 연습을 하세요.</p>
  </>
}
