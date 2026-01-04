/**
 * ActionCard - AI suggested action cards
 */

export interface AIAction {
  type: 'navigate' | 'book' | 'add-to-trip' | 'view-details' | 'plan-trip';
  label: string;
  location?: { lat: number; lng: number };
  data?: Record<string, unknown>;
}

interface ActionCardProps {
  action: AIAction;
  onAction: (action: AIAction) => void;
}

export function ActionCard({ action, onAction }: ActionCardProps) {
  const getActionIcon = () => {
    switch (action.type) {
      case 'navigate':
        return '📍';
      case 'book':
        return '📅';
      case 'add-to-trip':
        return '➕';
      case 'view-details':
        return '👁️';
      case 'plan-trip':
        return '✈️';
      default:
        return '✨';
    }
  };

  const getActionStyle = () => {
    switch (action.type) {
      case 'navigate':
        return 'action-navigate';
      case 'book':
        return 'action-book';
      case 'add-to-trip':
        return 'action-add';
      case 'view-details':
        return 'action-details';
      case 'plan-trip':
        return 'action-plan';
      default:
        return '';
    }
  };

  // Render data preview if available
  const renderDataPreview = () => {
    if (!action.data) return null;

    const data = action.data as Record<string, string | number>;

    if (data.name && data.rating) {
      // Restaurant/Place card
      return (
        <div className="action-preview">
          <div className="preview-header">
            <span className="preview-name">{String(data.name)}</span>
            <span className="preview-rating">⭐ {data.rating}</span>
          </div>
          {data.category && (
            <span className="preview-category">{String(data.category)}</span>
          )}
          {data.price && (
            <span className="preview-price">{String(data.price)}</span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`action-card ${getActionStyle()}`}>
      {renderDataPreview()}
      <button
        className="action-btn"
        onClick={() => onAction(action)}
      >
        <span className="action-icon">{getActionIcon()}</span>
        <span className="action-label">{action.label}</span>
        <span className="action-arrow">→</span>
      </button>
    </div>
  );
}
