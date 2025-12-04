/**
 * JsonPreview Component
 * Displays JSON preview of object type data
 */

interface JsonPreviewProps {
  show: boolean
  onToggle: () => void
  data: Record<string, any>
  jsonPreviewClassName: string
  jsonContentClassName: string
}

export function JsonPreview({
  show,
  onToggle,
  data,
  jsonPreviewClassName,
  jsonContentClassName
}: JsonPreviewProps) {
  return (
    <div style={{ marginTop: '16px' }}>
      <button
        onClick={onToggle}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--local-primary)',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0'
        }}
      >
        {show ? '▼' : '▶'} JSON 미리보기
      </button>

      {show && (
        <div className={jsonPreviewClassName}>
          <pre className={jsonContentClassName}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
