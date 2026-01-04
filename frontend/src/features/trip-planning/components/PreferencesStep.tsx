/**
 * PreferencesStep - Step 3: Select interests, budget, pace
 * Features: Interest chips, budget slider, pace selection
 */
import { useCallback } from 'react';
import type { TripDraft } from './TripPlanningWizard';

interface PreferencesStepProps {
  draft: TripDraft;
  updateDraft: (updates: Partial<TripDraft>) => void;
}

interface Interest {
  id: string;
  label: string;
  emoji: string;
  category: 'culture' | 'food' | 'outdoor' | 'entertainment' | 'shopping';
}

const INTERESTS: Interest[] = [
  { id: 'museums', label: 'Museums', emoji: '🏛️', category: 'culture' },
  { id: 'history', label: 'History', emoji: '📜', category: 'culture' },
  { id: 'art', label: 'Art', emoji: '🎨', category: 'culture' },
  { id: 'architecture', label: 'Architecture', emoji: '🏰', category: 'culture' },
  { id: 'restaurants', label: 'Restaurants', emoji: '🍽️', category: 'food' },
  { id: 'street-food', label: 'Street Food', emoji: '🌮', category: 'food' },
  { id: 'cafes', label: 'Cafes', emoji: '☕', category: 'food' },
  { id: 'local-cuisine', label: 'Local Cuisine', emoji: '🥘', category: 'food' },
  { id: 'hiking', label: 'Hiking', emoji: '🥾', category: 'outdoor' },
  { id: 'beaches', label: 'Beaches', emoji: '🏖️', category: 'outdoor' },
  { id: 'parks', label: 'Parks', emoji: '🌳', category: 'outdoor' },
  { id: 'nature', label: 'Nature', emoji: '🌿', category: 'outdoor' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🎉', category: 'entertainment' },
  { id: 'concerts', label: 'Concerts', emoji: '🎵', category: 'entertainment' },
  { id: 'theater', label: 'Theater', emoji: '🎭', category: 'entertainment' },
  { id: 'sports', label: 'Sports', emoji: '⚽', category: 'entertainment' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', category: 'shopping' },
  { id: 'markets', label: 'Markets', emoji: '🏬', category: 'shopping' },
];

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget', emoji: '💵', description: 'Hostels, street food, public transport' },
  { value: 'moderate', label: 'Moderate', emoji: '💳', description: 'Hotels, restaurants, mix of transport' },
  { value: 'luxury', label: 'Luxury', emoji: '💎', description: 'Premium hotels, fine dining, private tours' },
] as const;

const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed', emoji: '🧘', description: '2-3 activities per day' },
  { value: 'moderate', label: 'Moderate', emoji: '🚶', description: '4-5 activities per day' },
  { value: 'intensive', label: 'Intensive', emoji: '🏃', description: '6+ activities per day' },
] as const;

export function PreferencesStep({ draft, updateDraft }: PreferencesStepProps) {
  const toggleInterest = useCallback(
    (interestId: string) => {
      const current = draft.interests;
      const updated = current.includes(interestId)
        ? current.filter((id) => id !== interestId)
        : [...current, interestId];
      updateDraft({ interests: updated });
    },
    [draft.interests, updateDraft]
  );

  const handleBudgetChange = useCallback(
    (budget: TripDraft['budget']) => {
      updateDraft({ budget });
    },
    [updateDraft]
  );

  const handlePaceChange = useCallback(
    (pace: TripDraft['pace']) => {
      updateDraft({ pace });
    },
    [updateDraft]
  );

  // Group interests by category
  const interestsByCategory = INTERESTS.reduce((acc, interest) => {
    if (!acc[interest.category]) acc[interest.category] = [];
    acc[interest.category].push(interest);
    return acc;
  }, {} as Record<string, Interest[]>);

  const categoryLabels: Record<string, string> = {
    culture: 'Culture & History',
    food: 'Food & Drink',
    outdoor: 'Outdoor & Nature',
    entertainment: 'Entertainment',
    shopping: 'Shopping',
  };

  return (
    <div className="preferences-step">
      <div className="step-header">
        <span className="step-icon">🎯</span>
        <h2 className="step-title">What are you interested in?</h2>
        <p className="step-subtitle">
          Select at least one interest to personalize your trip
        </p>
      </div>

      {/* Interests Selection */}
      <section className="interests-section">
        {Object.entries(interestsByCategory).map(([category, interests]) => (
          <div key={category} className="interest-category">
            <h3 className="category-label">{categoryLabels[category]}</h3>
            <div className="interest-chips">
              {interests.map((interest) => (
                <button
                  key={interest.id}
                  className={`interest-chip ${draft.interests.includes(interest.id) ? 'selected' : ''}`}
                  onClick={() => toggleInterest(interest.id)}
                >
                  <span className="chip-emoji">{interest.emoji}</span>
                  <span className="chip-label">{interest.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Selected Count */}
      {draft.interests.length > 0 && (
        <div className="selected-count">
          <span className="count-badge">{draft.interests.length}</span>
          <span className="count-text">interests selected</span>
        </div>
      )}

      {/* Budget Selection */}
      <section className="budget-section">
        <h3 className="section-label">💰 Budget Level</h3>
        <div className="budget-options">
          {BUDGET_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`budget-option ${draft.budget === option.value ? 'selected' : ''}`}
              onClick={() => handleBudgetChange(option.value)}
            >
              <span className="option-emoji">{option.emoji}</span>
              <span className="option-label">{option.label}</span>
              <span className="option-desc">{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Pace Selection */}
      <section className="pace-section">
        <h3 className="section-label">⏱️ Travel Pace</h3>
        <div className="pace-options">
          {PACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`pace-option ${draft.pace === option.value ? 'selected' : ''}`}
              onClick={() => handlePaceChange(option.value)}
            >
              <span className="option-emoji">{option.emoji}</span>
              <span className="option-label">{option.label}</span>
              <span className="option-desc">{option.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
