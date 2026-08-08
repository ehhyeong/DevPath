import { useAuthSession } from '../../lib/useAuthSession'
import { useState } from 'react'

import type { LearningCourseDetail,LearningLessonProgress,LearningPlayerConfig,LearningVideoQuality,SubmissionHistoryItem,TimestampNote } from '../../types/learning'
import type { QnaQuestionDetail,QnaQuestionSummary,QnaQuestionTemplate } from '../../types/qna'
import { ASSIGNMENT_LOADING_MESSAGES,createAssignmentFormState,createQuestionFormState,type AssignmentGradingResultState,type AssignmentSubmissionFormState,type CompletionProofCardState,type QnaStatusFilter,type QuestionFormState,type TabKey } from './learning-player-model'

export function useLearningCourseState(initialLessonId: number | null) {
  const [session,setSession] = useAuthSession()
  const [course,setCourse] = useState<LearningCourseDetail | null>(null)
  const [courseError,setCourseError] = useState<string | null>(null)
  const [selectedLessonId,setSelectedLessonId] = useState<number | null>(initialLessonId)
  const [activeTab,setActiveTab] = useState<TabKey>('curriculum')
  const [openSectionIds,setOpenSectionIds] = useState<Set<number>>(() => new Set())
  const [notice,setNotice] = useState<string | null>(null)
  const [loadingCourse,setLoadingCourse] = useState(true)
  const [loadingLesson,setLoadingLesson] = useState(false)
  const [loadingLessonProgressMap,setLoadingLessonProgressMap] = useState(false)
  const [progress,setProgress] = useState<LearningLessonProgress | null>(null)
  const [lessonProgressById,setLessonProgressById] = useState<Record<number,LearningLessonProgress>>({})
  const [playerConfig,setPlayerConfig] = useState<LearningPlayerConfig | null>(null)

  return { session,setSession,course,setCourse,courseError,setCourseError,selectedLessonId,setSelectedLessonId,activeTab,setActiveTab,openSectionIds,setOpenSectionIds,notice,setNotice,loadingCourse,setLoadingCourse,loadingLesson,setLoadingLesson,loadingLessonProgressMap,setLoadingLessonProgressMap,progress,setProgress,lessonProgressById,setLessonProgressById,playerConfig,setPlayerConfig }
}

export function useLearningPlaybackState() {
  const [settingsOpen,setSettingsOpen] = useState(false)
  const [selectedVideoQuality,setSelectedVideoQuality] = useState<LearningVideoQuality>('1080')
  const [currentTime,setCurrentTime] = useState(0)
  const [duration,setDuration] = useState(0)
  const [actualDurationByLessonId,setActualDurationByLessonId] = useState<Record<number,number>>({})
  const [isPlaying,setIsPlaying] = useState(false)
  const [isMuted,setIsMuted] = useState(false)
  const [volume,setVolume] = useState(1)
  const [isPipActive,setIsPipActive] = useState(false)
  const [isFrameFullscreen,setIsFrameFullscreen] = useState(false)
  const [ocrBusy,setOcrBusy] = useState(false)
  const [isSelectMode,setIsSelectMode] = useState(false)
  const [selectDrag,setSelectDrag] = useState<{ startX: number;startY: number;endX: number;endY: number } | null>(null)
  const [videoFailed,setVideoFailed] = useState(false)

  return { settingsOpen,setSettingsOpen,selectedVideoQuality,setSelectedVideoQuality,currentTime,setCurrentTime,duration,setDuration,actualDurationByLessonId,setActualDurationByLessonId,isPlaying,setIsPlaying,isMuted,setIsMuted,volume,setVolume,isPipActive,setIsPipActive,isFrameFullscreen,setIsFrameFullscreen,ocrBusy,setOcrBusy,isSelectMode,setIsSelectMode,selectDrag,setSelectDrag,videoFailed,setVideoFailed }
}

