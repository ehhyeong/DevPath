import type { ErdColumn,ErdRelationship,ErdSchema,ErdTable } from './erd-types'


export const EMPTY_SCHEMA: ErdSchema = {
  tables: [],
  relationships: [],
}

export const DEFAULT_MERMAID_CODE = 'erDiagram\n'
export const ERD_DRAFT_KEY_PREFIX = 'workspace-erd-backup-'
export const ERD_HISTORY_KEY_PREFIX = 'workspace-erd-history-'
export const ERD_HISTORY_LIMIT = 30

export const SQL_TYPE_OPTIONS = ['BIGINT', 'INT', 'VARCHAR(255)', 'TEXT', 'DATETIME', 'BOOLEAN', 'DECIMAL(10,2)']

export const RELATIONSHIP_TYPE_OPTIONS = [
  { value: '||--||', label: '1 : 1', description: 'required one to required one' },
  { value: '||--|{', label: '1 : N', description: 'required one to required many' },
  { value: '|o--||', label: '0 : 1', description: 'optional one to required one' },
  { value: '||--o{', label: '0 : N', description: 'required one to optional many' },
  { value: '}o--o{', label: 'N : M', description: 'many to many, join table recommended' },
]

export const ON_DELETE_OPTIONS = ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'] as const

type MermaidApi = typeof import('mermaid')['default']

export let mermaidLoadPromise: Promise<MermaidApi> | null = null

export function getErdDraftKey(workspaceId: number) {
  return `${ERD_DRAFT_KEY_PREFIX}${workspaceId}`
}

export function getErdHistoryKey(workspaceId: number) {
  return `${ERD_HISTORY_KEY_PREFIX}${workspaceId}`
}

export function readErdHistory(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function writeErdHistory(key: string, history: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(history.slice(-ERD_HISTORY_LIMIT)))
  } catch {
    // Local backup should never block the ERD editor.
  }
}

export function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function formatRelativeTime(value?: string | null) {
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

export function safeSchemaFromJson(value?: string | null): ErdSchema {
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

export function normalizeTableName(value: string) {
  const nextValue = value.trim().replace(/\s+/g, '_').toUpperCase()
  return nextValue || 'NEW_TABLE'
}

export function generateMermaidCode(schema: ErdSchema) {
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

export function parseMermaidCode(code: string): ErdSchema {
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

export function quoteIdentifier(value: string) {
  const trimmed = value.trim()
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return trimmed
  }

  return `"${trimmed.replaceAll('"', '""')}"`
}

export function sqlColumnType(column: ErdColumn) {
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

export function buildSql(schema: ErdSchema) {
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

export function exportSql(schema: ErdSchema) {
  const sql = buildSql(schema)
  const blob = new Blob([sql], { type: 'text/plain' })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = 'schema.sql'
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

export function cleanSqlIdentifier(value: string) {
  return value.trim().replace(/^"|"$/g, '').replace(/^\[|\]$/g, '').replace(/`/g, '')
}

export function splitSqlDefinitions(value: string) {
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

export function parseColumnDefinition(definition: string): ErdColumn | null {
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

export function parseSqlToSchema(sql: string): ErdSchema {
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

export function getValidationIssues(schema: ErdSchema) {
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

export function schemaStats(schema: ErdSchema) {
  return {
    tables: schema.tables.length,
    columns: schema.tables.reduce((total, table) => total + table.columns.length, 0),
    relationships: schema.relationships.length,
  }
}

export function loadMermaid() {
  if (mermaidLoadPromise) {
    return mermaidLoadPromise
  }

  mermaidLoadPromise = import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' })
    return mermaid
  })

  return mermaidLoadPromise
}
