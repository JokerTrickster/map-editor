import type { TemplateMetadata } from '../lib/templateLoader';
import styles from './TemplateCard.module.css';

interface TemplateCardProps {
  template: TemplateMetadata;
  selected?: boolean;
  onSelect: (templateId: string) => void;
}

export default function TemplateCard({ template, selected = false, onSelect }: TemplateCardProps) {
  const isDisabled = template.status === 'coming-soon';

  const handleClick = () => {
    if (!isDisabled) {
      onSelect(template.id);
    }
  };

  return (
    <button
      className={`${styles.card} ${selected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
      onClick={handleClick}
      disabled={isDisabled}
      type="button"
    >
      {/* Thumbnail */}
      <div className={styles.thumbnail}>
        {template.thumbnail ? (
          <img src={template.thumbnail} alt={template.name} className={styles.thumbnailImage} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          </div>
        )}

        {/* Coming Soon Badge */}
        {isDisabled && (
          <div className={styles.badge}>
            <span>준비중</span>
          </div>
        )}

        {/* Selected Indicator */}
        {selected && !isDisabled && (
          <div className={styles.selectedIndicator}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h3 className={styles.title}>{template.name}</h3>
        <p className={styles.description}>{template.description}</p>
      </div>
    </button>
  );
}
