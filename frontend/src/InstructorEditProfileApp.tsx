import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import LoginRequiredGate from './components/LoginRequiredView'
import SiteHeader from './components/SiteHeader'
import UserAvatar from './components/UserAvatar'
import {
  buildMyInstructorProfileHref,
  defaultInstructorBannerImageUrl,
  fallbackInstructorAchievements,
  fallbackInstructorCareers,
  fallbackInstructorNotices,
  readInstructorChannelCustomization,
  sanitizeInstructorProfileImageUrl,
  writeInstructorChannelCustomization,
  type InstructorChannelListItem,
  type InstructorChannelNoticeItem,
} from './instructor-channel-customization'
import { authApi, instructorCourseApi, publicInstructorApi, userApi } from './lib/api'
import {
  AUTH_SESSION_SYNC_EVENT,
  clearStoredAuthSession,
  readStoredAuthSession,
  updateStoredAuthSession,
} from './lib/auth-session'
import { notifyProfileUpdated } from './lib/profile-sync'
import type { AuthSession } from './types/auth'
import type { InstructorChannel, InstructorCourseListItem, InstructorFeaturedCourse } from './types/instructor'
import type { UserProfile } from './types/learner'

type EditFormState = {
  displayName: string
  headline: string
  profileImageUrl: string
  bannerImageUrl: string
  githubUrl: string
  youtubeUrl: string
  websiteUrl: string
  intro: string
  specialties: string[]
  careers: InstructorChannelListItem[]
  achievements: InstructorChannelListItem[]
  notices: InstructorChannelNoticeItem[]
  featuredCourses: InstructorFeaturedCourse[]
}

const fieldClassName =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.12)]'

function readNumberSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  const parsed = value ? Number(value) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toInputDate(value: string) {
  if (!value) return ''
  return value.includes('.') ? value.replaceAll('.', '-') : value
}

function fromInputDate(value: string) {
  return value ? value.replaceAll('-', '.') : ''
}

