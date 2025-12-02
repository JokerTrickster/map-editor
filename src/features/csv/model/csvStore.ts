import { create } from 'zustand'

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
    })
  },

  parseFile: async () => {
    const { file } = get()
    if (!file) return

    try {
      set({ uploadState: { status: 'parsing' } })

      // Read file content
      const text = await file.text()

      // Basic row count (split by newlines, exclude header)
      const lines = text.split('\n').filter(line => line.trim())
      const rowCount = Math.max(0, lines.length - 1) // Exclude header

      set({
        rawData: text,
        uploadState: {
          status: 'parsed',
          fileName: file.name,
          rowCount,
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
