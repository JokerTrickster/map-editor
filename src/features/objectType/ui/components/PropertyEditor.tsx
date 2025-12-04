/**
 * PropertyEditor Component
 * Manages property list for object types
 */

import { type Property } from '@/shared/store/objectTypeStore'

interface PropertyEditorProps {
  properties: { key: string; type: Property['type']; required: boolean }[]
  onAdd: () => void
  onUpdate: (index: number, updates: Partial<Property>) => void
  onRemove: (index: number) => void
  propertiesClassName: string
  propertiesHeaderClassName: string
  smallButtonClassName: string
  propertyClassName: string
  propertyInputClassName: string
  propertySelectClassName: string
  removeButtonClassName: string
}

export function PropertyEditor({
  properties,
  onAdd,
  onUpdate,
  onRemove,
  propertiesClassName,
  propertiesHeaderClassName,
  smallButtonClassName,
  propertyClassName,
  propertyInputClassName,
  propertySelectClassName,
  removeButtonClassName
}: PropertyEditorProps) {
  return (
    <div className={propertiesClassName}>
      <div className={propertiesHeaderClassName}>
        <span>속성</span>
        <button onClick={onAdd} className={smallButtonClassName}>
          + 속성 추가
        </button>
      </div>

      {properties.map((prop, index) => (
        <div key={index} className={propertyClassName}>
          <input
            type="text"
            placeholder="키"
            value={prop.key}
            onChange={(e) => onUpdate(index, { key: e.target.value })}
            className={propertyInputClassName}
          />
          <select
            value={prop.type}
            onChange={(e) =>
              onUpdate(index, { type: e.target.value as Property['type'] })
            }
            className={propertySelectClassName}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="array">Array</option>
          </select>
          <button
            onClick={() => onRemove(index)}
            className={removeButtonClassName}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