export function useLearningNotesAndQnaState() {
  const [notes,setNotes] = useState<TimestampNote[]>([])
  const [noteContent,setNoteContent] = useState('')
  const [noteComposerOpen,setNoteComposerOpen] = useState(false)
  const [noteMessage,setNoteMessage] = useState<string | null>(null)
  const [qnaTemplates,setQnaTemplates] = useState<QnaQuestionTemplate[]>([])
  const [qnaQuestions,setQnaQuestions] = useState<QnaQuestionSummary[]>([])
  const [qnaDetails,setQnaDetails] = useState<Record<number,QnaQuestionDetail>>({})
  const [loadingQna,setLoadingQna] = useState(false)
  const [qnaError,setQnaError] = useState<string | null>(null)
  const [qnaStatusFilter,setQnaStatusFilter] = useState<QnaStatusFilter>('ALL')
  const [qnaSearch,setQnaSearch] = useState('')
  const [openQuestionId,setOpenQuestionId] = useState<number | null>(null)
  const [loadingQuestionId,setLoadingQuestionId] = useState<number | null>(null)
  const [questionForm,setQuestionForm] = useState<QuestionFormState>(createQuestionFormState)
  const [questionMessage,setQuestionMessage] = useState<string | null>(null)
  const [questionBusy,setQuestionBusy] = useState(false)
  const [questionComposerOpen,setQuestionComposerOpen] = useState(false)
  const [openNoteId,setOpenNoteId] = useState<number | null>(null)
  const [editingNoteContent,setEditingNoteContent] = useState('')

  return { notes,setNotes,noteContent,setNoteContent,noteComposerOpen,setNoteComposerOpen,noteMessage,setNoteMessage,qnaTemplates,setQnaTemplates,qnaQuestions,setQnaQuestions,qnaDetails,setQnaDetails,loadingQna,setLoadingQna,qnaError,setQnaError,qnaStatusFilter,setQnaStatusFilter,qnaSearch,setQnaSearch,openQuestionId,setOpenQuestionId,loadingQuestionId,setLoadingQuestionId,questionForm,setQuestionForm,questionMessage,setQuestionMessage,questionBusy,setQuestionBusy,questionComposerOpen,setQuestionComposerOpen,openNoteId,setOpenNoteId,editingNoteContent,setEditingNoteContent }
}

export function useLearningAssessmentState() {
  const [quizModalLessonId,setQuizModalLessonId] = useState<number | null>(null)
  const [quizQuestionIndex,setQuizQuestionIndex] = useState(0)
  const [quizSelectedOptionIndex,setQuizSelectedOptionIndex] = useState<number | null>(null)
  const [quizFeedback,setQuizFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [assignmentModalLessonId,setAssignmentModalLessonId] = useState<number | null>(null)
  const [assignmentForm,setAssignmentForm] = useState<AssignmentSubmissionFormState>(() => createAssignmentFormState())
  const [assignmentFileDragActive,setAssignmentFileDragActive] = useState(false)
  const [assignmentSubmitBusy,setAssignmentSubmitBusy] = useState(false)
  const [assignmentMessage,setAssignmentMessage] = useState<string | null>(null)
  const [assignmentLoadingVisible,setAssignmentLoadingVisible] = useState(false)
  const [assignmentLoadingText,setAssignmentLoadingText] = useState(ASSIGNMENT_LOADING_MESSAGES[0])
  const [assignmentGradingResult,setAssignmentGradingResult] = useState<AssignmentGradingResultState | null>(null)
  const [assignmentHistoryByAssignmentId,setAssignmentHistoryByAssignmentId] = useState<Record<number,SubmissionHistoryItem>>({})
  const [completionProofCard,setCompletionProofCard] = useState<CompletionProofCardState | null>(null)
  const [completionVisible,setCompletionVisible] = useState(false)
  const [completionCardFlipped,setCompletionCardFlipped] = useState(false)
  const [completionBurstKey,setCompletionBurstKey] = useState(0)

  return { quizModalLessonId,setQuizModalLessonId,quizQuestionIndex,setQuizQuestionIndex,quizSelectedOptionIndex,setQuizSelectedOptionIndex,quizFeedback,setQuizFeedback,assignmentModalLessonId,setAssignmentModalLessonId,assignmentForm,setAssignmentForm,assignmentFileDragActive,setAssignmentFileDragActive,assignmentSubmitBusy,setAssignmentSubmitBusy,assignmentMessage,setAssignmentMessage,assignmentLoadingVisible,setAssignmentLoadingVisible,assignmentLoadingText,setAssignmentLoadingText,assignmentGradingResult,setAssignmentGradingResult,assignmentHistoryByAssignmentId,setAssignmentHistoryByAssignmentId,completionProofCard,setCompletionProofCard,completionVisible,setCompletionVisible,completionCardFlipped,setCompletionCardFlipped,completionBurstKey,setCompletionBurstKey }
}
