import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../../lib/admin-api'
import type {
  AdminCompany,
  AdminJob,
  AdminRefund,
  AdminSettlement,
  ExperimentResult,
  JobSkillTag,
  LearningMetric,
  LearningRule,
  MarketReport,
  PlatformNotice,
  RecommendationSetting,
  SettlementEligibility,
} from '../../../types/admin-operations'

type OperationTab = 'jobs' | 'learning' | 'recommendation' | 'notices' | 'payments'

const operationTabs: Array<{ key: OperationTab; label: string; icon: string }> = [
  { key: 'jobs', label: '채용·기업', icon: 'fa-briefcase' },
  { key: 'learning', label: '학습 운영', icon: 'fa-graduation-cap' },
  { key: 'recommendation', label: '추천·분석', icon: 'fa-chart-line' },
  { key: 'notices', label: '플랫폼 공지', icon: 'fa-bullhorn' },
  { key: 'payments', label: '환불·정산', icon: 'fa-receipt' },
]

const operationValueLabels: Record<string, string> = {
  APPROVED: '승인',
  ARCHIVED: '보관됨',
  CAREER_LEVEL: '경력',
  CLOSED: '종료',
  COMPLETED: '완료',
  DRAFT: '작성 중',
  EXTERNAL: '외부 연동',
  HELD: '보류',
  INTERNAL: '직접 등록',
  JOBKOREA: '잡코리아',
  OPEN: '공개',
  PAUSED: '일시 중지',
  PENDING: '대기',
  REGION: '지역',
  REJECTED: '반려',
  RUNNING: '진행 중',
  VERIFIED: '인증 완료',
  WANTED: '원티드',
}

const operationFieldLabels: Record<string, string> = {
  averageLearningDurationSeconds: '평균 학습 시간(초)',
  averageRoadmapProgress: '평균 로드맵 진행률',
  automationMonitors: '자동화 점검 항목',
  clearanceRate: '노드 클리어율',
  issuedProofCardCount: '발급된 Proof Card',
  monthlyCompletedAssignments: '이번 달 완료 과제',
  quizQualityScore: '퀴즈 품질 점수',
  recommendationChangeCount: '추천 변경',
  roadmapCompletionRate: '로드맵 완료율',
  totalUsers: '전체 가입자',
  weeklyActiveUsers: '주간 활성 사용자',
  year: '조회 연도',
}

const recommendationSettingLabels: Record<string, string> = {
  'algorithm.weight.recent_activity': '최근 활동 가중치',
  'algorithm.weight.skill_match': '기술 일치 가중치',
  'algorithm.weight.tag_match': '태그 일치 가중치',
}

const learningMetricPresentations: Record<string, { name: string; description: string }> = {
  clearanceRate: { name: '노드 클리어율', description: '전체 노드 판정 중 클리어된 비율입니다.' },
  learningDuration: { name: '평균 학습 시간', description: '강의별 평균 학습 시간(초)입니다.' },
  quizQuality: { name: '퀴즈 품질 점수', description: '평균 점수율과 통과율을 종합한 점수입니다.' },
  roadmapCompletionRate: { name: '로드맵 완료율', description: '전체 수강 중 완료 상태인 비율입니다.' },
}

const learningRulePresentations: Record<string, { name: string; description: string }> = {
  NODE_CLEARANCE_AUTO_JUDGE: { name: '노드 클리어 자동 판정', description: '학습, 필수 태그, 퀴즈와 과제를 함께 평가합니다.' },
  NODE_CLEARANCE_REQUIRES_COMPLETION: { name: '노드 클리어 완료 조건', description: '전체 학습 완료와 평가 통과를 모두 요구합니다.' },
  PROOF_CARD_AUTO_ISSUE: { name: 'Proof Card 자동 발급', description: '증명 가능한 노드 클리어에만 Proof Card를 자동 발급합니다.' },
  PROOF_CARD_MANUAL_ISSUE: { name: 'Proof Card 수동 발급', description: '관리자의 수동 발급과 재발급을 허용합니다.' },
  RECOMMENDATION_CHANGE_ENABLED: { name: '추천 변경 기능', description: '추천 변경 제안 생성과 적용 흐름을 활성화합니다.' },
  RECOMMENDATION_CHANGE_MAX_LIMIT: { name: '추천 변경 최대 생성 수', description: '한 번에 생성할 추천 변경 제안의 최대 개수를 정합니다.' },
  SUPPLEMENT_RECOMMENDATION_ENABLED: { name: '보충 학습 추천', description: '학습 위험과 태그 부족을 기준으로 보충 추천을 생성합니다.' },
  SUPPLEMENT_RECOMMENDATION_PRIORITY: { name: '보충 추천 우선순위', description: '부족 태그 수와 충족률 격차로 보충 추천 순서를 정합니다.' },
  TAG_AUTO_CLASSIFICATION_ENABLED: { name: '태그 자동 분류', description: '태그를 기준으로 강의를 자동 분류합니다.' },
  TAG_MATCH_THRESHOLD: { name: '태그 일치 기준', description: '자동 추천에 필요한 최소 태그 충족률을 정합니다.' },
}

