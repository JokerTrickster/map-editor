/**
 * ViewerJsonPanel Component
 * Displays the full map JSON data in viewer mode
 */

import { useMemo, useState, useEffect } from 'react'
import { dia } from '@joint/core'
import styles from './ViewerJsonPanel.module.css'

interface ViewerJsonPanelProps {
  graph: dia.Graph | null
  projectName: string
}

export function ViewerJsonPanel({ graph, projectName }: ViewerJsonPanelProps) {
  // Track graph changes to force re-render
  const [, setGraphVersion] = useState(0)

  // Listen to graph changes
  useEffect(() => {
    if (!graph) return

    const handleChange = () => {
      setGraphVersion(v => v + 1)
    }

    // Listen to all graph change events
    graph.on('add remove change', handleChange)

    return () => {
      graph.off('add remove change', handleChange)
    }
  }, [graph])

  // Generate JSON data from graph
  const jsonData = useMemo(() => {
    if (!graph) {
      return {
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectName: projectName,
        },
        objects: [],
      }
    }

    const elements = graph.getElements()
    const objects = elements.map((element) => {
      const position = element.position()
      const size = element.size()
      const attrs = element.attributes

      return {
        id: String(element.id),
        type: attrs.objectType || attrs.type || 'Unknown',
        name: attrs.name || attrs.objectType || 'Unnamed',
        geometry: {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
          rotation: attrs.angle || 0,
        },
        style: {
          fill: attrs.attrs?.body?.fill || '#ffffff',
          stroke: attrs.attrs?.body?.stroke || '#000000',
          strokeWidth: attrs.attrs?.body?.strokeWidth || 1,
        },
        properties: attrs.properties || {},
        relations: attrs.relations || [],
      }
    })

    return {
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectName: projectName,
      },
      objects,
    }
  }, [graph, projectName, graph?.getCells().length])

  // Format JSON with syntax highlighting
  const formattedJson = useMemo(() => {
    return JSON.stringify(jsonData, null, 2)
  }, [jsonData])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>맵 JSON 데이터</h3>
        <div className={styles.info}>
          총 {jsonData.objects.length}개 객체
        </div>
      </div>

      <div className={styles.content}>
        <pre className={styles.jsonDisplay}>
          <code>{formattedJson}</code>
        </pre>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.copyButton}
          onClick={() => {
            navigator.clipboard.writeText(formattedJson)
            alert('JSON 데이터가 클립보드에 복사되었습니다.')
          }}
        >
          📋 복사
        </button>
        <button
          className={styles.downloadButton}
          onClick={() => {
            const blob = new Blob([formattedJson], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${projectName}-map.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }}
        >
          💾 다운로드
        </button>
      </div>
    </div>
  )
}
