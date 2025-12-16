/**
 * Connection Panel Component
 * Allows users to connect to real status server and generate embed URLs
 */

import { useState } from 'react';
import { useStatusStore } from '@/features/status';
import styles from './ConnectionPanel.module.css';

interface ConnectionPanelProps {
  projectId: string;
  onClose: () => void;
}

export function ConnectionPanel({ projectId, onClose }: ConnectionPanelProps) {
  const { isConnected, connect, disconnect } = useStatusStore();
  const [serverUrl, setServerUrl] = useState('ws://localhost:8080/status');
  const [copied, setCopied] = useState(false);

  // Generate embed URL
  const embedUrl = `${window.location.origin}/viewer/${projectId}`;
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      // TODO: Implement real server connection with serverUrl
      connect();
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>서버 연결 & 공유</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {/* Server Connection Section */}
          <section className={styles.section}>
            <h3>실시간 상태 서버 연결</h3>
            <div className={styles.connectionStatus}>
              <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`} />
              <span>{isConnected ? '연결됨' : '연결 안됨'}</span>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="serverUrl">서버 URL</label>
              <input
                id="serverUrl"
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="ws://localhost:8080/status"
                disabled={isConnected}
                className={styles.input}
              />
            </div>

            <button
              onClick={handleConnect}
              className={`${styles.button} ${isConnected ? styles.buttonDanger : styles.buttonPrimary}`}
            >
              {isConnected ? '연결 해제' : '서버 연결'}
            </button>
          </section>

          {/* Embed URL Section */}
          <section className={styles.section}>
            <h3>뷰어 공유 URL</h3>
            <p className={styles.description}>
              이 URL을 공유하면 누구나 뷰어를 볼 수 있습니다.
            </p>

            <div className={styles.urlBox}>
              <code className={styles.url}>{embedUrl}</code>
              <button
                onClick={handleCopyUrl}
                className={styles.copyButton}
              >
                {copied ? '✓ 복사됨' : '📋 복사'}
              </button>
            </div>
          </section>

          {/* Embed Code Section */}
          <section className={styles.section}>
            <h3>Embed 코드</h3>
            <p className={styles.description}>
              웹사이트에 뷰어를 임베드하려면 아래 코드를 사용하세요.
            </p>

            <div className={styles.codeBox}>
              <pre className={styles.code}>{embedCode}</pre>
              <button
                onClick={handleCopyEmbed}
                className={styles.copyButton}
              >
                {copied ? '✓ 복사됨' : '📋 복사'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