const learningRuleValueLabels: Record<string, string> = {
  false: '미사용',
  LESSON_100_AND_EVALUATION_PASS: '학습 100%와 평가 통과',
  LESSON_100_AND_REQUIRED_TAGS_AND_EVALUATION_PASS: '학습 100%, 필수 태그와 평가 통과',
  MISSING_TAG_COUNT_DESC: '부족 태그 수가 많은 순서',
  PROOF_ELIGIBLE_ONLY: '발급 조건 충족 시',
  true: '사용',
}

function operationValueLabel(value: string | null | undefined) {
  if (!value) return '-'
  return operationValueLabels[value] ?? value
}

function operationFieldLabel(key: string) {
  return operationFieldLabels[key] ?? key
}

function learningRuleValueLabel(value?: string | null) {
  if (!value) return '-'
  return learningRuleValueLabels[value] ?? value
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return value.toLocaleString('ko-KR')
  if (Array.isArray(value)) return `${value.length.toLocaleString('ko-KR')}개`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function ErrorNotice({ message }: { message: string }) {
  return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{message}</p>
}

function parseMetricsJson(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed }
  } catch {
    return { raw: value }
  }
}

function JobsOperationPanel() {
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [keyword, setKeyword] = useState('Spring Boot')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [skillTagsByJob, setSkillTagsByJob] = useState<Record<number, JobSkillTag[]>>({})

  const load = useCallback(async () => {
    const [jobItems, companyItems] = await Promise.all([adminApi.getAllJobs(), adminApi.getCompanies()])
    setJobs(jobItems)
    setCompanies(companyItems)
  }, [])

  useEffect(() => {
    void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : '채용 데이터를 불러오지 못했습니다.'))
  }, [load])

  async function collectJobs() {
    setBusy(true)
    try {
      const result = await adminApi.collectJobs(keyword, 20)
      setMessage(`신규 ${result.savedCount}개 저장, 중복 ${result.skippedCount}개 건너뜀`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '수집에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function createCompany(form: HTMLFormElement) {
    const data = new FormData(form)
    await adminApi.createCompany({
      name: data.get('name'),
      description: data.get('description'),
      websiteUrl: data.get('websiteUrl'),
      logoUrl: null,
      industry: data.get('industry'),
      location: data.get('location'),
    })
    form.reset()
    await load()
  }

  async function createJob(form: HTMLFormElement) {
    const data = new FormData(form)
    await adminApi.createJob({
      companyId: Number(data.get('companyId')),
      title: data.get('title'),
      jobRole: data.get('jobRole'),
      description: data.get('description'),
      requiredSkills: data.get('requiredSkills'),
      region: data.get('region'),
      careerLevel: data.get('careerLevel'),
      sourceUrl: data.get('sourceUrl'),
      source: 'INTERNAL',
      status: 'OPEN',
      deadline: data.get('deadline') || null,
      externalJobId: null,
    })
    form.reset()
    await load()
  }

  async function editCompany(companyId: number) {
    const company = await adminApi.getCompany(companyId)
    const name = window.prompt('기업명', company.name)
    if (!name?.trim()) return
    const description = window.prompt('기업 소개', company.description ?? '')
    if (description === null) return
    const industry = window.prompt('산업군', company.industry ?? '')
    if (industry === null) return
    const location = window.prompt('기업 위치', company.location ?? '')
    if (location === null) return
    await adminApi.updateCompany(companyId, {
      name: name.trim(),
      description,
      websiteUrl: company.websiteUrl ?? null,
      logoUrl: company.logoUrl ?? null,
      industry,
      location,
    })
    await load()
  }

  async function toggleCompanyArchive(company: AdminCompany) {
    if (company.archived) await adminApi.restoreCompany(company.companyId)
    else if (window.confirm('연결 공고가 없는 기업만 보관할 수 있습니다. 계속할까요?')) await adminApi.archiveCompany(company.companyId)
    await load()
  }

  async function editJob(jobId: number) {
    const job = await adminApi.getJob(jobId)
    const title = window.prompt('공고 제목', job.title)
    if (!title?.trim()) return
    const description = window.prompt('공고 설명', job.description ?? '')
    if (!description?.trim()) return
    const status = window.prompt('공고 상태', job.status)
    if (!status?.trim()) return
    await adminApi.updateJob(jobId, {
      title: title.trim(),
      jobRole: job.jobRole,
      description: description.trim(),
      requiredSkills: job.requiredSkills ?? null,
      region: job.region ?? null,
      careerLevel: job.careerLevel ?? null,
      sourceUrl: job.sourceUrl ?? null,
      source: job.source,
      status: status.trim().toUpperCase(),
      deadline: job.deadline ?? null,
      externalJobId: job.externalJobId ?? null,
    })
    await load()
  }

  async function toggleJobArchive(job: AdminJob) {
    if (job.archived) await adminApi.restoreJob(job.jobId)
    else if (window.confirm('공고를 종료하고 보관할까요?')) await adminApi.archiveJob(job.jobId)
    await load()
  }

  async function analyzeJob(job: AdminJob) {
    const result = await adminApi.analyzeJobJd(job.jobId)
    setSkillTagsByJob((current) => ({ ...current, [job.jobId]: result.skillTags }))
    setMessage(`${job.title}에서 기술 태그 ${result.extractedCount}개를 추출했습니다.`)
  }

  async function showJobSkillTags(jobId: number) {
    if (skillTagsByJob[jobId]) {
      setSkillTagsByJob((current) => {
        const next = { ...current }
        delete next[jobId]
        return next
      })
      return
    }
    const skillTags = await adminApi.getJobSkillTags(jobId)
    setSkillTagsByJob((current) => ({ ...current, [jobId]: skillTags }))
  }

  return (
    <div className="space-y-5">
      {message && <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">{message}</p>}
      <section className="admin-panel">
        <header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-blue-50 text-blue-600"><i className="fas fa-cloud-download-alt" /></span><div><h3>외부 채용 수집</h3><p>잡코리아 API에서 공고를 가져와 중복을 제외하고 저장합니다.</p></div></div></header>
        <div className="flex flex-wrap gap-3 p-5"><input className="min-w-64 flex-1 rounded-xl border border-slate-200 px-4 py-2.5" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="수집 키워드" /><button className="admin-primary-action" type="button" disabled={busy} onClick={() => void collectJobs()}>{busy ? '수집 중' : '20개 수집'}</button></div>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <details className="admin-panel" open>
          <summary className="cursor-pointer p-5 text-sm font-bold text-slate-800">기업 등록</summary>
          <form className="grid gap-3 px-5 pb-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void createCompany(event.currentTarget).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '기업 등록에 실패했습니다.')) }}>
            <input name="name" required placeholder="기업명" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="industry" placeholder="산업군" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="location" placeholder="위치" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="websiteUrl" placeholder="홈페이지 URL" className="rounded-xl border border-slate-200 px-3 py-2" /><textarea name="description" placeholder="기업 소개" className="rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2" /><button className="admin-primary-action sm:col-span-2" type="submit">기업 저장</button>
          </form>
        </details>
        <details className="admin-panel">
          <summary className="cursor-pointer p-5 text-sm font-bold text-slate-800">채용 공고 등록</summary>
          <form className="grid gap-3 px-5 pb-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void createJob(event.currentTarget).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '공고 등록에 실패했습니다.')) }}>
            <select name="companyId" required className="rounded-xl border border-slate-200 px-3 py-2"><option value="">기업 선택</option>{companies.filter((company) => !company.archived).map((company) => <option key={company.companyId} value={company.companyId}>{company.name}</option>)}</select><input name="title" required placeholder="공고 제목" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="jobRole" required placeholder="직무" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="requiredSkills" placeholder="기술 스택" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="region" placeholder="지역" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="careerLevel" placeholder="경력 조건" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="sourceUrl" placeholder="원문 URL" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="deadline" type="date" className="rounded-xl border border-slate-200 px-3 py-2" /><textarea name="description" required placeholder="공고 설명" className="rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2" /><button className="admin-primary-action sm:col-span-2" type="submit">공고 저장</button>
          </form>
        </details>
      </div>
      <section className="admin-panel overflow-hidden"><header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-violet-50 text-violet-600"><i className="fas fa-building" /></span><div><h3>기업 인증과 보관</h3><p>연결 공고를 먼저 보관한 뒤 기업을 안전하게 보관하거나 복구합니다.</p></div></div><span className="admin-result-count">{companies.length}개</span></header><div className="grid gap-3 p-5 lg:grid-cols-2">{companies.map((company) => <article key={company.companyId} className={`rounded-xl border border-slate-200 p-4 ${company.archived ? 'bg-slate-50 opacity-70' : ''}`}><div className="flex items-start justify-between gap-3"><div><strong>{company.name}</strong><p className="mt-1 text-xs text-slate-500">{company.industry || '산업 미등록'} · {company.location || '위치 미등록'}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold">{operationValueLabel(company.archived ? 'ARCHIVED' : company.verificationStatus)}</span></div><div className="mt-3 flex flex-wrap gap-2">{!company.archived && <><button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700" type="button" onClick={() => void editCompany(company.companyId).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '기업 수정 실패'))}>수정</button><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" type="button" onClick={() => void adminApi.verifyCompany(company.companyId, 'VERIFIED', '관리자 확인 완료').then(load)}>인증</button><button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" type="button" onClick={() => void adminApi.verifyCompany(company.companyId, 'REJECTED', '관리자 검증 반려').then(load)}>반려</button></>}<button className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700" type="button" onClick={() => void toggleCompanyArchive(company).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '기업 보관 상태 변경 실패'))}>{company.archived ? '복구' : '보관'}</button></div></article>)}</div></section>
      <section className="admin-panel overflow-hidden">
        <header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-amber-50 text-amber-600"><i className="fas fa-tasks" /></span><div><h3>전체 채용 공고와 JD 분석</h3><p>공개 상태와 관계없이 운영 공고 전체와 추출 기술을 확인합니다.</p></div></div><span className="admin-result-count">{jobs.length}개</span></header>
        <div className="admin-table-scroll"><table className="w-full min-w-[1020px]"><thead><tr><th>기업</th><th>공고</th><th>직무·기술</th><th>출처</th><th>상태</th><th>관리</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.jobId} className={job.archived ? 'opacity-60' : ''}><td>{job.companyName}</td><td><strong>{job.title}</strong><small className="block text-slate-400">{job.region || '-'}</small></td><td><div>{job.jobRole}</div><small className="block text-slate-400">{job.requiredSkills || '-'}</small>{skillTagsByJob[job.jobId] && <div className="mt-2 flex max-w-sm flex-wrap gap-1">{skillTagsByJob[job.jobId].length ? skillTagsByJob[job.jobId].map((tag) => <span key={tag.skillTagId} className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700" title={`신뢰도 ${Math.round((tag.confidenceScore ?? 0) * 100)}%`}>{tag.name}</span>) : <span className="text-xs text-slate-400">추출된 태그 없음</span>}</div>}</td><td>{operationValueLabel(job.source)}</td><td>{operationValueLabel(job.archived ? 'ARCHIVED' : job.status)}</td><td><div className="flex flex-wrap gap-2">{!job.archived && <><button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700" type="button" onClick={() => void editJob(job.jobId).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '공고 수정 실패'))}>수정</button><button className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700" type="button" onClick={() => void analyzeJob(job).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'JD 분석 실패'))}>JD 분석</button><button className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700" type="button" onClick={() => void showJobSkillTags(job.jobId).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '기술 태그 조회 실패'))}>{skillTagsByJob[job.jobId] ? '태그 닫기' : '태그 보기'}</button></>}<button className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700" type="button" onClick={() => void toggleJobArchive(job).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '공고 보관 상태 변경 실패'))}>{job.archived ? '복구' : '보관'}</button></div></td></tr>)}</tbody></table></div>
      </section>
    </div>
  )
}

