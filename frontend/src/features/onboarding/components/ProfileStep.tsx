/**
 * ProfileStep - Set name and enable notifications
 */
import { useState } from 'react';

interface ProfileStepProps {
  name: string;
  onUpdate: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ProfileStep({ name, onUpdate, onNext, onBack }: ProfileStepProps) {
  const [enableNotifications, setEnableNotifications] = useState(true);

  const canContinue = name.trim().length >= 2;

  return (
    <div className="profile-step">
      <div className="step-header">
        <h2 className="step-title">Almost there!</h2>
        <p className="step-subtitle">Let's personalize your profile</p>
      </div>

      {/* Avatar Preview */}
      <div className="avatar-section">
        <div className="avatar-preview">
          <span className="avatar-emoji">👤</span>
          <button className="avatar-edit">
            📷
          </button>
        </div>
        <p className="avatar-hint">Tap to add photo (optional)</p>
      </div>

      {/* Name Input */}
      <div className="name-section">
        <label className="input-label">What should we call you?</label>
        <input
          type="text"
          className="name-input"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => onUpdate(e.target.value)}
          autoFocus
        />
        {name && name.length < 2 && (
          <span className="input-hint">Name must be at least 2 characters</span>
        )}
      </div>

      {/* Notifications Toggle */}
      <div className="notifications-section">
        <div className="notification-card">
          <div className="notification-info">
            <span className="notification-icon">🔔</span>
            <div className="notification-text">
              <span className="notification-title">Enable Notifications</span>
              <span className="notification-desc">
                Get trip reminders and real-time updates
              </span>
            </div>
          </div>
          <button
            className={`toggle-switch ${enableNotifications ? 'active' : ''}`}
            onClick={() => setEnableNotifications(!enableNotifications)}
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      </div>

      <div className="step-actions">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <button
          className="next-btn"
          onClick={onNext}
          disabled={!canContinue}
        >
          Finish Setup →
        </button>
      </div>
    </div>
  );
}
