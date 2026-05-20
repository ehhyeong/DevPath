import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import UserAvatar from './components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { projectApiRequest } from './project-api'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

type ErdColumn = {
  name: string
  type: string
  pk?: boolean
  fk?: boolean
  notNull?: boolean
  unique?: boolean
  indexed?: boolean
  defaultValue?: string
  autoIncrement?: boolean
  check?: string
}

type ErdTable = {
  id: string
  name: string
  columns: ErdColumn[]
}

type ErdRelationship = {
  id: string
  from: string
  to: string
  type: string
  label: string
  fromColumn?: string
  toColumn?: string
  onDelete?: 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'NO ACTION'
}

type ErdSchema = {
  tables: ErdTable[]
  relationships: ErdRelationship[]
}

type ErdDocument = {
  workspaceId: number
  projectName: string
  mermaidCode: string
  schemaJson: string
  version: number
  updatedById?: number | null
  updatedByName?: string | null
  updatedAt?: string | null
  members: WorkspaceMember[]
}

type TeamMessage = {
  messageId: number
  loungeId: number
  senderId: number
  senderName: string
  content: string
  createdAt?: string | null
  isMine: boolean
}

type ErdVersion = {
  versionId: number
  workspaceId: number
  version: number
  mermaidCode: string
  schemaJson: string
  summary?: string | null
  updatedById?: number | null
  updatedByName?: string | null
  discussionMessageId?: number | null
  createdAt?: string | null
}

type ErdComment = {
  commentId: number
  workspaceId: number
  targetType: string
  targetId: string
  targetLabel?: string | null
  authorId: number
  authorName: string
  body: string
  isMine: boolean
  createdAt?: string | null
}

type ErdCommentTarget = {
  targetType: string
  targetId: string
  targetLabel: string
}

type MermaidApi = {
  initialize: (options: Record<string, unknown>) => void
  render: (id: string, code: string) => Promise<{ svg: string }> | { svg: string }
}

declare global {
  interface Window {
    mermaid?: MermaidApi
  }
}

const EMPTY_SCHEMA: ErdSchema = {
  tables: [],
  relationships: [],
}

const DEFAULT_MERMAID_CODE = 'erDiagram\n'
const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js'
const ERD_DRAFT_KEY_PREFIX = 'workspace-erd-backup-'
const ERD_HISTORY_KEY_PREFIX = 'workspace-erd-history-'
const ERD_HISTORY_LIMIT = 30

const SQL_TYPE_OPTIONS = ['BIGINT', 'INT', 'VARCHAR(255)', 'TEXT', 'DATETIME', 'BOOLEAN', 'DECIMAL(10,2)']

const RELATIONSHIP_TYPE_OPTIONS = [
  { value: '||--||', label: '1 : 1', description: 'required one to required one' },
  { value: '||--|{', label: '1 : N', description: 'required one to required many' },
  { value: '|o--||', label: '0 : 1', description: 'optional one to required one' },
  { value: '||--o{', label: '0 : N', description: 'required one to optional many' },
  { value: '}o--o{', label: 'N : M', description: 'many to many, join table recommended' },
]

const ON_DELETE_OPTIONS = ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'] as const

let mermaidLoadPromise: Promise<MermaidApi> | null = null

function getErdDraftKey(workspaceId: number) {
  return `${ERD_DRAFT_KEY_PREFIX}${workspaceId}`
}

function getErdHistoryKey(workspaceId: number) {
  return `${ERD_HISTORY_KEY_PREFIX}${workspaceId}`
}

function readErdHistory(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeErdHistory(key: string, history: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(history.slice(-ERD_HISTORY_LIMIT)))
  } catch {
    // Local backup should never block the ERD editor.
  }
}

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) {
    return '방금 전'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  if (diffDays === 1) {
    return '어제'
  }

  return `${diffDays}일 전`
}

function safeSchemaFromJson(value?: string | null): ErdSchema {
  if (!value) {
    return EMPTY_SCHEMA
  }

  try {
    const parsed = JSON.parse(value) as ErdSchema
    if (!Array.isArray(parsed.tables) || !Array.isArray(parsed.relationships)) {
      return EMPTY_SCHEMA
    }

    return {
      tables: parsed.tables.map((table, index) => ({
        id: table.id || `t-${index}`,
        name: table.name || `TABLE_${index + 1}`,
        columns: Array.isArray(table.columns)
          ? table.columns.map((column) => ({
              name: column.name || 'column_name',
              type: column.type || 'VARCHAR(255)',
              pk: Boolean(column.pk),
              fk: Boolean(column.fk),
              notNull: Boolean(column.notNull),
              unique: Boolean(column.unique),
              indexed: Boolean(column.indexed),
              defaultValue: column.defaultValue || '',
              autoIncrement: Boolean(column.autoIncrement),
              check: column.check || '',
            }))
          : [],
      })),
      relationships: parsed.relationships.map((relationship, index) => ({
        id: relationship.id || `r-${index}`,
        from: relationship.from,
        to: relationship.to,
        type: relationship.type || '||--|{',
        label: relationship.label || 'has',
        fromColumn: relationship.fromColumn || '',
        toColumn: relationship.toColumn || '',
        onDelete: ON_DELETE_OPTIONS.includes(relationship.onDelete ?? 'RESTRICT')
          ? relationship.onDelete
          : 'RESTRICT',
      })),
    }
  } catch {
    return EMPTY_SCHEMA
  }
}

function normalizeTableName(value: string) {
  const nextValue = value.trim().replace(/\s+/g, '_').toUpperCase()
  return nextValue || 'NEW_TABLE'
}

function generateMermaidCode(schema: ErdSchema) {
  let code = 'erDiagram\n'

  schema.tables.forEach((table) => {
    code += `    ${table.name} {\n`
    table.columns.forEach((column) => {
      const type = column.type.split('(')[0].toLowerCase()
      const keys = [column.pk ? 'PK' : null, column.fk ? 'FK' : null, column.unique ? 'UK' : null]
        .filter(Boolean)
        .join(', ')
      const comment = [
        column.notNull ? 'NOT NULL' : null,
        column.indexed ? 'INDEX' : null,
        column.autoIncrement ? 'AUTO_INCREMENT' : null,
        column.defaultValue ? `DEFAULT ${column.defaultValue}` : null,
        column.check ? `CHECK ${column.check}` : null,
      ]
        .filter(Boolean)
        .join('; ')
      code += `        ${type} ${column.name}${keys ? ` ${keys}` : ''}${comment ? ` "${comment}"` : ''}\n`
    })
    code += '    }\n'
  })

  schema.relationships.forEach((relationship) => {
    const labelParts = [
      relationship.label || 'relates',
      relationship.fromColumn && relationship.toColumn ? `${relationship.fromColumn} -> ${relationship.toColumn}` : null,
    ].filter(Boolean)
    code += `    ${relationship.from} ${relationship.type} ${relationship.to} : "${labelParts.join(' | ')}"\n`
  })

  return code
}