function LearningOperationPanel() {
  const [metrics, setMetrics] = useState<LearningMetric[]>([])
  const [rules, setRules] = useState<LearningRule[]>([])
  const [annualReport, setAnnualReport] = useState<Record<string, unknown>>({})
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const [metricItems, ruleItems, report] = await Promise.all([adminApi.getLearningMetrics(), adminApi.getLearningRules(), adminApi.getAnnualLearningReport(reportYear)])
    setMetrics(metricItems); setRules(ruleItems); setAnnualReport(report)
  }, [reportYear])
  useEffect(() => { void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '학습 운영 데이터를 불러오지 못했습니다.')) }, [load])

  async function createRule(form: HTMLFormElement) {
    const data = new FormData(form)
    await adminApi.createLearningRule({
      ruleKey: String(data.get('ruleKey')).trim().toUpperCase(),
      ruleName: String(data.get('ruleName')).trim(),
      description: String(data.get('description')).trim(),
      ruleValue: String(data.get('ruleValue')).trim(),
      priority: Number(data.get('priority')),
    })
    form.reset()
    await load()
  }

  async function editRule(rule: LearningRule) {
    const ruleValue = window.prompt('규칙 값', rule.ruleValue ?? '')
    if (ruleValue === null) return
    const priority = window.prompt('우선순위', String(rule.priority))
    if (priority === null || !Number.isInteger(Number(priority))) return
    await adminApi.updateLearningRule(rule.ruleId, {
      ruleKey: rule.ruleKey,
      ruleName: rule.ruleName,
      description: rule.description ?? '',
      ruleValue,
      priority: Number(priority),
    })
    await load()
  }

  return <div className="space-y-5">
    {error && <ErrorNotice message={error} />}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => { const presentation = learningMetricPresentations[metric.metricKey]; return <article key={metric.metricKey} className="admin-panel p-5"><p className="text-xs font-bold text-slate-500">{presentation?.name ?? metric.metricName}</p><strong className="mt-2 block text-2xl text-slate-900">{formatValue(metric.metricValue)}</strong><p className="mt-2 text-xs leading-5 text-slate-500">{presentation?.description ?? metric.description}</p></article> })}</section>
    <section className="admin-panel p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">연간 학습 리포트</h3><p className="mt-1 text-xs text-slate-500">선택 연도의 1월 1일부터 다음 해 1월 1일 전까지 집계합니다.</p></div><input aria-label="리포트 조회 연도" type="number" min="2000" max="2100" value={reportYear} onChange={(event) => setReportYear(Number(event.target.value))} className="w-28 rounded-lg border border-slate-200 px-3 py-2" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(annualReport).map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{operationFieldLabel(key)}</p><strong className="mt-1 block break-all text-sm">{formatValue(value)}</strong></div>)}</div></section>
    <section className="admin-panel overflow-hidden">
      <header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-emerald-50 text-emerald-600"><i className="fas fa-bolt" /></span><div><h3>학습 자동화 규칙</h3><p>추천과 Proof Card 발급 동작에 실제 적용되는 규칙입니다.</p></div></div></header>
      <form className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-5" onSubmit={(event) => { event.preventDefault(); void createRule(event.currentTarget).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '규칙 등록 실패')) }}>
        <input name="ruleKey" required className="rounded-xl border border-slate-200 px-3 py-2" placeholder="규칙 코드" />
        <input name="ruleName" required className="rounded-xl border border-slate-200 px-3 py-2" placeholder="규칙 이름" />
        <input name="description" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="설명" />
        <input name="ruleValue" required className="rounded-xl border border-slate-200 px-3 py-2" placeholder="규칙 값" />
        <div className="flex gap-2"><input name="priority" type="number" defaultValue="100" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2" /><button type="submit" className="admin-primary-action">등록</button></div>
      </form>
      <div className="grid gap-3 p-5 lg:grid-cols-2">{rules.map((rule) => { const presentation = learningRulePresentations[rule.ruleKey]; return <article key={rule.ruleId} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4"><div><strong>{presentation?.name ?? rule.ruleName}</strong><code className="mt-1 block text-xs text-indigo-600">{rule.ruleKey}</code><p className="mt-2 text-xs text-slate-500">{presentation?.description ?? rule.description}</p><small className="mt-2 block text-slate-400" title={rule.ruleValue ? `원본 값: ${rule.ruleValue}` : undefined}>값 {learningRuleValueLabel(rule.ruleValue)} · 우선순위 {rule.priority}</small></div><div className="flex gap-2"><button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => void editRule(rule).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '규칙 수정 실패'))}>수정</button><button type="button" className={`rounded-lg px-3 py-2 text-xs font-bold ${rule.status === 'ENABLED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`} onClick={() => void adminApi.setLearningRuleEnabled(rule.ruleId, rule.status !== 'ENABLED').then(load)}>{rule.status === 'ENABLED' ? '활성' : '비활성'}</button></div></article> })}</div>
    </section>
  </div>
}

function RecommendationOperationPanel() {
  const [settings, setSettings] = useState<RecommendationSetting[]>([])
  const [experiments, setExperiments] = useState<ExperimentResult[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentResult | null>(null)
  const [analytics, setAnalytics] = useState<Record<string, unknown>>({})
  const [market, setMarket] = useState<MarketReport | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const [settingItems, experimentItems, analyticsData, marketData] = await Promise.all([adminApi.getRecommendationSettings(), adminApi.getExperimentResults(), adminApi.getAnalyticsDashboard(), adminApi.getMarketReport()])
    setSettings(settingItems); setExperiments(experimentItems); setAnalytics(analyticsData); setMarket(marketData)
  }, [])
  useEffect(() => { void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '추천·분석 데이터를 불러오지 못했습니다.')) }, [load])
  async function saveSettings() { await adminApi.updateRecommendationSettings(settings.map((setting) => ({ key: setting.settingKey, value: setting.settingValue }))); await load() }
  async function openExperiment(experimentId: string) {
    setSelectedExperiment(await adminApi.getExperimentResult(experimentId))
  }
  async function createExperiment(form: HTMLFormElement) {
    const data = new FormData(form)
    await adminApi.createExperiment({ experimentId: String(data.get('experimentId')).trim(), experimentName: String(data.get('experimentName')).trim(), hypothesis: String(data.get('hypothesis')).trim() })
    form.reset()
    await load()
  }
  async function changeExperimentStatus(status: ExperimentResult['status']) {
    if (!selectedExperiment) return
    setSelectedExperiment(await adminApi.changeExperimentStatus(selectedExperiment.experimentId, status))
    await load()
  }
  async function saveExperimentResult() {
    if (!selectedExperiment) return
    const metricsJson = window.prompt('검증된 실험 지표 JSON 객체', selectedExperiment.metricsJson)
    if (!metricsJson?.trim()) return
    setSelectedExperiment(await adminApi.saveExperimentResult(selectedExperiment.experimentId, metricsJson.trim()))
    await load()
  }
  const metricCards = Object.entries(analytics)
  const experimentMetrics = selectedExperiment ? parseMetricsJson(selectedExperiment.metricsJson) : {}

  return <div className="space-y-5">
    {error && <ErrorNotice message={error} />}
    <section className="admin-panel"><header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-fuchsia-50 text-fuchsia-600"><i className="fas fa-sliders-h" /></span><div><h3>추천 알고리즘 설정</h3><p>최근 활동과 기술 일치 가중치가 실제 추천 점수에 반영됩니다.</p></div></div><button type="button" className="admin-primary-action" onClick={() => void saveSettings().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '설정 저장 실패'))}>전체 저장</button></header><div className="grid gap-3 p-5 lg:grid-cols-2">{settings.map((setting, index) => <label key={setting.id} className="rounded-xl border border-slate-200 p-4"><span className="text-xs font-bold text-slate-600">{recommendationSettingLabels[setting.settingKey] ?? setting.settingKey}</span><code className="mt-1 block text-[11px] text-slate-400">{setting.settingKey}</code><input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2" value={setting.settingValue} onChange={(event) => setSettings((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, settingValue: event.target.value } : item))} /><small className="mt-2 block text-slate-400">{setting.description}</small></label>)}</div></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map(([key, value]) => <article key={key} className="admin-panel p-5"><p className="text-xs font-bold text-slate-500">{operationFieldLabel(key)}</p><strong className="mt-2 block text-xl">{formatValue(value)}</strong></article>)}</section>
    {market && <section className="admin-panel overflow-hidden"><header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-blue-50 text-blue-600"><i className="fas fa-chart-bar" /></span><div><h3>채용 시장 분석</h3><p>실제 공고와 JD 기술 태그 집계 결과입니다.</p></div></div><span className="admin-result-count">전체 {market.totalPostingCount}건</span></header><div className="grid gap-5 p-5 xl:grid-cols-3"><div><h4 className="text-sm font-bold text-slate-800">상위 기술</h4><div className="mt-3 space-y-2">{market.topSkills.map((item) => <div key={item.skillName} className="flex justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs"><strong>{item.skillName}</strong><span>{item.postingCount}건</span></div>)}</div></div><div><h4 className="text-sm font-bold text-slate-800">상위 직무</h4><div className="mt-3 space-y-2">{market.topJobRoles.map((item) => <div key={item.jobRole} className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs"><strong>{item.jobRole}</strong><span>{item.postingCount}건</span></div>)}</div></div><div><h4 className="text-sm font-bold text-slate-800">지역·경력 지표</h4><div className="mt-3 flex flex-wrap gap-2">{market.indicators.map((item) => <span key={`${item.type}-${item.label}`} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{operationValueLabel(item.type)} · {item.label} {item.postingCount}건</span>)}</div></div></div></section>}
    <section className="admin-panel overflow-hidden"><header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-cyan-50 text-cyan-600"><i className="fas fa-flask" /></span><div><h3>A/B 실험 수명주기</h3><p>내부에서는 상태와 검증 결과만 관리하며 외부 이벤트 수집은 자동 생성하지 않습니다.</p></div></div><span className="admin-result-count">{experiments.length}개</span></header><form className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void createExperiment(event.currentTarget).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '실험 생성 실패')) }}><input name="experimentId" required pattern="[A-Za-z0-9_-]+" placeholder="실험 ID" className="rounded-xl border border-slate-200 px-3 py-2" /><input name="experimentName" required placeholder="실험 이름" className="rounded-xl border border-slate-200 px-3 py-2" /><div className="flex gap-2"><input name="hypothesis" required placeholder="검증 가설" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2" /><button className="admin-primary-action" type="submit">생성</button></div></form><div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]"><div className="space-y-3">{experiments.map((experiment) => <button key={experiment.experimentId} type="button" className={`w-full rounded-xl border p-4 text-left ${selectedExperiment?.experimentId === experiment.experimentId ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white'}`} onClick={() => void openExperiment(experiment.experimentId).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '실험 상세 조회 실패'))}><strong className="block text-sm text-slate-900">{experiment.experimentName}</strong><small className="mt-1 block text-slate-500">{experiment.experimentId} · {operationValueLabel(experiment.status)} · {formatValue(experiment.createdAt)}</small></button>)}</div><aside className="rounded-xl bg-slate-50 p-4">{selectedExperiment ? <><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-slate-900">{selectedExperiment.experimentName}</h4><p className="mt-1 text-xs text-slate-500">{selectedExperiment.experimentId} · {operationValueLabel(selectedExperiment.status)}</p><p className="mt-2 text-xs text-slate-600">{selectedExperiment.hypothesis}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{selectedExperiment.status === 'DRAFT' && <button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" type="button" onClick={() => void changeExperimentStatus('RUNNING')}>시작</button>}{selectedExperiment.status === 'RUNNING' && <button className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700" type="button" onClick={() => void changeExperimentStatus('PAUSED')}>일시 중지</button>}{selectedExperiment.status === 'PAUSED' && <button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" type="button" onClick={() => void changeExperimentStatus('RUNNING')}>재개</button>}{(selectedExperiment.status === 'RUNNING' || selectedExperiment.status === 'PAUSED') && <><button className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700" type="button" onClick={() => void saveExperimentResult()}>결과 저장</button><button className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700" type="button" onClick={() => void changeExperimentStatus('COMPLETED')}>완료</button></>}</div><div className="mt-4 space-y-2">{Object.entries(experimentMetrics).map(([key, value]) => <div key={key} className="flex justify-between gap-4 rounded-lg bg-white px-3 py-2 text-xs"><span className="font-semibold text-slate-500">{key}</span><strong className="break-all text-right">{formatValue(value)}</strong></div>)}</div></> : <p className="text-sm text-slate-500">확인할 실험을 선택하세요.</p>}</aside></div></section>
  </div>
}

