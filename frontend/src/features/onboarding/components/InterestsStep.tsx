/**
 * InterestsStep - Select travel interests
 */

interface InterestsStepProps {
  selected: string[];
  onUpdate: (interests: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Interest {
  id: string;
  label: string;
  emoji: string;
}

const INTERESTS: Interest[] = [
  { id: 'culture', label: 'Culture & History', emoji: '🏛️' },
  { id: 'food', label: 'Food & Cuisine', emoji: '🍽️' },
  { id: 'nature', label: 'Nature & Outdoors', emoji: '🌲' },
  { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
  { id: 'beaches', label: 'Beaches', emoji: '🏖️' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🎉' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'art', label: 'Art & Design', emoji: '🎨' },
  { id: 'photography', label: 'Photography', emoji: '📷' },
  { id: 'wellness', label: 'Wellness & Spa', emoji: '🧘' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'music', label: 'Music & Concerts', emoji: '🎵' },
];

export function InterestsStep({ selected, onUpdate, onNext, onBack }: InterestsStepProps) {
  const toggleInterest = (id: string) => {
    if (selected.includes(id)) {
      onUpdate(selected.filter((i) => i !== id));
    } else {
      onUpdate([...selected, id]);
    }
  };

  const canContinue = selected.length >= 2;

  return (
    <div className="interests-step">
      <div className="step-header">
        <h2 className="step-title">What do you love exploring?</h2>
        <p className="step-subtitle">Select at least 2 interests to personalize your experience</p>
      </div>

      <div className="interests-grid">
        {INTERESTS.map((interest) => (
          <button
            key={interest.id}
            className={`interest-card ${selected.includes(interest.id) ? 'selected' : ''}`}
            onClick={() => toggleInterest(interest.id)}
          >
            <span className="interest-emoji">{interest.emoji}</span>
            <span className="interest-label">{interest.label}</span>
            {selected.includes(interest.id) && (
              <span className="interest-check">✓</span>
            )}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="selected-count">
          {selected.length} selected
        </div>
      )}

      <div className="step-actions">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <button
          className="next-btn"
          onClick={onNext}
          disabled={!canContinue}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