function parseMermaidCode(code: string): ErdSchema {
  const tables: ErdTable[] = []
  const relationships: ErdRelationship[] = []
  let activeTable: ErdTable | null = null

  for (const rawLine of code.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('%%') || line.toLowerCase() === 'erdiagram') {
      continue
    }

    const tableMatch = line.match(/^([^\s{}]+)\s*\{$/)
    if (tableMatch) {
      activeTable = {
        id: `t-${tableMatch[1]}-${tables.length}`,
        name: tableMatch[1],
        columns: [],
      }
      tables.push(activeTable)
      continue
    }

    if (line === '}') {
      activeTable = null
      continue
    }

    if (activeTable) {
      const commentMatch = line.match(/"([^"]*)"\s*$/)
      const commentText = commentMatch?.[1] ?? ''
      const normalizedLine = commentMatch ? line.slice(0, commentMatch.index).trim() : line
      const parts = normalizedLine.split(/\s+/)
      if (parts.length >= 2) {
        const keyText = parts.slice(2).join(' ').toUpperCase()
        const normalizedComment = commentText.toUpperCase()
        const defaultMatch = commentText.match(/DEFAULT\s+([^;]+)/i)
        const checkMatch = commentText.match(/CHECK\s+([^;]+)/i)
        activeTable.columns.push({
          type: parts[0].toUpperCase(),
          name: parts[1],
          pk: keyText.includes('PK'),
          fk: keyText.includes('FK'),
          notNull: keyText.includes('NOT NULL') || keyText.includes('NN') || normalizedComment.includes('NOT NULL'),
          unique: keyText.includes('UK') || keyText.includes('UNIQUE'),
          indexed: keyText.includes('IX') || keyText.includes('INDEX') || normalizedComment.includes('INDEX'),
          autoIncrement:
            keyText.includes('AUTO_INCREMENT') ||
            keyText.includes('IDENTITY') ||
            normalizedComment.includes('AUTO_INCREMENT'),
          defaultValue: defaultMatch?.[1]?.trim() ?? '',
          check: checkMatch?.[1]?.trim() ?? '',
        })
      }
      continue
    }

    const relationshipMatch = line.match(/^([^\s{}]+)\s+([|}{o\-.]+)\s+([^\s{}]+)\s*:\s*"?([^"]*)"?$/)
    if (relationshipMatch) {
      relationships.push({
        id: `r-${relationships.length}`,
        from: relationshipMatch[1],
        type: relationshipMatch[2],
        to: relationshipMatch[3],
        label: (relationshipMatch[4] || 'relates').split('|')[0]?.trim() || 'relates',
        fromColumn: relationshipMatch[4]?.match(/([\w"'.]+)\s*->\s*([\w"'.]+)/)?.[1]?.trim() ?? '',
        toColumn: relationshipMatch[4]?.match(/([\w"'.]+)\s*->\s*([\w"'.]+)/)?.[2]?.trim() ?? '',
        onDelete: 'RESTRICT',
      })
    }
  }

  return { tables, relationships }
}

function quoteIdentifier(value: string) {
  const trimmed = value.trim()
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return trimmed
  }

  return `"${trimmed.replaceAll('"', '""')}"`
}

function sqlColumnType(column: ErdColumn) {
  const upperType = column.type.toUpperCase()
  if (!column.autoIncrement) {
    return column.type
  }

  if (upperType === 'BIGINT') {
    return 'BIGINT GENERATED BY DEFAULT AS IDENTITY'
  }

  if (upperType === 'INT' || upperType === 'INTEGER') {
    return 'INTEGER GENERATED BY DEFAULT AS IDENTITY'
  }

  return column.type
}

function buildSql(schema: ErdSchema) {
  let sql = '-- Created by DevPath Architect\n\n'

  schema.tables.forEach((table) => {
    const tableName = quoteIdentifier(table.name)
    const lines = table.columns.map((column) => {
      const columnParts = [`    ${quoteIdentifier(column.name)} ${sqlColumnType(column)}`]
      if (column.pk || column.notNull) {
        columnParts.push('NOT NULL')
      }
      if (column.defaultValue) {
        columnParts.push(`DEFAULT ${column.defaultValue}`)
      }
      if (column.check) {
        columnParts.push(`CHECK (${column.check})`)
      }
      return columnParts.join(' ')
    })
    const primaryColumns = table.columns.filter((column) => column.pk)
    if (primaryColumns.length > 0) {
      lines.push(
        `    CONSTRAINT ${quoteIdentifier(`pk_${table.name}`)} PRIMARY KEY (${primaryColumns
          .map((column) => quoteIdentifier(column.name))
          .join(', ')})`,
      )
    }

    table.columns
      .filter((column) => column.unique && !column.pk)
      .forEach((column) => {
        lines.push(
          `    CONSTRAINT ${quoteIdentifier(`uq_${table.name}_${column.name}`)} UNIQUE (${quoteIdentifier(column.name)})`,
        )
      })

    schema.relationships
      .filter((relationship) => relationship.to === table.name && relationship.fromColumn && relationship.toColumn)
      .filter((relationship) => relationship.type !== '}o--o{')
      .forEach((relationship) => {
        const onDelete = relationship.onDelete ?? 'RESTRICT'
        lines.push(
          `    CONSTRAINT ${quoteIdentifier(`fk_${relationship.to}_${relationship.toColumn}`)} FOREIGN KEY (${quoteIdentifier(
            relationship.toColumn ?? '',
          )}) REFERENCES ${quoteIdentifier(relationship.from)} (${quoteIdentifier(relationship.fromColumn ?? '')}) ON DELETE ${onDelete}`,
        )
      })

    sql += `CREATE TABLE ${tableName} (\n`
    sql += lines.join(',\n')
    sql += '\n);\n\n'

    table.columns
      .filter((column) => column.indexed && !column.unique && !column.pk)
      .forEach((column) => {
        sql += `CREATE INDEX ${quoteIdentifier(`idx_${table.name}_${column.name}`)} ON ${tableName} (${quoteIdentifier(
          column.name,
        )});\n`
      })
    if (table.columns.some((column) => column.indexed && !column.unique && !column.pk)) {
      sql += '\n'
    }
  })

  const manyToMany = schema.relationships.filter((relationship) => relationship.type === '}o--o{')
  manyToMany.forEach((relationship) => {
    sql += `-- ${relationship.from} <-> ${relationship.to} is N:M. Create a join table before adding foreign keys.\n`
  })

  return sql
}

function exportSql(schema: ErdSchema) {
  const sql = buildSql(schema)
  const blob = new Blob([sql], { type: 'text/plain' })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = 'schema.sql'
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

function cleanSqlIdentifier(value: string) {
  return value.trim().replace(/^"|"$/g, '').replace(/^\[|\]$/g, '').replace(/`/g, '')
}

function splitSqlDefinitions(value: string) {
  const definitions: string[] = []
  let current = ''
  let depth = 0
  let quote: string | null = null

  for (const char of value) {
    if ((char === '"' || char === "'" || char === '`') && quote === null) {
      quote = char
    } else if (quote === char) {
      quote = null
    }

    if (!quote && char === '(') {
      depth += 1
    }

    if (!quote && char === ')') {
      depth = Math.max(0, depth - 1)
    }

    if (!quote && depth === 0 && char === ',') {
      definitions.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    definitions.push(current.trim())
  }

  return definitions
}

function parseColumnDefinition(definition: string): ErdColumn | null {
  const match = definition.match(/^("[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s]+)\s+(.+)$/)
  if (!match) {
    return null
  }

  const name = cleanSqlIdentifier(match[1])
  const rest = match[2].trim()
  const typeMatch = rest.match(
    /^(.+?)(?=\s+(PRIMARY\s+KEY|NOT\s+NULL|UNIQUE|DEFAULT|CHECK|REFERENCES|GENERATED|AUTO_INCREMENT)\b|$)/i,
  )
  const type = typeMatch?.[1]?.trim() || 'VARCHAR(255)'
  const defaultMatch = rest.match(/\bDEFAULT\s+(.+?)(?=\s+CHECK\b|\s+REFERENCES\b|$)/i)
  const checkMatch = rest.match(/\bCHECK\s*\((.+)\)/i)

  return {
    name,
    type: type.toUpperCase(),
    pk: /\bPRIMARY\s+KEY\b/i.test(rest),
    fk: /\bREFERENCES\b/i.test(rest),
    notNull: /\bNOT\s+NULL\b/i.test(rest),
    unique: /\bUNIQUE\b/i.test(rest),
    indexed: false,
    defaultValue: defaultMatch?.[1]?.trim() ?? '',
    autoIncrement: /\b(AUTO_INCREMENT|IDENTITY|SERIAL)\b/i.test(rest) || /\b(BIGSERIAL|SERIAL)\b/i.test(type),
    check: checkMatch?.[1]?.trim() ?? '',
  }
}

function parseSqlToSchema(sql: string): ErdSchema {
  const tables: ErdTable[] = []
  const relationships: ErdRelationship[] = []
  const tableBlocks = sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(]+)\s*\(([\s\S]*?)\)\s*;/gi)

  for (const block of tableBlocks) {
    const tableName = cleanSqlIdentifier(block[1])
    const definitions = splitSqlDefinitions(block[2])
    const columns: ErdColumn[] = []
    const pendingPrimaryKeys: string[] = []
    const pendingUniques: string[] = []
    const pendingForeignKeys: Array<{ column: string; refTable: string; refColumn: string; onDelete?: string }> = []

    definitions.forEach((definition) => {
      const primaryMatch = definition.match(/(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i)
      if (primaryMatch) {
        pendingPrimaryKeys.push(...primaryMatch[1].split(',').map(cleanSqlIdentifier))
        return
      }

      const uniqueMatch = definition.match(/(?:CONSTRAINT\s+\S+\s+)?UNIQUE\s*\(([^)]+)\)/i)
      if (uniqueMatch) {
        pendingUniques.push(...uniqueMatch[1].split(',').map(cleanSqlIdentifier))
        return
      }

      const foreignMatch = definition.match(
        /(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(]+)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i,
      )
      if (foreignMatch) {
        pendingForeignKeys.push({
          column: cleanSqlIdentifier(foreignMatch[1]),
          refTable: cleanSqlIdentifier(foreignMatch[2]),
          refColumn: cleanSqlIdentifier(foreignMatch[3]),
          onDelete: foreignMatch[4]?.toUpperCase(),
        })
        return
      }

      const column = parseColumnDefinition(definition)
      if (column) {
        const inlineReference = definition.match(
          /\bREFERENCES\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(]+)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/i,
        )
        if (inlineReference) {
          pendingForeignKeys.push({
            column: column.name,
            refTable: cleanSqlIdentifier(inlineReference[1]),
            refColumn: cleanSqlIdentifier(inlineReference[2]),
            onDelete: inlineReference[3]?.toUpperCase(),
          })
        }
        columns.push(column)
      }
    })

    columns.forEach((column) => {
      if (pendingPrimaryKeys.includes(column.name)) {
        column.pk = true
      }
      if (pendingUniques.includes(column.name)) {
        column.unique = true
      }
      if (pendingForeignKeys.some((foreignKey) => foreignKey.column === column.name)) {
        column.fk = true
      }
    })

    pendingForeignKeys.forEach((foreignKey) => {
      relationships.push({
        id: `r-${relationships.length}`,
        from: foreignKey.refTable,
        fromColumn: foreignKey.refColumn,
        to: tableName,
        toColumn: foreignKey.column,
        type: '||--o{',
        label: foreignKey.column,
        onDelete: ON_DELETE_OPTIONS.includes((foreignKey.onDelete ?? 'RESTRICT') as (typeof ON_DELETE_OPTIONS)[number])
          ? (foreignKey.onDelete as ErdRelationship['onDelete'])
          : 'RESTRICT',
      })
    })

    tables.push({
      id: `t-${tableName}-${tables.length}`,
      name: tableName,
      columns,
    })
  }

  return { tables, relationships }
}

function getValidationIssues(schema: ErdSchema) {
  const issues: string[] = []
  const tableNameCounts = new Map<string, number>()

  schema.tables.forEach((table) => {
    const tableName = table.name.trim()
    tableNameCounts.set(tableName, (tableNameCounts.get(tableName) ?? 0) + 1)

    if (!table.columns.some((column) => column.pk)) {
      issues.push(`${table.name}: primary key is missing.`)
    }

    const columnNameCounts = new Map<string, number>()
    table.columns.forEach((column) => {
      const columnName = column.name.trim()
      columnNameCounts.set(columnName, (columnNameCounts.get(columnName) ?? 0) + 1)
    })
    columnNameCounts.forEach((count, columnName) => {
      if (count > 1) {
        issues.push(`${table.name}.${columnName}: duplicate column name.`)
      }
    })
  })

  tableNameCounts.forEach((count, tableName) => {
    if (count > 1) {
      issues.push(`${tableName}: duplicate table name.`)
    }
  })

  schema.relationships.forEach((relationship) => {
    const fromTable = schema.tables.find((table) => table.name === relationship.from)
    const toTable = schema.tables.find((table) => table.name === relationship.to)

    if (!fromTable) {
      issues.push(`${relationship.from}: relationship source table is missing.`)
      return
    }

    if (!toTable) {
      issues.push(`${relationship.to}: relationship target table is missing.`)
      return
    }

    if (relationship.type === '}o--o{') {
      issues.push(`${relationship.from} - ${relationship.to}: N:M needs a join table before physical FK export.`)
    }

    if (!relationship.fromColumn || !relationship.toColumn) {
      issues.push(`${relationship.from} -> ${relationship.to}: FK columns are not linked.`)
      return
    }

    if (!fromTable.columns.some((column) => column.name === relationship.fromColumn)) {
      issues.push(`${relationship.from}.${relationship.fromColumn}: source column is missing.`)
    }

    if (!toTable.columns.some((column) => column.name === relationship.toColumn)) {
      issues.push(`${relationship.to}.${relationship.toColumn}: target FK column is missing.`)
    }
  })

  return issues
}

function schemaStats(schema: ErdSchema) {
  return {
    tables: schema.tables.length,
    columns: schema.tables.reduce((total, table) => total + table.columns.length, 0),
    relationships: schema.relationships.length,
  }
}

function loadMermaid() {
  if (window.mermaid) {
    return Promise.resolve(window.mermaid)
  }

  if (mermaidLoadPromise) {
    return mermaidLoadPromise
  }

  mermaidLoadPromise = new Promise<MermaidApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = MERMAID_CDN
    script.async = true
    script.onload = () => {
      if (!window.mermaid) {
        reject(new Error('Mermaid failed to load'))
        return
      }

      window.mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })
      resolve(window.mermaid)
    }
    script.onerror = () => reject(new Error('Mermaid failed to load'))
    document.head.appendChild(script)
  })

  return mermaidLoadPromise
}

