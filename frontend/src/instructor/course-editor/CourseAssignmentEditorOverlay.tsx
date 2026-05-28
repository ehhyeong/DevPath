import { useEffect, useRef, useState } from 'react'
import { instructorLessonEvaluationApi } from '../../lib/api'
import type {
  InstructorAssignmentEditor,
  InstructorAssignmentReferenceFile,
  InstructorAssignmentRubric,
} from '../../types/instructor-evaluation'

type RubricDraft = InstructorAssignmentRubric & { localId: string }
type ReferenceFileDraft = InstructorAssignmentReferenceFile & {
  localId: string
  base64Content: string | null
}
type AssignmentEditorDraft = Omit<InstructorAssignmentEditor, 'rubrics' | 'referenceFiles'> & {
  rubrics: RubricDraft[]
  referenceFiles: ReferenceFileDraft[]
}
type ToastItem = { id: string; message: string }

type Props = {
  lessonId: number
  lessonTitle: string
  onClose: () => void
  standalone?: boolean
}

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function createRubric(): RubricDraft {
  return {
    localId: createLocalId('rubric'),
    rubricId: null,
    criteriaName: '',
    criteriaKeywords: '',
    maxPoints: 0,
    displayOrder: null,
  }
}

function normalizeEditor(editor: InstructorAssignmentEditor): AssignmentEditorDraft {
  return {
    ...editor,
    aiReviewEnabled: true,
    rubrics: editor.rubrics.map((rubric) => ({
      ...rubric,
      criteriaKeywords: rubric.criteriaKeywords ?? '',
      localId: createLocalId('rubric'),
    })),
    referenceFiles: editor.referenceFiles.map((file) => ({
      ...file,
      contentType: file.contentType ?? null,
      localId: createLocalId('file'),
      base64Content: null,
    })),
  }
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsDataURL(file)
  })
}

