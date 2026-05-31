import { useEffect, useState } from 'react'
import { instructorLessonEvaluationApi } from '../../lib/api'
import type {
  GenerateInstructorQuizRequest,
  InstructorQuizEditor,
  InstructorQuizEditorOption,
  InstructorQuizEditorQuestion,
} from '../../types/instructor-evaluation'

type QuizOptionDraft = InstructorQuizEditorOption & { localId: string }
type QuizQuestionDraft = Omit<InstructorQuizEditorQuestion, 'options'> & {
  localId: string
  options: QuizOptionDraft[]
}
type QuizEditorDraft = Omit<InstructorQuizEditor, 'questions'> & {
  questions: QuizQuestionDraft[]
}

type Props = {
  lessonId: number
  lessonTitle: string
  courseTags?: string[]
  onClose: () => void
  standalone?: boolean
}

const QUESTION_EXPLANATION_MAX_LENGTH = 120

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function createOption(
  optionText = '',
  isCorrect = false,
  displayOrder = 1,
): QuizOptionDraft {
  return {
    localId: createLocalId('option'),
    optionId: null,
    optionText,
    isCorrect,
    displayOrder,
  }
}

function createQuestion(questionType: QuizQuestionDraft['questionType']): QuizQuestionDraft {
  if (questionType === 'TRUE_FALSE') {
    return {
      localId: createLocalId('question'),
      questionId: null,
      questionType,
      questionText: '',
      explanation: '',
      points: 5,
      displayOrder: null,
      sourceTimestamp: null,
      options: [createOption('O', true, 1), createOption('X', false, 2)],
    }
  }

  if (questionType === 'SHORT_ANSWER') {
    return {
      localId: createLocalId('question'),
      questionId: null,
      questionType,
      questionText: '',
      explanation: '',
      points: 5,
      displayOrder: null,
      sourceTimestamp: null,
      options: [createOption('', true, 1)],
    }
  }

  return {
    localId: createLocalId('question'),
    questionId: null,
    questionType,
    questionText: '',
    explanation: '',
    points: 5,
    displayOrder: null,
    sourceTimestamp: null,
    options: [createOption('', false, 1), createOption('', true, 2)],
  }
}

function normalizeEditor(editor: InstructorQuizEditor): QuizEditorDraft {
  return {
    ...editor,
    questions: editor.questions.map((question) => ({
      ...question,
      localId: createLocalId('question'),
      explanation: question.explanation ?? '',
      sourceTimestamp: question.sourceTimestamp ?? null,
      options: question.options.map((option) => ({
        ...option,
        localId: createLocalId('option'),
      })),
    })),
  }
}