function NoticeOperationPanel() {
  const [notices, setNotices] = useState<PlatformNotice[]>([])
  const [error, setError] = useState('')
  const load = useCallback(async () => setNotices(await adminApi.getNotices()), [])
  useEffect(() => { void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '공지를 불러오지 못했습니다.')) }, [load])
  async function create(form: HTMLFormElement) { const data = new FormData(form); await adminApi.createNotice({ title: String(data.get('title')), content: String(data.get('content')), isPinned: data.get('isPinned') === 'on' }); form.reset(); await load() }
  async function edit(notice: PlatformNotice) { const title = window.prompt('공지 제목', notice.title); if (title === null) return; const content = window.prompt('공지 내용', notice.content); if (content === null) return; await adminApi.updateNotice(notice.id, { title, content, isPinned: notice.isPinned }); await load() }
  return <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">{error && <ErrorNotice message={error} />}<section className="admin-panel p-5"><h3 className="font-bold">새 플랫폼 공지</h3><form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void create(event.currentTarget).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '공지 등록 실패')) }}><input name="title" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5" placeholder="공지 제목" /><textarea name="content" required rows={8} className="w-full rounded-xl border border-slate-200 px-4 py-2.5" placeholder="공지 내용" /><label className="flex items-center gap-2 text-sm font-semibold"><input name="isPinned" type="checkbox" />상단 고정</label><button className="admin-primary-action w-full" type="submit">공지 등록</button></form></section><section className="admin-panel overflow-hidden"><header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-orange-50 text-orange-600"><i className="fas fa-bullhorn" /></span><div><h3>공지 목록</h3><p>등록 즉시 일반 사용자 공개 API에 노출됩니다.</p></div></div><span className="admin-result-count">{notices.length}개</span></header><div className="divide-y divide-slate-100">{notices.map((notice) => <article key={notice.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><strong>{notice.title}</strong>{notice.isPinned && <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">고정</span>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{notice.content}</p></div><div className="flex shrink-0 gap-2"><button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold" onClick={() => void edit(notice)}>수정</button><button type="button" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => { if (window.confirm('공지를 삭제할까요?')) void adminApi.deleteNotice(notice.id).then(load) }}>삭제</button></div></div></article>)}</div></section></div>
}

