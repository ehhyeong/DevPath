import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import UserAvatar from '../../components/UserAvatar'
import { updateStoredAuthSession } from '../../lib/auth-session'
import { userApi } from '../../lib/api'
import { notifyProfileUpdated } from '../../lib/profile-sync'
import { LearnerContentRow, LearnerPageShell, MyMenuSidebar } from '../template'
import type { AuthSession } from '../../types/auth'
import type { TechTag, UserProfile, UserProfileUpdateRequest } from '../../types/learner'

type ProfileFormState = {
  name: string
  channelName: string
  bio: string
  githubUrl: string
  blogUrl: string
  profileImage: string
  tagIds: number[]
}

const emptyForm: ProfileFormState = {
  name: '',
  channelName: '',
  bio: '',
  githubUrl: '',
  blogUrl: '',
  profileImage: '',
  tagIds: [],
}

function toForm(profile: UserProfile): ProfileFormState {
  return {
    name: profile.name ?? '',
    channelName: profile.channelName ?? '',
    bio: profile.bio ?? '',
    githubUrl: profile.githubUrl ?? '',
    blogUrl: profile.blogUrl ?? '',
    profileImage: profile.profileImage ?? '',
    tagIds: (profile.tags ?? []).map((tag) => tag.tagId),
  }
}

function resolveErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function ProfilePage({ session }: { session: AuthSession }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [officialTags, setOfficialTags] = useState<TechTag[]>([])
  const [form, setForm] = useState<ProfileFormState>(emptyForm)
  const [tagQuery, setTagQuery] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      const [profileResult, tagResult] = await Promise.allSettled([
        userApi.getMyProfile(controller.signal),
        userApi.getOfficialTags(controller.signal),
      ])

      if (controller.signal.aborted) {
        return
      }

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value)
        setForm(toForm(profileResult.value))
      } else {
        setProfile(null)
        setForm(emptyForm)
        setError(resolveErrorMessage(profileResult.reason, '프로필 정보를 불러오지 못했습니다.'))
      }

      setOfficialTags(tagResult.status === 'fulfilled' ? tagResult.value : [])
    }

    void load()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => setToastMessage(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  const tagById = new Map<number, TechTag>()
  ;[...(profile?.tags ?? []), ...officialTags].forEach((tag) => tagById.set(tag.tagId, tag))
  const selectedTags = form.tagIds
    .map((tagId) => tagById.get(tagId))
    .filter((tag): tag is TechTag => Boolean(tag))

  function handleAddTag() {
    const keyword = tagQuery.trim().toLowerCase()

    if (!keyword) {
      return
    }

    const matchedTag = officialTags.find(
      (tag) => tag.name.toLowerCase() === keyword || tag.name.toLowerCase().includes(keyword),
    )

    if (!matchedTag) {
      setError('등록된 공식 태그에서 일치하는 항목을 찾지 못했습니다.')
      return
    }

    setError('')
    setForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(matchedTag.tagId) ? current.tagIds : [...current.tagIds, matchedTag.tagId],
    }))
    setTagQuery('')
  }

  function handleTagInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddTag()
    }
  }

  function handleProfileImageEdit() {
    const nextUrl = window.prompt('프로필 이미지 URL을 입력해 주세요.', form.profileImage)

    if (nextUrl === null) {
      return
    }

    const trimmedUrl = nextUrl.trim()

    if (trimmedUrl.length > 500) {
      setError('프로필 이미지 URL은 500자 이하로 입력해 주세요.')
      return
    }

    setError('')
    setForm((current) => ({ ...current, profileImage: trimmedUrl }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setToastMessage('')
    setError('')

    const trimmedName = form.name.trim()

    if (!trimmedName) {
      setError('이름을 입력해 주세요.')
      return
    }

    const payload: UserProfileUpdateRequest = {
      name: trimmedName,
      bio: form.bio.trim(),
      phone: profile?.phone ?? '',
      profileImage: form.profileImage.trim(),
      channelName: form.channelName.trim(),
      githubUrl: form.githubUrl.trim(),
      blogUrl: form.blogUrl.trim(),
      tagIds: form.tagIds,
    }

    setIsSaving(true)

    try {
      const updatedProfile = await userApi.updateMyProfile(payload)
      setProfile(updatedProfile)
      setForm(toForm(updatedProfile))
      updateStoredAuthSession({ name: updatedProfile.name })
      notifyProfileUpdated({
        name: updatedProfile.name,
        profileImage: updatedProfile.profileImage,
      })
      setToastMessage('변경 사항이 성공적으로 저장되었습니다.')
    } catch (submitError) {
      setError(resolveErrorMessage(submitError, '프로필 저장 중 문제가 발생했습니다.'))
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = form.name || profile?.name || session.name || 'User'
  const imageUrl = form.profileImage || profile?.profileImage || null

  return (
    <LearnerPageShell>
      <LearnerContentRow>
        <MyMenuSidebar currentPageKey="profile" wrapperClassName="w-60 shrink-0 hidden lg:block -ml-0" />

        <section className="min-w-0 flex-1">
          <h2 className="mb-6 pt-[5px] text-2xl font-bold leading-none text-gray-900">프로필 관리</h2>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">
            <form className="flex flex-col gap-8 md:flex-row" onSubmit={handleSubmit}>
              <div className="flex w-full shrink-0 flex-col items-center gap-4 md:w-52">
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-gray-100 bg-gray-50 shadow-sm">
                    <UserAvatar
                      name={displayName}
                      imageUrl={imageUrl}
                      className="h-full w-full border-0 shadow-none"
                      iconClassName="text-4xl"
                      alt={`${displayName} profile`}
                    />
                  </div>
                  <button
                    type="button"
                    className="absolute right-0 bottom-0 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition-all hover:border-brand hover:text-brand active:scale-95"
                    onClick={handleProfileImageEdit}
                    aria-label="프로필 이미지 URL 입력"
                  >
                    <i className="fas fa-camera" />
                  </button>
                </div>
                <p className="text-center text-[11px] tracking-tight text-gray-400">이미지 URL은 최대 500자까지 저장됩니다.</p>
              </div>

              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="profile-name">
                      이름
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      className="input-field"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="이름을 입력해주세요"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="profile-channel">
                      닉네임
                    </label>
                    <input
                      id="profile-channel"
                      type="text"
                      className="input-field"
                      value={form.channelName}
                      onChange={(event) => setForm((current) => ({ ...current, channelName: event.target.value }))}
                      placeholder="닉네임을 입력해주세요"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="profile-bio">
                    한 줄 소개
                  </label>
                  <input
                    id="profile-bio"
                    type="text"
                    className="input-field"
                    value={form.bio}
                    onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                    placeholder="자신을 한 줄로 표현해주세요"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="profile-tag-input">
                    관심 기술 태그
                  </label>
                  <div className="mb-2.5 flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag.tagId}
                        className="flex items-center gap-1.5 rounded-lg border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-bold text-brand"
                      >
                        {tag.name}
                        <button
                          type="button"
                          className="opacity-60 transition hover:opacity-100"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              tagIds: current.tagIds.filter((tagId) => tagId !== tag.tagId),
                            }))
                          }
                          aria-label={`${tag.name} 태그 제거`}
                        >
                          <i className="fas fa-times cursor-pointer" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    id="profile-tag-input"
                    type="text"
                    className="input-field"
                    value={tagQuery}
                    onChange={(event) => setTagQuery(event.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="기술 스택을 입력하고 엔터를 누르세요. 예시 React, Docker"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-700" htmlFor="profile-github">
                      <i className="fab fa-github text-gray-800" /> GitHub
                    </label>
                    <input
                      id="profile-github"
                      type="text"
                      className="input-field"
                      value={form.githubUrl}
                      onChange={(event) => setForm((current) => ({ ...current, githubUrl: event.target.value }))}
                      placeholder="https://github.com/username"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-700" htmlFor="profile-blog">
                      <i className="fas fa-globe text-gray-400" /> 블로그 / 포트폴리오
                    </label>
                    <input
                      id="profile-blog"
                      type="text"
                      className="input-field"
                      value={form.blogUrl}
                      onChange={(event) => setForm((current) => ({ ...current, blogUrl: event.target.value }))}
                      placeholder="URL을 입력해주세요"
                    />
                  </div>
                </div>

                {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}

                <div className="flex justify-end pt-4">
                  <button
                    className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-brand px-10 py-3.5 font-bold text-white transition-all hover:bg-green-600 hover:shadow-lg hover:shadow-green-100 disabled:cursor-not-allowed disabled:opacity-75"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <i className="fas fa-spinner fa-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check" />
                        저장하기
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      </LearnerContentRow>

      {toastMessage ? (
        <div className="fixed right-6 bottom-6 z-[1000] flex items-center gap-3 rounded-xl bg-gray-800 px-6 py-4 text-sm font-bold text-white shadow-xl">
          <i className="fas fa-check-circle text-brand" />
          <span>{toastMessage}</span>
        </div>
      ) : null}
    </LearnerPageShell>
  )
}
