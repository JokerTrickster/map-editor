import { create } from 'zustand'
import { parseCSV, type ParseResult } from '../lib/csvParser'
import { groupByLayer, type GroupedLayer } from '../lib/layerGrouper'

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

  // Actions
  setFile: (file: File) => void
  setUploadState: (state: UploadState) => void
  clearFile: () => void
  parseFile: () => Promise<void>
}

export const useCSVStore = create<CSVState>((set, get) => ({
  uploadState: { status: 'idle' },
  file: null,
  rawData: null,
  parsedData: null,
  groupedLayers: null,

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
    })
  },

  parseFile: async () => {
    const { file } = get()
    if (!file) return

    try {
      set({ uploadState: { status: 'parsing' } })

      // Read file content
      const content = await file.text()

      // Parse CSV
      const parsedData = parseCSV(content)

      // Check for parsing errors
      if (parsedData.errors.length > 0) {
        // If there are errors but some entities were parsed, show warning
        if (parsedData.entities.length > 0) {
          console.warn('CSV parsing completed with errors:', parsedData.errors)
          // Continue with partial data
        } else {
          // Fatal errors - no entities parsed
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

      // Group entities by layer
      const groupedLayers = groupByLayer(parsedData.entities)

      set({
        rawData: content,
        parsedData,
        groupedLayers,
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
