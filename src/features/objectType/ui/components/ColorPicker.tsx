/**
 * ColorPicker Component
 * Color selection for object types
 */

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '12px',
        marginBottom: '8px',
        color: 'var(--local-text-secondary)'
      }}>
        객체 색상
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '40px',
            height: '40px',
            padding: '0',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: 'none'
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: 'var(--local-surface)',
            border: '1px solid var(--local-border)',
            color: 'var(--local-text)',
            padding: '8px',
            borderRadius: '6px',
            fontSize: '13px',
            width: '100px'
          }}
        />
      </div>
    </div>
  )
}
