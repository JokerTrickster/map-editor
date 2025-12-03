/**
 * CSV Parser for CAD/DXF Export Data
 *
 * Parses parking lot CSV files exported from CAD/DXF with entity data.
 * Supports various CSV formats and handles large files efficiently.
 */

export interface ParsedEntity {
  layer: string
  entityType: string
  entityHandle: string
  points: Array<{ x: number; y: number }>
  text?: string
  blockName?: string
  rotation?: number
}

export interface ParseResult {
  entities: ParsedEntity[]
  rowCount: number
  errors: string[]
}

/**
 * Required columns for CSV validation
 */
const REQUIRED_COLUMNS = ['layer', 'entitytype', 'entityhandle', 'points'] as const

/**
 * Parse points string to coordinate array
 *
 * Handles various formats:
 * - "[(100.5, 200.3), (150.2, 300.1)]"
 * - "(100.5, 200.3), (150.2, 300.1)"
 * - "(100.5, 200.3)"
 * - "100.5, 200.3"
 */
function parsePoints(pointsStr: string): Array<{ x: number; y: number }> {
  if (!pointsStr || pointsStr.trim() === '') {
    return []
  }

  try {
    // Remove outer brackets if present
    let cleaned = pointsStr.trim()
    if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
      cleaned = cleaned.slice(1, -1)
    }

    // Match coordinate pairs: (x, y) or x, y
    // Regex: optional opening paren, number (int/float), comma, number, optional closing paren
    const coordPattern = /\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?/g
    const matches = [...cleaned.matchAll(coordPattern)]

    if (matches.length === 0) {
      return []
    }

    return matches.map(match => ({
      x: parseFloat(match[1]),
      y: parseFloat(match[2])
    }))
  } catch (error) {
    throw new Error(`Invalid points format: ${pointsStr}`)
  }
}

/**
 * Detect CSV delimiter (comma or tab)
 */
function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) || []).length
  const tabCount = (headerLine.match(/\t/g) || []).length

  return tabCount > commaCount ? '\t' : ','
}

/**
 * Parse CSV row with proper handling of quoted fields
 */
function parseCSVRow(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      fields.push(currentField.trim())
      currentField = ''
    } else {
      currentField += char
    }
  }

  // Add last field
  fields.push(currentField.trim())

  return fields
}

/**
 * Normalize column name for case-insensitive matching
 */
function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

/**
 * Create column index mapping from header
 */
function createColumnMapping(headers: string[]): Map<string, number> {
  const mapping = new Map<string, number>()

  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header)
    mapping.set(normalized, index)
  })

  return mapping
}

/**
 * Validate that all required columns exist
 */
function validateColumns(columnMapping: Map<string, number>): string[] {
  const errors: string[] = []

  REQUIRED_COLUMNS.forEach(requiredCol => {
    if (!columnMapping.has(requiredCol)) {
      errors.push(`Required column '${requiredCol}' not found`)
    }
  })

  return errors
}

/**
 * Parse a single entity row
 */
function parseEntityRow(
  fields: string[],
  columnMapping: Map<string, number>,
  rowNumber: number
): { entity?: ParsedEntity; error?: string } {
  try {
    const getField = (colName: string): string => {
      const index = columnMapping.get(colName)
      if (index === undefined) return ''
      return fields[index] || ''
    }

    const layer = getField('layer')
    const entityType = getField('entitytype')
    const entityHandle = getField('entityhandle')
    const pointsStr = getField('points')

    // Validate required fields
    if (!layer) {
      return { error: `Row ${rowNumber}: Missing layer` }
    }
    if (!entityType) {
      return { error: `Row ${rowNumber}: Missing entityType` }
    }
    if (!entityHandle) {
      return { error: `Row ${rowNumber}: Missing entityHandle` }
    }

    // Parse points
    let points: Array<{ x: number; y: number }> = []
    try {
      points = parsePoints(pointsStr)
    } catch (err) {
      return {
        error: `Row ${rowNumber}: ${err instanceof Error ? err.message : 'Invalid points format'}`
      }
    }

    // Build entity
    const entity: ParsedEntity = {
      layer,
      entityType,
      entityHandle,
      points
    }

    // Optional fields
    const text = getField('text')
    if (text) {
      entity.text = text
    }

    const blockName = getField('blockname')
    if (blockName) {
      entity.blockName = blockName
    }

    const rotationStr = getField('rotation')
    if (rotationStr) {
      const rotation = parseFloat(rotationStr)
      if (!isNaN(rotation)) {
        entity.rotation = rotation
      }
    }

    return { entity }
  } catch (error) {
    return {
      error: `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Parse error'}`
    }
  }
}

/**
 * Main CSV parser function
 *
 * @param csvContent - Raw CSV file content
 * @returns ParseResult with entities and errors
 */
export function parseCSV(csvContent: string): ParseResult {
  const errors: string[] = []
  const entities: ParsedEntity[] = []

  // Validate input
  if (!csvContent || csvContent.trim() === '') {
    return {
      entities: [],
      rowCount: 0,
      errors: ['CSV file is empty']
    }
  }

  // Split into lines (handle both \n and \r\n)
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim())

  if (lines.length === 0) {
    return {
      entities: [],
      rowCount: 0,
      errors: ['CSV file contains no data']
    }
  }

  if (lines.length === 1) {
    return {
      entities: [],
      rowCount: 0,
      errors: ['CSV file contains only header row']
    }
  }

  // Parse header
  const headerLine = lines[0]
  const delimiter = detectDelimiter(headerLine)
  const headers = parseCSVRow(headerLine, delimiter)

  if (headers.length < 4) {
    return {
      entities: [],
      rowCount: 0,
      errors: [`CSV has too few columns. Expected at least 4, found ${headers.length}`]
    }
  }

  // Create column mapping
  const columnMapping = createColumnMapping(headers)

  // Validate required columns
  const columnErrors = validateColumns(columnMapping)
  if (columnErrors.length > 0) {
    return {
      entities: [],
      rowCount: lines.length - 1,
      errors: columnErrors
    }
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const rowNumber = i + 1 // 1-based row numbers (after header)

    // Skip empty lines
    if (!line.trim()) {
      continue
    }

    const fields = parseCSVRow(line, delimiter)

    // Parse entity
    const result = parseEntityRow(fields, columnMapping, rowNumber)

    if (result.error) {
      errors.push(result.error)
      // Continue parsing other rows for better error reporting
    } else if (result.entity) {
      entities.push(result.entity)
    }
  }

  return {
    entities,
    rowCount: lines.length - 1, // Exclude header
    errors
  }
}