export default function SquadErdApp() {
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
      setDiagramSvg(result.svg)
      setDiagramError(null)
    } catch {
      setDiagramSvg(null)
      setDiagramError('Mermaid 렌더링을 사용할 수 없어 코드 미리보기로 표시합니다.')
    }
  }, [])

  useEffect(() => {
    document.title = 'DevPath - ERD Architect'
    const html = document.documentElement
    const body = document.body

    html.classList.add('squad-dashboard-document')
    body.classList.add('squad-dashboard-body')

    return () => {
      html.classList.remove('squad-dashboard-document')
      body.classList.remove('squad-dashboard-body')
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
  }, [renderDiagram, workspaceId])

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    const timer = window.setInterval(() => {
      void refreshMessages(true)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [workspaceId])

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

  function storeCurrentDraft(code: string) {
    if (!workspaceId) {
      return
    }

    try {
      localStorage.setItem(getErdDraftKey(workspaceId), code)
    } catch {
      // Local backup should not block editing or saving to the server.
    }
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
  }

  function addColumn(tableIndex: number) {
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
  }

  function deleteRelationship(relationshipId: string) {
    syncSchema({
      ...schema,
      relationships: schema.relationships.filter((relationship) => relationship.id !== relationshipId),
    })
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
    showAuthToast({ message: 'SQL에서 ERD를 가져왔습니다.', durationMs: 1600 })
  }

  async function refreshMessages(silent = false) {
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
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'ERD 코멘트를 저장하지 못했습니다.'
      showAuthToast({ message, variant: 'error', durationMs: 2200 })
    }
  }

  async function deleteComment(commentId: number) {
    if (!workspaceId) {
      return
    }

    try {
      await projectApiRequest<void>(
        `/api/workspaces/${workspaceId}/erd/comments/${commentId}`,
        { method: 'DELETE' },
        'required',
      )
      setComments((current) => current.filter((comment) => comment.commentId !== commentId))
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

  if (loading) {
    return (
      <div className="squad-dashboard-page squad-erd-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F3F4F6]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
      </div>
    )
  }

  return (
    <div className="squad-dashboard-page squad-erd-page flex h-screen w-screen overflow-hidden text-gray-800">
      <aside className="w-20 hover:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <a href="workspace-hub.html" className="h-20 flex items-center px-5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="sidebar-text flex flex-col justify-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">목록으로 돌아가기</p>
            <p className="font-extrabold text-gray-900 truncate w-36 leading-tight">{projectName}</p>
          </div>
        </a>

        <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
          <a href={navHref('/squad-dashboard', workspaceId)} className="nav-item">
            <i className="fas fa-chart-pie w-6 text-center text-lg"></i>
            <span className="sidebar-text">대시보드</span>
          </a>
          <a href={navHref('/squad-workspace', workspaceId)} className="nav-item">
            <i className="fas fa-columns w-6 text-center text-lg"></i>
            <span className="sidebar-text">작업 현황판</span>
          </a>
          <a href={navHref('/squad-review', workspaceId)} className="nav-item">
            <i className="fas fa-code-branch w-6 text-center text-lg"></i>
            <span className="sidebar-text flex-1">코드 피드백</span>
          </a>
          <a href={navHref('/squad-erd', workspaceId)} className="nav-item active">
            <i className="fas fa-project-diagram w-6 text-center text-lg"></i>
            <span className="sidebar-text">ERD 설계</span>
          </a>
          <a href={navHref('/squad-schedule', workspaceId)} className="nav-item">
            <i className="fas fa-calendar-alt w-6 text-center text-lg"></i>
            <span className="sidebar-text">일정 관리</span>
          </a>
          <a href={navHref('/squad-files', workspaceId)} className="nav-item">
            <i className="fas fa-folder-open w-6 text-center text-lg"></i>
            <span className="sidebar-text">팀 자료실</span>
          </a>
          <a href={navHref('/squad-meeting', workspaceId)} className="nav-item">
            <i className="fas fa-headset w-6 text-center text-lg"></i>
            <span className="sidebar-text">음성 회의</span>
          </a>
          <div className="h-px bg-gray-100 my-4 mx-2"></div>
          <a href={navHref('/squad-settings', workspaceId)} className="nav-item">
            <i className="fas fa-cog w-6 text-center text-lg"></i>
            <span className="sidebar-text">스쿼드 설정</span>
          </a>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <div className="erd-topbar h-16 bg-white border-b border-gray-200 flex justify-between items-center px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <i className="fas fa-project-diagram text-brand"></i> ERD Architect Pro
            </h2>
            <span className="hidden md:inline-flex text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-1">
              v{schema.tables.length + schema.relationships.length}
            </span>
          </div>
          <div className="erd-toolbar flex items-center gap-2">
            <button onClick={() => setHelpOpen(true)} className="erd-toolbar-help w-8 h-8 rounded-full text-gray-400 hover:text-brand hover:bg-green-50 transition flex items-center justify-center" title="도움말">
              <i className="fas fa-question-circle text-lg"></i>
            </button>
            <div className="w-px h-8 bg-gray-200 mx-1"></div>
            <button onClick={restoreHistory} className="erd-toolbar-button erd-toolbar-restore px-4 py-2 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition border border-orange-100">
              <i className="fas fa-history mr-1"></i> 이전 버전 복구
            </button>
            <button onClick={resetSchema} className="erd-toolbar-button erd-toolbar-reset px-4 py-2 rounded-lg text-xs font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition">
              <i className="fas fa-trash-alt mr-1"></i> 초기화
            </button>
            <button onClick={() => void saveDocument()} disabled={saving} className="erd-toolbar-button erd-toolbar-save px-4 py-2 rounded-lg text-xs font-bold text-brand bg-green-50 hover:bg-green-100 transition border border-green-100 disabled:opacity-50">
              <i className="fas fa-save mr-1"></i> {saving ? '저장 중' : '저장'}
            </button>
            <button onClick={() => setVersionOpen(true)} className="erd-toolbar-button erd-toolbar-versions px-4 py-2 rounded-lg text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 transition border border-purple-100">
              <i className="fas fa-code-compare mr-1"></i> 버전 기록
            </button>
            <button onClick={() => setSqlImportOpen(true)} className="erd-toolbar-button erd-toolbar-import px-4 py-2 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition border border-blue-100">
              <i className="fas fa-file-import mr-1"></i> SQL 가져오기
            </button>
            <button onClick={() => exportSql(schema)} className="erd-toolbar-button erd-toolbar-export bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow-lg flex items-center gap-2">
              <i className="fas fa-file-code"></i> SQL 내보내기
            </button>
            <button onClick={() => setChatOpen(true)} className="erd-toolbar-chat w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center hover:bg-blue-100 transition shadow-sm ml-1 relative" title="설계 토론방">
              <i className="fas fa-comments"></i>
              {messages.length > 0 ? <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white"></span> : null}
            </button>
            <button onClick={session ? handleLogout : () => setAuthView('login')} className="text-[11px] font-bold text-gray-400 hover:text-gray-700 transition ml-2">
              {session ? '로그아웃' : '로그인'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="erd-schema-panel w-96 bg-white border-r border-gray-200 flex flex-col shadow-[4px_0_20px_rgba(0,0,0,0.02)] z-10">
            <div className="erd-schema-tabs flex border-b border-gray-200 bg-gray-50 shrink-0">
              <button className="erd-schema-tab flex-1 py-3 text-xs font-bold text-brand border-b-2 border-brand bg-white">테이블 관리</button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="erd-schema-action-wrap p-4 border-b border-gray-100 bg-white shrink-0">
                <div className="erd-schema-actions grid grid-cols-2 gap-2">
                  <button onClick={addTable} className="erd-schema-action-button flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition border border-gray-200 group">
                    <i className="fas fa-plus text-brand"></i> 테이블 추가
                  </button>
                  <button onClick={openRelationModal} className="erd-schema-action-button flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition border border-gray-200 group">
                    <i className="fas fa-link text-blue-500"></i> 관계 연결
                  </button>
                </div>
              </div>

              <div className="erd-schema-list-container flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                <div className="erd-schema-list-heading flex items-center gap-2 mb-2">
                  <span className="erd-schema-list-title text-[10px] font-bold text-gray-400 uppercase">Schema List</span>
                  <div className="h-px bg-gray-100 flex-1"></div>
                </div>

                {validationIssues.length > 0 ? (
                  <div className="erd-validation-box rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-extrabold text-amber-700 mb-2">
                      <i className="fas fa-triangle-exclamation"></i>
                      설계 검증 {validationIssues.length}개
                    </div>
                    <ul className="space-y-1">
                      {validationIssues.slice(0, 5).map((issue) => (
                        <li key={issue} className="text-[10px] leading-4 text-amber-800">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="erd-validation-box rounded-xl border border-green-100 bg-green-50 p-3 text-[10px] font-bold text-green-700">
                    <i className="fas fa-circle-check mr-1"></i> 기본 관계 검증 통과
                  </div>
                )}

                <div className="erd-schema-list space-y-4">
                  {schema.tables.length === 0 ? (
                    <div className="erd-schema-empty rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                      <i className="fas fa-table text-2xl text-gray-300 mb-2"></i>
                      <p className="text-xs font-bold text-gray-500">아직 테이블이 없습니다.</p>
                      <button onClick={addTable} className="mt-3 text-xs font-bold text-brand">첫 테이블 추가</button>
                    </div>
                  ) : (
                    schema.tables.map((table, tableIndex) => (
                      <div key={table.id} className="erd-table-card bg-white border border-gray-200 rounded-xl overflow-hidden fade-in shadow-sm">
                        <div className="erd-table-card-header p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center group">
                          <input
                            type="text"
                            value={table.name}
                            onChange={(event) => updateTableName(tableIndex, event.target.value)}
                            className="erd-table-name-input bg-transparent font-bold text-gray-700 text-xs w-32 outline-none border-b border-transparent focus:border-brand transition"
                          />
                          <div className="erd-table-card-actions flex gap-1">
                            <button
                              onClick={() =>
                                openCommentTarget({
                                  targetType: 'TABLE',
                                  targetId: table.name,
                                  targetLabel: table.name,
                                })
                              }
                              className="erd-table-icon-button text-gray-400 hover:text-blue-500 px-1 transition"
                              title="테이블 코멘트"
                            >
                              <i className="fas fa-comment"></i>
                              {commentCount('TABLE', table.name) > 0 ? (
                                <span className="ml-0.5 text-[9px]">{commentCount('TABLE', table.name)}</span>
                              ) : null}
                            </button>
                            <button onClick={() => addColumn(tableIndex)} className="erd-table-icon-button text-gray-400 hover:text-brand px-1 transition" title="컬럼 추가">
                              <i className="fas fa-plus"></i>
                            </button>
                            <button onClick={() => deleteTable(tableIndex)} className="erd-table-icon-button text-gray-400 hover:text-red-500 px-1 transition" title="테이블 삭제">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>

                        <div className="erd-column-list p-2 space-y-1 bg-white">
                          {table.columns.map((column, columnIndex) => (
                            <div key={`${table.id}-${columnIndex}`} className="erd-column-editor rounded-lg border border-gray-100 bg-gray-50 p-2">
                              <div className="erd-column-row flex items-center gap-2 text-xs">
                                <input
                                  type="text"
                                  value={column.name}
                                  onChange={(event) => updateColumn(tableIndex, columnIndex, { name: event.target.value })}
                                  className="erd-column-name-input bg-white text-gray-700 w-20 px-1.5 py-1 rounded border border-transparent focus:border-brand outline-none transition"
                                />
                                <select
                                  value={column.type}
                                  onChange={(event) => updateColumn(tableIndex, columnIndex, { type: event.target.value })}
                                  className="erd-column-type-select bg-white text-blue-600 w-20 px-1 py-1 rounded border border-gray-200 outline-none cursor-pointer text-[10px]"
                                >
                                  {SQL_TYPE_OPTIONS.map((type) => (
                                    <option key={type} value={type}>{type.replace('(255)', '')}</option>
                                  ))}
                                </select>
                                <button onClick={() => deleteColumn(tableIndex, columnIndex)} className="erd-column-delete-button text-gray-300 hover:text-red-500 ml-auto px-1">
                                  &times;
                                </button>
                              </div>
                              <div className="erd-column-flags flex flex-wrap gap-1 mt-2">
                                <button onClick={() => togglePrimaryKey(tableIndex, columnIndex)} className={`erd-column-flag-button px-1 ${column.pk ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-gray-400 bg-white border-gray-200'}`}>
                                  PK
                                </button>
                                <button onClick={() => updateColumn(tableIndex, columnIndex, { fk: !column.fk })} className={`erd-column-flag-button px-1 ${column.fk ? 'text-purple-600 bg-purple-50 border-purple-200' : 'text-gray-400 bg-white border-gray-200'}`}>
                                  FK
                                </button>
                                <button onClick={() => updateColumn(tableIndex, columnIndex, { notNull: !column.notNull })} className={`erd-column-flag-button px-1 ${column.notNull ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-400 bg-white border-gray-200'}`}>
                                  NN
                                </button>
                                <button onClick={() => updateColumn(tableIndex, columnIndex, { unique: !column.unique })} className={`erd-column-flag-button px-1 ${column.unique ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-gray-400 bg-white border-gray-200'}`}>
                                  UQ
                                </button>
                                <button onClick={() => updateColumn(tableIndex, columnIndex, { indexed: !column.indexed })} className={`erd-column-flag-button px-1 ${column.indexed ? 'text-green-600 bg-green-50 border-green-200' : 'text-gray-400 bg-white border-gray-200'}`}>
                                  IX
                                </button>
                                <button onClick={() => updateColumn(tableIndex, columnIndex, { autoIncrement: !column.autoIncrement })} className={`erd-column-flag-button px-1 ${column.autoIncrement ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-gray-400 bg-white border-gray-200'}`}>
                                  AI
                                </button>
                                <button
                                  onClick={() =>
                                    openCommentTarget({
                                      targetType: 'COLUMN',
                                      targetId: `${table.name}.${column.name}`,
                                      targetLabel: `${table.name}.${column.name}`,
                                    })
                                  }
                                  className="erd-column-flag-button px-1 text-blue-500 bg-white border-blue-100"
                                >
                                  <i className="fas fa-comment mr-0.5"></i>
                                  {commentCount('COLUMN', `${table.name}.${column.name}`)}
                                </button>
                              </div>
                              <div className="erd-column-extra-row grid grid-cols-2 gap-1 mt-2">
                                <input
                                  type="text"
                                  value={column.defaultValue ?? ''}
                                  onChange={(event) => updateColumn(tableIndex, columnIndex, { defaultValue: event.target.value })}
                                  className="erd-column-extra-input"
                                  placeholder="DEFAULT"
                                />
                                <input
                                  type="text"
                                  value={column.check ?? ''}
                                  onChange={(event) => updateColumn(tableIndex, columnIndex, { check: event.target.value })}
                                  className="erd-column-extra-input"
                                  placeholder="CHECK"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}

                  {schema.relationships.length > 0 ? (
                    <div className="erd-relationship-list rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                      <p className="text-[10px] font-extrabold text-blue-700 uppercase mb-2">Relationships</p>
                      <div className="space-y-2">
                        {schema.relationships.map((relationship) => (
                          <div key={relationship.id} className="erd-relationship-item rounded-lg bg-white border border-blue-100 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="min-w-0 truncate text-[10px] font-bold text-gray-800">
                                {relationship.from}.{relationship.fromColumn || '?'} → {relationship.to}.{relationship.toColumn || '?'}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    openCommentTarget({
                                      targetType: 'RELATIONSHIP',
                                      targetId: relationship.id,
                                      targetLabel: `${relationship.from}.${relationship.fromColumn || '?'} -> ${relationship.to}.${relationship.toColumn || '?'}`,
                                    })
                                  }
                                  className="text-blue-400 hover:text-blue-600"
                                  title="관계 코멘트"
                                >
                                  <i className="fas fa-comment"></i>
                                  {commentCount('RELATIONSHIP', relationship.id) > 0 ? (
                                    <span className="ml-0.5 text-[9px]">{commentCount('RELATIONSHIP', relationship.id)}</span>
                                  ) : null}
                                </button>
                                <button onClick={() => deleteRelationship(relationship.id)} className="text-gray-300 hover:text-red-500">
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-gray-400">
                              <span>{RELATIONSHIP_TYPE_OPTIONS.find((option) => option.value === relationship.type)?.label ?? relationship.type}</span>
                              <span>ON DELETE {relationship.onDelete ?? 'RESTRICT'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="erd-code-panel h-64 border-t border-gray-200 p-2 bg-[#1E1E1E] shrink-0">
              <div className="ide-container h-full">
                <div className="erd-ide-header ide-header flex justify-between items-center px-3 py-1.5">
                  <span className="erd-ide-title text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <i className="fas fa-code"></i> schema.mermaid
                  </span>
                  <span className="erd-ide-status text-[9px] text-gray-500">Live Editor</span>
                </div>
                <div className="erd-code-body flex-1 flex p-1 relative overflow-hidden">
                  <div className="erd-line-numbers line-numbers text-[10px] font-mono leading-relaxed opacity-40 pt-1 text-gray-400">1</div>
                  <textarea
                    ref={textareaRef}
                    value={mermaidCode}
                    onChange={(event) => handleCodeChange(event.target.value)}
                    className="erd-code-textarea code-editor text-[11px] leading-relaxed p-1"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className="erd-diagram-wrapper flex-1 relative"
            onMouseDown={(event) => {
              if (event.button !== 0) {
                return
              }
              setIsPanning(true)
              setPanStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y })
            }}
            onMouseMove={(event) => {
              if (!isPanning) {
                return
              }
              event.preventDefault()
              setPanOffset({ x: event.clientX - panStart.x, y: event.clientY - panStart.y })
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
            onWheel={(event) => {
              event.preventDefault()
              setZoomLevel((current) => Math.max(0.5, Math.min(3, current - event.deltaY * 0.001)))
            }}
          >
            <div
              className="erd-pan-zoom-container"
              style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})` }}
            >
              {diagramSvg ? (
                <div className="drop-shadow-xl" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
              ) : (
                <pre className="max-w-3xl whitespace-pre-wrap rounded-2xl border border-gray-200 bg-white p-6 text-xs font-mono text-gray-600 shadow-xl">
                  {diagramError ? `${diagramError}\n\n` : null}
                  {mermaidCode}
                </pre>
              )}
            </div>

            <div className="absolute bottom-6 left-6 flex flex-col gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-lg z-20">
              <button onClick={() => setZoomLevel((current) => Math.min(3, current + 0.1))} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-brand hover:bg-green-50 rounded-lg transition">
                <i className="fas fa-plus"></i>
              </button>
              <button onClick={() => setZoomLevel((current) => Math.max(0.5, current - 0.1))} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-brand hover:bg-green-50 rounded-lg transition">
                <i className="fas fa-minus"></i>
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1)
                  setPanOffset({ x: 0, y: 0 })
                }}
                className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-brand hover:bg-green-50 rounded-lg transition"
              >
                <i className="fas fa-compress"></i>
              </button>
            </div>
          </div>
        </div>

        <div className={`absolute top-16 right-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col transform ${chatOpen ? 'translate-x-0' : 'translate-x-full'} erd-chat-drawer`}>
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50 shrink-0">
            <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
              <i className="fas fa-comments text-blue-500"></i> 설계 토론방
            </h3>
            <button onClick={() => setChatOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {messages.length > 0 ? (
              messages.map(renderTeamMessage)
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <i className="fas fa-comments text-3xl mb-3"></i>
                <p className="text-xs font-bold">아직 설계 토론 메시지가 없습니다.</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
            <div className="relative flex items-center">
              <input
                type="text"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void sendMessage()
                  }
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                placeholder="메시지를 입력하세요..."
              />
              <button onClick={() => void sendMessage()} className="absolute right-1.5 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 transition shadow-sm">
                <i className="fas fa-paper-plane text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </main>

      {versionOpen ? (
        <div className="erd-version-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="erd-version-modal-panel bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden modal-enter flex max-h-[88vh]">
            <aside className="w-80 border-r border-gray-100 bg-gray-50 flex flex-col">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-code-compare text-purple-500"></i> 버전 기록
                </h3>
                <button onClick={() => setVersionOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {versions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs font-bold text-gray-400">
                    저장된 버전이 없습니다.
                  </div>
                ) : (
                  versions.map((version) => (
                    <button
                      key={version.versionId}
                      onClick={() => setCompareVersion(version)}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        compareVersion?.versionId === version.versionId
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-100 bg-white hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-gray-900">v{version.version}</span>
                        <span className="text-[10px] font-bold text-gray-400">{formatRelativeTime(version.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-gray-500 truncate">{version.summary ?? 'ERD updated'}</p>
                      <p className="mt-1 text-[10px] text-gray-400">by {version.updatedByName ?? '-'}</p>
                    </button>
                  ))
                )}
              </div>
            </aside>
            <section className="flex-1 flex flex-col min-w-0">
              <div className="p-5 border-b border-gray-100 bg-white">
                <p className="text-xs font-bold text-gray-400">현재 v{versions[0]?.version ?? '-'} 기준 비교</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-400">Tables</p>
                    <p className="text-lg font-extrabold text-gray-900">{currentStats.tables}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-400">Columns</p>
                    <p className="text-lg font-extrabold text-gray-900">{currentStats.columns}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-400">Relations</p>
                    <p className="text-lg font-extrabold text-gray-900">{currentStats.relationships}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {compareVersion ? (
                  (() => {
                    const previousSchema = safeSchemaFromJson(compareVersion.schemaJson)
                    const previousStats = schemaStats(previousSchema)

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
                            <p className="text-[10px] font-bold text-purple-400">v{compareVersion.version} Tables</p>
                            <p className="text-lg font-extrabold text-purple-700">{previousStats.tables}</p>
                          </div>
                          <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
                            <p className="text-[10px] font-bold text-purple-400">v{compareVersion.version} Columns</p>
                            <p className="text-lg font-extrabold text-purple-700">{previousStats.columns}</p>
                          </div>
                          <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
                            <p className="text-[10px] font-bold text-purple-400">v{compareVersion.version} Relations</p>
                            <p className="text-lg font-extrabold text-purple-700">{previousStats.relationships}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-extrabold text-gray-700 mb-2">v{compareVersion.version} Mermaid</p>
                            <pre className="h-80 overflow-auto rounded-xl bg-gray-950 text-blue-100 text-[10px] leading-4 p-4 font-mono">{compareVersion.mermaidCode}</pre>
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-gray-700 mb-2">현재 Mermaid</p>
                            <pre className="h-80 overflow-auto rounded-xl bg-gray-950 text-green-100 text-[10px] leading-4 p-4 font-mono">{mermaidCode}</pre>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div className="h-full min-h-80 flex items-center justify-center text-center text-gray-400">
                    <div>
                      <i className="fas fa-code-compare text-4xl mb-3"></i>
                      <p className="text-sm font-bold">왼쪽에서 비교할 버전을 선택하세요.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {commentTarget ? (
        <div className="erd-comment-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="erd-comment-modal-panel bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden modal-enter">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-comment text-blue-500"></i> 설계 코멘트
                </h3>
                <p className="mt-1 text-[10px] font-bold text-gray-400 truncate">{commentTarget.targetLabel}</p>
              </div>
              <button onClick={() => setCommentTarget(null)} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
            </div>
            <div className="max-h-72 overflow-y-auto p-4 space-y-3">
              {targetComments(commentTarget).length > 0 ? (
                targetComments(commentTarget).map((comment) => (
                  <div key={comment.commentId} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-extrabold text-gray-900">{comment.authorName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                        {comment.isMine ? (
                          <button onClick={() => void deleteComment(comment.commentId)} className="text-gray-300 hover:text-red-500">
                            <i className="fas fa-trash text-[10px]"></i>
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs font-bold text-gray-400">
                  아직 코멘트가 없습니다.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white">
              <textarea
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs outline-none focus:border-blue-400 focus:bg-white resize-none"
                placeholder="설계 의도, 변경 이유, 검토 의견을 남기세요."
              />
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setCommentTarget(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition">닫기</button>
                <button onClick={() => void createComment()} className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition">등록</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {relationModalOpen ? (
        <div className="erd-relation-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form onSubmit={addRelationship} className="erd-relation-modal-panel bg-white w-80 rounded-2xl shadow-2xl p-6 modal-enter">
            <h3 className="erd-relation-modal-title text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fas fa-link text-brand"></i> 관계 설정
            </h3>
            <div className="erd-relation-field-list space-y-4">
              <div className="erd-relation-field">
                <label className="erd-relation-label block text-xs font-bold text-gray-500 mb-1">출발 테이블</label>
                <select
                  value={relationForm.from}
                  onChange={(event) => {
                    const table = schema.tables.find((item) => item.name === event.target.value)
                    const nextColumn = table?.columns.find((column) => column.pk)?.name ?? table?.columns[0]?.name ?? ''
                    setRelationForm((current) => ({
                      ...current,
                      from: event.target.value,
                      fromColumn: nextColumn,
                      toColumn: current.toColumn || `${event.target.value.toLowerCase()}_${nextColumn}`,
                    }))
                  }}
                  className="erd-relation-control w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 outline-none focus:border-brand"
                >
                  {schema.tables.map((table) => <option key={table.id} value={table.name}>{table.name}</option>)}
                </select>
              </div>
              <div className="erd-relation-field">
                <label className="erd-relation-label block text-xs font-bold text-gray-500 mb-1">도착 테이블</label>
                <select
                  value={relationForm.to}
                  onChange={(event) => {
                    const table = schema.tables.find((item) => item.name === event.target.value)
                    const existingFk = table?.columns.find((column) => column.fk)?.name ?? ''
                    setRelationForm((current) => ({
                      ...current,
                      to: event.target.value,
                      toColumn: existingFk || `${current.from.toLowerCase()}_${current.fromColumn}`,
                    }))
                  }}
                  className="erd-relation-control w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 outline-none focus:border-brand"
                >
                  {schema.tables.map((table) => <option key={table.id} value={table.name}>{table.name}</option>)}
                </select>
              </div>
              <div className="erd-relation-grid grid grid-cols-2 gap-2">
                <div className="erd-relation-field">
                  <label className="erd-relation-label block text-xs font-bold text-gray-500 mb-1">부모 PK</label>
                  <select value={relationForm.fromColumn} onChange={(event) => setRelationForm((current) => ({ ...current, fromColumn: event.target.value }))} className="erd-relation-control w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-brand">
                    {(schema.tables.find((table) => table.name === relationForm.from)?.columns ?? []).map((column) => (
                      <option key={column.name} value={column.name}>{column.name}</option>
                    ))}
                  </select>
                </div>
                <div className="erd-relation-field">
                  <label className="erd-relation-label block text-xs font-bold text-gray-500 mb-1">자식 FK</label>
                  <input
                    value={relationForm.toColumn}
                    onChange={(event) => setRelationForm((current) => ({ ...current, toColumn: event.target.value }))}
                    type="text"
                    className="erd-relation-control w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand"
                    placeholder="user_id"
                  />
                </div>
              </div>
              <label className="erd-relation-checkbox flex items-center gap-2 text-xs font-bold text-gray-600">
                <input
                  type="checkbox"
                  checked={relationForm.autoCreateFk}
                  onChange={(event) => setRelationForm((current) => ({ ...current, autoCreateFk: event.target.checked }))}
                />
                FK 컬럼이 없으면 자동 생성
              </label>
              <div className="erd-relation-field">
                <label className="erd-relation-label block text-xs font-bold text-gray-500 mb-1">관계 유형</label>
                <select value={relationForm.type} onChange={(event) => setRelationForm((current) => ({ ...current, type: event.target.value }))} className="erd-relation-control w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-brand">
                  {RELATIONSHIP_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="erd-relation-field">
                <label className="erd-relation-label block text-xs font-bold text-gray-500 mb-1">삭제 규칙</label>
                <select value={relationForm.onDelete} onChange={(event) => setRelationForm((current) => ({ ...current, onDelete: event.target.value as ErdRelationship['onDelete'] }))} className="erd-relation-control w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-brand">
                  {ON_DELETE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="erd-relation-field">
                <label className="erd-relation-label block text-xs font-bold text-gray-500 mb-1">설명</label>
                <input value={relationForm.label} onChange={(event) => setRelationForm((current) => ({ ...current, label: event.target.value }))} type="text" className="erd-relation-control w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand" />
              </div>
            </div>
            <div className="erd-relation-actions flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setRelationModalOpen(false)} className="erd-relation-cancel px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition">취소</button>
              <button type="submit" className="erd-relation-submit px-5 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-green-600 transition">연결</button>
            </div>
          </form>
        </div>
      ) : null}

      {sqlImportOpen ? (
        <div className="erd-sql-import-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="erd-sql-import-panel bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden modal-enter">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-file-import text-blue-500"></i> SQL 가져오기
              </h3>
              <button onClick={() => setSqlImportOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
            </div>
            <div className="p-6">
              <textarea
                value={sqlImportText}
                onChange={(event) => setSqlImportText(event.target.value)}
                className="erd-sql-import-textarea w-full h-72 rounded-xl border border-gray-200 bg-gray-950 text-blue-100 font-mono text-xs p-4 outline-none focus:border-blue-400"
                spellCheck={false}
                placeholder={'CREATE TABLE users (\n  id BIGINT PRIMARY KEY,\n  email VARCHAR(255) NOT NULL UNIQUE\n);'}
              />
              <p className="mt-2 text-[10px] text-gray-400">
                CREATE TABLE, PRIMARY KEY, FOREIGN KEY, UNIQUE, DEFAULT, CHECK 일부 구문을 ERD로 변환합니다.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setSqlImportOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition">취소</button>
              <button onClick={importSql} className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition">가져오기</button>
            </div>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div className="erd-help-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="erd-help-modal-panel bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden modal-enter flex flex-col max-h-[90vh]">
            <div className="erd-help-modal-header px-8 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="erd-help-modal-title text-xl font-bold text-gray-900 flex items-center gap-3">
                <span className="erd-help-modal-icon w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white text-sm">
                  <i className="fas fa-book"></i>
                </span>
                DevPath ERD 가이드북
              </h2>
              <button onClick={() => setHelpOpen(false)} className="erd-help-modal-close text-gray-400 hover:text-gray-700 text-2xl transition">&times;</button>
            </div>
            <div className="erd-help-modal-body flex-1 overflow-y-auto p-8 bg-white">
              <div className="erd-help-modal-grid grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="erd-help-modal-column space-y-6">
                  <div>
                    <h4 className="erd-help-modal-section-title text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <i className="fas fa-keyboard text-purple-500"></i> 필수 단축키 안내
                    </h4>
                    <div className="space-y-3">
                      <div className="help-card flex gap-3 items-start">
                        <div className="erd-help-key-chip px-2 py-1 bg-gray-200 text-gray-800 font-mono text-xs rounded border border-gray-300 shadow-sm mt-1 shrink-0">Ctrl+S</div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">빠른 저장</p>
                          <p className="text-xs text-gray-500 leading-relaxed">작업 중인 ERD를 시스템에 안전하게 저장합니다.</p>
                        </div>
                      </div>
                      <div className="help-card flex gap-3 items-start">
                        <div className="erd-help-key-chip px-2 py-1 bg-gray-200 text-gray-800 font-mono text-xs rounded border border-gray-300 shadow-sm mt-1 shrink-0">Ctrl+Z</div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">실행 취소 (Undo)</p>
                          <p className="text-xs text-gray-500 leading-relaxed">코드 에디터에서 실수로 지운 내용을 즉시 복구합니다.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="erd-help-modal-column space-y-6">
                  <div>
                    <h4 className="erd-help-modal-section-title text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <i className="fas fa-mouse text-blue-500"></i> 마우스 조작 & 에디터
                    </h4>
                    <div className="erd-help-action-grid grid grid-cols-2 gap-3 mb-3">
                      <div className="help-card text-center py-4">
                        <div className="text-xl text-gray-400 mb-1"><i className="fas fa-arrows-alt"></i></div>
                        <p className="text-xs font-bold text-gray-700">이동 (Pan)</p>
                        <p className="text-[10px] text-gray-400">빈 공간 드래그</p>
                      </div>
                      <div className="help-card text-center py-4">
                        <div className="text-xl text-gray-400 mb-1"><i className="fas fa-search-plus"></i></div>
                        <p className="text-xs font-bold text-gray-700">확대/축소</p>
                        <p className="text-[10px] text-gray-400">마우스 휠</p>
                      </div>
                    </div>
                    <div className="help-card">
                      <p className="text-xs font-bold text-gray-700 mb-1"><i className="fas fa-history text-orange-500"></i> 자동 백업 시스템</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed">코드를 수정할 때마다 브라우저에 임시 저장됩니다. 실수로 날아갔다면 <b>[이전 버전 복구]</b> 버튼을 눌러보세요.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="erd-help-modal-footer p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setHelpOpen(false)} className="erd-help-modal-confirm px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition shadow-md">확인했습니다</button>
            </div>
          </div>
        </div>
      ) : null}

      {savedOpen ? (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[1100]">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl modal-enter">
            <div className="w-16 h-16 rounded-full bg-green-50 text-brand flex items-center justify-center mx-auto mb-5 border border-green-100">
              <i className="fas fa-check text-3xl"></i>
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">저장 완료</h3>
            <p className="text-sm text-gray-500 mb-6">설계 화면이 워크스페이스에 저장되었습니다.</p>
            <button onClick={() => setSavedOpen(false)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition">확인</button>
          </div>
        </div>
      ) : null}

      {authView ? (
        <AuthModal view={authView} onClose={() => setAuthView(null)} onViewChange={setAuthView} onAuthenticated={handleAuthenticated} />
      ) : null}
    </div>
  )
}
