/**
 * PreferencesStep - Budget, pace, travel style preferences
 */
import type { OnboardingData } from './OnboardingFlow';

interface PreferencesStepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget', emoji: '💵', desc: 'Affordable options' },
  { value: 'moderate', label: 'Moderate', emoji: '💳', desc: 'Balanced spending' },
  { value: 'luxury', label: 'Luxury', emoji: '💎', desc: 'Premium experiences' },
] as const;

const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed', emoji: '🧘', desc: 'Take it easy' },
  { value: 'moderate', label: 'Moderate', emoji: '🚶', desc: 'Balanced pace' },
  { value: 'intensive', label: 'Intensive', emoji: '🏃', desc: 'See it all!' },
] as const;

const TRAVEL_STYLE_OPTIONS = [
  { value: 'solo', label: 'Solo', emoji: '🎒' },
  { value: 'couple', label: 'Couple', emoji: '💑' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'friends', label: 'Friends', emoji: '👯' },
  { value: 'group', label: 'Group', emoji: '👥' },
] as const;

export function OnboardingPreferencesStep({ data, onUpdate, onNext, onBack }: PreferencesStepProps) {
  return (
    <div className="preferences-step">
      <div className="step-header">
        <h2 className="step-title">How do you like to travel?</h2>
        <p className="step-subtitle">This helps us personalize your experience</p>
      </div>

      {/* Budget Preference */}
      <section className="preference-section">
        <h3 className="preference-label">💰 Budget Style</h3>
        <div className="options-row">
          {BUDGET_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`option-card ${data.budgetPreference === option.value ? 'selected' : ''}`}
              onClick={() => onUpdate({ budgetPreference: option.value })}
            >
              <span className="option-emoji">{option.emoji}</span>
              <span className="option-label">{option.label}</span>
              <span className="option-desc">{option.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Pace Preference */}
      <section className="preference-section">
        <h3 className="preference-label">⚡ Travel Pace</h3>
        <div className="options-row">
          {PACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`option-card ${data.pacePreference === option.value ? 'selected' : ''}`}
              onClick={() => onUpdate({ pacePreference: option.value })}
            >
              <span className="option-emoji">{option.emoji}</span>
              <span className="option-label">{option.label}</span>
              <span className="option-desc">{option.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Travel Style */}
      <section className="preference-section">
        <h3 className="preference-label">👥 Usually travel...</h3>
        <div className="style-options">
          {TRAVEL_STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`style-chip ${data.travelStyle === option.value ? 'selected' : ''}`}
              onClick={() => onUpdate({ travelStyle: option.value })}
            >
              <span className="style-emoji">{option.emoji}</span>
              <span className="style-label">{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="step-actions">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <button className="next-btn" onClick={onNext}>
          Continue →
        </button>
      </div>
    </div>
  );
}
