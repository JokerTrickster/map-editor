import { dia } from '@joint/core'
import { TemplateRelationType } from '@/entities/schema/templateSchema'

export function autoLinkObjects(
    graph: dia.Graph,
    sourceElement: dia.Element,
    _relationKey: string,
    config: TemplateRelationType
): string[] {
    if (!config.autoLink) return []

    const sourceCenter = sourceElement.getBBox().center()
    const candidates = graph.getElements().filter(el => {
        if (el.id === sourceElement.id) return false
        const typeId = el.get('data')?.typeId
        return typeId === config.targetType
    })

    const { strategy, maxDistance } = config.autoLink
    const linkedIds: string[] = []

    if (strategy === 'nearest') {
        // Find all candidates within range
        const inRange = candidates.filter(target => {
            const targetCenter = target.getBBox().center()
            const distance = sourceCenter.distance(targetCenter)
            return distance <= maxDistance
        })

        // Sort by distance
        inRange.sort((a, b) => {
            const distA = sourceCenter.distance(a.getBBox().center())
            const distB = sourceCenter.distance(b.getBBox().center())
            return distA - distB
        })

        if (config.cardinality === '1:1') {
            if (inRange.length > 0) {
                linkedIds.push(inRange[0].id as string)
            }
        } else {
            // 1:N - link all in range
            linkedIds.push(...inRange.map(el => el.id as string))
        }
    }

    return linkedIds
}

export function updateRelationship(
    element: dia.Element,
    propertyKey: string,
    targetId: string,
    cardinality: '1:1' | '1:N',
    action: 'add' | 'remove'
) {
    const currentData = element.get('data') || {}
    const currentProps = currentData.properties || {}
    const value = currentProps[propertyKey]

    let newValue: string | string[] | undefined

    if (cardinality === '1:1') {
        if (action === 'add') {
            newValue = targetId
        } else {
            newValue = undefined
        }
    } else {
        // 1:N
        const list = Array.isArray(value) ? [...value] : (value ? [value] : [])
        if (action === 'add') {
            if (!list.includes(targetId)) {
                list.push(targetId)
            }
        } else {
            const index = list.indexOf(targetId)
            if (index > -1) {
                list.splice(index, 1)
            }
        }
        newValue = list
    }

    const newData = {
        ...currentData,
        properties: {
            ...currentProps,
            [propertyKey]: newValue
        }
    }

    element.set('data', newData)
    return newData
}
