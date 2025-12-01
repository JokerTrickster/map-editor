import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../shared/context/ThemeContext'
import styles from './EditorPage.module.css'

export default function EditorPage() {
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()
    const [isDragging, setIsDragging] = useState(false)
    const [uploadedImage, setUploadedImage] = useState<string | null>(null)
    const [zoom, setZoom] = useState(1)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        navigate('/login')
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files)
        handleFiles(files)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            handleFiles(files)
        }
    }

    const handleFiles = (files: File[]) => {
        if (files.length > 0) {
            const file = files[0]
            if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onload = (e) => {
                    setUploadedImage(e.target?.result as string)
                    setZoom(1) // Reset zoom on new upload
                }
                reader.readAsDataURL(file)
            } else {
                alert('Please upload an image file.')
            }
        }
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3))
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5))
    const handleZoomReset = () => setZoom(1)

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
                    </svg>
                    Map Editor
                </div>

                <div className={styles.toolbar}>
                    {/* Zoom Controls */}
                    <div className={styles.zoomControls}>
                        <button onClick={handleZoomOut} className={styles.toolButton} title="Zoom Out">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                        <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} className={styles.toolButton} title="Zoom In">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                        <button onClick={handleZoomReset} className={styles.toolButton} title="Reset Zoom">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />

                    <button className={styles.toolButton}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                        Save
                    </button>
                    <button className={`${styles.toolButton} ${styles.primaryButton}`}>
                        Export
                    </button>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />

                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} className={styles.toolButton} title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
                        {theme === 'light' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={handleLogout}
                        className={styles.toolButton}
                        title="Logout"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Left Sidebar - Tools */}
                <aside className={styles.leftSidebar}>
                    <button className={`${styles.iconButton} ${styles.iconButtonActive}`} title="Select">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                            <path d="M13 13l6 6" />
                        </svg>
                    </button>
                    <button className={styles.iconButton} title="Wall">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="3" y1="15" x2="21" y2="15" />
                            <line x1="9" y1="9" x2="9" y2="21" />
                            <line x1="15" y1="3" x2="15" y2="15" />
                        </svg>
                    </button>
                    <button className={styles.iconButton} title="Parking Slot">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <path d="M9 9h6" />
                            <path d="M12 9v6" />
                        </svg>
                    </button>
                </aside>

                {/* Canvas Area */}
                <div
                    className={styles.canvasArea}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {!uploadedImage ? (
                        <div
                            className={styles.uploadZone}
                            style={isDragging ? { borderColor: 'var(--color-primary)', backgroundColor: 'rgba(59, 130, 246, 0.1)' } : {}}
                        >
                            <div className={styles.uploadIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <h2 className={styles.uploadTitle}>Upload Blueprint</h2>
                            <p className={styles.uploadDesc}>Drag & drop your map image here, or click to browse</p>
                            <button onClick={triggerFileInput} className={styles.uploadButton}>
                                Choose File
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileInput}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>
                    ) : (
                        <div
                            className={styles.canvasContent}
                            style={{ transform: `scale(${zoom})`, transition: 'transform 0.1s ease-out' }}
                        >
                            <img src={uploadedImage} alt="Blueprint" className={styles.blueprintImage} />
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Properties */}
                <aside className={styles.rightSidebar}>
                    <div className={styles.sidebarHeader}>Properties</div>
                    <div className={styles.sidebarContent}>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            {uploadedImage ? 'Image uploaded. Select tools to start editing.' : 'No element selected.'}
                        </p>
                    </div>
                </aside>
            </main>
        </div>
    )
}
