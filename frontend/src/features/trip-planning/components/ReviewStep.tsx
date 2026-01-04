/**
 * ReviewStep - Step 5: Review and confirm trip
 * Features: Trip name, summary, edit options, create button
 */
import { useMemo, useCallback } from 'react';
import type { TripDraft } from './TripPlanningWizard';

interface ReviewStepProps {
  draft: TripDraft;
  updateDraft: (updates: Partial<TripDraft>) => void;
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    culture: '🏛️',
    food: '🍽️',
    outdoor: '🌳',
    attraction: '📍',
    shopping: '🛍️',
    entertainment: '🎭',
  };
  return icons[category] || '📍';
}

export function ReviewStep({ draft, updateDraft }: ReviewStepProps) {
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateDraft({ tripName: e.target.value });
    },
    [updateDraft]
  );

  const tripDuration = useMemo(() => {
    if (!draft.startDate || !draft.endDate) return 0;
    const diff = draft.endDate.getTime() - draft.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [draft.startDate, draft.endDate]);

  const totalActivities = useMemo(() => {
    return draft.generatedDays.reduce((sum, day) => sum + day.activities.length, 0);
  }, [draft.generatedDays]);

  const estimatedCost = useMemo(() => {
    let total = 0;
    draft.generatedDays.forEach((day) => {
      day.activities.forEach((activity) => {
        total += activity.cost || 0;
      });
    });
    return total * draft.travelers;
  }, [draft.generatedDays, draft.travelers]);

  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    draft.generatedDays.forEach((day) => {
      day.activities.forEach((activity) => {
        categories[activity.category] = (categories[activity.category] || 0) + 1;
      });
    });
    return Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);
  }, [draft.generatedDays]);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="review-step">
      <div className="step-header">
        <span className="step-icon">✅</span>
        <h2 className="step-title">Review Your Trip</h2>
        <p className="step-subtitle">Make sure everything looks good</p>
      </div>

      {/* Trip Name Input */}
      <section className="name-section">
        <label className="name-label">Trip Name</label>
        <input
          type="text"
          className="name-input"
          value={draft.tripName}
          onChange={handleNameChange}
          placeholder={`Trip to ${draft.destination}`}
        />
      </section>

      {/* Trip Summary Card */}
      <div className="trip-summary-card">
        <div className="summary-hero">
          <span className="hero-emoji">✈️</span>
          <div className="hero-info">
            <h3 className="hero-destination">{draft.destination}</h3>
            <span className="hero-dates">
              {formatDate(draft.startDate)} - {formatDate(draft.endDate)}
            </span>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-stat">
            <span className="stat-icon">📅</span>
            <span className="stat-value">{tripDuration}</span>
            <span className="stat-label">Days</span>
          </div>
          <div className="summary-stat">
            <span className="stat-icon">📍</span>
            <span className="stat-value">{totalActivities}</span>
            <span className="stat-label">Activities</span>
          </div>
          <div className="summary-stat">
            <span className="stat-icon">👥</span>
            <span className="stat-value">{draft.travelers}</span>
            <span className="stat-label">{draft.travelers === 1 ? 'Traveler' : 'Travelers'}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-icon">💰</span>
            <span className="stat-value">${estimatedCost}</span>
            <span className="stat-label">Est. Cost</span>
          </div>
        </div>
      </div>

      {/* Trip Details */}
      <section className="details-section">
        <div className="detail-row">
          <span className="detail-label">Budget Level</span>
          <span className="detail-value">
            {draft.budget === 'budget' && '💵 Budget'}
            {draft.budget === 'moderate' && '💳 Moderate'}
            {draft.budget === 'luxury' && '💎 Luxury'}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Travel Pace</span>
          <span className="detail-value">
            {draft.pace === 'relaxed' && '🧘 Relaxed'}
            {draft.pace === 'moderate' && '🚶 Moderate'}
            {draft.pace === 'intensive' && '🏃 Intensive'}
          </span>
        </div>
      </section>

      {/* Activity Breakdown */}
      <section className="breakdown-section">
        <h3 className="section-label">Activity Mix</h3>
        <div className="category-breakdown">
          {categoryBreakdown.map(([category, count]) => (
            <div key={category} className="category-item">
              <span className="category-icon">{getCategoryIcon(category)}</span>
              <span className="category-name">{category}</span>
              <span className="category-count">{count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Interests */}
      <section className="interests-review">
        <h3 className="section-label">Your Interests</h3>
        <div className="interest-tags">
          {draft.interests.slice(0, 6).map((interest) => (
            <span key={interest} className="interest-tag">
              {interest}
            </span>
          ))}
          {draft.interests.length > 6 && (
            <span className="interest-more">+{draft.interests.length - 6} more</span>
          )}
        </div>
      </section>

      {/* Day Preview */}
      <section className="days-preview">
        <h3 className="section-label">Day Overview</h3>
        <div className="days-timeline">
          {draft.generatedDays.map((day) => (
            <div key={day.id} className="day-preview">
              <span className="preview-day">Day {day.dayNumber}</span>
              <span className="preview-theme">{day.theme}</span>
              <span className="preview-count">{day.activities.length} stops</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ready Message */}
      <div className="ready-message">
        <span className="ready-icon">🎉</span>
        <p className="ready-text">
          Your trip is ready! Click "Create Trip" to save it.
        </p>
      </div>
    </div>
  );
}
