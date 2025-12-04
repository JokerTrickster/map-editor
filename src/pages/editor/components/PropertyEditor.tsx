import React, { useState, useEffect } from 'react'
import { dia } from '@joint/core'
import { useObjectTypeStore } from '@/shared/store/objectTypeStore'
import styles from './PropertyEditor.module.css'

interface PropertyEditorProps {
    element: dia.Element
    onUpdate: (id: string, updates: Partial<any>) => void
}

export function PropertyEditor({ element, onUpdate }: PropertyEditorProps) {
    const types = useObjectTypeStore(state => state.types)

    const [position, setPosition] = useState<{ x: number; y: number }>(element.position())
    const [size, setSize] = useState<{ width: number; height: number }>(element.size())
    const [selectedTypeId, setSelectedTypeId] = useState<string>('')
    const [customProperties, setCustomProperties] = useState<Record<string, any>>({})
    const [jsonData, setJsonData] = useState('')
    const [jsonError, setJsonError] = useState<string | null>(null)

    useEffect(() => {
        setPosition(element.position())
        setSize(element.size())

        const data = element.get('data') || {}
        setJsonData(JSON.stringify(data, null, 2))

        // Initialize selected type and custom properties from data
        if (data.typeId) {
            setSelectedTypeId(data.typeId)
        }
        setCustomProperties(data.properties || {})
    }, [element])

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

    return (
        <div className={styles.container}>
            <div className={styles.section}>
                <h3 className={styles.title}>Properties</h3>

                <div className={styles.row}>
                    <label>ID</label>
                    <input type="text" value={element.id as string} disabled className={styles.input} />
                </div>

                <div className={styles.group}>
                    <label className={styles.groupLabel}>Object Type</label>
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
                </div>

                {selectedType && (
                    <div className={styles.group}>
                        <label className={styles.groupLabel}>Custom Properties</label>
                        {selectedType.properties.map(prop => (
                            <div key={prop.key} className={styles.propertyRow}>
                                <label className={styles.propertyLabel}>
                                    {prop.key}
                                    {prop.required && <span className={styles.required}>*</span>}
                                </label>
                                {prop.type === 'boolean' ? (
                                    <input
                                        type="checkbox"
                                        checked={!!customProperties[prop.key]}
                                        onChange={(e) => handlePropertyChange(prop.key, e.target.checked)}
                                    />
                                ) : (
                                    <input
                                        type={prop.type === 'number' ? 'number' : 'text'}
                                        value={customProperties[prop.key] || ''}
                                        onChange={(e) => handlePropertyChange(prop.key, e.target.value)}
                                        className={styles.input}
                                        placeholder={prop.type}
                                    />
                                )}
                            </div>
                        ))}
                        {selectedType.properties.length === 0 && (
                            <div className={styles.emptyProperties}>No properties defined for this type</div>
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
                <h3 className={styles.title}>Raw Data (JSON)</h3>
                <textarea
                    value={jsonData}
                    onChange={handleJsonChange}
                    className={`${styles.textarea} ${jsonError ? styles.error : ''}`}
                    rows={10}
                />
                {jsonError && <div className={styles.errorMessage}>{jsonError}</div>}
            </div>
        </div>
    )
}
