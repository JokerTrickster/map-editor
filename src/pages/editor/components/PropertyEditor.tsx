import { useState, useEffect } from 'react'
import { dia } from '@joint/core'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'
import styles from './PropertyEditor.module.css'

interface PropertyEditorProps {
    element: dia.Element
    onUpdate: (id: string, data: any) => void
    graph: dia.Graph | null
}

export function PropertyEditor({
    element,
    onUpdate,
    graph: _graph
}: PropertyEditorProps) {
    const types = useObjectTypeStore(state => state.types)

    const [position, setPosition] = useState<{ x: number; y: number }>(element.position())
    const [size, setSize] = useState<{ width: number; height: number }>(element.size())
    const [selectedTypeId, setSelectedTypeId] = useState<string>('')
    const [customProperties, setCustomProperties] = useState<Record<string, any>>({})
    const [jsonData, setJsonData] = useState('')
    const [jsonError, setJsonError] = useState<string | null>(null)
    const [isCsvEntity, setIsCsvEntity] = useState(false)
    const [showJson, setShowJson] = useState(false)

    useEffect(() => {
        setPosition(element.position())
        setSize(element.size())

        const data = element.get('data') || {}
        setJsonData(JSON.stringify(data, null, 2))

        // Check if this is a CSV entity
        const isCSV = data.type === 'csv-entity'
        setIsCsvEntity(isCSV)

        // Initialize selected type and custom properties from data
        if (data.typeId || data.type) {
            setSelectedTypeId(data.typeId || data.type)
        }

        // Initialize properties with default values from object type
        if (data.typeId && isCSV) {
            const type = types.find(t => t.id === data.typeId)
            if (type) {
                const initialProps: Record<string, any> = {}
                type.properties.forEach(prop => {
                    // Use existing value or default value
                    initialProps[prop.key] = data.properties?.[prop.key] ?? prop.defaultValue ?? ''
                })
                setCustomProperties(initialProps)
            }
        } else {
            setCustomProperties(data.properties || {})
        }
    }, [element, types])

    const handlePositionChange = (axis: 'x' | 'y', value: string) => {
        const numValue = parseFloat(value)
        if (isNaN(numValue)) return

        const newPos = { ...position, [axis]: numValue }
        setPosition(newPos)
        onUpdate(element.id as string, { position: newPos })
    }

    const handleSizeChange = (dim: 'width' | 'height', value: string) => {
        const numValue = parseFloat(value)
        if (isNaN(numValue) || numValue <= 0) return

        const newSize = { ...size, [dim]: numValue }
        setSize(newSize)
        onUpdate(element.id as string, { size: newSize })
    }

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const typeId = e.target.value
        setSelectedTypeId(typeId)

        // Update element data with new typeId
        const currentData = element.get('data') || {}
        const newData = { ...currentData, typeId }

        // If type changed, we might want to reset properties or keep matching ones
        // For now, let's keep existing properties

        onUpdate(element.id as string, { data: newData })
    }

    const handlePropertyChange = (key: string, value: any) => {
        const newProperties = { ...customProperties, [key]: value }
        setCustomProperties(newProperties)

        const currentData = element.get('data') || {}
        const newData = {
            ...currentData,
            properties: newProperties
        }

        // Update JSON display
        setJsonData(JSON.stringify(newData, null, 2))

        onUpdate(element.id as string, { data: newData })
    }

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setJsonData(value)

        try {
            const parsed = JSON.parse(value)
            setJsonError(null)
            onUpdate(element.id as string, { data: parsed })

            // Sync local state if JSON is edited directly
            if (parsed.typeId) setSelectedTypeId(parsed.typeId)
            if (parsed.properties) setCustomProperties(parsed.properties)
        } catch (err) {
            setJsonError((err as Error).message)
        }
    }

    const selectedType = types.find(t => t.id === selectedTypeId)

    // Get name from properties
    const elementName = customProperties.name || ''

    const handleNameChange = (value: string) => {
        handlePropertyChange('name', value)
    }

    return (
        <div className={styles.container}>
            <div className={styles.section}>
                <h3 className={styles.title}>Properties</h3>

                <div className={styles.group}>
                    <label className={styles.groupLabel}>Name</label>
                    <input
                        type="text"
                        value={elementName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className={styles.input}
                        placeholder="Enter name"
                    />
                </div>

                <div className={styles.group}>
                    <label className={styles.groupLabel}>Object Type</label>
                    {isCsvEntity ? (
                        <div className={styles.typeDisplay}>
                            {selectedType ? (
                                <div className={styles.typeInfo}>
                                    {selectedType.icon && selectedType.icon.startsWith('#') && (
                                        <div
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: 4,
                                                background: selectedType.icon,
                                                border: '1px solid rgba(255,255,255,0.2)'
                                            }}
                                        />
                                    )}
                                    {selectedType.icon && (selectedType.icon.startsWith('/') || selectedType.icon.startsWith('http')) && (
                                        <img
                                            src={selectedType.icon}
                                            alt=""
                                            style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover' }}
                                        />
                                    )}
                                    <span>{selectedType.name}</span>
                                    <span className={styles.mappedBadge}>Mapped from CSV</span>
                                </div>
                            ) : (
                                <div className={styles.noType}>No type assigned</div>
                            )}
                        </div>
                    ) : (
                        <select
                            value={selectedTypeId}
                            onChange={handleTypeChange}
                            className={styles.select}
                        >
                            <option value="">Select Type...</option>
                            {types.map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {selectedType && (
                    <div className={styles.group}>
                        <label className={styles.groupLabel}>
                            {isCsvEntity ? 'Properties' : 'Properties'}
                            {isCsvEntity && <span className={styles.csvNote}> (mapped)</span>}
                        </label>
                        <div className={styles.propertyTable}>
                            {selectedType.properties
                                .filter(prop => prop.key !== 'name') // Name is shown at top
                                .map(prop => {
                                    const value = customProperties[prop.key]

                                    return (
                                        <div key={prop.key} className={styles.propertyRow}>
                                            <label className={styles.propertyLabel}>
                                                {prop.key}
                                                {prop.required && <span className={styles.required}>*</span>}
                                                <span className={styles.propertyType}>({prop.type})</span>
                                            </label>
                                            <div>
                                                {prop.type === 'boolean' ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={!!value}
                                                        onChange={(e) => handlePropertyChange(prop.key, e.target.checked)}
                                                    />
                                                ) : prop.type === 'number' ? (
                                                    <input
                                                        type="number"
                                                        value={value ?? ''}
                                                        onChange={(e) => {
                                                            const numValue = e.target.value === '' ? '' : parseFloat(e.target.value)
                                                            handlePropertyChange(prop.key, numValue)
                                                        }}
                                                        className={styles.input}
                                                        placeholder={prop.key}
                                                    />
                                                ) : prop.type === 'array' ? (
                                                    <input
                                                        type="text"
                                                        value={Array.isArray(value) ? value.join(', ') : value || ''}
                                                        onChange={(e) => {
                                                            const arrValue = e.target.value.split(',').map(v => v.trim()).filter(v => v)
                                                            handlePropertyChange(prop.key, arrValue)
                                                        }}
                                                        className={styles.input}
                                                        placeholder="comma-separated"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={value ?? ''}
                                                        onChange={(e) => handlePropertyChange(prop.key, e.target.value)}
                                                        className={styles.input}
                                                        placeholder={prop.key}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                        {selectedType.properties.length === 0 && (
                            <div className={styles.emptyProperties}>No properties</div>
                        )}
                    </div>
                )}

                <div className={styles.group}>
                    <label className={styles.groupLabel}>Position</label>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label>X</label>
                            <input
                                type="number"
                                value={position.x}
                                onChange={(e) => handlePositionChange('x', e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>Y</label>
                            <input
                                type="number"
                                value={position.y}
                                onChange={(e) => handlePositionChange('y', e.target.value)}
                                className={styles.input}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.group}>
                    <label className={styles.groupLabel}>Size</label>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label>W</label>
                            <input
                                type="number"
                                value={size.width}
                                onChange={(e) => handleSizeChange('width', e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>H</label>
                            <input
                                type="number"
                                value={size.height}
                                onChange={(e) => handleSizeChange('height', e.target.value)}
                                className={styles.input}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <button
                    onClick={() => setShowJson(!showJson)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '0',
                        marginBottom: showJson ? '12px' : '0'
                    }}
                >
                    {showJson ? '▼' : '▶'} JSON 미리보기
                </button>

                {showJson && (
                    <>
                        <div className={styles.jsonPreview}>
                            <textarea
                                value={jsonData}
                                onChange={handleJsonChange}
                                className={`${styles.jsonContent} ${jsonError ? styles.error : ''}`}
                                rows={10}
                            />
                        </div>
                        {jsonError && <div className={styles.errorMessage}>{jsonError}</div>}
                    </>
                )}
            </div>
        </div>
    )
}
