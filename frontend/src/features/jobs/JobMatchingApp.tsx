import { useEffect,useMemo,useState } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import AuthModal,{ type AuthView } from '../../components/AuthModal'
import LoginRequiredView from '../../components/LoginRequiredView'
import SiteHeader from '../../components/SiteHeader'
import { authApi, userApi } from '../../lib/api/auth'
import { AUTH_SESSION_SYNC_EVENT,clearStoredAuthSession,getPostLoginRedirect,readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import { useInternalPageScroll } from '../../lib/useInternalPageScroll'
import { projectApiRequest } from '../project/api'
import { type ActivityProfile,buildQuery,type CareerFilter,careerOptions,clearJobMatchingSnapshot,extractStretchJobs,filterDbJobs,type GeminiAnalysis,initials,type JobkoreaResult,type JobMatchingSnapshot,type LoadingStep,loadJobMatchingSnapshot,mapJobkoreaPosting,mapRecommendedJob,type MatchingJob,optionOf,type RecommendedJob,type RegionFilter,regionOptions,type RoleFilter,roleOptions,saveJobMatchingSnapshot,type SkillSuggestionResult,sortJobs,STEP_MESSAGES,toDisplayDate,type UserProfile } from './job-matching-model'


export default function JobMatchingApp() {
  useInternalPageScroll()

  const [session, setSession] = useState(() => readStoredAuthSession())
  // 탭 세션에 보존된 이전 분석 결과 (현재 로그인 계정과 일치할 때만 복원)
  const [snapshot] = useState<JobMatchingSnapshot | null>(() => loadJobMatchingSnapshot(session?.userId ?? null))
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(() => snapshot?.roleFilter ?? 'all')
  const [regionFilter, setRegionFilter] = useState<RegionFilter>(() => snapshot?.regionFilter ?? 'all')
  const [careerFilter, setCareerFilter] = useState<CareerFilter>(() => snapshot?.careerFilter ?? 'all')
  const [highMatchOnly, setHighMatchOnly] = useState(() => snapshot?.highMatchOnly ?? false)
  const [loading, setLoading] = useState(false)
  const [scanned, setScanned] = useState(() => snapshot?.scanned ?? false)
  const [jobs, setJobs] = useState<MatchingJob[]>(() => snapshot?.jobs ?? [])
  const [stretchJobs, setStretchJobs] = useState<MatchingJob[]>(() => snapshot?.stretchJobs ?? [])
  const [sourceWarnings, setSourceWarnings] = useState<string[]>(() => snapshot?.sourceWarnings ?? [])
  const [jobkoreaAttribution, setJobkoreaAttribution] = useState<JobkoreaResult['attribution']>(() => snapshot?.jobkoreaAttribution ?? null)
  const [activityProfile, setActivityProfile] = useState<ActivityProfile | null>(null)
  const [geminiMode, setGeminiMode] = useState(() => snapshot?.geminiMode ?? false)
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [pageSize, setPageSize] = useState(() => snapshot?.pageSize ?? 20)
  const [skillLoading, setSkillLoading] = useState<string | null>(null)
  const [skillSuggestion, setSkillSuggestion] = useState<SkillSuggestionResult | null>(null)
  const [skillApplying, setSkillApplying] = useState(false)

  const role = useMemo(() => optionOf(roleOptions, roleFilter), [roleFilter])
  const visibleJobs = useMemo(
    () => jobs.filter((job) => !highMatchOnly || job.matchScore >= 70),
    [highMatchOnly, jobs],
  )
  const averageProofCardScore = activityProfile?.averageProofCardScore ?? null
  const displayedSkills = activityProfile?.skillSignals.length
    ? activityProfile.skillSignals.slice(0, 8)
    : role.skills

  const currentLoadingMessage = loadingStep
    ? (STEP_MESSAGES[loadingStep][loadingMsgIdx] ?? STEP_MESSAGES[loadingStep][0])
    : '분석 중입니다...'

  useEffect(() => {
    document.title = 'DevPath - AI 채용 매칭'
  }, [])

  useEffect(() => {
    if (!loadingStep) return
    setLoadingMsgIdx(0)
    const msgs = STEP_MESSAGES[loadingStep]
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % msgs.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [loadingStep])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setActivityProfile(null)
      return
    }

    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((nextProfile) => {
        setProfile(nextProfile)
      })
      .catch(() => {
        setProfile(null)
      })

    return () => {
      controller.abort()
    }
  }, [session])

  useEffect(() => {
    if (!session) return

    projectApiRequest<ActivityProfile>('/api/jobs/activity-profile/me', {}, 'required')
      .then((data) => setActivityProfile(data))
      .catch(() => setActivityProfile(null))
  }, [session])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  // 분석 결과/필터를 탭 세션에 저장해 페이지 이동 후 복귀 시 복원되도록 한다.
  useEffect(() => {
    if (!scanned) return

    saveJobMatchingSnapshot({
      userId: session?.userId ?? null,
      roleFilter,
      regionFilter,
      careerFilter,
      highMatchOnly,
      jobs,
      stretchJobs,
      scanned,
      geminiMode,
      sourceWarnings,
      jobkoreaAttribution,
      pageSize,
    })
  }, [
    session,
    roleFilter,
    regionFilter,
    careerFilter,
    highMatchOnly,
    jobs,
    stretchJobs,
    scanned,
    geminiMode,
    sourceWarnings,
    jobkoreaAttribution,
    pageSize,
  ])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // 서버 로그아웃 실패와 관계없이 브라우저 세션은 정리한다.
    } finally {
      clearStoredAuthSession()
      clearJobMatchingSnapshot()
      setSession(null)
      setProfile(null)
      setActivityProfile(null)
    }
  }

  function openAuthModal(message?: string) {
    if (message) {
      showAuthToast({ message, durationMs: 2200 })
    }

    setAuthView('login')
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN' || nextSession?.role === 'ROLE_INSTRUCTOR') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
  }

  async function scanJobs(size = pageSize) {
    if (!session) {
      openAuthModal('AI 맞춤 공고 스캔하기는 로그인 후 이용할 수 있습니다.')
      return
    }

    const selectedRole = optionOf(roleOptions, roleFilter)
    const selectedRegion = optionOf(regionOptions, regionFilter)
    const selectedCareer = optionOf(careerOptions, careerFilter)

    setLoading(true)
    setSourceWarnings([])
    setGeminiMode(false)
    setStretchJobs([])

    try {
      // ── Gemini 시도 ──
      // jobkorea 단계 표시 후 2초 뒤 gemini 단계로 자동 전환 (백엔드 내부 JobKorea 호출 흐름 반영)
      setLoadingStep('jobkorea')
      const stepTimer = setTimeout(() => setLoadingStep('gemini'), 2000)

      let geminiSuccess = false
      try {
        const geminiQuery = buildQuery({
          keyword: selectedRole.keyword,
          industryCode: selectedRole.industryCode,
          areaCode: selectedRegion.areaCode,
          jobCode: selectedRole.jobCode,
        })
        const analysis = await projectApiRequest<GeminiAnalysis>(
          `/api/jobs/gemini-recommendations/me${geminiQuery}`,
          {},
          'required',
        )
        clearTimeout(stepTimer)
        setLoadingStep('finishing')

        const geminiJobs: MatchingJob[] = analysis.recommendations.map((rec, i) => ({
          id: `gemini-${rec.externalId ?? i}`,
          source: 'jobkorea',
          title: rec.title ?? '채용공고',
          companyName: rec.companyName ?? '기업명 미공개',
          regionLabel: rec.areaCode ?? selectedRegion.label,
          careerLabel: rec.careerCode ?? '상세 조건 확인',
          skills: rec.keywords ?? [],
          url: rec.jobkoreaUrl,
          deadline: rec.deadline,
          createdAt: rec.postedDate,
          matchScore: rec.aiMatchScore,
          matchedReasons: rec.aiReason ? [rec.aiReason] : ['AI 매칭 완료'],
          missingSkills: [],
          aiAnalyzed: true,
        }))

        setJobs(geminiJobs.slice(0, 7))
        setGeminiMode(true)
        geminiSuccess = true

        // Gemini가 직접 선별한 성장 공고 (missingSkills 포함)
        const geminiStretch: MatchingJob[] = (analysis.stretchRecommendations ?? []).map((rec, i) => ({
          id: `gemini-stretch-${rec.externalId ?? i}`,
          source: 'jobkorea' as const,
          title: rec.title ?? '채용공고',
          companyName: rec.companyName ?? '기업명 미공개',
          regionLabel: rec.areaCode ?? selectedRegion.label,
          careerLabel: rec.careerCode ?? '상세 조건 확인',
          skills: rec.keywords ?? [],
          url: rec.jobkoreaUrl,
          deadline: rec.deadline,
          createdAt: rec.postedDate,
          matchScore: rec.aiMatchScore,
          matchedReasons: rec.aiReason ? [rec.aiReason] : ['AI 분석 완료'],
          missingSkills: rec.missingSkills ?? [],
          aiAnalyzed: true,
          isStretch: true,
        }))
        setStretchJobs(geminiStretch)

      } catch {
        clearTimeout(stepTimer)
      }

      // ── Fallback: 기존 rule-based 로직 ──
      if (!geminiSuccess) {
        setLoadingStep('fallback')
        const warnings: string[] = ['Gemini AI 분석에 실패했습니다. 기본 매칭으로 전환합니다.']

        const jobkoreaQuery = buildQuery({
          size,
          page: 1,
          order: 1,
          // 직종 소분류(jobCode)가 있으면 다단어 키워드 AND 매칭으로 결과가 0이 되는 것을 막기 위해 키워드 생략
          keyword: selectedRole.jobCode ? undefined : selectedRole.keyword,
          industryCode: selectedRole.industryCode ?? '10031',
          jobCode: selectedRole.jobCode,
          areaCode: selectedRegion.areaCode,
          starter: selectedCareer.value === 'intern',
        })

        const [dbResult, jobkoreaResult] = await Promise.allSettled([
          projectApiRequest<RecommendedJob[]>('/api/jobs/recommendations/me', {}, 'required'),
          projectApiRequest<JobkoreaResult>(`/api/jobs/jobkorea${jobkoreaQuery}`),
        ])

        const nextJobs: MatchingJob[] = []

        if (dbResult.status === 'fulfilled') {
          nextJobs.push(
            ...filterDbJobs(dbResult.value, selectedRole, selectedRegion, selectedCareer).map(
              (job) => mapRecommendedJob(job, selectedRole, selectedRegion, selectedCareer),
            ),
          )
        } else {
          warnings.push('DevPath DB 채용공고를 불러오지 못했습니다.')
        }

        if (jobkoreaResult.status === 'fulfilled') {
          setJobkoreaAttribution(jobkoreaResult.value.attribution ?? null)
          nextJobs.push(
            ...(jobkoreaResult.value.items ?? []).map((posting, index) =>
              mapJobkoreaPosting(posting, index, selectedRole, selectedRegion, selectedCareer),
            ),
          )
        } else {
          warnings.push('잡코리아 실시간 공고를 불러오지 못했습니다.')
        }

        const uniqueJobs = Array.from(
          new Map(sortJobs(nextJobs).map((job) => [job.id, job])).values(),
        )
        const stretch = extractStretchJobs(uniqueJobs)
        const stretchIds = new Set(stretch.map((j) => j.id))
        const matched = uniqueJobs.filter((j) => !stretchIds.has(j.id)).slice(0, 7)
        setJobs(matched)
        setStretchJobs(stretch)
        setSourceWarnings(warnings)
        setGeminiMode(false)
      }

      setScanned(true)
    } finally {
      setLoadingStep(null)
      setLoading(false)
    }
  }

  async function handleMissingSkill(skill: string, jobTitle?: string) {
    if (!session) {
      openAuthModal('역량 로드맵 추가는 로그인 후 이용할 수 있습니다.')
      return
    }
    if (skillLoading) return

    setSkillLoading(skill)
    showAuthToast({ message: 'AI가 내 로드맵을 분석하고 있어요...', durationMs: 1800 })
    try {
      const result = await projectApiRequest<SkillSuggestionResult>(
        '/api/jobs/skill-suggestions',
        { method: 'POST', body: JSON.stringify({ skill, jobTitle: jobTitle ?? null }) },
        'required',
      )

      if (result.mode === 'CREATED') {
        // 학습 중인 로드맵이 없어 기술 로드맵을 새로 생성한 경우 → 바로 이동
        showAuthToast({ message: `'${skill}' 학습 로드맵을 새로 만들었어요.`, durationMs: 2000 })
        navigateTo(result.redirectUrl)
        return
      }

      // 기존 로드맵에 노드 추가 제안 → 확인 모달
      setSkillSuggestion(result)
    } catch (error) {
      showAuthToast({
        message: error instanceof Error ? error.message : '로드맵 연동에 실패했습니다.',
        durationMs: 2200,
      })
    } finally {
      setSkillLoading(null)
    }
  }

  async function applySkillSuggestion() {
    if (!skillSuggestion?.changeId || skillApplying) return

    setSkillApplying(true)
    try {
      await projectApiRequest(
        `/api/me/recommendation-changes/${skillSuggestion.changeId}/apply`,
        { method: 'POST' },
        'required',
      )
      showAuthToast({ message: '로드맵에 학습 노드를 추가했어요.', durationMs: 1500 })
      navigateTo(skillSuggestion.redirectUrl)
    } catch (error) {
      showAuthToast({
        message: error instanceof Error ? error.message : '노드 추가에 실패했습니다.',
        durationMs: 2200,
      })
      setSkillApplying(false)
    }
  }

  function dismissSkillSuggestion() {
    // 거절 시 생성된 pending 추천은 무시 처리(실패해도 모달은 닫는다)
    if (skillSuggestion?.changeId) {
      void projectApiRequest(
        `/api/me/recommendation-changes/${skillSuggestion.changeId}/ignore`,
        { method: 'POST' },
        'required',
      ).catch(() => {})
    }
    setSkillSuggestion(null)
  }

  function openJob(job: MatchingJob) {
    if (job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer')
    }
  }

  function loadMore() {
    const nextSize = pageSize + 20
    setPageSize(nextSize)
    void scanJobs(nextSize)
  }

  const displayName = profile?.nickname ?? profile?.name ?? session?.name ?? '-'
  const profileImage = profile?.profileImage
  const activityProjectLabel = activityProfile ? `${activityProfile.projectCount}개` : '-'
  const proofCardLabel = activityProfile ? `${activityProfile.proofCardCount}개` : '-'
  const proofScoreLabel =
    activityProfile && averageProofCardScore != null ? `${averageProofCardScore}점` : '-'

  if (!session) return <LoginRequiredView />

  return (
    <>
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal()}
        activeNavHref="/job-matching"
      />

      <main className="app-main min-h-screen bg-gray-50 text-gray-800">
        <div className="job-matching-page max-w-7xl mx-auto px-6 py-10 font-['Pretendard',sans-serif] text-[16px] leading-[24px] [&_.text-sm]:text-[14px] [&_.text-sm]:leading-[20px] [&_.text-xs]:text-[12px] [&_.text-xs]:leading-[16px] [&_button]:font-['Pretendard',sans-serif]! [&_button]:text-[14px]! [&_button]:leading-[20px]! [&_input]:font-['Pretendard',sans-serif]! [&_input]:text-[14px]! [&_input]:leading-[20px]! [&_select]:font-['Pretendard',sans-serif]! [&_select]:text-[14px]! [&_select]:leading-[1.2]! [&_textarea]:font-['Pretendard',sans-serif]! [&_textarea]:text-[14px]! [&_textarea]:leading-[20px]!">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">학습 기반 자동 매칭</h1>
            <p className="text-sm text-gray-500 mt-1">DevPath에서 증명한 스킬과 채용공고 데이터를 분석하여 가장 적합한 기업을 찾아줍니다.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-1/3 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">내 분석 프로필</h2>
                  <span className="text-[10px] leading-[14px] bg-green-100 text-primary px-2 py-1 rounded font-bold">실시간 데이터</span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-2">분석 기준 데이터</div>
                  <ul className="space-y-2">
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium"><i className="fas fa-id-card text-primary mr-2"></i>Proof Card</span>
                      <span className="font-bold truncate max-w-[160px]">{proofCardLabel}</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium"><i className="fas fa-folder-open text-blue-500 mr-2"></i>Project</span>
                      <span className="font-bold">{activityProjectLabel}</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium"><i className="fas fa-chart-line text-gray-400 mr-2"></i>평균 점수</span>
                      <span className="font-bold text-primary">{proofScoreLabel}</span>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <div className="text-xs text-gray-500 mb-2">추출된 핵심 키워드</div>
                  <div className="flex flex-wrap gap-2">
                    {displayedSkills.map((skill, index) => (
                      <span
                        key={skill}
                        className={index < 3
                          ? 'px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs font-bold'
                          : 'px-2 py-1 bg-gray-100 text-gray-500 border border-gray-200 rounded text-xs'}
                      >
                        {skill}{index === 0 ? ' (우수)' : ''}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-sm mb-4">매칭 필터</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">희망 직무</label>
                    <select
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                      className="w-full appearance-none border border-gray-300 rounded text-sm bg-white bg-no-repeat [background-image:url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2024%2024%27%20stroke=%27%239CA3AF%27%3E%3Cpath%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27M19%209l-7%207-7-7%27%3E%3C/path%3E%3C/svg%3E')] [background-position:right_12px_center] [background-size:14px] pt-[8px]! pr-[36px]! pb-[8px]! pl-[12px]! leading-[1.2]! focus:outline-none focus:border-primary"
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">희망 지역</label>
                    <select
                      value={regionFilter}
                      onChange={(event) => setRegionFilter(event.target.value as RegionFilter)}
                      className="w-full appearance-none border border-gray-300 rounded text-sm bg-white bg-no-repeat [background-image:url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2024%2024%27%20stroke=%27%239CA3AF%27%3E%3Cpath%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27M19%209l-7%207-7-7%27%3E%3C/path%3E%3C/svg%3E')] [background-position:right_12px_center] [background-size:14px] pt-[8px]! pr-[36px]! pb-[8px]! pl-[12px]! leading-[1.2]! focus:outline-none focus:border-primary"
                    >
                      {regionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">경력 구분</label>
                    <select
                      value={careerFilter}
                      onChange={(event) => setCareerFilter(event.target.value as CareerFilter)}
                      className="w-full appearance-none border border-gray-300 rounded text-sm bg-white bg-no-repeat [background-image:url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2024%2024%27%20stroke=%27%239CA3AF%27%3E%3Cpath%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27M19%209l-7%207-7-7%27%3E%3C/path%3E%3C/svg%3E')] [background-position:right_12px_center] [background-size:14px] pt-[8px]! pr-[36px]! pb-[8px]! pl-[12px]! leading-[1.2]! focus:outline-none focus:border-primary"
                    >
                      {careerOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="match-high"
                      checked={highMatchOnly}
                      onChange={(event) => setHighMatchOnly(event.target.checked)}
                      className="accent-primary w-4 h-4"
                    />
                    <label htmlFor="match-high" className="text-sm text-gray-700 font-medium cursor-pointer">매칭률 70% 이상만 보기</label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scanJobs()}
                  className="w-full mt-6 bg-primary hover:bg-green-600 text-white py-3 rounded-lg font-bold text-sm transition shadow-lg shadow-green-500/20 flex justify-center items-center gap-2"
                >
                  <i className="fas fa-magic"></i> AI 맞춤 공고 스캔하기
                </button>
              </div>
            </aside>

            <section className="flex-1" id="main-content-area">
              {!scanned ? (
                <div id="empty-state" className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-search text-gray-300 text-2xl"></i>
                  </div>
                  <h3 className="text-base font-bold text-gray-500">맞춤 공고가 아직 분석되지 않았습니다</h3>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    좌측의 매칭 필터를 설정한 후 <br /><strong className="text-primary">AI 맞춤 공고 스캔하기</strong> 버튼을 눌러주세요.
                  </p>
                </div>
              ) : (
                <div id="job-results" className="space-y-4">
                  <div className={`border rounded-xl p-4 mb-6 flex justify-between items-center ${geminiMode ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div>
                      <span className={`text-sm ${geminiMode ? 'text-purple-800' : 'text-blue-800'}`}>
                        {geminiMode
                          ? <><i className="fas fa-robot mr-1"></i>Gemini AI가 {displayName}님의 프로필을 분석하여</>
                          : `${displayName}님의 조건과 채용 데이터를 분석하여`}
                      </span>
                      <div className="font-bold text-lg text-gray-900">
                        총 <span className={geminiMode ? 'text-purple-600' : 'text-blue-600'}>{visibleJobs.length}건</span>의 매칭 공고
                        {stretchJobs.length > 0 && (
                          <span className="text-gray-400 font-normal text-base"> · <span className="text-amber-500 font-bold">{stretchJobs.length}건</span>의 성장 공고</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <span className="text-xs text-gray-500">평균 점수</span>
                      <div className="text-2xl font-bold text-primary">{proofScoreLabel}</div>
                    </div>
                  </div>

                  {sourceWarnings.length > 0 ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
                      {sourceWarnings.map((warning) => (
                        <p key={warning}><i className="fas fa-triangle-exclamation mr-2"></i>{warning}</p>
                      ))}
                    </div>
                  ) : null}

                  {visibleJobs.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                      <i className="fas fa-briefcase text-3xl text-gray-300 mb-3"></i>
                      <h3 className="text-base font-bold text-gray-600">조건에 맞는 채용공고가 없습니다</h3>
                      <p className="text-sm text-gray-400 mt-2">필터를 넓히거나 매칭률 조건을 해제해 주세요.</p>
                    </div>
                  ) : (
                    visibleJobs.map((job, index) => (
                      <article
                        key={job.id}
                        className={index === 0
                          ? 'bg-white border-2 border-primary/20 rounded-xl p-6 hover:shadow-lg transition cursor-pointer relative group'
                          : 'bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition cursor-pointer relative group'}
                        onClick={() => openJob(job)}
                      >
                        <div className={index === 0
                          ? `absolute top-4 right-4 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm ${job.aiAnalyzed ? 'bg-purple-600' : 'bg-primary'}`
                          : `absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full ${job.aiAnalyzed ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {job.aiAnalyzed
                            ? `AI 추천 ${job.matchScore}점${index === 0 ? ' ✦' : ''}`
                            : `${job.matchScore}% 일치${index === 0 ? ' (강력 추천)' : ''}`}
                        </div>

                        <div className="flex items-start gap-4 mb-4 pr-24">
                          <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center font-bold text-gray-400 shrink-0">{initials(job.companyName)}</div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition">{job.title}</h3>
                            <p className="text-sm text-gray-500 font-bold">{job.companyName} · {job.regionLabel}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <p className="text-xs text-gray-500 mb-2 font-bold">
                            {job.aiAnalyzed ? '🤖 AI 추천 이유' : '🎯 매칭 포인트 (Why?)'}
                          </p>
                          <div className="space-y-2">
                            {job.matchedReasons.map((reason) => (
                              <div key={reason} className="job-matching-reason-row flex justify-between items-center text-left text-xs">
                                <span className="min-w-0 [flex:1_1_auto] pr-[12px] text-gray-700"><i className="fas fa-check text-primary mr-1"></i> {reason}</span>
                                <span className="ml-auto shrink-0 whitespace-nowrap text-right text-primary font-bold">검증 완료</span>
                              </div>
                            ))}
                            {job.missingSkills.map((skill) => (
                              <div
                                key={skill}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleMissingSkill(skill, job.title)
                                }}
                                className="job-matching-missing-skill group/add flex min-h-[32px] justify-between items-center text-left text-[12px] leading-[16px] opacity-50 hover:opacity-100 cursor-pointer hover:bg-red-50 p-[8px]! mx-[-8px]! rounded-lg transition-all border border-transparent hover:border-red-100 [&_i]:text-[12px] [&_i]:leading-none"
                              >
                                <span className="min-w-0 [flex:1_1_auto] pr-[12px] text-gray-500 group-hover/add:text-red-600 transition"><i className="fas fa-exclamation-circle mr-1"></i> {skill} 경험 부족</span>
                                <span className="ml-auto shrink-0 whitespace-nowrap text-right font-bold text-red-400 group-hover/add:hidden">미충족</span>
                                <span className="ml-auto shrink-0 whitespace-nowrap text-right font-bold text-red-600 hidden group-hover/add:inline-block">관련 로드맵 추가하기 <i className="fas fa-plus ml-1"></i></span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] leading-[14px] text-gray-500">
                          <span className="border px-2 py-1 rounded">{job.source === 'jobkorea' ? '잡코리아' : 'DevPath DB'}</span>
                          <span className="border px-2 py-1 rounded">{job.careerLabel}</span>
                          <span className="border px-2 py-1 rounded">마감 {toDisplayDate(job.deadline)}</span>
                          {job.skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="border px-2 py-1 rounded">{skill}</span>
                          ))}
                        </div>
                      </article>
                    ))
                  )}

                  {visibleJobs.length > 0 && !geminiMode ? (
                    <button
                      type="button"
                      onClick={loadMore}
                      className="w-full mt-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-600 font-bold text-sm hover:bg-gray-50"
                    >
                      결과 더보기
                    </button>
                  ) : null}

                  {stretchJobs.length > 0 && (
                    <div className="mt-10">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">📈 성장 공고</span>
                        <p className="text-sm text-gray-500">몇 가지 스킬을 보완하면 지원해 볼 수 있는 공고예요</p>
                      </div>
                      <div className="space-y-4">
                        {stretchJobs.map((job) => (
                          <article
                            key={job.id}
                            className="bg-white border-2 border-amber-200 rounded-xl p-6 hover:shadow-md transition cursor-pointer relative group"
                            onClick={() => openJob(job)}
                          >
                            <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              {job.missingSkills.length}개 스킬 보완 필요
                            </div>

                            <div className="flex items-start gap-4 mb-4 pr-32">
                              <div className="w-12 h-12 bg-amber-50 rounded border border-amber-100 flex items-center justify-center font-bold text-amber-400 shrink-0">{initials(job.companyName)}</div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-amber-600 transition">{job.title}</h3>
                                <p className="text-sm text-gray-500 font-bold">{job.companyName} · {job.regionLabel}</p>
                              </div>
                            </div>

                            <div className="bg-amber-50 rounded-lg p-3 mb-4 border border-amber-100">
                              <p className="text-xs text-amber-700 mb-2 font-bold">🎯 지금 배우면 지원 가능해요</p>
                              <div className="space-y-2">
                                {job.matchedReasons.map((reason) => (
                                  <div key={reason} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600"><i className="fas fa-check text-green-500 mr-1"></i> {reason}</span>
                                    <span className="text-green-600 font-bold">보유</span>
                                  </div>
                                ))}
                                {job.missingSkills.map((skill) => (
                                  <div
                                    key={skill}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleMissingSkill(skill, job.title)
                                    }}
                                    className="flex justify-between items-center text-xs bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 p-2 rounded-lg cursor-pointer transition-all group/skill"
                                  >
                                    <span className="text-amber-700 font-bold"><i className="fas fa-book-open mr-1"></i> {skill}</span>
                                    <span className="text-amber-500 group-hover/skill:text-amber-700 font-bold transition">로드맵에서 학습하기 <i className="fas fa-arrow-right ml-1"></i></span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 text-[10px] leading-[14px] text-gray-500">
                              <span className="border px-2 py-1 rounded">{job.source === 'jobkorea' ? '잡코리아' : 'DevPath DB'}</span>
                              <span className="border px-2 py-1 rounded">{job.careerLabel}</span>
                              <span className="border px-2 py-1 rounded">마감 {toDisplayDate(job.deadline)}</span>
                              {job.skills.slice(0, 4).map((skill) => (
                                <span key={skill} className="border px-2 py-1 rounded">{skill}</span>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  {jobkoreaAttribution ? (
                    <p className="text-[11px] leading-[16px] text-gray-400 pt-2">
                      <a
                        href={jobkoreaAttribution.url ?? 'https://www.jobkorea.co.kr'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-primary hover:underline"
                      >
                        {jobkoreaAttribution.label ?? '잡코리아 채용정보 바로가기'}
                      </a>
                      {' '}· {jobkoreaAttribution.notice ?? '상세 채용정보는 원문에서 확인해 주세요.'}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <div className={`job-matching-loader fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[rgba(30,41,59,0.4)] font-['Pretendard',sans-serif] text-[16px] leading-[24px] backdrop-blur-[10px] transition-[opacity,visibility] duration-[400ms] ease-[ease] ${loading ? 'active visible pointer-events-auto opacity-100' : 'invisible pointer-events-none opacity-0'}`}>
        <div className="smooth-spinner mb-[24px] h-[50px] w-[50px] rounded-[50%] border-[3px] border-[rgba(0,196,113,0.15)] border-t-[#00C471] [box-shadow:0_0_15px_rgba(0,196,113,0.2)] [animation:spin_1s_cubic-bezier(0.4,0,0.2,1)_infinite]"></div>
        <div className="text-center">
          <h2 className="text-white text-lg font-bold mb-2 drop-shadow-md tracking-wide">DevPath AI</h2>
          <p className="text-green-400 text-sm font-bold h-5 drop-shadow-md pulse-text [animation:pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">{currentLoadingMessage}</p>
        </div>
        <div className="absolute bottom-8 left-8 text-[11px] text-green-400/40 font-mono space-y-1">
          <p>&gt; applying preference filters...</p>
          <p>&gt; calculating fit scores based on JD...</p>
        </div>
      </div>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}

      {skillSuggestion ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                {skillSuggestion.branchType === 'REVIEW' ? '복습 노드' : '심화 노드'} 추천
              </span>
            </div>

            <h3 className="mb-3 text-lg font-bold text-gray-900">
              학습 중인 로드맵에 노드를 추가할까요?
            </h3>

            <div className="mb-5 space-y-3 rounded-xl bg-gray-50 p-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="w-16 shrink-0 font-bold text-gray-500">로드맵</span>
                <span className="font-bold text-gray-900">{skillSuggestion.roadmapTitle}</span>
              </div>
              {skillSuggestion.anchorNodeTitle ? (
                <div className="flex items-start gap-2">
                  <span className="w-16 shrink-0 font-bold text-gray-500">삽입 위치</span>
                  <span className="text-gray-700">
                    '{skillSuggestion.anchorNodeTitle}' 노드 바로 뒤
                  </span>
                </div>
              ) : null}
              <div className="flex items-start gap-2">
                <span className="w-16 shrink-0 font-bold text-gray-500">추가 노드</span>
                <span className="font-bold text-primary">{skillSuggestion.newNodeTitle}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={dismissSkillSuggestion}
                disabled={skillApplying}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                거절
              </button>
              <button
                type="button"
                onClick={() => void applySkillSuggestion()}
                disabled={skillApplying}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {skillApplying ? '추가 중...' : '수락하고 추가'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