function mapCourseToFeatured(course: InstructorCourseListItem): InstructorFeaturedCourse {
  return {
    courseId: course.courseId,
    title: course.title,
    subtitle: course.categoryLabel ? `${course.categoryLabel} · ${course.levelLabel}` : course.levelLabel,
    thumbnailUrl: course.thumbnailUrl,
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

function buildFormState(
  profile: UserProfile,
  channel: InstructorChannel | null,
  courses: InstructorCourseListItem[],
  instructorId: number,
): EditFormState {
  const customization = readInstructorChannelCustomization(instructorId)
  const defaultFeaturedCourses = channel?.featuredCourses.length
    ? channel.featuredCourses
    : courses.slice(0, 3).map(mapCourseToFeatured)
  const profileImageUrl =
    sanitizeInstructorProfileImageUrl(customization?.profileImageUrl) ??
    sanitizeInstructorProfileImageUrl(profile.profileImage) ??
    sanitizeInstructorProfileImageUrl(channel?.profile.profileImageUrl) ??
    ''

  return {
    displayName: customization?.displayName || profile.channelName || channel?.profile.nickname || profile.name,
    headline: customization?.headline || channel?.profile.headline || profile.bio || '',
    profileImageUrl,
    bannerImageUrl: customization?.bannerImageUrl || defaultInstructorBannerImageUrl,
    githubUrl: customization?.githubUrl || profile.githubUrl || channel?.externalLinks?.githubUrl || '',
    youtubeUrl: customization?.youtubeUrl || '',
    websiteUrl: customization?.websiteUrl || profile.blogUrl || channel?.externalLinks?.blogUrl || '',
    intro: customization?.intro || channel?.intro || profile.bio || '',
    specialties: customization?.specialties.length
      ? customization.specialties
      : channel?.specialties.length
        ? channel.specialties
        : profile.tags.map((tag) => tag.name),
    careers: customization?.careers.length ? customization.careers : fallbackInstructorCareers,
    achievements: customization?.achievements.length ? customization.achievements : fallbackInstructorAchievements,
    notices: customization?.notices.length ? customization.notices : fallbackInstructorNotices,
    featuredCourses: customization?.featuredCourses.length ? customization.featuredCourses : defaultFeaturedCourses,
  }
}

function SectionCard({
  title,
  iconClassName,
  children,
}: {
  title: string
  iconClassName: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
        <i className={`${iconClassName} text-brand`} />
        <span>{title}</span>
      </h2>
      {children}
    </section>
  )
}

function EditableListSection({
  title,
  items,
  addLabel,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string
  items: InstructorChannelListItem[]
  addLabel: string
  onAdd: () => void
  onChange: (id: string, field: 'title' | 'description', value: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-bold text-gray-700">{title}</label>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-sm font-bold text-brand transition hover:text-green-600">
          <i className="fas fa-plus text-xs" />
          <span>{addLabel}</span>
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <input type="text" value={item.title} onChange={(event) => onChange(item.id, 'title', event.target.value)} placeholder={`${title} 제목`} className={fieldClassName} />
                <textarea rows={2} value={item.description} onChange={(event) => onChange(item.id, 'description', event.target.value)} placeholder={`${title} 설명`} className={`${fieldClassName} min-h-[88px] resize-y`} />
              </div>
              <button type="button" onClick={() => onRemove(item.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500">
                <i className="fas fa-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function InstructorEditProfileApp() {
  const queryInstructorId = useMemo(() => readNumberSearchParam('instructorId'), [])
  const [session, setSession] = useState<AuthSession | null>(() => readStoredAuthSession())
  const instructorId = queryInstructorId ?? session?.userId ?? null
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [courses, setCourses] = useState<InstructorCourseListItem[]>([])
  const [form, setForm] = useState<EditFormState | null>(null)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    if (!session || session.role !== 'ROLE_INSTRUCTOR' || !instructorId) {
      setLoading(false)
      return
    }

    const currentInstructorId = instructorId
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [profileResponse, channelResponse, courseResponse] = await Promise.all([
          userApi.getMyProfile(controller.signal),
          publicInstructorApi.getChannel(currentInstructorId, controller.signal).catch(() => null),
          instructorCourseApi.getCourses(controller.signal).catch(() => []),
        ])

        setProfile(profileResponse)
        setCourses(courseResponse)
        setForm(buildFormState(profileResponse, channelResponse, courseResponse, currentInstructorId))
        setProfileImage(profileResponse.profileImage)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '프로필 정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [instructorId, session])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setToastMessage(null), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()
    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // noop
    } finally {
      clearStoredAuthSession({ toastMessage: null })
      setSession(null)
      setProfileImage(null)
    }
  }

  function updateForm<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
    if (key === 'profileImageUrl') {
      setProfileImage(String(value || '') || null)
    }
  }

  function addSpecialty() {
    if (!form) {
      return
    }

    const nextValue = tagInput.trim()
    if (!nextValue) {
      return
    }

    if (form.specialties.includes(nextValue)) {
      setToastMessage('이미 추가된 전문 분야입니다.')
      return
    }

    updateForm('specialties', [...form.specialties, nextValue])
    setTagInput('')
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addSpecialty()
    }
  }

  function updateListItem(key: 'careers' | 'achievements', id: string, field: 'title' | 'description', value: string) {
    setForm((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [key]: current[key].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      }
    })
  }

  function removeListItem(key: 'careers' | 'achievements', id: string) {
    setForm((current) => (current ? { ...current, [key]: current[key].filter((item) => item.id !== id) } : current))
  }

  function addListItem(key: 'careers' | 'achievements') {
    const nextItem = { id: createLocalId(key), title: '', description: '' }
    setForm((current) => (current ? { ...current, [key]: [...current[key], nextItem] } : current))
  }

  function updateNotice(id: string, field: keyof InstructorChannelNoticeItem, value: string | boolean) {
    setForm((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        notices: current.notices.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      }
    })
  }

  function addNotice() {
    setForm((current) =>
      current
        ? {
            ...current,
            notices: [
              ...current.notices,
              {
                id: createLocalId('notice'),
                title: '',
                dateLabel: new Date().toISOString().slice(0, 10).replaceAll('-', '.'),
                isNew: false,
              },
            ],
          }
        : current,
    )
  }

  function removeNotice(id: string) {
    setForm((current) => (current ? { ...current, notices: current.notices.filter((item) => item.id !== id) } : current))
  }

  function toggleFeaturedCourse(course: InstructorCourseListItem) {
    setForm((current) => {
      if (!current) {
        return current
      }

      const exists = current.featuredCourses.some((item) => item.courseId === course.courseId)
      if (exists) {
        return {
          ...current,
          featuredCourses: current.featuredCourses.filter((item) => item.courseId !== course.courseId),
        }
      }

      if (current.featuredCourses.length >= 3) {
        setToastMessage('대표 강의는 최대 3개까지 선택할 수 있습니다.')
        return current
      }

      return {
        ...current,
        featuredCourses: [...current.featuredCourses, mapCourseToFeatured(course)],
      }
    })
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>, key: 'bannerImageUrl' | 'profileImageUrl') {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      updateForm(key, dataUrl)
      setToastMessage(key === 'bannerImageUrl' ? '배너 이미지를 변경했습니다.' : '프로필 이미지를 변경했습니다.')
    } catch (imageError) {
      setToastMessage(imageError instanceof Error ? imageError.message : '이미지를 처리하지 못했습니다.')
    } finally {
      event.target.value = ''
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form || !profile || !instructorId) {
      return
    }

    if (!form.displayName.trim() || !form.headline.trim()) {
      setToastMessage('채널명과 한 줄 소개를 입력해주세요.')
      return
    }

    const normalizedProfileImageUrl = sanitizeInstructorProfileImageUrl(form.profileImageUrl) ?? ''

    setSaving(true)
    setError(null)

    try {
      const updatedProfile = await userApi.updateMyProfile({
        name: profile.name,
        bio: form.headline.trim(),
        phone: profile.phone ?? '',
        profileImage: normalizedProfileImageUrl,
        channelName: form.displayName.trim(),
        githubUrl: form.githubUrl.trim(),
        blogUrl: form.websiteUrl.trim(),
        tagIds: profile.tags.map((tag) => tag.tagId),
      })

      writeInstructorChannelCustomization(instructorId, {
        displayName: form.displayName,
        headline: form.headline,
        profileImageUrl: normalizedProfileImageUrl,
        bannerImageUrl: form.bannerImageUrl,
        githubUrl: form.githubUrl,
        youtubeUrl: form.youtubeUrl,
        websiteUrl: form.websiteUrl,
        intro: form.intro,
        specialties: form.specialties,
        careers: form.careers,
        achievements: form.achievements,
        notices: form.notices,
        featuredCourses: form.featuredCourses,
      })

      setProfile(updatedProfile)
      setProfileImage(normalizedProfileImageUrl || null)
      updateStoredAuthSession({ name: updatedProfile.name })
      notifyProfileUpdated({ name: updatedProfile.name, profileImage: normalizedProfileImageUrl || null })
      setToastMessage('채널 정보가 저장되었습니다.')
      window.setTimeout(() => {
        window.location.href = buildMyInstructorProfileHref(session)
      }, 700)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '저장 중 문제가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCourseIds = useMemo(
    () => new Set(form?.featuredCourses.map((item) => item.courseId) ?? []),
    [form],
  )

  if (!session) {
    return <LoginRequiredGate message="강사용 채널 편집 화면은 로그인한 강사 계정으로만 접근할 수 있습니다." />
  }

  if (session.role !== 'ROLE_INSTRUCTOR') {
    return (
      <div className="min-h-screen bg-[#f9fafb] text-gray-800">
        <SiteHeader session={session} profileImage={profileImage} onLogout={handleLogout} onLoginClick={() => { window.location.href = '/home?auth=login' }} />
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 pt-24">
          <div className="w-full rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-extrabold text-gray-900">강사 계정이 필요합니다.</h1>
            <p className="mt-3 text-sm text-gray-500">이 페이지는 강사 전용 채널 편집 화면입니다.</p>
            <a href="/home" className="mt-6 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black">홈으로 돌아가기</a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-800">
      <SiteHeader session={session} profileImage={profileImage} onLogout={handleLogout} onLoginClick={() => { window.location.href = '/home?auth=login' }} />
      <main className="px-6 pb-20 pt-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">채널 편집</h1>
              <p className="mt-2 text-sm text-gray-500">강사 채널에 표시되는 정보를 관리하고 저장할 수 있습니다.</p>
            </div>
            <a href={buildMyInstructorProfileHref(session)} className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"><i className="fas fa-times text-lg" /></a>
          </div>
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">{error}</div>
          ) : null}

          {form ? (
            <form className="space-y-8" onSubmit={handleSubmit}>
              <SectionCard title="배너 이미지" iconClassName="fas fa-image">
                <div className="space-y-4">
                  <label className="block cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageChange(event, 'bannerImageUrl')} />
                    <div className="relative h-48 overflow-hidden rounded-2xl bg-slate-900">
                      <img src={form.bannerImageUrl || defaultInstructorBannerImageUrl} alt="banner preview" className="h-full w-full object-cover opacity-75" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition hover:opacity-100">
                        <span className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-900"><i className="fas fa-upload mr-2" />배너 이미지 변경</span>
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-gray-500">권장 비율은 16:9입니다. 선택한 이미지는 현재 브라우저에서 바로 반영됩니다.</p>
                </div>
              </SectionCard>

              <SectionCard title="프로필 정보" iconClassName="fas fa-user-circle">
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">프로필 사진</label>
                    <div className="flex items-center gap-4">
                      <UserAvatar name={form.displayName || session.name} imageUrl={form.profileImageUrl} className="h-24 w-24 border-2 border-gray-100" iconClassName="text-3xl" alt={form.displayName || session.name} />
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-200">
                          <i className="fas fa-upload" />
                          <span>사진 변경</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageChange(event, 'profileImageUrl')} />
                        </label>
                        <button type="button" onClick={() => updateForm('profileImageUrl', '')} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-500 transition hover:bg-gray-50">초기화</button>
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-700">채널명 / 닉네임</span>
                    <input type="text" value={form.displayName} onChange={(event) => updateForm('displayName', event.target.value)} className={fieldClassName} placeholder="채널에 표시될 이름을 입력하세요." />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-700">한 줄 소개</span>
                    <input type="text" maxLength={100} value={form.headline} onChange={(event) => updateForm('headline', event.target.value)} className={fieldClassName} placeholder="채널 상단에 표시될 소개 문구를 입력하세요." />
                    <p className="mt-1 text-right text-xs text-gray-400">{form.headline.length}/100</p>
                  </label>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-gray-700">GitHub</span>
                      <input type="url" value={form.githubUrl} onChange={(event) => updateForm('githubUrl', event.target.value)} className={fieldClassName} placeholder="https://github.com/..." />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-gray-700">YouTube</span>
                      <input type="url" value={form.youtubeUrl} onChange={(event) => updateForm('youtubeUrl', event.target.value)} className={fieldClassName} placeholder="https://youtube.com/..." />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-gray-700">웹사이트</span>
                      <input type="url" value={form.websiteUrl} onChange={(event) => updateForm('websiteUrl', event.target.value)} className={fieldClassName} placeholder="https://..." />
                    </label>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="강사 소개" iconClassName="fas fa-file-alt">
                <div className="space-y-6">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-700">상세 소개</span>
                    <textarea rows={10} value={form.intro} onChange={(event) => updateForm('intro', event.target.value)} className={`${fieldClassName} min-h-[220px] resize-y`} placeholder="강사로서의 경력과 교육 철학을 자유롭게 작성하세요." />
                  </label>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">전문 분야</label>
                    <div className="mb-3 flex min-h-[52px] flex-wrap gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      {form.specialties.length ? form.specialties.map((item) => (
                        <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm">
                          {item}
                          <button type="button" onClick={() => updateForm('specialties', form.specialties.filter((tag) => tag !== item))} className="text-gray-400 transition hover:text-red-500">
                            <i className="fas fa-times text-[10px]" />
                          </button>
                        </span>
                      )) : <span className="text-xs text-gray-400">전문 분야를 추가해주세요.</span>}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={handleTagKeyDown} className={fieldClassName} placeholder="전문 분야를 입력하고 Enter를 누르세요." />
                      <button type="button" onClick={addSpecialty} className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-green-600">추가</button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="경력 및 성과" iconClassName="fas fa-briefcase">
                <div className="space-y-8">
                  <EditableListSection title="주요 경력" items={form.careers} addLabel="경력 추가" onAdd={() => addListItem('careers')} onChange={(id, field, value) => updateListItem('careers', id, field, value)} onRemove={(id) => removeListItem('careers', id)} />
                  <EditableListSection title="주요 성과" items={form.achievements} addLabel="성과 추가" onAdd={() => addListItem('achievements')} onChange={(id, field, value) => updateListItem('achievements', id, field, value)} onRemove={(id) => removeListItem('achievements', id)} />
                </div>
              </SectionCard>

              <SectionCard title="공지 및 대표 강의" iconClassName="fas fa-bullhorn">
                <div className="space-y-8">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700">최신 공지</label>
                      <button type="button" onClick={addNotice} className="inline-flex items-center gap-1 text-sm font-bold text-brand transition hover:text-green-600"><i className="fas fa-plus text-xs" /><span>공지 추가</span></button>
                    </div>
                    <div className="space-y-3">
                      {form.notices.map((notice) => (
                        <div key={notice.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-500">
                              <input type="checkbox" checked={Boolean(notice.isNew)} onChange={(event) => updateNotice(notice.id, 'isNew', event.target.checked)} className="h-4 w-4 accent-emerald-500" />
                              <span>New 배지</span>
                            </label>
                            <input type="date" value={toInputDate(notice.dateLabel)} onChange={(event) => updateNotice(notice.id, 'dateLabel', fromInputDate(event.target.value))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 outline-none transition focus:border-brand" />
                          </div>
                          <div className="flex items-start gap-3">
                            <input type="text" value={notice.title} onChange={(event) => updateNotice(notice.id, 'title', event.target.value)} placeholder="공지 제목" className={fieldClassName} />
                            <button type="button" onClick={() => removeNotice(notice.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500"><i className="fas fa-trash" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700">대표 강의</label>
                      <span className="text-xs font-semibold text-gray-400">최대 3개 선택</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {courses.length ? courses.map((course) => {
                        const selected = selectedCourseIds.has(course.courseId)
                        return (
                          <button key={course.courseId} type="button" onClick={() => toggleFeaturedCourse(course)} className={`overflow-hidden rounded-2xl border text-left transition ${selected ? 'border-brand bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <div className="h-40 overflow-hidden bg-gray-100">
                              {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">썸네일 없음</div>}
                            </div>
                            <div className="space-y-2 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="line-clamp-2 font-bold text-gray-900">{course.title}</p>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${selected ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>{selected ? '선택됨' : '선택'}</span>
                              </div>
                              <p className="text-xs text-gray-500">{course.categoryLabel} · {course.levelLabel}</p>
                            </div>
                          </button>
                        )
                      }) : <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-400 md:col-span-2">등록된 강의를 불러오지 못했습니다.</div>}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <div className="sticky bottom-6 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50">미리보기</button>
                <a href={buildMyInstructorProfileHref(session)} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-500 transition hover:bg-gray-50">취소</a>
                <button type="submit" disabled={saving} className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-green-600 disabled:opacity-70">{saving ? '저장 중...' : '저장하기'}</button>
              </div>
            </form>
          ) : null}
        </div>
      </main>

      {previewOpen && form ? (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/55 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gray-900">미리보기</h2>
              <button type="button" onClick={() => setPreviewOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"><i className="fas fa-times" /></button>
            </div>
            <div className="p-6">
              <div className="overflow-hidden rounded-3xl border border-gray-200">
                <div className="relative h-52 overflow-hidden bg-slate-900">
                  <img src={form.bannerImageUrl || defaultInstructorBannerImageUrl} alt="banner preview" className="h-full w-full object-cover opacity-75" />
                </div>
                <div className="px-6 pb-6 pt-8">
                  <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end">
                    <UserAvatar name={form.displayName || session.name} imageUrl={form.profileImageUrl} className="h-28 w-28 border-4 border-white shadow-lg" iconClassName="text-3xl" alt={form.displayName || session.name} />
                    <div className="flex-1">
                      <h3 className="text-3xl font-extrabold text-gray-900">{form.displayName || session.name}</h3>
                      <p className="mt-2 text-gray-500">{form.headline}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-5">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{form.intro}</p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {form.specialties.map((item) => <span key={item} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">{item}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-6 left-1/2 z-[2200] -translate-x-1/2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl">{toastMessage}</div>
      ) : null}
    </div>
  )
}