function PaymentOperationPanel() {
  const [refunds, setRefunds] = useState<AdminRefund[]>([])
  const [settlements, setSettlements] = useState<AdminSettlement[]>([])
  const [selectedRefund, setSelectedRefund] = useState<AdminRefund | null>(null)
  const [eligibility, setEligibility] = useState<SettlementEligibility | null>(null)
  const [selectedSettlement, setSelectedSettlement] = useState<AdminSettlement | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => { const [refundItems, settlementItems] = await Promise.all([adminApi.getRefunds(), adminApi.getSettlements()]); setRefunds(refundItems); setSettlements(settlementItems) }, [])
  useEffect(() => { void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '환불·정산 데이터를 불러오지 못했습니다.')) }, [load])
  async function openRefund(refundId: number) {
    const [refund, eligibilityResult] = await Promise.all([adminApi.getRefund(refundId), adminApi.getSettlementEligibility(refundId)])
    setSelectedRefund(refund)
    setEligibility(eligibilityResult)
  }
  async function openSettlement(settlementId: number) {
    setSelectedSettlement(await adminApi.getSettlement(settlementId))
  }
  async function processRefund(refundId: number, approved: boolean) { const reason = window.prompt(approved ? '환불 승인 사유' : '환불 반려 사유'); if (!reason) return; await adminApi.processRefund(refundId, approved, reason); await load(); await openRefund(refundId) }
  async function updateSettlement(settlementId: number, action: 'hold' | 'release' | 'complete') { const reason = action === 'complete' ? '' : window.prompt(action === 'hold' ? '보류 사유' : '보류 해제 사유'); if (action !== 'complete' && !reason) return; await adminApi.updateSettlementStatus(settlementId, action, reason ?? ''); await load(); await openSettlement(settlementId) }

  return <div className="space-y-5">
    {error && <ErrorNotice message={error} />}
    <section className="admin-panel admin-finance-panel overflow-hidden"><header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-rose-50 text-rose-600"><i className="fas fa-undo-alt" /></span><div><h3>환불 요청</h3><p>요청 당시 진도와 환불 기한을 조회한 뒤 처리합니다.</p></div></div><span className="admin-result-count">{refunds.length}건</span></header><div className="admin-table-scroll"><table className="admin-finance-table w-full min-w-[1040px]"><thead><tr><th>ID</th><th>학습자·강의</th><th>사유</th><th>금액</th><th>상태</th><th>처리</th></tr></thead><tbody>{refunds.map((refund) => <tr key={refund.id}><td>#{refund.id}</td><td>회원 #{refund.learnerId}<small className="block text-slate-400">강의 #{refund.courseId}</small></td><td className="admin-finance-reason">{refund.reason || '-'}</td><td className="admin-finance-amount">{refund.refundAmount.toLocaleString()}원</td><td className="admin-finance-status">{operationValueLabel(refund.status)}</td><td><div className="admin-finance-actions"><button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold" type="button" onClick={() => void openRefund(refund.id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '환불 상세 조회 실패'))}>상세</button>{refund.status === 'PENDING' && <><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" type="button" onClick={() => void processRefund(refund.id, true)}>승인</button><button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" type="button" onClick={() => void processRefund(refund.id, false)}>반려</button></>}</div></td></tr>)}</tbody></table></div>{selectedRefund && eligibility && <aside className="m-5 grid gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-5 sm:grid-cols-2 xl:grid-cols-4"><div><small>환불 요청</small><strong className="block">#{selectedRefund.id} · {operationValueLabel(selectedRefund.status)}</strong></div><div><small>수강 진도</small><strong className="block">{eligibility.progressPercent}% · {eligibility.progressEligible ? '기준 충족' : '기준 초과'}</strong></div><div><small>환불 기한</small><strong className="block">{eligibility.remainingDays}일 남음 · {eligibility.withinRefundPeriod ? '기간 내' : '기간 만료'}</strong></div><div><small>승인 가능</small><strong className={`block ${eligibility.refundApprovable ? 'text-emerald-700' : 'text-rose-700'}`}>{eligibility.refundApprovable ? '가능' : '불가'}</strong></div><div><small>후보 정산</small><strong className="block">#{eligibility.candidateSettlementId ?? '-'} · {eligibility.candidateSettlementAmount.toLocaleString()}원</strong></div><div><small>정산 보류</small><strong className="block">{eligibility.holdBlocked ? '보류로 차감 불가' : '차감 가능'}</strong></div><div className="sm:col-span-2"><small>요청 사유</small><p className="mt-1 text-sm text-slate-700">{selectedRefund.reason || '-'}</p></div></aside>}</section>
    <section className="admin-panel admin-finance-panel overflow-hidden"><header className="admin-panel-header"><div className="admin-panel-heading"><span className="admin-panel-icon bg-emerald-50 text-emerald-600"><i className="fas fa-coins" /></span><div><h3>정산 관리</h3><p>수강 등록에서 생성된 정산의 상세 금액과 상태를 관리합니다.</p></div></div><span className="admin-result-count">{settlements.length}건</span></header><div className="admin-table-scroll"><table className="admin-finance-table w-full min-w-[1120px]"><thead><tr><th>ID</th><th>강사·학습자</th><th>강의</th><th>총액</th><th>수수료</th><th>정산액</th><th>상태</th><th>처리</th></tr></thead><tbody>{settlements.map((settlement) => <tr key={settlement.settlementId}><td>#{settlement.settlementId}</td><td>강사 #{settlement.instructorId}<small className="block text-slate-400">학습자 #{settlement.learnerId ?? '-'}</small></td><td>#{settlement.courseId}</td><td className="admin-finance-amount">{settlement.grossAmount.toLocaleString()}원</td><td className="admin-finance-amount">{settlement.feeAmount.toLocaleString()}원</td><td className="admin-finance-amount">{settlement.amount.toLocaleString()}원</td><td className="admin-finance-status">{operationValueLabel(settlement.status)}</td><td><div className="admin-finance-actions"><button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold" type="button" onClick={() => void openSettlement(settlement.settlementId).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '정산 상세 조회 실패'))}>상세</button>{settlement.status === 'PENDING' && <><button className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700" type="button" onClick={() => void updateSettlement(settlement.settlementId, 'hold')}>보류</button><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" type="button" onClick={() => void updateSettlement(settlement.settlementId, 'complete')}>완료</button></>}{settlement.status === 'HELD' && <button className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700" type="button" onClick={() => void updateSettlement(settlement.settlementId, 'release')}>보류 해제</button>}</div></td></tr>)}</tbody></table></div>{selectedSettlement && <aside className="m-5 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 sm:grid-cols-2 xl:grid-cols-5"><div><small>정산 ID</small><strong className="block">#{selectedSettlement.settlementId}</strong></div><div><small>상태</small><strong className="block">{operationValueLabel(selectedSettlement.status)}</strong></div><div><small>결제 총액</small><strong className="block">{selectedSettlement.grossAmount.toLocaleString()}원</strong></div><div><small>플랫폼 수수료</small><strong className="block">{selectedSettlement.feeAmount.toLocaleString()}원</strong></div><div><small>강사 정산액</small><strong className="block">{selectedSettlement.amount.toLocaleString()}원</strong></div><div className="sm:col-span-2"><small>결제 시각</small><strong className="block">{formatValue(selectedSettlement.purchasedAt)}</strong></div><div className="sm:col-span-2"><small>정산 완료 시각</small><strong className="block">{formatValue(selectedSettlement.settledAt)}</strong></div></aside>}</section>
  </div>
}

export default function AdminOperationsView() {
  const [activeTab, setActiveTab] = useState<OperationTab>('jobs')
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    const handleAdminTabChange = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === 'operations') setActivated(true)
    }
    window.addEventListener('devpath:admin-tab-change', handleAdminTabChange)
    return () => window.removeEventListener('devpath:admin-tab-change', handleAdminTabChange)
  }, [])

  return (
    <div id="view-operations" className="admin-operations-view view-section hidden space-y-5">
      <div className="admin-operation-tabs admin-panel flex gap-2 p-3">{operationTabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`admin-operation-tab ${activeTab === tab.key ? 'is-active' : ''}`}><i className={`fas ${tab.icon}`} />{tab.label}</button>)}</div>
      {activated && activeTab === 'jobs' && <JobsOperationPanel />}
      {activated && activeTab === 'learning' && <LearningOperationPanel />}
      {activated && activeTab === 'recommendation' && <RecommendationOperationPanel />}
      {activated && activeTab === 'notices' && <NoticeOperationPanel />}
      {activated && activeTab === 'payments' && <PaymentOperationPanel />}
    </div>
  )
}