function normalizeKeywordList(values: string[] = []) {
  return values.reduce<string[]>((keywords, value) => {
    const keyword = value.trim().replace(/^#/, '')
    if (!keyword || keywords.some((item) => item.toLowerCase() === keyword.toLowerCase())) {
      return keywords
    }

    return [...keywords, keyword]
  }, [])
}

export default function CourseQuizEditorOverlay({
  lessonId,
  lessonTitle,
  courseTags = [],
  onClose,
  standalone = false,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<QuizEditorDraft | null>(null)
  const [generationMode, setGenerationMode] = useState<'video' | 'text'>('video')
  const [tagInput, setTagInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>(() => normalizeKeywordList(courseTags))
  const [scriptText, setScriptText] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState(2)
  const [questionCount, setQuestionCount] = useState(3)
  const [videoFileName, setVideoFileName] = useState<string | null>(null)
  const [videoMimeType, setVideoMimeType] = useState<string | null>(null)
  const [videoBase64Content, setVideoBase64Content] = useState<string | null>(null)
  const [readingVideo, setReadingVideo] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    instructorLessonEvaluationApi
      .getQuizEditor(lessonId, controller.signal)
      .then((response) => {
        setDraft(normalizeEditor(response))
        // 저장된 생성 키워드/스크립트가 있으면 복원한다.
        if (response.keywords && response.keywords.length) {
          setKeywords(normalizeKeywordList(response.keywords))
        }
        if (response.scriptText != null) {
          setScriptText(response.scriptText)
        }
        setLoading(false)
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setError(nextError.message)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [lessonId])

  useEffect(() => {
    const nextKeywords = normalizeKeywordList(courseTags)
    if (!nextKeywords.length) {
      return
    }

    setKeywords((current) => (current.length ? current : nextKeywords))
  }, [courseTags])

  useEffect(() => {
    if (!settingsStatus) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSettingsStatus(null)
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [settingsStatus])

  function readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : ''
        const [, base64Content = ''] = result.split(',', 2)
        resolve(base64Content)
      }
      reader.onerror = () => reject(reader.error ?? new Error('파일을 읽지 못했습니다.'))
      reader.readAsDataURL(file)
    })
  }

  async function handleVideoFileChange(file: File | null) {
    if (!file) {
      setVideoFileName(null)
      setVideoMimeType(null)
      setVideoBase64Content(null)
      setReadingVideo(false)
      return
    }

    setVideoFileName(file.name)
    setVideoMimeType(file.type || 'video/mp4')
    setReadingVideo(true)
    try {
      setVideoBase64Content(await readFileAsBase64(file))
    } catch (nextError) {
      setVideoFileName(null)
      setVideoMimeType(null)
      setVideoBase64Content(null)
      setError(nextError instanceof Error ? nextError.message : '영상 파일을 읽지 못했습니다.')
    } finally {
      setReadingVideo(false)
    }
  }

  function updateDraft(recipe: (current: QuizEditorDraft) => QuizEditorDraft) {
    setDraft((current) => (current ? recipe(current) : current))
  }

  function addKeyword() {
    const nextKeyword = tagInput.trim().replace(/^#/, '')
    if (!nextKeyword) {
      return
    }

    setKeywords((current) =>
      current.some((item) => item.toLowerCase() === nextKeyword.toLowerCase()) ? current : [...current, nextKeyword],
    )
    setTagInput('')
  }

  function addQuestion(questionType: QuizQuestionDraft['questionType'] = 'MULTIPLE_CHOICE') {
    updateDraft((current) => ({
      ...current,
      questions: [...current.questions, createQuestion(questionType)],
    }))
  }

  function updateQuestion(
    questionLocalId: string,
    field: keyof Omit<QuizQuestionDraft, 'localId' | 'options'>,
    value: string | number | null,
  ) {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.localId === questionLocalId ? { ...question, [field]: value } : question,
      ),
    }))
  }

  function updateQuestionType(questionLocalId: string, nextType: QuizQuestionDraft['questionType']) {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.localId !== questionLocalId) {
          return question
        }

        const baseQuestion = createQuestion(nextType)
        return {
          ...question,
          questionType: nextType,
          options:
            nextType === 'MULTIPLE_CHOICE' && question.options.length >= 2
              ? question.options.map((option, index) => ({ ...option, displayOrder: index + 1 }))
              : baseQuestion.options,
        }
      }),
    }))
  }

  function updateOption(questionLocalId: string, optionLocalId: string, value: string) {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.localId !== questionLocalId
          ? question
          : {
              ...question,
              options: question.options.map((option) =>
                option.localId === optionLocalId ? { ...option, optionText: value } : option,
              ),
            },
      ),
    }))
  }

  function addOption(questionLocalId: string) {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.localId !== questionLocalId
          ? question
          : {
              ...question,
              options: [...question.options, createOption('', false, question.options.length + 1)],
            },
      ),
    }))
  }

  function removeOption(questionLocalId: string, optionLocalId: string) {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.localId !== questionLocalId) {
          return question
        }

        const nextOptions = question.options.filter((option) => option.localId !== optionLocalId)
        return {
          ...question,
          options:
            nextOptions.length > 0
              ? nextOptions.map((option, index) => ({ ...option, displayOrder: index + 1 }))
              : question.questionType === 'SHORT_ANSWER'
                ? [createOption('', true, 1)]
                : [createOption('', false, 1), createOption('', true, 2)],
        }
      }),
    }))
  }

  function selectCorrectOption(questionLocalId: string, optionLocalId: string) {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.localId !== questionLocalId
          ? question
          : {
              ...question,
              options: question.options.map((option) => ({
                ...option,
                isCorrect: option.localId === optionLocalId,
              })),
            },
      ),
    }))
  }

  function moveQuestion(questionLocalId: string, direction: -1 | 1) {
    updateDraft((current) => {
      const currentIndex = current.questions.findIndex((question) => question.localId === questionLocalId)
      const nextIndex = currentIndex + direction

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.questions.length) {
        return current
      }

      const nextQuestions = [...current.questions]
      const [target] = nextQuestions.splice(currentIndex, 1)
      nextQuestions.splice(nextIndex, 0, target)

      return { ...current, questions: nextQuestions }
    })
  }

  function removeQuestion(questionLocalId: string) {
    updateDraft((current) => ({
      ...current,
      questions: current.questions.filter((question) => question.localId !== questionLocalId),
    }))
  }

  function buildSavePayload(current: QuizEditorDraft) {
    return {
      title: current.title,
      description: current.description,
      quizType: current.quizType,
      passScore: current.passScore,
      timeLimitMinutes: current.timeLimitMinutes,
      exposeAnswer: current.exposeAnswer,
      exposeExplanation: current.exposeExplanation,
      isPublished: current.isPublished,
      keywords,
      scriptText,
      questions: current.questions.map((question, questionIndex) => ({
        questionId: question.questionId,
        questionType: question.questionType,
        questionText: question.questionText,
        explanation: question.explanation,
        points: question.points,
        displayOrder: questionIndex + 1,
        sourceTimestamp: question.sourceTimestamp,
        options: question.options.map((option, optionIndex) => ({
          optionId: option.optionId,
          optionText: option.optionText,
          isCorrect: option.isCorrect,
          displayOrder: optionIndex + 1,
        })),
      })),
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)

    try {
      const payload: GenerateInstructorQuizRequest = {
        mode: generationMode,
        videoFileName,
        videoMimeType: generationMode === 'video' ? videoMimeType : null,
        videoBase64Content: generationMode === 'video' ? videoBase64Content : null,
        scriptText,
        questionCount,
        difficultyLevel,
        keywords,
      }
      console.log('[AI Quiz] 생성 요청 시작 →', {
        lessonId,
        mode: payload.mode,
        videoFileName: payload.videoFileName,
        questionCount: payload.questionCount,
        difficultyLevel: payload.difficultyLevel,
        keywords: payload.keywords,
      })
      const generated = await instructorLessonEvaluationApi.generateQuizDraft(lessonId, payload)
      console.log('[AI Quiz] 생성 완료 ←', { questionCount: generated.questions.length, quizType: generated.quizType })
      setDraft(normalizeEditor(generated))
    } catch (nextError) {
      console.error('[AI Quiz] 생성 실패 ✗', nextError)
      setError(nextError instanceof Error ? nextError.message : '퀴즈 초안 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!draft) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const saved = await instructorLessonEvaluationApi.saveQuizEditor(lessonId, buildSavePayload(draft))

      setDraft(normalizeEditor(saved))
      onClose()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '퀴즈 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleApplySettings() {
    if (!draft) {
      return
    }

    setSettingsSaving(true)
    setSettingsStatus(null)
    setError(null)

    try {
      const saved = await instructorLessonEvaluationApi.saveQuizEditor(lessonId, buildSavePayload(draft))
      setDraft(normalizeEditor(saved))
      setSettingsStatus('설정 반영 완료')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '설정 반영에 실패했습니다.')
    } finally {
      setSettingsSaving(false)
    }
  }

  if (loading || !draft) {
    return (
      <div
        className={
          standalone
            ? 'course-quiz-editor-page flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4'
            : 'fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[2px]'
        }
      >
        <div className="rounded-2xl bg-white px-8 py-6 text-sm font-bold text-gray-700 shadow-2xl">
          퀴즈 편집기를 불러오는 중입니다.
        </div>
      </div>
    )
  }

  return (
    <div
      className={
        standalone
          ? 'course-quiz-editor-page min-h-screen bg-[#F0F2F5]'
          : 'course-quiz-editor-modal fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px]'
      }
    >
      <div className={`course-quiz-editor-shell flex bg-[#F0F2F5] text-gray-800 ${standalone ? 'min-h-screen' : 'h-full'}`}>
        <div className="course-quiz-editor-ai-panel flex w-96 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl">
          <div className="course-quiz-editor-ai-header border-b border-gray-100 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <i className="fas fa-robot text-purple-600" /> AI 퀴즈 생성
            </h2>
            <p className="mt-1 text-xs text-gray-500">강의 소재를 분석해 문항 초안을 만듭니다.</p>
          </div>

          <div className="course-quiz-editor-ai-body flex-1 overflow-y-auto p-6">
            <div className="course-quiz-editor-mode-tabs mb-6 flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setGenerationMode('video')}
                className={`course-quiz-editor-mode-tab flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  generationMode === 'video' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                <i className="fas fa-video mr-1" /> 영상 분석
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode('text')}
                className={`course-quiz-editor-mode-tab flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  generationMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                <i className="fas fa-file-alt mr-1" /> 텍스트 분석
              </button>
            </div>

            {generationMode === 'video' ? (
              <label className="course-quiz-editor-upload-box group flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-emerald-400 hover:bg-emerald-50">
                <i className="fas fa-cloud-upload-alt mb-2 text-3xl text-gray-400 transition group-hover:text-emerald-500" />
                <span className="text-sm font-bold text-gray-600">
                  {videoFileName ? videoFileName : '강의 영상 업로드'}
                </span>
                <span className="mt-1 text-[10px] text-gray-400">MP4, MOV</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => {
                    void handleVideoFileChange(event.target.files?.[0] ?? null)
                  }}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">주제 / 키워드</label>
                  <div className="rounded-lg border border-gray-300 bg-white p-2">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700"
                        >
                          #{keyword}
                          <button
                            type="button"
                            onClick={() => setKeywords((current) => current.filter((item) => item !== keyword))}
                          >
                            <i className="fas fa-times" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addKeyword()
                        }
                      }}
                      type="text"
                      placeholder="키워드 입력 후 Enter"
                      className="w-full border-none p-1 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">강의 스크립트</label>
                  <textarea
                    value={scriptText}
                    onChange={(event) => setScriptText(event.target.value)}
                    className="h-32 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none transition focus:border-emerald-500"
                    placeholder="강의 요약 또는 핵심 설명을 입력하세요."
                  />
                </div>
              </div>
            )}

            <div className="mt-8 space-y-4 border-t border-gray-100 pt-6">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">난이도</label>
                  <span className="text-xs font-bold text-emerald-500">
                    {difficultyLevel === 1 ? '초급' : difficultyLevel === 2 ? '중급' : '고급'}
                  </span>
                </div>
                <input
                  value={difficultyLevel}
                  onChange={(event) => setDifficultyLevel(Number(event.target.value))}
                  type="range"
                  min={1}
                  max={3}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-[#00C471]"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">문항 수</label>
                  <span className="text-xs font-bold text-gray-900">{questionCount}문제</span>
                </div>
                <input
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  type="range"
                  min={1}
                  max={10}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-[#00C471]"
                />
              </div>
            </div>
          </div>

          <div className="course-quiz-editor-generator-footer border-t border-gray-100 bg-gray-50 p-6">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || readingVideo}
              className="course-quiz-editor-generate-button flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fas fa-magic text-yellow-400" />
              {readingVideo ? '영상 처리 중...' : generating ? '생성 중...' : '퀴즈 생성하기'}
            </button>
          </div>
        </div>

        <div className="course-quiz-editor-workspace flex min-w-0 flex-1 flex-col">
          <div className="course-quiz-editor-workspace-header flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8">
            <div className="course-quiz-editor-title-group flex items-center gap-3">
              {standalone ? (
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="course-quiz-editor-back-button flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-600 shadow-sm transition hover:bg-gray-200 hover:text-gray-900"
                  title="뒤로 가기"
                >
                  <i className="fas fa-arrow-left" />
                </button>
              ) : null}
              <div>
                <h1 className="text-lg font-bold text-gray-900">퀴즈 편집기</h1>
                <p className="text-xs text-gray-500">{lessonTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="course-quiz-editor-meta mr-4 flex items-center gap-2 text-xs text-gray-500">
                <span>
                  <i className="fas fa-clock mr-1" />
                  제한 시간
                  <input
                    value={draft.timeLimitMinutes}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, timeLimitMinutes: Math.max(1, Number(event.target.value || 1)) } : current,
                      )
                    }
                    type="number"
                    min={1}
                    className="ml-1 w-10 border-b border-gray-300 text-center outline-none focus:border-emerald-500"
                  />
                  분
                </span>
                <span>|</span>
                <span>
                  <i className="fas fa-check-circle mr-1" />
                  패스 점수
                  <input
                    value={draft.passScore}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              passScore: Math.max(0, Math.min(current.totalScore || 100, Number(event.target.value || 0))),
                            }
                          : current,
                      )
                    }
                    type="number"
                    min={0}
                    max={draft.totalScore || 100}
                    className="ml-1 w-10 border-b border-gray-300 text-center outline-none focus:border-emerald-500"
                  />
                  점
                </span>
              </div>

              <button
                type="button"
                onClick={handleApplySettings}
                disabled={settingsSaving || saving}
                className="course-quiz-editor-secondary-button rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
              >
                {settingsSaving ? '반영 중...' : '설정 변경'}
              </button>
              {settingsStatus ? <span className="course-quiz-editor-settings-status">{settingsStatus}</span> : null}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="course-quiz-editor-primary-button rounded-lg bg-[#00C471] px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? '저장 중...' : '저장 완료'}
              </button>
            </div>
          </div>

          <div className="course-quiz-editor-workspace-body min-h-0 flex-1 overflow-y-auto p-8">
            {error ? (
              <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="course-quiz-editor-list mx-auto max-w-3xl space-y-6">
              {draft.questions.length === 0 ? (
                <div className="course-quiz-editor-empty-state py-20 text-center text-gray-400">
                  <i className="fas fa-clipboard-list mb-4 text-6xl text-gray-300" />
                  <p className="text-lg font-bold text-gray-500">아직 등록된 문항이 없습니다.</p>
                  <p className="text-sm">왼쪽에서 AI 생성하거나 아래 버튼으로 직접 추가하세요.</p>
                </div>
              ) : null}

              {draft.questions.map((question, questionIndex) => (
                <div
                  key={question.localId}
                  className="course-quiz-editor-question-card group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                        {questionIndex + 1}
                      </span>
                      <select
                        value={question.questionType}
                        onChange={(event) =>
                          updateQuestionType(question.localId, event.target.value as QuizQuestionDraft['questionType'])
                        }
                        className="course-quiz-editor-type-select rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 outline-none"
                      >
                        <option value="MULTIPLE_CHOICE">객관식</option>
                        <option value="TRUE_FALSE">OX 퀴즈</option>
                        <option value="SHORT_ANSWER">단답형</option>
                      </select>
                    </div>

                    <div className="course-quiz-editor-card-actions flex items-center gap-2 text-gray-400">
                      <button type="button" onClick={() => moveQuestion(question.localId, -1)} className="hover:text-blue-500">
                        <i className="fas fa-arrow-up" />
                      </button>
                      <button type="button" onClick={() => moveQuestion(question.localId, 1)} className="hover:text-blue-500">
                        <i className="fas fa-arrow-down" />
                      </button>
                      <button type="button" onClick={() => removeQuestion(question.localId)} className="ml-2 hover:text-red-500">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>

                  <input
                    value={question.questionText}
                    onChange={(event) => updateQuestion(question.localId, 'questionText', event.target.value)}
                    type="text"
                    placeholder="질문을 입력하세요"
                    className="course-quiz-editor-question-input mb-4 w-full border-b border-transparent bg-transparent text-lg font-bold text-gray-900 outline-none transition focus:border-emerald-500"
                  />

                  {question.questionType === 'TRUE_FALSE' ? (
                    <div className="mt-2 flex gap-4">
                      {question.options.map((option, optionIndex) => (
                        <button
                          key={option.localId}
                          type="button"
                          onClick={() => selectCorrectOption(question.localId, option.localId)}
                          className={`flex-1 rounded-lg border-2 py-3 text-sm font-bold transition ${
                            option.isCorrect
                              ? optionIndex === 0
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                : 'border-red-400 bg-red-50 text-red-500'
                              : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {option.optionText || (optionIndex === 0 ? 'O' : 'X')}
                        </button>
                      ))}
                    </div>
                  ) : question.questionType === 'SHORT_ANSWER' ? (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                      <label className="mb-1 block text-xs font-bold text-emerald-700">정답 키워드</label>
                      <input
                        value={question.options[0]?.optionText ?? ''}
                        onChange={(event) =>
                          updateOption(question.localId, question.options[0]?.localId ?? '', event.target.value)
                        }
                        type="text"
                        placeholder="예: Garbage Collection, GC"
                        className="w-full rounded border border-emerald-200 bg-white p-2 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 pl-2">
                      {question.options.map((option) => (
                        <div
                          key={option.localId}
                          className={`group/option flex items-center gap-3 rounded-lg border p-2 transition ${
                            option.isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            checked={option.isCorrect}
                            onChange={() => selectCorrectOption(question.localId, option.localId)}
                            type="radio"
                            name={question.localId}
                            className="h-4 w-4 accent-blue-500"
                          />
                          <input
                            value={option.optionText}
                            onChange={(event) => updateOption(question.localId, option.localId, event.target.value)}
                            type="text"
                            placeholder="보기 입력"
                            className={`flex-1 bg-transparent text-sm outline-none ${
                              option.isCorrect ? 'font-bold text-emerald-700' : 'text-gray-600'
                            }`}
                          />
                          {option.isCorrect ? <i className="fas fa-check-circle text-emerald-500" /> : null}
                          <button
                            type="button"
                            onClick={() => removeOption(question.localId, option.localId)}
                            className="opacity-0 transition group-hover/option:opacity-100 hover:text-red-500"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addOption(question.localId)}
                        className="mt-3 flex items-center gap-1 pl-2 text-xs font-bold text-blue-500 transition hover:text-blue-700"
                      >
                        <i className="fas fa-plus" /> 보기 추가
                      </button>
                    </div>
                  )}

                  <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-gray-700">해설</label>
                      <span className="shrink-0 text-[10px] font-semibold text-gray-400">
                        {(question.explanation ?? '').length} / {QUESTION_EXPLANATION_MAX_LENGTH}
                      </span>
                    </div>
                    <textarea
                      value={question.explanation ?? ''}
                      onChange={(event) => updateQuestion(question.localId, 'explanation', event.target.value)}
                      maxLength={QUESTION_EXPLANATION_MAX_LENGTH}
                      rows={2}
                      placeholder="정답 근거를 한두 문장으로 간결하게 입력하세요."
                      className="w-full resize-none rounded border border-gray-200 bg-white p-2 text-sm leading-5 text-gray-700 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addQuestion()}
                className="course-quiz-editor-add-question-button flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white/70 py-4 font-bold text-gray-400 transition hover:border-emerald-400 hover:bg-white hover:text-emerald-500"
              >
                <i className="fas fa-plus-circle text-2xl" />
                <span>새 문항 직접 추가하기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