export default function CourseAssignmentEditorOverlay({ lessonId, lessonTitle, onClose, standalone = false }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<AssignmentEditorDraft | null>(null)
  const [dragging, setDragging] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    instructorLessonEvaluationApi
      .getAssignmentEditor(lessonId, controller.signal)
      .then((response) => {
        const normalized = normalizeEditor(response)
        setDraft({
          ...normalized,
          rubrics: normalized.rubrics.length > 0 ? normalized.rubrics : [createRubric()],
        })
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

  function pushToast(message: string) {
    const id = createLocalId('toast')
    setToasts((current) => [...current, { id, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 3000)
  }

  function updateDraft(recipe: (current: AssignmentEditorDraft) => AssignmentEditorDraft) {
    setDraft((current) => (current ? recipe(current) : current))
  }

  function recalculateTotal(nextRubrics: RubricDraft[]) {
    return nextRubrics.reduce((sum, rubric) => sum + Math.max(rubric.maxPoints || 0, 0), 0)
  }

  function updateRubric(
    rubricLocalId: string,
    field: keyof Omit<RubricDraft, 'localId' | 'rubricId'>,
    value: string | number | null,
  ) {
    updateDraft((current) => {
      const nextRubrics = current.rubrics.map((rubric) =>
        rubric.localId === rubricLocalId ? { ...rubric, [field]: value } : rubric,
      )

      const nextTotal = recalculateTotal(nextRubrics)

      return {
        ...current,
        rubrics: nextRubrics,
        totalScore: nextTotal,
        passScore: Math.min(current.passScore, Math.max(nextTotal, 0)),
      }
    })
  }

  function addRubric() {
    updateDraft((current) => {
      const nextRubrics = [...current.rubrics, createRubric()]
      const nextTotal = recalculateTotal(nextRubrics)
      return { ...current, rubrics: nextRubrics, totalScore: nextTotal }
    })
    pushToast('새 평가 기준을 추가했습니다.')
  }

  function removeRubric(rubricLocalId: string) {
    updateDraft((current) => {
      const nextRubrics = current.rubrics.filter((rubric) => rubric.localId !== rubricLocalId)
      const safeRubrics = nextRubrics.length > 0 ? nextRubrics : [createRubric()]
      const nextTotal = recalculateTotal(safeRubrics)
      return {
        ...current,
        rubrics: safeRubrics,
        totalScore: nextTotal,
        passScore: Math.min(current.passScore, Math.max(nextTotal, 0)),
      }
    })
    pushToast('평가 기준을 삭제했습니다.')
  }

  async function handleFileSelection(files: FileList | null) {
    if (!files || files.length === 0) {
      return
    }

    const uploadedFiles = await Promise.all(
      Array.from(files).map(async (file) => ({
        localId: createLocalId('file'),
        fileId: null,
        fileName: file.name,
        contentType: file.type || null,
        fileSize: file.size,
        displayOrder: null,
        createdAt: null,
        base64Content: await readFileAsBase64(file),
      })),
    )

    updateDraft((current) => ({
      ...current,
      referenceFiles: [...current.referenceFiles, ...uploadedFiles],
    }))
    pushToast(`${uploadedFiles.length}개의 파일을 첨부했습니다.`)
  }

  function removeFile(fileLocalId: string) {
    updateDraft((current) => ({
      ...current,
      referenceFiles: current.referenceFiles.filter((file) => file.localId !== fileLocalId),
    }))
    pushToast('첨부 파일을 삭제했습니다.')
  }

  function insertFormat(prefix: string, suffix: string) {
    const target = textareaRef.current
    if (!target || !draft) {
      return
    }

    const start = target.selectionStart
    const end = target.selectionEnd
    const selected = draft.description.slice(start, end)
    const nextValue = `${draft.description.slice(0, start)}${prefix}${selected}${suffix}${draft.description.slice(end)}`

    setDraft({ ...draft, description: nextValue })

    requestAnimationFrame(() => {
      target.focus()
      target.setSelectionRange(start + prefix.length, end + prefix.length)
    })

    pushToast('마크다운 서식을 적용했습니다.')
  }

  async function handleSave() {
    if (!draft) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const saved = await instructorLessonEvaluationApi.saveAssignmentEditor(lessonId, {
        title: draft.title,
        description: draft.description,
        totalScore: draft.totalScore,
        passScore: draft.passScore,
        aiReviewEnabled: true,
        allowTextSubmission: draft.allowTextSubmission,
        allowFileSubmission: draft.allowFileSubmission,
        allowUrlSubmission: draft.allowUrlSubmission,
        rubrics: draft.rubrics.map((rubric, index) => ({
          rubricId: rubric.rubricId,
          criteriaName: rubric.criteriaName,
          criteriaKeywords: rubric.criteriaKeywords,
          maxPoints: rubric.maxPoints,
          displayOrder: index + 1,
        })),
        referenceFiles: draft.referenceFiles.map((file, index) => ({
          fileId: file.fileId,
          fileName: file.fileName,
          contentType: file.contentType,
          fileSize: file.fileSize,
          displayOrder: index + 1,
          base64Content: file.base64Content,
        })),
      })

      setDraft({
        ...normalizeEditor(saved),
        rubrics: saved.rubrics.length > 0 ? normalizeEditor(saved).rubrics : [createRubric()],
      })
      setSuccessOpen(true)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '과제 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !draft) {
    return (
      <div
        className={
          standalone
            ? 'content-assignment-editor-page flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4'
            : 'fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[2px]'
        }
      >
        <div className="rounded-2xl bg-white px-8 py-6 text-sm font-bold text-gray-700 shadow-2xl">
          과제 편집기를 불러오는 중입니다.
        </div>
      </div>
    )
  }

  return (
    <div className={standalone ? 'content-assignment-editor-page relative min-h-screen bg-[#F8F9FA]' : 'fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px]'}>
      <div className="content-assignment-editor-toast-container fixed right-8 top-20 z-[95] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-xl border border-gray-700 bg-gray-900/90 px-5 py-3 text-sm font-bold text-white shadow-xl">
            {toast.message}
          </div>
        ))}
      </div>

      <div className={`content-assignment-editor-shell flex flex-col overflow-hidden bg-[#F8F9FA] ${standalone ? 'min-h-screen' : 'h-full'}`}>
        <div className="content-assignment-editor-topbar flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="content-assignment-editor-back-button flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <i className="fas fa-arrow-left" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">과제 만들기</h1>
              <p className="mt-0.5 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                {lessonTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="content-assignment-editor-save-button flex items-center gap-2 rounded-xl bg-[#00C471] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className="fas fa-save" />
            {saving ? '저장 중...' : '저장 완료'}
          </button>
        </div>

        <div className="content-assignment-editor-body min-h-0 flex-1 overflow-y-auto p-8">
          <div className="content-assignment-editor-content mx-auto max-w-4xl space-y-6 pb-20">
            {error ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="content-assignment-editor-card rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <label className="mb-2 block text-sm font-extrabold text-gray-800">
                과제 제목 <span className="text-red-500">*</span>
              </label>
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                type="text"
                className="mb-8 w-full border-b-2 border-gray-200 pb-2 text-xl font-bold outline-none transition focus:border-[#00C471]"
                placeholder="과제 제목을 입력하세요"
              />

              <label className="mb-2 block text-sm font-extrabold text-gray-800">
                과제 가이드 <span className="text-red-500">*</span>
              </label>
              <div className="content-assignment-editor-markdown mb-8 overflow-hidden rounded-xl border border-gray-200 shadow-sm transition focus-within:border-[#00C471] focus-within:ring-1 focus-within:ring-[#00C471]">
                <div className="content-assignment-editor-toolbar flex gap-1 border-b border-gray-200 bg-gray-50 p-2 text-gray-600">
                  <button type="button" onClick={() => insertFormat('**', '**')} className="flex h-8 w-8 items-center justify-center rounded transition hover:bg-gray-200">
                    <i className="fas fa-bold" />
                  </button>
                  <button type="button" onClick={() => insertFormat('*', '*')} className="flex h-8 w-8 items-center justify-center rounded transition hover:bg-gray-200">
                    <i className="fas fa-italic" />
                  </button>
                  <div className="mx-1 my-auto h-5 w-px bg-gray-300" />
                  <button type="button" onClick={() => insertFormat('- ', '')} className="flex h-8 w-8 items-center justify-center rounded transition hover:bg-gray-200">
                    <i className="fas fa-list-ul" />
                  </button>
                  <button type="button" onClick={() => insertFormat('`', '`')} className="flex h-8 w-8 items-center justify-center rounded transition hover:bg-gray-200">
                    <i className="fas fa-code" />
                  </button>
                  <button type="button" onClick={() => insertFormat('```\n', '\n```')} className="flex h-8 w-8 items-center justify-center rounded transition hover:bg-gray-200">
                    <i className="fas fa-file-code" />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  className="h-48 w-full resize-y bg-white p-5 text-sm leading-relaxed outline-none"
                  placeholder="학생들이 수행해야 할 과제 내용을 자세히 적어주세요."
                />
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-extrabold text-gray-600">참고 파일 첨부</label>
                  <label
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault()
                      setDragging(false)
                    }}
                    onDrop={async (event) => {
                      event.preventDefault()
                      setDragging(false)
                      await handleFileSelection(event.dataTransfer.files)
                    }}
                    className={`content-assignment-editor-upload group relative block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                      dragging ? 'border-[#00C471] bg-emerald-50' : 'border-gray-300 hover:border-[#00C471] hover:bg-emerald-50'
                    }`}
                  >
                    <i className="fas fa-cloud-upload-alt mb-2 text-2xl text-gray-400 transition group-hover:text-[#00C471]" />
                    <span className="block text-sm font-bold text-gray-600 group-hover:text-[#00C471]">
                      클릭하거나 파일을 드래그해서 첨부
                    </span>
                    <span className="mt-1 block text-[10px] text-gray-400">PDF, ZIP, 이미지</span>
                    <input type="file" multiple className="hidden" onChange={(event) => void handleFileSelection(event.target.files)} />
                  </label>

                  <div className="mt-3 space-y-2">
                    {draft.referenceFiles.map((file) => (
                      <div key={file.localId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <i className="fas fa-file-alt text-gray-400" />
                          <span className="truncate text-xs font-bold text-gray-700">{file.fileName}</span>
                          <span className="shrink-0 text-[10px] text-gray-400">
                            ({(file.fileSize / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button type="button" onClick={() => removeFile(file.localId)} className="px-2 text-gray-400 transition hover:text-red-500">
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold text-gray-600">
                    학생 제출 허용 형식 <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-gray-700">
                      <input
                        checked={draft.allowTextSubmission}
                        onChange={(event) => setDraft({ ...draft, allowTextSubmission: event.target.checked })}
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                      />
                      텍스트 코드 직접 입력
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-gray-700">
                      <input
                        checked={draft.allowFileSubmission}
                        onChange={(event) => setDraft({ ...draft, allowFileSubmission: event.target.checked })}
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                      />
                      파일 업로드
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-gray-700">
                      <input
                        checked={draft.allowUrlSubmission}
                        onChange={(event) => setDraft({ ...draft, allowUrlSubmission: event.target.checked })}
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                      />
                      외부 링크 제출
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="content-assignment-editor-card content-assignment-editor-rubric-panel relative overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="content-assignment-editor-card-header flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-gray-50/50 p-6">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                    <i className="fas fa-robot text-[#00C471]" /> AI 자동 채점 시스템
                  </h2>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    루브릭 기준과 키워드를 바탕으로 AI가 자동 채점합니다.
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {draft.rubrics.map((rubric, index) => (
                    <div key={rubric.localId} className="content-assignment-editor-rubric-item group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 font-black text-[#00C471]">
                        {index + 1}
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-5">
                          <label className="mb-1 block text-[10px] font-extrabold text-gray-500">평가 항목</label>
                          <input
                            value={rubric.criteriaName}
                            onChange={(event) => updateRubric(rubric.localId, 'criteriaName', event.target.value)}
                            type="text"
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-800 outline-none transition focus:border-[#00C471]"
                          />
                        </div>
                        <div className="lg:col-span-5">
                          <label className="mb-1 block text-[10px] font-extrabold text-gray-500">자동 검색 키워드</label>
                          <input
                            value={rubric.criteriaKeywords ?? ''}
                            onChange={(event) => updateRubric(rubric.localId, 'criteriaKeywords', event.target.value)}
                            type="text"
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-800 outline-none transition focus:border-[#00C471]"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="mb-1 block text-[10px] font-extrabold text-gray-500">배점</label>
                          <div className="relative">
                            <input
                              value={rubric.maxPoints}
                              onChange={(event) => updateRubric(rubric.localId, 'maxPoints', Number(event.target.value || 0))}
                              type="number"
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-right text-sm font-black text-[#00C471] outline-none transition focus:border-[#00C471]"
                            />
                            <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">점</span>
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeRubric(rubric.localId)} className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 transition hover:bg-red-50 hover:text-red-500">
                        <i className="fas fa-trash-alt" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addRubric}
                  className="content-assignment-editor-add-rubric mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-3 text-sm font-bold text-gray-500 transition hover:border-[#00C471] hover:bg-emerald-50 hover:text-[#00C471]"
                >
                  <i className="fas fa-plus" /> 평가 기준 추가하기
                </button>

              </div>
            </div>

            <div className="content-assignment-editor-card content-assignment-editor-score-card grid grid-cols-1 gap-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-end justify-between">
                  <label className="block text-sm font-extrabold text-gray-800">총 배점 합계</label>
                  <span className="text-[10px] font-bold text-gray-400">
                    루브릭 점수가 자동 합산됩니다.
                  </span>
                </div>
                <div className="relative">
                  <input
                    value={draft.totalScore}
                    onChange={(event) => setDraft({ ...draft, totalScore: Number(event.target.value || 0) })}
                    readOnly={true}
                    type="number"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-12 text-right text-lg font-black text-gray-900 outline-none transition bg-gray-50"
                  />
                  <span className="absolute right-4 top-3.5 text-sm font-bold text-gray-500">점</span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-end justify-between">
                  <label className="block text-sm font-extrabold text-gray-800">과제 패스 기준</label>
                  <span className="text-[10px] font-bold text-gray-400">총점 이하 점수만 입력 가능합니다.</span>
                </div>
                <div className="relative">
                  <input
                    value={draft.passScore}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        passScore: Math.min(Number(event.target.value || 0), Math.max(draft.totalScore, 0)),
                      })
                    }
                    type="number"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-16 text-right text-lg font-black text-[#00C471] outline-none transition focus:border-[#00C471]"
                  />
                  <span className="absolute right-4 top-3.5 text-sm font-bold text-gray-500">점 이상</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {successOpen ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-[#00C471] shadow-sm">
                <i className="fas fa-check text-3xl" />
              </div>
              <h3 className="mb-2 text-xl font-extrabold text-gray-900">저장 완료!</h3>
              <p className="mb-6 text-sm font-medium text-gray-500">과제 편집 내용이 정상적으로 저장되었습니다.</p>
              <button
                type="button"
                onClick={() => {
                  setSuccessOpen(false)
                  onClose()
                }}
                className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white transition hover:bg-black"
              >
                강의 편집기로 돌아가기
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
