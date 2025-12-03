import { ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode
    footer?: ReactNode
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
    if (!isOpen) return null

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>{title}</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className={styles.content}>{children}</div>
                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        </div>
    )
}
