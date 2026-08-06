import { useCallback,useEffect,useMemo,useRef,useState,type FormEvent } from 'react'
import { type AuthView } from '../../components/AuthModal'
import UserAvatar from '../../components/UserAvatar'
import { clearStoredAuthSession,getPostLoginRedirect,readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import { sanitizeSvg } from '../../lib/html-sanitizer'
import { projectApiRequest } from '../project/api'
import { createSquadNotification,squadActorName } from './notifications'

import { DEFAULT_MERMAID_CODE,EMPTY_SCHEMA,formatRelativeTime,generateMermaidCode,getErdDraftKey,getErdHistoryKey,getValidationIssues,getWorkspaceIdFromUrl,loadMermaid,normalizeTableName,parseMermaidCode,parseSqlToSchema,readErdHistory,safeSchemaFromJson,schemaStats,writeErdHistory } from './erd-support'
import type {
ErdColumn,
ErdComment,
ErdCommentTarget,
ErdDocument,
ErdRelationship,
ErdSchema,
ErdVersion,
TeamMessage,
WorkspaceMember,
} from './erd-types'

export function useSquadErdController() {
const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [projectName, setProjectName] = useState('스쿼드 프로젝트')
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [schema, setSchema] = useState<ErdSchema>(EMPTY_SCHEMA)
  const [mermaidCode, setMermaidCode] = useState(DEFAULT_MERMAID_CODE)
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null)
  const [diagramError, setDiagramError] = useState<string | null>(null)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [versions, setVersions] = useState<ErdVersion[]>([])
  const [comments, setComments] = useState<ErdComment[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [commentInput, setCommentInput] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [relationModalOpen, setRelationModalOpen] = useState(false)
  const [sqlImportOpen, setSqlImportOpen] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [commentTarget, setCommentTarget] = useState<ErdCommentTarget | null>(null)
  const [compareVersion, setCompareVersion] = useState<ErdVersion | null>(null)
  const [sqlImportText, setSqlImportText] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [relationForm, setRelationForm] = useState({
    from: '',
    fromColumn: '',
    to: '',
    toColumn: '',
    type: '||--|{',
    label: 'has',
    onDelete: 'RESTRICT' as ErdRelationship['onDelete'],
    autoCreateFk: true,
  })
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const mermaidCodeRef = useRef(DEFAULT_MERMAID_CODE)

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.learnerId, member])),
    [members],
  )
  const currentMember = session?.userId ? memberById.get(session.userId) : null
  const validationIssues = useMemo(() => getValidationIssues(schema), [schema])
  const currentStats = useMemo(() => schemaStats(schema), [schema])

  useEffect(() => {
    mermaidCodeRef.current = mermaidCode
  }, [mermaidCode])

  const renderDiagram = useCallback(async (code: string) => {
    try {
      const mermaid = await loadMermaid()
      const result = await mermaid.render(`erd-${Date.now()}`, code)
      setDiagramSvg(sanitizeSvg(result.svg))
      setDiagramError(null)
    } catch {
      setDiagramSvg(null)
      setDiagramError('Mermaid 렌더링을 사용할 수 없어 코드 미리보기로 표시합니다.')
    }
  }, [])

  const storeCurrentDraft = useCallback((code: string) => {
    if (!workspaceId) {
      return
    }

    try {
      localStorage.setItem(getErdDraftKey(workspaceId), code)
    } catch {
      // Local backup should not block editing or saving to the server.
    }
  }, [workspaceId])

  const refreshMessages = useCallback(async (silent = false) => {
    if (!workspaceId) {
      return
    }

    try {
      const nextMessages = await projectApiRequest<TeamMessage[]>(
        `/api/lounge/chats/messages?loungeId=${workspaceId}`,
        {},
        'required',
      )
      setMessages(nextMessages ?? [])
    } catch (loadError) {
      if (!silent) {
        const message = loadError instanceof Error ? loadError.message : '설계 토론방 메시지를 불러오지 못했습니다.'
        showAuthToast({ message, variant: 'error', durationMs: 2200 })
      }
    }
  }, [workspaceId])

  useEffect(() => {
    document.title = 'DevPath - ERD Architect'
    const html = document.documentElement
    const body = document.body

    const root = document.getElementById('root')
    const appViewport = document.querySelector<HTMLElement>('.app-viewport')
    html.classList.add('h-full!', 'overflow-hidden!')
    body.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    root?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    appViewport?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')

    return () => {
      html.classList.remove('h-full!', 'overflow-hidden!')
      body.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      root?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      appViewport?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      showAuthToast({ message: '워크스페이스 정보를 찾을 수 없습니다.', variant: 'error', durationMs: 2200 })
      return
    }

    let ignore = false

    async function load() {
      setLoading(true)

      try {
        const [documentData, messageData, versionData, commentData] = await Promise.all([
          projectApiRequest<ErdDocument>(`/api/workspaces/${workspaceId}/erd`, {}, 'required'),
          projectApiRequest<TeamMessage[]>(`/api/lounge/chats/messages?loungeId=${workspaceId}`, {}, 'required'),
          projectApiRequest<ErdVersion[]>(`/api/workspaces/${workspaceId}/erd/versions`, {}, 'required'),
          projectApiRequest<ErdComment[]>(`/api/workspaces/${workspaceId}/erd/comments`, {}, 'required'),
        ])

        if (ignore) {
          return
        }

        const nextSchema = safeSchemaFromJson(documentData.schemaJson)
        const nextCode = documentData.mermaidCode || generateMermaidCode(nextSchema)

        setProjectName(documentData.projectName)
        setMembers(documentData.members ?? [])
        setSchema(nextSchema)
        mermaidCodeRef.current = nextCode
        setMermaidCode(nextCode)
        setMessages(messageData ?? [])
        setVersions(versionData ?? [])
        setComments(commentData ?? [])
        storeCurrentDraft(nextCode)
        void renderDiagram(nextCode)
      } catch (loadError) {
        if (!ignore) {
          const message = loadError instanceof Error ? loadError.message : 'ERD 설계 화면을 불러오지 못했습니다.'
          if (message.includes('로그인')) {
            setAuthView('login')
          }
          showAuthToast({ message, variant: 'error', durationMs: 2200 })
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [renderDiagram, storeCurrentDraft, workspaceId])

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    const timer = window.setInterval(() => {
      void refreshMessages(true)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [refreshMessages, workspaceId])

  useEffect(() => {
    if (!chatOpen || !chatScrollRef.current) {
      return
    }

    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatOpen, messages])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveDocument()
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        const target = event.target
        const isEditable =
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLInputElement ||
          (target instanceof HTMLElement && target.isContentEditable)

        if (isEditable) {
          window.setTimeout(() => {
            const nextCode = textareaRef.current?.value
            if (typeof nextCode === 'string' && nextCode !== mermaidCodeRef.current) {
              applyMermaidDraft(nextCode, { recordHistory: false })
              return
            }

            void renderDiagram(mermaidCodeRef.current)
          }, 0)
          return
        }

        event.preventDefault()
        restoreHistory()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
    window.location.reload()
  }

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
    setAuthView('login')
  }

  function notifyErdChange(message: string) {
    void createSquadNotification(workspaceId, {
      pageKey: 'squad-erd',
      message: `${squadActorName(session?.name)}님이 ${message}`,
      targetPath: '/squad-erd',
    })
  }

  function recordHistorySnapshot(code: string) {
    if (!workspaceId || !code.trim()) {
      return
    }

    const key = getErdHistoryKey(workspaceId)
    const history = readErdHistory(key)
    if (history[history.length - 1] === code) {
      return
    }

    writeErdHistory(key, [...history, code])
  }

  function applyMermaidDraft(value: string, options: { recordHistory?: boolean } = {}) {
    if (options.recordHistory !== false && mermaidCodeRef.current !== value) {
      recordHistorySnapshot(mermaidCodeRef.current)
    }

    mermaidCodeRef.current = value
    setMermaidCode(value)
    storeCurrentDraft(value)

    setSchema(parseMermaidCode(value))
    void renderDiagram(value)
  }

  function syncSchema(nextSchema: ErdSchema) {
    const nextCode = generateMermaidCode(nextSchema)

    if (mermaidCodeRef.current !== nextCode) {
      recordHistorySnapshot(mermaidCodeRef.current)
    }

    mermaidCodeRef.current = nextCode
    setSchema(nextSchema)
    setMermaidCode(nextCode)
    storeCurrentDraft(nextCode)
    void renderDiagram(nextCode)
  }

  function handleCodeChange(value: string) {
    applyMermaidDraft(value)
  }

  async function saveDocument() {
    if (!workspaceId) {
      return
    }

    setSaving(true)

    try {
      const saved = await projectApiRequest<ErdDocument>(
        `/api/workspaces/${workspaceId}/erd`,
        {
          method: 'PUT',
          body: JSON.stringify({
            mermaidCode,
            schemaJson: JSON.stringify(schema),
            changeSummary: `Saved ${schema.tables.length} tables and ${schema.relationships.length} relationships`,
          }),
        },
        'required',
      )

      setProjectName(saved.projectName)
      setMembers(saved.members ?? members)
      await Promise.all([refreshVersions(true), refreshMessages(true)])
      setSavedOpen(true)
      notifyErdChange(`ERD 문서를 저장했습니다. 테이블 ${schema.tables.length}개, 관계 ${schema.relationships.length}개.`)
      window.setTimeout(() => setSavedOpen(false), 1800)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'ERD를 저장하지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    } finally {
      setSaving(false)
    }
  }

  function restoreHistory() {
    if (!workspaceId) {
      return
    }

    const historyKey = getErdHistoryKey(workspaceId)
    const history = readErdHistory(historyKey)
    while (history.length > 0 && history[history.length - 1] === mermaidCodeRef.current) {
      history.pop()
    }

    const backup = history.pop()
    if (!backup) {
      showAuthToast({ message: '저장된 이전 버전이 없습니다.', variant: 'error', durationMs: 1800 })
      return
    }

    writeErdHistory(historyKey, history)
    applyMermaidDraft(backup, { recordHistory: false })
    showAuthToast({ message: '이전 버전을 복구했습니다.', durationMs: 1600 })
  }

  function resetSchema() {
    if (!window.confirm('ERD를 초기화하시겠습니까?')) {
      return
    }

    syncSchema(EMPTY_SCHEMA)
    notifyErdChange('ERD 초안을 초기화했습니다.')
  }

  function addTable() {
    syncSchema({
      ...schema,
      tables: [
        ...schema.tables,
        {
          id: `t-${Date.now()}`,
          name: 'NEW_TABLE',
          columns: [{ name: 'id', type: 'BIGINT', pk: true }],
        },
      ],
    })
    notifyErdChange('ERD에 새 테이블을 추가했습니다.')
  }

  function updateTableName(index: number, value: string) {
    const oldName = schema.tables[index]?.name
    const newName = normalizeTableName(value)

    syncSchema({
      tables: schema.tables.map((table, tableIndex) =>
        tableIndex === index ? { ...table, name: newName } : table,
      ),
      relationships: schema.relationships.map((relationship) => ({
        ...relationship,
        from: relationship.from === oldName ? newName : relationship.from,
        to: relationship.to === oldName ? newName : relationship.to,
      })),
    })
  }

  function deleteTable(index: number) {
    const table = schema.tables[index]
    if (!table || !window.confirm('테이블을 삭제하시겠습니까?')) {
      return
    }

    syncSchema({
      tables: schema.tables.filter((_, tableIndex) => tableIndex !== index),
      relationships: schema.relationships.filter(
        (relationship) => relationship.from !== table.name && relationship.to !== table.name,
      ),
    })
    notifyErdChange(`ERD 테이블 "${table.name}"을 삭제했습니다.`)
  }

  function addColumn(tableIndex: number) {
    const tableName = schema.tables[tableIndex]?.name ?? '테이블'
    syncSchema({
      ...schema,
      tables: schema.tables.map((table, index) =>
        index === tableIndex
          ? {
              ...table,
              columns: [...table.columns, { name: 'new_col', type: 'VARCHAR(255)', notNull: false }],
            }
          : table,
      ),
    })
    notifyErdChange(`ERD 테이블 "${tableName}"에 컬럼을 추가했습니다.`)
  }

  function updateColumn(tableIndex: number, columnIndex: number, patch: Partial<ErdColumn>) {
    const table = schema.tables[tableIndex]
    const oldColumnName = table?.columns[columnIndex]?.name
    const newColumnName = patch.name?.trim()

    syncSchema({
      tables: schema.tables.map((table, index) =>
        index === tableIndex
          ? {
              ...table,
              columns: table.columns.map((column, currentColumnIndex) =>
                currentColumnIndex === columnIndex ? { ...column, ...patch } : column,
              ),
            }
          : table,
      ),
      relationships:
        newColumnName && oldColumnName
          ? schema.relationships.map((relationship) => ({
              ...relationship,
              fromColumn:
                relationship.from === table?.name && relationship.fromColumn === oldColumnName
                  ? newColumnName
                  : relationship.fromColumn,
              toColumn:
                relationship.to === table?.name && relationship.toColumn === oldColumnName
                  ? newColumnName
                  : relationship.toColumn,
            }))
          : schema.relationships,
    })
  }

  function togglePrimaryKey(tableIndex: number, columnIndex: number) {
    syncSchema({
      ...schema,
      tables: schema.tables.map((table, index) =>
        index === tableIndex
          ? {
              ...table,
              columns: table.columns.map((column, currentColumnIndex) => ({
                ...column,
                pk: currentColumnIndex === columnIndex ? !column.pk : false,
              })),
            }
          : table,
      ),
    })
  }

  function deleteColumn(tableIndex: number, columnIndex: number) {
    const table = schema.tables[tableIndex]
    const column = table?.columns[columnIndex]

    syncSchema({
      tables: schema.tables.map((table, index) =>
        index === tableIndex
          ? { ...table, columns: table.columns.filter((_, currentColumnIndex) => currentColumnIndex !== columnIndex) }
          : table,
      ),
      relationships:
        table && column
          ? schema.relationships.filter(
              (relationship) =>
                !(
                  (relationship.from === table.name && relationship.fromColumn === column.name) ||
                  (relationship.to === table.name && relationship.toColumn === column.name)
                ),
            )
          : schema.relationships,
    })
    if (table && column) {
      notifyErdChange(`ERD 테이블 "${table.name}"에서 컬럼 "${column.name}"을 삭제했습니다.`)
    }
  }

  function openRelationModal() {
    const firstTable = schema.tables[0]?.name ?? ''
    const secondTable = schema.tables[1]?.name ?? firstTable
    const firstColumn =
      schema.tables[0]?.columns.find((column) => column.pk)?.name ?? schema.tables[0]?.columns[0]?.name ?? ''
    const secondColumn =
      schema.tables[1]?.columns.find((column) => column.fk)?.name ??
      (firstTable && firstColumn ? `${firstTable.toLowerCase()}_${firstColumn}` : '')

    setRelationForm({
      from: firstTable,
      fromColumn: firstColumn,
      to: secondTable,
      toColumn: secondColumn,
      type: '||--|{',
      label: 'has',
      onDelete: 'RESTRICT',
      autoCreateFk: true,
    })
    setRelationModalOpen(true)
  }

  function addRelationship(event: FormEvent) {
    event.preventDefault()

    if (!relationForm.from || !relationForm.to) {
      showAuthToast({ message: '연결할 테이블을 선택해주세요.', variant: 'error', durationMs: 1800 })
      return
    }

    if (!relationForm.fromColumn) {
      showAuthToast({ message: 'PK 컬럼을 선택해주세요.', variant: 'error', durationMs: 1800 })
      return
    }

    const sourceTable = schema.tables.find((table) => table.name === relationForm.from)
    const targetTable = schema.tables.find((table) => table.name === relationForm.to)
    if (!sourceTable || !targetTable) {
      showAuthToast({ message: '선택한 테이블을 찾을 수 없습니다.', variant: 'error', durationMs: 1800 })
      return
    }

    const nextFkColumn = relationForm.toColumn.trim() || `${relationForm.from.toLowerCase()}_${relationForm.fromColumn}`
    const targetHasColumn = targetTable.columns.some((column) => column.name === nextFkColumn)
    const shouldCreateColumn = relationForm.autoCreateFk && !targetHasColumn
    const targetColumnType =
      sourceTable.columns.find((column) => column.name === relationForm.fromColumn)?.type ?? 'BIGINT'
    const nextTables = schema.tables.map((table) =>
      table.name === targetTable.name && shouldCreateColumn
        ? {
            ...table,
            columns: [
              ...table.columns,
              {
                name: nextFkColumn,
                type: targetColumnType,
                fk: true,
                notNull: relationForm.type === '||--||' || relationForm.type === '||--|{',
              },
            ],
          }
        : table.name === targetTable.name
          ? {
              ...table,
              columns: table.columns.map((column) =>
                column.name === nextFkColumn ? { ...column, fk: true } : column,
              ),
            }
          : table,
    )

    syncSchema({
      tables: nextTables,
      relationships: [
        ...schema.relationships,
        {
          id: `r-${Date.now()}`,
          from: relationForm.from,
          fromColumn: relationForm.fromColumn,
          to: relationForm.to,
          toColumn: nextFkColumn,
          type: relationForm.type,
          label: relationForm.label || 'has',
          onDelete: relationForm.onDelete,
        },
      ],
    })
    setRelationModalOpen(false)
    notifyErdChange(`ERD 관계 "${relationForm.from} -> ${relationForm.to}"를 추가했습니다.`)
  }

  function deleteRelationship(relationshipId: string) {
    const relationship = schema.relationships.find((item) => item.id === relationshipId)
    syncSchema({
      ...schema,
      relationships: schema.relationships.filter((relationship) => relationship.id !== relationshipId),
    })
    if (relationship) {
      notifyErdChange(`ERD 관계 "${relationship.from} -> ${relationship.to}"를 삭제했습니다.`)
    }
  }

  function importSql() {
    const nextSchema = parseSqlToSchema(sqlImportText)
    if (nextSchema.tables.length === 0) {
      showAuthToast({ message: '가져올 CREATE TABLE 구문을 찾지 못했습니다.', variant: 'error', durationMs: 1800 })
      return
    }

    syncSchema(nextSchema)
    setSqlImportOpen(false)
    setSqlImportText('')
    notifyErdChange(`SQL 가져오기로 ERD 테이블 ${nextSchema.tables.length}개를 생성했습니다.`)
    showAuthToast({ message: 'SQL에서 ERD를 가져왔습니다.', durationMs: 1600 })
  }

  async function refreshVersions(silent = false) {
    if (!workspaceId) {
      return
    }

    try {
      const nextVersions = await projectApiRequest<ErdVersion[]>(
        `/api/workspaces/${workspaceId}/erd/versions`,
        {},
        'required',
      )
      setVersions(nextVersions ?? [])
    } catch (loadError) {
      if (!silent) {
        const message = loadError instanceof Error ? loadError.message : '버전 기록을 불러오지 못했습니다.'
        showAuthToast({ message, variant: 'error', durationMs: 2200 })
      }
    }
  }

  async function refreshComments(silent = false) {
    if (!workspaceId) {
      return
    }

    try {
      const nextComments = await projectApiRequest<ErdComment[]>(
        `/api/workspaces/${workspaceId}/erd/comments`,
        {},
        'required',
      )
      setComments(nextComments ?? [])
    } catch (loadError) {
      if (!silent) {
        const message = loadError instanceof Error ? loadError.message : 'ERD 코멘트를 불러오지 못했습니다.'
        showAuthToast({ message, variant: 'error', durationMs: 2200 })
      }
    }
  }

  function openCommentTarget(target: ErdCommentTarget) {
    setCommentTarget(target)
    setCommentInput('')
    void refreshComments(true)
  }

  function targetComments(target: ErdCommentTarget | null) {
    if (!target) {
      return []
    }

    return comments.filter(
      (comment) => comment.targetType === target.targetType && comment.targetId === target.targetId,
    )
  }

  function commentCount(targetType: string, targetId: string) {
    return comments.filter((comment) => comment.targetType === targetType && comment.targetId === targetId).length
  }

  async function createComment() {
    const target = commentTarget
    const body = commentInput.trim()
    if (!workspaceId || !target || !body) {
      return
    }

    try {
      const created = await projectApiRequest<ErdComment>(
        `/api/workspaces/${workspaceId}/erd/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            targetType: target.targetType,
            targetId: target.targetId,
            targetLabel: target.targetLabel,
            body,
          }),
        },
        'required',
      )
      setComments((current) => [...current, created])
      setCommentInput('')
      notifyErdChange(`ERD ${target.targetLabel}에 댓글을 남겼습니다.`)
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'ERD 코멘트를 저장하지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    }
  }

  async function deleteComment(commentId: number) {
    if (!workspaceId) {
      return
    }

    const comment = comments.find((item) => item.commentId === commentId)

    try {
      await projectApiRequest<void>(
        `/api/workspaces/${workspaceId}/erd/comments/${commentId}`,
        { method: 'DELETE' },
        'required',
      )
      setComments((current) => current.filter((comment) => comment.commentId !== commentId))
      notifyErdChange(`ERD ${comment?.targetLabel ?? '댓글'} 댓글을 삭제했습니다.`)
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'ERD 코멘트를 삭제하지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    }
  }

  async function sendMessage() {
    const content = messageInput.trim()
    if (!workspaceId || !content) {
      return
    }

    try {
      const created = await projectApiRequest<TeamMessage>(
        '/api/lounge/chats/messages',
        {
          method: 'POST',
          body: JSON.stringify({ loungeId: workspaceId, content }),
        },
        'required',
      )
      setMessages((current) => [...current, created])
      setMessageInput('')
      notifyErdChange('ERD 채팅에 메시지를 보냈습니다.')
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : '메시지를 보내지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    }
  }

  function renderTeamMessage(message: TeamMessage) {
    const sender = memberById.get(message.senderId)
    const senderName = sender?.learnerName ?? message.senderName
    const imageUrl = sender?.profileImage ?? null

    if (message.isMine) {
      return (
        <div key={message.messageId} className="flex gap-3 items-start flex-row-reverse">
          <UserAvatar
            name={currentMember?.learnerName ?? senderName}
            imageUrl={currentMember?.profileImage ?? imageUrl}
            className="w-8 h-8 rounded-full border border-gray-200 bg-white shadow-sm shrink-0"
            iconClassName="text-[10px]"
          />
          <div className="text-right">
            <div className="flex items-baseline gap-2 mb-1 flex-row-reverse">
              <span className="text-xs font-bold text-gray-900">{currentMember?.learnerName ?? senderName}</span>
              <span className="text-[9px] text-gray-400">{formatRelativeTime(message.createdAt)}</span>
            </div>
            <p className="text-xs text-white bg-blue-500 p-2.5 rounded-xl rounded-tr-none leading-relaxed shadow-md inline-block text-left">
              {message.content}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div key={message.messageId} className="flex gap-3 items-start">
        <UserAvatar
          name={senderName}
          imageUrl={imageUrl}
          className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 shrink-0"
          iconClassName="text-[10px]"
        />
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-bold text-gray-900">{senderName}</span>
            <span className="text-[9px] text-gray-400">{formatRelativeTime(message.createdAt)}</span>
          </div>
          <p className="text-xs text-gray-700 bg-gray-100 p-2.5 rounded-xl rounded-tl-none leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  if (loading) return { status: 'loading' as const }

  return {
    status: 'ready' as const,
    workspaceId,
    projectName,
    schema,
    setHelpOpen,
    restoreHistory,
    resetSchema,
    saveDocument,
    saving,
    setVersionOpen,
    setSqlImportOpen,
    setChatOpen,
    messages,
    session,
    handleLogout,
    setAuthView,
    addTable,
    openRelationModal,
    validationIssues,
    updateTableName,
    openCommentTarget,
    commentCount,
    addColumn,
    deleteTable,
    updateColumn,
    deleteColumn,
    togglePrimaryKey,
    deleteRelationship,
    textareaRef,
    mermaidCode,
    handleCodeChange,
    setIsPanning,
    setPanStart,
    panOffset,
    isPanning,
    setPanOffset,
    panStart,
    setZoomLevel,
    zoomLevel,
    diagramSvg,
    diagramError,
    chatOpen,
    chatScrollRef,
    renderTeamMessage,
    messageInput,
    setMessageInput,
    sendMessage,
    versionOpen,
    versions,
    setCompareVersion,
    compareVersion,
    currentStats,
    commentTarget,
    setCommentTarget,
    targetComments,
    deleteComment,
    commentInput,
    setCommentInput,
    createComment,
    relationModalOpen,
    addRelationship,
    relationForm,
    setRelationForm,
    setRelationModalOpen,
    sqlImportOpen,
    sqlImportText,
    setSqlImportText,
    importSql,
    helpOpen,
    savedOpen,
    setSavedOpen,
    authView,
    handleAuthenticated,
  }
}

export type SquadErdReadyModel = Extract<
  ReturnType<typeof useSquadErdController>,
  { status: 'ready' }
>
