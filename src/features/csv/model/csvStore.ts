import { create } from 'zustand'
import { parseCSV, type ParseResult, type ParsedEntity } from '../lib/csvParser'
import { groupByLayer, type GroupedLayer } from '../lib/layerGrouper'
import { parseBanpoCSV, groupByEntity } from '@/shared/lib/csvParser'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'parsing' }
  | { status: 'parsed'; fileName: string; rowCount: number }
  | { status: 'error'; message: string }

interface CSVState {
  uploadState: UploadState
  file: File | null
  rawData: string | null
  parsedData: ParseResult | null
  groupedLayers: GroupedLayer[] | null
  selectedLayers: Set<string> // Track selected layer names

  // Actions
  setFile: (file: File) => void
  setUploadState: (state: UploadState) => void
  clearFile: () => void
  parseFile: () => Promise<void>
  toggleLayer: (layerName: string) => void
  selectAllLayers: () => void
  deselectAllLayers: () => void
}

export const useCSVStore = create<CSVState>((set, get) => ({
  uploadState: { status: 'idle' },
  file: null,
  rawData: null,
  parsedData: null,
  groupedLayers: null,
  selectedLayers: new Set<string>(),

  setFile: (file: File) => {
    set({ file })
  },

  setUploadState: (state: UploadState) => {
    set({ uploadState: state })
  },

  clearFile: () => {
    set({
      uploadState: { status: 'idle' },
      file: null,
      rawData: null,
      parsedData: null,
      groupedLayers: null,
      selectedLayers: new Set<string>(),
    })
  },

  toggleLayer: (layerName: string) => {
    const { selectedLayers } = get()
    const newSelected = new Set(selectedLayers)

    if (newSelected.has(layerName)) {
      newSelected.delete(layerName)
    } else {
      newSelected.add(layerName)
    }

    set({ selectedLayers: newSelected })
  },

  selectAllLayers: () => {
    const { groupedLayers } = get()
    if (!groupedLayers) return

    const allLayers = new Set(groupedLayers.map(layer => layer.layer))
    set({ selectedLayers: allLayers })
  },

  deselectAllLayers: () => {
    set({ selectedLayers: new Set<string>() })
  },

  parseFile: async () => {
    const { file } = get()
    if (!file) return

    try {
      set({ uploadState: { status: 'parsing' } })

      // Read file content
      const content = await file.text()

      // Detect CSV format by checking first line
      const firstLine = content.split('\n')[0].toLowerCase()
      const isBanpoFormat = firstLine.includes('x') && firstLine.includes('y') && firstLine.includes('layer')
      const isEntityFormat = firstLine.includes('entitytype') && firstLine.includes('points')

      let parsedData: ParseResult
      let groupedLayers: GroupedLayer[]

      if (isEntityFormat) {
        // New format: entity-based CSV
        parsedData = parseCSV(content)

        // Check for parsing errors
        if (parsedData.errors.length > 0) {
          if (parsedData.entities.length > 0) {
            console.warn('CSV parsing completed with errors:', parsedData.errors)
          } else {
            set({
              uploadState: {
                status: 'error',
                message: `CSV parsing failed:\n${parsedData.errors.slice(0, 5).join('\n')}${
                  parsedData.errors.length > 5 ? `\n... and ${parsedData.errors.length - 5} more errors` : ''
                }`,
              },
            })
            return
          }
        }

        groupedLayers = groupByLayer(parsedData.entities)
      } else if (isBanpoFormat) {
        // Old format: Banpo CSV (x, y, z, layer, ...)
        const banpoRows = parseBanpoCSV(content)
        const banpoEntities = groupByEntity(banpoRows)

        // Convert Banpo entities to ParsedEntity format
        const entities: ParsedEntity[] = banpoEntities.map((entity) => ({
          layer: entity.layer,
          entityType: entity.isPolygon ? 'LWPOLYLINE' : 'LINE',
          entityHandle: entity.entityHandle,
          points: entity.points.map((p) => ({ x: p.x, y: p.y })),
          text: entity.points[0]?.text,
        }))

        parsedData = {
          entities,
          rowCount: banpoRows.length,
          errors: [],
        }

        groupedLayers = groupByLayer(entities)
      } else {
        // Unknown format
        set({
          uploadState: {
            status: 'error',
            message: 'Unsupported CSV format. Expected either entity-based format (entitytype, points) or Banpo format (x, y, z, layer).',
          },
        })
        return
      }

      // Auto-select all layers after successful parsing
      const allLayerNames = new Set(groupedLayers.map(layer => layer.layer))

      set({
        rawData: content,
        parsedData,
        groupedLayers,
        selectedLayers: allLayerNames,
        uploadState: {
          status: 'parsed',
          fileName: file.name,
          rowCount: parsedData.rowCount,
        },
      })
    } catch (error) {
      set({
        uploadState: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to parse CSV file',
        },
      })
    }
  },
}))
