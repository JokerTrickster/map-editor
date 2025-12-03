import styles from './LoadingOverlay.module.css'

interface LoadingOverlayProps {
    message?: string
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
    return (
        <div className={styles.overlay}>
            <div className={styles.spinner} />
            <div className={styles.message}>{message}</div>
        </div>
    )
}
