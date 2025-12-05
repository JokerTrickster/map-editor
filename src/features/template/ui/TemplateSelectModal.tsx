import { useState } from 'react';
import { useTemplateList } from '../hooks/useTemplate';
import TemplateCard from './TemplateCard';
import styles from './TemplateSelectModal.module.css';

interface TemplateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export default function TemplateSelectModal({ isOpen, onClose, onSelect }: TemplateSelectModalProps) {
  const { templates, loading, error } = useTemplateList();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (templateId: string) => {
    setSelectedId(templateId);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
      setSelectedId(null);
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>템플릿 선택</h2>
            <p className={styles.subtitle}>프로젝트에 사용할 템플릿을 선택하세요</p>
          </div>
          <button className={styles.closeButton} onClick={handleClose} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>템플릿을 불러오는 중...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && templates.length === 0 && (
            <div className={styles.empty}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
              </svg>
              <p>사용 가능한 템플릿이 없습니다</p>
            </div>
          )}

          {!loading && !error && templates.length > 0 && (
            <div className={styles.grid}>
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedId === template.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>
            취소
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={!selectedId || loading}
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}
