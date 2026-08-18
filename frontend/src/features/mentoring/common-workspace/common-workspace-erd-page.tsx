import { useMemo,useState,type PointerEvent as ReactPointerEvent } from 'react'
import { showAuthToast } from '../../../lib/auth-toast'
import type { WorkspaceErdDocument,WorkspaceErdVersion } from './common-types'
import { ERD_COLUMN_HEIGHT,ERD_HEADER_HEIGHT,ERD_TABLE_WIDTH,formatRelativeTime,generateMermaidErd,getErdRelationCardinality,getErdRelationshipId,normalizeErdSchema,parseErdSchema,type ErdColumnSchema,type ErdDragState,type ErdRelationshipSchema,type ErdRelationType,type ErdTableSchema,type ErdTool } from './common-workspace-support'



export function ErdPage({
  erd,
  onSaveErd,
  submitting,
}: {
  erd: WorkspaceErdDocument | null
  versions: WorkspaceErdVersion[]
  onSaveErd: (payload: { mermaidCode: string; schemaJson: string; changeSummary: string }) => Promise<void>
  submitting: boolean
}) {
  const initialSchema = useMemo(
    () => normalizeErdSchema(parseErdSchema(erd?.schemaJson, erd?.mermaidCode ?? '')),
    [erd?.schemaJson, erd?.mermaidCode],
  )
  const [tables, setTables] = useState<ErdTableSchema[]>(initialSchema.tables)
  const [relationships, setRelationships] = useState<ErdRelationshipSchema[]>(initialSchema.relationships)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(initialSchema.tables[0]?.id ?? null)
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null)
  const [tool, setTool] = useState<ErdTool>('select')
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null)
  const [relationModalOpen, setRelationModalOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [dragState, setDragState] = useState<ErdDragState | null>(null)
  const [tableCounter, setTableCounter] = useState(initialSchema.tables.length + 1)
  const [connectionCounter, setConnectionCounter] = useState(initialSchema.relationships.length + 1)
  const [dirty, setDirty] = useState(false)
  const tableById = useMemo(() => new Map(tables.map((table) => [table.id ?? table.name, table])), [tables])
  const selectedTable = selectedTableId ? tableById.get(selectedTableId) ?? null : null
  const selectedRelationship = selectedRelationshipId
    ? relationships.find((relationship) => getErdRelationshipId(relationship) === selectedRelationshipId) ?? null
    : null
  const selectedColumns = selectedTable?.columns ?? []
  const generatedMermaidCode = useMemo(() => generateMermaidErd(tables, relationships), [tables, relationships])

  function markDirty() {
    setDirty(true)
  }

  function activateTool(nextTool: ErdTool) {
    setTool(nextTool)
    setConnectSourceId(null)
    setPendingTargetId(null)
    setRelationModalOpen(false)
    setSelectedRelationshipId(null)

    if (nextTool === 'connect') {
      setSelectedTableId(null)
    }
  }

  function getTableId(table: ErdTableSchema) {
    return table.id ?? table.name
  }

  function getTableHeight(table: ErdTableSchema) {
    return ERD_HEADER_HEIGHT + Math.max(1, table.columns?.length ?? 0) * ERD_COLUMN_HEIGHT
  }

  function getConnectionGeometry(relationship: ErdRelationshipSchema) {
    const source = tableById.get(relationship.from)
    const target = tableById.get(relationship.to)

    if (!source || !target) {
      return null
    }

    const sourceX = source.x ?? 0
    const sourceY = source.y ?? 0
    const targetX = target.x ?? 0
    const targetY = target.y ?? 0
    const sourceLeftSide = sourceX > targetX
    const x1 = sourceLeftSide ? sourceX : sourceX + ERD_TABLE_WIDTH
    const x2 = sourceLeftSide ? targetX + ERD_TABLE_WIDTH : targetX
    const y1 = sourceY + getTableHeight(source) / 2
    const y2 = targetY + getTableHeight(target) / 2
    const controlOffset = Math.max(80, Math.abs(x2 - x1) / 2)
    const c1x = sourceLeftSide ? x1 - controlOffset : x1 + controlOffset
    const c2x = sourceLeftSide ? x2 + controlOffset : x2 - controlOffset
    const sourceBadgeOffset = sourceLeftSide ? -20 : 20
    const targetBadgeOffset = sourceLeftSide ? 20 : -20

    return {
      path: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2 - 12,
      startX: x1,
      startY: y1,
      endX: x2,
      endY: y2,
      sourceBadgeX: x1 + sourceBadgeOffset,
      sourceBadgeY: y1,
      targetBadgeX: x2 + targetBadgeOffset,
      targetBadgeY: y2,
    }
  }

  function handleCanvasClick() {
    if (tool === 'connect') {
      setConnectSourceId(null)
      setPendingTargetId(null)
      setSelectedRelationshipId(null)
      return
    }

    setSelectedTableId(null)
    setSelectedRelationshipId(null)
  }

  function handleTableClick(tableId: string) {
    if (tool === 'connect') {
      setSelectedRelationshipId(null)

      if (!connectSourceId) {
        setConnectSourceId(tableId)
        return
      }

      if (connectSourceId === tableId) {
        setConnectSourceId(null)
        return
      }

      setPendingTargetId(tableId)
      setRelationModalOpen(true)
      return
    }

    setSelectedTableId(tableId)
    setSelectedRelationshipId(null)
  }

  function addTable() {
    const nextId = `table-${tableCounter}`
    const offset = (tableCounter - 1) * 24

    setTables((current) => [
      ...current,
      {
        id: nextId,
        name: 'New_Table',
        x: 200 + (offset % 96),
        y: 150 + (offset % 96),
        columns: [{ name: 'id', type: 'BIGINT', key: 'PK', primary: true, foreign: false }],
      },
    ])
    setTableCounter((current) => current + 1)
    setSelectedTableId(nextId)
    activateTool('select')
    markDirty()
  }

  function deleteSelectedTable() {
    if (!selectedTableId || !window.confirm('정말 이 테이블을 삭제하시겠습니까?')) {
      return
    }

    const nextSelectedTable = tables.find((table) => getTableId(table) !== selectedTableId)

    setTables((current) => current.filter((table) => getTableId(table) !== selectedTableId))
    setSelectedTableId(nextSelectedTable ? getTableId(nextSelectedTable) : null)
    setSelectedRelationshipId(null)
    setRelationships((current) =>
      current.filter((relationship) => relationship.from !== selectedTableId && relationship.to !== selectedTableId),
    )
    markDirty()
  }

  function updateTableName(tableId: string, nextName: string) {
    setTables((current) =>
      current.map((table) => (getTableId(table) === tableId ? { ...table, name: nextName } : table)),
    )
    markDirty()
  }

  function updateTablePosition(tableId: string, x: number, y: number) {
    setTables((current) =>
      current.map((table) => (getTableId(table) === tableId ? { ...table, x, y } : table)),
    )
    markDirty()
  }

  function updateColumn(tableId: string, index: number, patch: Partial<ErdColumnSchema>) {
    setTables((current) =>
      current.map((table) => {
        if (getTableId(table) !== tableId) {
          return table
        }

        return {
          ...table,
          columns: (table.columns ?? []).map((column, columnIndex) =>
            columnIndex === index ? { ...column, ...patch } : column,
          ),
        }
      }),
    )
    markDirty()
  }

  function toggleColumnKey(tableId: string, index: number, key: 'PK' | 'FK', checked: boolean) {
    updateColumn(tableId, index, {
      key: checked ? key : null,
      primary: key === 'PK' ? checked : false,
      foreign: key === 'FK' ? checked : false,
    })
  }

  function addColumn(tableId: string) {
    setTables((current) =>
      current.map((table) => {
        if (getTableId(table) !== tableId) {
          return table
        }

        return {
          ...table,
          columns: [...(table.columns ?? []), { name: 'new_col', type: 'VARCHAR', key: null, primary: false, foreign: false }],
        }
      }),
    )
    markDirty()
  }

  function removeColumn(tableId: string, index: number) {
    setTables((current) =>
      current.map((table) => {
        if (getTableId(table) !== tableId) {
          return table
        }

        return {
          ...table,
          columns: (table.columns ?? []).filter((_, columnIndex) => columnIndex !== index),
        }
      }),
    )
    markDirty()
  }

  function startTableDrag(event: ReactPointerEvent<HTMLDivElement>, table: ErdTableSchema) {
    if (tool === 'connect') {
      return
    }

    const tableElement = event.currentTarget.closest('[data-erd-table]') as HTMLDivElement | null
    const tableId = getTableId(table)

    event.preventDefault()
    event.stopPropagation()
    tableElement?.setPointerCapture(event.pointerId)
    setSelectedTableId(tableId)
    setSelectedRelationshipId(null)
    setDragState({
      tableId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: table.x ?? 0,
      originY: table.y ?? 0,
    })
  }

  function moveTableDrag(event: ReactPointerEvent<HTMLDivElement>, tableId: string) {
    if (!dragState || dragState.tableId !== tableId || dragState.pointerId !== event.pointerId) {
      return
    }

    updateTablePosition(
      tableId,
      Math.max(0, dragState.originX + event.clientX - dragState.startX),
      Math.max(0, dragState.originY + event.clientY - dragState.startY),
    )
  }

  function endTableDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragState(null)
  }

  function confirmConnection(type: ErdRelationType) {
    if (!connectSourceId || !pendingTargetId) {
      return
    }

    const existingRelationship = relationships.find(
      (relationship) =>
        (relationship.from === connectSourceId && relationship.to === pendingTargetId) ||
        (relationship.from === pendingTargetId && relationship.to === connectSourceId),
    )

    if (existingRelationship) {
      const existingRelationshipId = getErdRelationshipId(existingRelationship)

      setRelationships((current) =>
        current.map((relationship) =>
          getErdRelationshipId(relationship) === existingRelationshipId
            ? { ...relationship, from: connectSourceId, to: pendingTargetId, label: type, type }
            : relationship,
        ),
      )
      setSelectedRelationshipId(existingRelationshipId)
      showAuthToast({ message: '기존 관계 타입을 갱신했습니다.' })
    } else {
      const nextRelationshipId = `conn-${connectionCounter}`

      setRelationships((current) => [
        ...current,
        {
          id: nextRelationshipId,
          from: connectSourceId,
          to: pendingTargetId,
          label: type,
          type,
        },
      ])
      setConnectionCounter((current) => current + 1)
      setSelectedRelationshipId(nextRelationshipId)
    }

    setTool('select')
    setSelectedTableId(null)
    setRelationModalOpen(false)
    setConnectSourceId(null)
    setPendingTargetId(null)
    markDirty()
  }

  function cancelConnection() {
    setRelationModalOpen(false)
    setConnectSourceId(null)
    setPendingTargetId(null)
  }

  function selectRelationship(relationship: ErdRelationshipSchema) {
    setSelectedRelationshipId(getErdRelationshipId(relationship))
    setSelectedTableId(null)
    setTool('select')
    setConnectSourceId(null)
    setPendingTargetId(null)
    setRelationModalOpen(false)
  }

  function updateRelationshipType(connectionId: string, type: ErdRelationType) {
    setRelationships((current) =>
      current.map((relationship) =>
        getErdRelationshipId(relationship) === connectionId ? { ...relationship, label: type, type } : relationship,
      ),
    )
    markDirty()
  }

  function deleteConnection(connectionId?: string | null) {
    if (!connectionId) {
      return
    }

    setRelationships((current) => current.filter((relationship) => getErdRelationshipId(relationship) !== connectionId))
    setSelectedRelationshipId((current) => (current === connectionId ? null : current))
    markDirty()
  }

  function deleteSelectedElement() {
    if (selectedRelationshipId) {
      deleteConnection(selectedRelationshipId)
      return
    }

    deleteSelectedTable()
  }

  async function handleSave() {
    await onSaveErd({
      mermaidCode: generatedMermaidCode,
      schemaJson: JSON.stringify({ tables, relationships }),
      changeSummary: 'ERD Visual Builder update',
    })
    setSaveModalOpen(false)
    setDirty(false)
  }

  const selectedTablePanelId = selectedTable ? getTableId(selectedTable) : null
  const selectedRelationshipSource = selectedRelationship ? tableById.get(selectedRelationship.from) ?? null : null
  const selectedRelationshipTarget = selectedRelationship ? tableById.get(selectedRelationship.to) ?? null : null
  const selectedRelationshipType = (selectedRelationship?.type ?? selectedRelationship?.label ?? '1:N') as ErdRelationType

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <i className="fas fa-project-diagram text-[#00C471]"></i>
            시각적 ERD 설계
          </h2>
          <div className="mx-1 h-5 w-px bg-gray-300"></div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
            onClick={addTable}
          >
            <i className="fas fa-plus"></i>
            테이블 추가
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="mr-2 text-xs font-bold text-gray-500">
            <i className="fas fa-cloud-upload-alt mr-1 text-[#00C471]"></i>
            {dirty ? '저장되지 않은 변경사항 있음' : '모든 변경사항 저장됨'}
          </div>
          <button
            type="button"
            onClick={() => showAuthToast({ message: 'ERD 내보내기는 캔버스 저장 API가 붙으면 연결됩니다.' })}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <i className="fas fa-download"></i>
            내보내기
          </button>
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className="fas fa-save"></i>
            버전 저장
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section
          className="relative min-w-0 flex-1 overflow-hidden bg-[#F8F9FA]"
          style={{
            backgroundImage: 'radial-gradient(#D1D5DB 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
          onClick={handleCanvasClick}
        >
          <div className="absolute left-4 top-4 z-30 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-md">
            <button
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                tool === 'select' ? 'bg-[#00C471]/10 text-[#00C471]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="선택 도구"
              onClick={(event) => {
                event.stopPropagation()
                activateTool('select')
              }}
            >
              <i className="fas fa-mouse-pointer"></i>
            </button>
            <button
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                tool === 'connect' ? 'bg-[#00C471]/10 text-[#00C471]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="관계선 연결"
              onClick={(event) => {
                event.stopPropagation()
                activateTool('connect')
              }}
            >
              <i className="fas fa-link"></i>
            </button>
            <div className="mx-auto my-1 h-px w-6 bg-gray-200"></div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              title="선택 삭제"
              disabled={!selectedTableId && !selectedRelationshipId}
              onClick={(event) => {
                event.stopPropagation()
                deleteSelectedElement()
              }}
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>

          {tool === 'connect' ? (
            <div className="absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-lg">
              {connectSourceId ? '연결할 대상 테이블을 클릭하세요.' : '연결할 시작 테이블을 클릭하세요.'}
            </div>
          ) : null}

          <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible">
            {relationships.map((relationship) => {
              const geometry = getConnectionGeometry(relationship)

              if (!geometry) {
                return null
              }

              const relationshipId = getErdRelationshipId(relationship)
              const selected = selectedRelationshipId === relationshipId

              return (
                <path
                  key={relationshipId}
                  d={geometry.path}
                  className={`connection-line pointer-events-auto cursor-pointer! fill-none! [transition:filter_0.2s_ease,stroke_0.2s_ease,stroke-width_0.2s_ease]! ${
                    selected
                      ? 'selected stroke-[#00C471]! [stroke-width:3.5]! [filter:drop-shadow(0_0_5px_rgba(0,196,113,0.28))]! hover:stroke-[#00C471]! hover:[stroke-width:3.5]!'
                      : 'stroke-[#9CA3AF]! [stroke-width:2.5]! [filter:drop-shadow(0_1px_1px_rgba(15,23,42,0.08))]! hover:stroke-[#00C471]! hover:[stroke-width:3]!'
                  }`}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectRelationship(relationship)
                  }}
                />
              )
            })}
          </svg>

          <div className="pointer-events-none absolute inset-0 z-[6]">
            {relationships.map((relationship) => {
              const geometry = getConnectionGeometry(relationship)

              if (!geometry) {
                return null
              }

              const relationshipId = getErdRelationshipId(relationship)
              const selected = selectedRelationshipId === relationshipId
              const cardinality = getErdRelationCardinality(relationship.type ?? relationship.label)

              return (
                <div key={`overlay-${relationshipId}`}>
                  <span
                    className={`erd-anchor-dot pointer-events-none! absolute! h-[10px]! w-[10px]! rounded-full! border-[2px]! bg-white! [transform:translate(-50%,-50%)]! ${
                      selected
                        ? 'selected border-[#00C471]! shadow-[0_0_0_4px_rgba(0,196,113,0.14)]!'
                        : 'border-[#9CA3AF]! shadow-[0_1px_3px_rgba(15,23,42,0.14)]!'
                    }`}
                    style={{ left: geometry.startX, top: geometry.startY }}
                  />
                  <span
                    className={`erd-anchor-dot pointer-events-none! absolute! h-[10px]! w-[10px]! rounded-full! border-[2px]! bg-white! [transform:translate(-50%,-50%)]! ${
                      selected
                        ? 'selected border-[#00C471]! shadow-[0_0_0_4px_rgba(0,196,113,0.14)]!'
                        : 'border-[#9CA3AF]! shadow-[0_1px_3px_rgba(15,23,42,0.14)]!'
                    }`}
                    style={{ left: geometry.endX, top: geometry.endY }}
                  />
                  <span
                    className={`erd-cardinality-badge pointer-events-none! absolute! flex! h-[24px]! w-[24px]! items-center! justify-center! rounded-full! border-[1px]! font-['Pretendard',Inter,system-ui,sans-serif]! text-[10px]! leading-[1]! font-black! [transform:translate(-50%,-50%)]! ${
                      selected
                        ? `selected border-[#00C471]! shadow-[0_0_0_4px_rgba(0,196,113,0.16),0_4px_10px_rgba(15,23,42,0.14)]! ${
                            cardinality.source === 'N'
                              ? 'many bg-[#00C471]! text-white!'
                              : 'one bg-white! text-[#374151]!'
                          }`
                        : cardinality.source === 'N'
                          ? 'many border-[#111827]! bg-[#111827]! text-white! shadow-[0_4px_10px_rgba(15,23,42,0.14)]!'
                          : 'one border-[#D1D5DB]! bg-white! text-[#374151]! shadow-[0_4px_10px_rgba(15,23,42,0.14)]!'
                    }`}
                    style={{ left: geometry.sourceBadgeX, top: geometry.sourceBadgeY }}
                  >
                    {cardinality.source}
                  </span>
                  <span
                    className={`erd-cardinality-badge pointer-events-none! absolute! flex! h-[24px]! w-[24px]! items-center! justify-center! rounded-full! border-[1px]! font-['Pretendard',Inter,system-ui,sans-serif]! text-[10px]! leading-[1]! font-black! [transform:translate(-50%,-50%)]! ${
                      selected
                        ? `selected border-[#00C471]! shadow-[0_0_0_4px_rgba(0,196,113,0.16),0_4px_10px_rgba(15,23,42,0.14)]! ${
                            cardinality.target === 'N'
                              ? 'many bg-[#00C471]! text-white!'
                              : 'one bg-white! text-[#374151]!'
                          }`
                        : cardinality.target === 'N'
                          ? 'many border-[#111827]! bg-[#111827]! text-white! shadow-[0_4px_10px_rgba(15,23,42,0.14)]!'
                          : 'one border-[#D1D5DB]! bg-white! text-[#374151]! shadow-[0_4px_10px_rgba(15,23,42,0.14)]!'
                    }`}
                    style={{ left: geometry.targetBadgeX, top: geometry.targetBadgeY }}
                  >
                    {cardinality.target}
                  </span>
                  <button
                    type="button"
                    className={`erd-relation-label pointer-events-auto absolute inline-flex! h-[22px]! min-w-[42px]! items-center! justify-center! rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-gray-500 shadow-sm transition box-border! [transform:translate(-50%,-50%)]! hover:border-[#00C471] hover:bg-green-50 hover:text-[#00C471] ${
                      selected
                        ? 'selected border-[#00C471]! bg-[#ECFDF5]! text-[#059669]! shadow-[0_0_0_4px_rgba(0,196,113,0.13),0_4px_10px_rgba(15,23,42,0.1)]!'
                        : ''
                    }`}
                    style={{ left: geometry.labelX, top: geometry.labelY }}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectRelationship(relationship)
                    }}
                  >
                    {relationship.type ?? relationship.label ?? '1:N'}
                  </button>
                </div>
              )
            })}
          </div>

          {tables.length === 0 ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white text-3xl text-gray-300 shadow-sm">
                <i className="fas fa-project-diagram"></i>
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-gray-600">생성된 테이블이 없습니다</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                상단의 <span className="mx-1 rounded bg-gray-100 px-2 py-0.5 font-bold text-gray-600">+ 테이블 추가</span> 버튼을 눌러
                <br />
                새로운 ERD 설계를 시작해 보세요.
              </p>
            </div>
          ) : null}

          <div className="relative z-10 h-full w-full">
            {tables.map((table) => {
              const tableId = getTableId(table)
              const active = selectedTableId === tableId
              const connectSource = connectSourceId === tableId

              return (
                <div
                  data-erd-table="true"
                  role="button"
                  tabIndex={0}
                  key={tableId}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleTableClick(tableId)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleTableClick(tableId)
                    }
                  }}
                  onPointerMove={(event) => moveTableDrag(event, tableId)}
                  onPointerUp={endTableDrag}
                  onPointerCancel={endTableDrag}
                  className={`erd-visual-table absolute flex w-[240px] flex-col overflow-hidden rounded-lg border-2 bg-white text-left shadow-xl transition select-none! ${
                    active
                      ? 'selected z-50! border-[#00C471] ring-4 ring-[#00C471]/15'
                      : connectSource
                        ? 'connect-source z-50! border-[#3B82F6]! shadow-[0_0_0_4px_rgba(59,130,246,0.16),0_20px_25px_-5px_rgba(15,23,42,0.12)]!'
                        : 'z-10! border-gray-200 hover:border-[#00C471]/70'
                  }`}
                  style={{ left: table.x ?? 0, top: table.y ?? 0 }}
                >
                  <div
                    className={`table-header flex w-full items-center justify-between border-b border-gray-900 bg-gray-800 px-3 py-2.5 text-sm font-bold text-white ${
                      tool === 'connect' ? 'cursor-pointer' : 'cursor-move'
                    }`}
                    onPointerDown={(event) => startTableDrag(event, table)}
                  >
                    <span className="w-full truncate text-center">{table.name || 'Unnamed'}</span>
                  </div>
                  <div className="w-full bg-white text-xs">
                    {(table.columns ?? []).length > 0 ? (
                      (table.columns ?? []).map((column, index) => {
                        const key = column.key?.toUpperCase()
                        const primary = column.primary || key === 'PK'
                        const foreign = column.foreign || key === 'FK'

                        return (
                          <div
                            key={`${tableId}-${column.name}-${index}`}
                            className={`flex min-h-[33px] items-center justify-between border-b border-gray-100 px-3 py-2 ${
                              primary ? 'bg-yellow-50/70' : foreign ? 'bg-gray-50' : 'bg-white'
                            }`}
                          >
                            <span className={`min-w-0 truncate font-bold ${primary ? 'text-gray-900' : 'text-gray-700'}`}>
                              {primary ? <i className="fas fa-key mr-1.5 text-yellow-500"></i> : null}
                              {foreign ? <i className="fas fa-link mr-1.5 text-gray-400"></i> : null}
                              {column.name || 'col'}
                            </span>
                            <span className="ml-2 shrink-0 font-mono text-gray-500">{column.type ?? 'VARCHAR'}</span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex min-h-[33px] items-center justify-center border-b border-gray-100 px-3 py-2 text-xs font-bold text-gray-300">
                        컬럼 없음
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="z-20 flex h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-white shadow-sm">
          {selectedTable && selectedTablePanelId ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                <h3 className="text-sm font-extrabold text-gray-900">
                  <i className="fas fa-sliders-h mr-1 text-[#00C471]"></i>
                  테이블 속성 편집
                </h3>
              </div>

              <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-600">테이블 명</label>
                  <input
                    type="text"
                    value={selectedTable.name}
                    onChange={(event) => updateTableName(selectedTablePanelId, event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none transition focus:border-[#00C471] focus:ring-4 focus:ring-[#00C471]/10"
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-end justify-between border-b border-gray-100 pb-2">
                    <label className="block text-xs font-extrabold text-gray-900">컬럼 (Columns)</label>
                    <button
                      type="button"
                      className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold text-[#00C471] shadow-sm transition hover:bg-green-100"
                      onClick={() => addColumn(selectedTablePanelId)}
                    >
                      + 컬럼 추가
                    </button>
                  </div>
                  <div className="erd-column-list gap-[4px]! space-y-[4px]!">
                    {selectedColumns.length > 0 ? (
                      selectedColumns.map((column, index) => {
                        const key = column.key?.toUpperCase()
                        const primary = column.primary || key === 'PK'
                        const foreign = column.foreign || key === 'FK'

                        return (
                          <div
                            key={`${selectedTablePanelId}-panel-${column.name}-${index}`}
                            className="erd-column-editor grid! w-full! max-w-full! grid-cols-[14px_minmax(0,1fr)_22px]! items-start gap-[8px]! overflow-hidden! rounded-[10px]! border border-gray-200 bg-white p-[8px]! shadow-sm box-border!"
                          >
                            <i className="fas fa-grip-lines mt-2 cursor-move text-xs text-gray-300"></i>
                            <div className="erd-column-main flex min-w-0! max-w-full! flex-col gap-2">
                              <div className="erd-column-row grid! w-full! min-w-0! max-w-full! grid-cols-[minmax(0,1fr)_86px]! items-center! gap-[8px]!">
                                <input
                                  type="text"
                                  value={column.name}
                                  onChange={(event) => updateColumn(selectedTablePanelId, index, { name: event.target.value })}
                                  className="erd-column-name-input h-[26px]! w-full! min-w-0! max-w-full! flex-[1_1_0]! rounded-[4px]! border border-gray-200 bg-gray-50 px-[6px]! py-[4px]! font-bold outline-none transition box-border! focus:border-[#00C471] focus:bg-white"
                                  style={{ height: 26 }}
                                />
                                <select
                                  value={column.type ?? 'VARCHAR'}
                                  onChange={(event) => updateColumn(selectedTablePanelId, index, { type: event.target.value })}
                                  className="erd-column-type-select h-[26px]! w-[86px]! min-w-0! max-w-[86px]! flex-[0_0_86px]! appearance-none! rounded-[4px]! border border-gray-200 bg-gray-50 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2024%2024%27%20stroke=%27%236B7280%27%3E%3Cpath%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27M19%209l-7%207-7-7%27%3E%3C/path%3E%3C/svg%3E')]! bg-[position:right_5px_center]! bg-[length:12px_12px]! bg-no-repeat! py-[4px]! pr-[18px]! pl-[6px]! font-mono outline-none transition box-border! focus:border-[#00C471]"
                                  style={{ width: 86, height: 26 }}
                                >
                                  <option>BIGINT</option>
                                  <option>INT</option>
                                  <option>VARCHAR</option>
                                  <option>DATETIME</option>
                                </select>
                              </div>
                              <div className="erd-column-flags flex items-center gap-[4px]! pl-0!">
                                <label
                                  className={`erd-column-flag-label flex h-[22px]! min-w-[28px]! cursor-pointer items-center gap-[4px]! rounded-[6px]! border-[1px]! border-[#E5E7EB]! bg-white! px-[6px]! py-0! box-border! ${
                                    primary ? 'text-yellow-600' : 'text-gray-400'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="m-0! h-[12px]! w-[12px]! accent-yellow-500"
                                    checked={primary}
                                    onChange={(event) => toggleColumnKey(selectedTablePanelId, index, 'PK', event.target.checked)}
                                  />
                                  PK
                                </label>
                                <label
                                  className={`erd-column-flag-label flex h-[22px]! min-w-[28px]! cursor-pointer items-center gap-[4px]! rounded-[6px]! border-[1px]! border-[#E5E7EB]! bg-white! px-[6px]! py-0! box-border! ${
                                    foreign ? 'text-blue-600' : 'text-gray-400'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="m-0! h-[12px]! w-[12px]! accent-blue-500"
                                    checked={foreign}
                                    onChange={(event) => toggleColumnKey(selectedTablePanelId, index, 'FK', event.target.checked)}
                                  />
                                  FK
                                </label>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="erd-column-delete-button mt-[2px]! h-[22px]! w-[22px]! min-w-[22px]! rounded-[6px]! p-0! text-gray-300 transition hover:text-red-500"
                              onClick={() => removeColumn(selectedTablePanelId, index)}
                              aria-label="컬럼 삭제"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        )
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs font-bold text-gray-400">
                        컬럼이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-white p-4">
                <p className="mb-3 text-[10px] font-bold text-gray-400">
                  최근 저장 v{erd?.version ?? 0} · {erd?.updatedAt ? formatRelativeTime(erd.updatedAt) : '저장 이력 없음'}
                </p>
                <button
                  type="button"
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-100"
                  onClick={deleteSelectedTable}
                >
                  <i className="fas fa-trash-alt mr-1"></i>
                  이 테이블 삭제
                </button>
              </div>
            </>
          ) : selectedRelationship && selectedRelationshipId ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                <h3 className="text-sm font-extrabold text-gray-900">
                  <i className="fas fa-link mr-1 text-[#00C471]"></i>
                  관계선 속성
                </h3>
              </div>

              <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-gray-400">Connection</p>
                  <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                    <span className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-center">
                      {selectedRelationshipSource?.name ?? selectedRelationship.from}
                    </span>
                    <i className="fas fa-arrow-right text-xs text-[#00C471]"></i>
                    <span className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-center">
                      {selectedRelationshipTarget?.name ?? selectedRelationship.to}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-xs font-extrabold text-gray-900">관계 타입</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1:1', '1:N', 'N:M'] as ErdRelationType[]).map((type) => (
                      <button
                        type="button"
                        key={type}
                        className={`rounded-xl border px-2 py-2 text-xs font-extrabold transition ${
                          selectedRelationshipType === type
                            ? 'border-[#00C471] bg-green-50 text-[#00C471]'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-[#00C471] hover:text-[#00C471]'
                        }`}
                        onClick={() => updateRelationshipType(selectedRelationshipId, type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-white p-4">
                <button
                  type="button"
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-100"
                  onClick={() => deleteConnection(selectedRelationshipId)}
                >
                  <i className="fas fa-trash-alt mr-1"></i>
                  선택한 관계선 삭제
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-2xl text-gray-300">
                <i className="fas fa-mouse-pointer"></i>
              </div>
              <p className="mb-1 text-sm font-bold text-gray-700">선택된 요소가 없습니다.</p>
              <p className="text-xs leading-relaxed text-gray-500">캔버스에서 테이블을 선택하세요.</p>
            </div>
          )}
        </aside>
      </div>

      {relationModalOpen ? (
        <div className="mentoring-workspace-modal-overlay fixed inset-0 z-[1100] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="modal-content w-full max-w-xs overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="mb-4 text-lg font-extrabold text-gray-900">관계 타입 선택</h3>
            <p className="mb-6 text-xs text-gray-500">두 테이블 간의 관계(Relation)를 선택하세요.</p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="rounded-xl border border-gray-200 py-3 font-bold text-gray-700 shadow-sm transition hover:border-[#00C471] hover:bg-green-50 hover:text-[#00C471]"
                onClick={() => confirmConnection('1:1')}
              >
                1 : 1 관계
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#00C471] bg-green-50 py-3 font-bold text-[#00C471] shadow-sm transition hover:bg-green-100"
                onClick={() => confirmConnection('1:N')}
              >
                1 : N 관계
              </button>
              <button
                type="button"
                className="rounded-xl border border-gray-200 py-3 font-bold text-gray-700 shadow-sm transition hover:border-[#00C471] hover:bg-green-50 hover:text-[#00C471]"
                onClick={() => confirmConnection('N:M')}
              >
                N : M 관계
              </button>
            </div>

            <button type="button" className="mt-6 text-xs font-bold text-gray-400 transition hover:text-gray-700" onClick={cancelConnection}>
              취소
            </button>
          </div>
        </div>
      ) : null}

      {saveModalOpen ? (
        <div className="mentoring-workspace-modal-overlay fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="modal-content w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-save text-[#00C471]"></i>
                ERD 저장
              </h3>
              <button type="button" className="text-gray-400 transition hover:text-gray-900" onClick={() => setSaveModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mt-10 flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-700"
                onClick={() => setSaveModalOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-xl bg-gray-900 px-8 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                onClick={handleSave}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
