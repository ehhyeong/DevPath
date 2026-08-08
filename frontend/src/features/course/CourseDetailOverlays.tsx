import type { Dispatch, SetStateAction } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import type { CourseNewsCard } from './course-detail-support'

type QuestionDraft = { title: string; tag: string; body: string }
type Props = {
  enrollModalOpen: boolean
  setEnrollModalOpen: Dispatch<SetStateAction<boolean>>
  learningHref: string
  selectedNews: CourseNewsCard | null
  setSelectedNews: Dispatch<SetStateAction<CourseNewsCard | null>>
  askModalOpen: boolean
  setAskModalOpen: Dispatch<SetStateAction<boolean>>
  questionDraft: QuestionDraft
  setQuestionDraft: Dispatch<SetStateAction<QuestionDraft>>
  questionErrors: string | null
  questionBusy: boolean
  handleSubmitQuestion: () => void
  toastMessage: string | null
}

const qnaInputBaseClassName = 'qna-input w-full rounded-[12px] border-[1px] border-solid border-[#e5e7eb] bg-white px-[12px] py-[10px] [outline:none] [transition:all_0.2s] focus:border-[#00c471] focus:[box-shadow:0_0_0_3px_rgba(0,196,113,0.12)]'
const qnaInputClassName = `${qnaInputBaseClassName} text-[14px]!`
const qnaTextareaClassName = 'qna-textarea min-h-[140px] w-full resize-none rounded-[12px] border-[1px] border-solid border-[#e5e7eb] bg-white p-[12px] text-[14px]! [outline:none] [transition:all_0.2s] focus:border-[#00c471] focus:[box-shadow:0_0_0_3px_rgba(0,196,113,0.12)]'

export default function CourseDetailOverlays({ enrollModalOpen, setEnrollModalOpen, learningHref, selectedNews, setSelectedNews, askModalOpen, setAskModalOpen, questionDraft, setQuestionDraft, questionErrors, questionBusy, handleSubmitQuestion, toastMessage }: Props) {
  return (
    <>
      {enrollModalOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center"
          aria-hidden="false"
          onClick={(event) => {
            if (event.target === event.currentTarget) setEnrollModalOpen(false)
          }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEnrollModalOpen(false)}
          />
          <div className="[animation:popIn_0.2s_cubic-bezier(0.16,1,0.3,1)_forwards] relative mx-4 w-full max-w-[380px] overflow-hidden rounded-2xl bg-white px-8 py-10 shadow-2xl">
            <div className="mb-8 flex justify-center">
              <div className="flex h-[72px] w-[72px] animate-bounce items-center justify-center rounded-full bg-green-50 duration-1000">
                <svg className="h-10 w-10 text-brand" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12.5L9.2 16.5L19 7"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="mb-8 text-center">
              <h3 className="mb-2 text-2xl font-extrabold text-gray-900">수강신청 완료!</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                성공적으로 신청되었습니다.
                <br />
                지금 바로 학습을 시작해보세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                className="rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => {
                  navigateTo(learningHref)
                }}
                className="rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600 hover:shadow-lg"
              >
                바로 학습하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedNews ? (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="courseNewsModalTitle"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedNews(null)
          }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="공지 닫기"
            onClick={() => setSelectedNews(null)}
          />
          <div className="[animation:popIn_0.2s_cubic-bezier(0.16,1,0.3,1)_forwards] relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${selectedNews.badgeClassName}`}>
                    {selectedNews.badgeLabel}
                  </span>
                  <span className="text-xs font-bold text-gray-400">{selectedNews.dateLabel}</span>
                </div>
                <h3 id="courseNewsModalTitle" className="text-lg font-extrabold leading-snug text-gray-900">
                  {selectedNews.title}
                </h3>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:bg-gray-50 hover:text-gray-900"
                aria-label="공지 닫기"
                onClick={() => setSelectedNews(null)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="max-h-[52vh] overflow-y-auto px-6 py-5">
              <p className="whitespace-pre-line text-sm font-medium leading-7 text-gray-700">{selectedNews.summary}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              {selectedNews.href ? (
                <a
                  href={selectedNews.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-black text-white transition hover:bg-black"
                >
                  원문 보기
                  <i className="fas fa-arrow-up-right-from-square text-[10px]" />
                </a>
              ) : null}
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-100"
                onClick={() => setSelectedNews(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {askModalOpen ? (
        <div
          className="qna-modal-backdrop show fixed inset-0 z-[2500] flex items-center justify-center bg-[rgba(17,24,39,0.55)] p-[16px]"
          id="askModal"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAskModalOpen(false)
          }}
        >
          <div className="qna-modal w-[min(680px,96vw)] overflow-hidden rounded-[18px] border-[1px] border-solid border-[#e5e7eb] bg-white [box-shadow:0_24px_72px_rgba(17,24,39,0.18)]" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="qna-modal-header flex items-center justify-between bg-white px-[16px] py-[14px] [border-bottom:1px_solid_#f3f4f6]">
              <div className="qna-modal-title flex items-center gap-[8px] text-[14px] font-[900] text-[#111827]"><i className="fas fa-pen-to-square text-primary" /> 새 질문 작성</div>
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                onClick={() => setAskModalOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="qna-modal-body p-[16px]">
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700">제목</label>
                  <input
                    id="qnaTitle"
                    value={questionDraft.title}
                    onChange={(event) => setQuestionDraft((current) => ({ ...current, title: event.target.value }))}
                    className={qnaInputClassName}
                    placeholder="예: 클래스와 프로세스 차이가 궁금합니다"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700">구간/키워드 (선택)</label>
                  <input
                    id="qnaTag"
                    value={questionDraft.tag}
                    onChange={(event) => setQuestionDraft((current) => ({ ...current, tag: event.target.value }))}
                    className={qnaInputClassName}
                    placeholder="예: Unit 3 / 12:40 / 상속"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-xs font-bold text-gray-700">내용</label>
                <textarea
                  id="qnaBody"
                  maxLength={1000}
                  value={questionDraft.body}
                  onChange={(event) => setQuestionDraft((current) => ({ ...current, body: event.target.value }))}
                  className={qnaTextareaClassName}
                  placeholder="질문 내용을 자세하게 적어주세요."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-gray-400" id="qnaCount">
                  {questionDraft.body.length} / 1000
                </div>
                {questionErrors ? <div className="text-[11px] font-bold text-rose-500">{questionErrors}</div> : null}
              </div>
            </div>

            <div className="qna-modal-footer flex justify-end gap-[8px] bg-[#f9fafb] px-[16px] py-[12px] [border-top:1px_solid_#f3f4f6]">
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                onClick={() => setAskModalOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                id="qnaSubmitBtn"
                disabled={questionBusy}
                className="rounded-xl bg-brand px-5 py-2 text-xs font-black text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                onClick={handleSubmitQuestion}
              >
                {questionBusy ? '등록 중' : '질문 등록'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-[2200] rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {toastMessage}
        </div>
      ) : null}
    </>
  )
}
