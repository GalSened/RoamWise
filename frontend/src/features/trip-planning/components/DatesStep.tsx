/**
 * DatesStep - Step 2: Select travel dates and travelers
 * Features: Date picker, trip duration, traveler count
 */
import { useState, useMemo, useCallback } from 'react';
import type { TripDraft } from './TripPlanningWizard';

interface DatesStepProps {
  draft: TripDraft;
  updateDraft: (updates: Partial<TripDraft>) => void;
}

const QUICK_DURATIONS = [
  { days: 3, label: 'Weekend', emoji: '🌴' },
  { days: 5, label: '5 Days', emoji: '✈️' },
  { days: 7, label: 'Week', emoji: '🌍' },
  { days: 14, label: '2 Weeks', emoji: '🏝️' },
];

export function DatesStep({ draft, updateDraft }: DatesStepProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const tripDuration = useMemo(() => {
    if (!draft.startDate || !draft.endDate) return 0;
    const diff = draft.endDate.getTime() - draft.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [draft.startDate, draft.endDate]);

  const handleQuickDuration = useCallback(
    (days: number) => {
      const start = draft.startDate || new Date();
      const end = new Date(start);
      end.setDate(start.getDate() + days - 1);
      updateDraft({ startDate: start, endDate: end });
    },
    [draft.startDate, updateDraft]
  );

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) {
        updateDraft({ startDate: date });
        // Auto-set end date if not set or if end is before start
        if (!draft.endDate || draft.endDate < date) {
          const defaultEnd = new Date(date);
          defaultEnd.setDate(date.getDate() + 6); // Default 7 days
          updateDraft({ endDate: defaultEnd });
        }
      }
    },
    [draft.endDate, updateDraft]
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) {
        updateDraft({ endDate: date });
      }
    },
    [updateDraft]
  );

  const handleTravelersChange = useCallback(
    (delta: number) => {
      const newCount = Math.max(1, Math.min(10, draft.travelers + delta));
      updateDraft({ travelers: newCount });
    },
    [draft.travelers, updateDraft]
  );

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const minStartDate = new Date().toISOString().split('T')[0];
  const minEndDate = draft.startDate
    ? new Date(draft.startDate.getTime() + 86400000).toISOString().split('T')[0]
    : minStartDate;

  return (
    <div className="dates-step">
      <div className="step-header">
        <span className="step-icon">📅</span>
        <h2 className="step-title">When are you traveling?</h2>
        <p className="step-subtitle">Select your trip dates</p>
      </div>

      {/* Quick Duration Chips */}
      <section className="quick-duration-section">
        <h3 className="section-label">Quick Select</h3>
        <div className="duration-chips">
          {QUICK_DURATIONS.map((d) => (
            <button
              key={d.days}
              className={`duration-chip ${tripDuration === d.days ? 'selected' : ''}`}
              onClick={() => handleQuickDuration(d.days)}
            >
              <span className="chip-emoji">{d.emoji}</span>
              <span className="chip-label">{d.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Date Pickers */}
      <section className="date-pickers-section">
        <div className="date-picker">
          <label className="date-label">Start Date</label>
          <div className="date-input-wrapper">
            <span className="date-icon">🛫</span>
            <input
              type="date"
              className="date-input"
              value={formatDateForInput(draft.startDate)}
              onChange={handleStartDateChange}
              min={minStartDate}
            />
          </div>
          <span className="date-display">{formatDateDisplay(draft.startDate)}</span>
        </div>

        <div className="date-separator">
          <span className="separator-line" />
          <span className="separator-duration">
            {tripDuration > 0 ? `${tripDuration} days` : '→'}
          </span>
          <span className="separator-line" />
        </div>

        <div className="date-picker">
          <label className="date-label">End Date</label>
          <div className="date-input-wrapper">
            <span className="date-icon">🛬</span>
            <input
              type="date"
              className="date-input"
              value={formatDateForInput(draft.endDate)}
              onChange={handleEndDateChange}
              min={minEndDate}
            />
          </div>
          <span className="date-display">{formatDateDisplay(draft.endDate)}</span>
        </div>
      </section>

      {/* Trip Summary */}
      {draft.startDate && draft.endDate && (
        <div className="trip-summary-card">
          <div className="summary-header">
            <span className="summary-icon">✈️</span>
            <span className="summary-title">{draft.destination || 'Your Trip'}</span>
          </div>
          <div className="summary-details">
            <span className="summary-dates">
              {formatDateDisplay(draft.startDate)} - {formatDateDisplay(draft.endDate)}
            </span>
            <span className="summary-duration">{tripDuration} days</span>
          </div>
        </div>
      )}

      {/* Travelers */}
      <section className="travelers-section">
        <h3 className="section-label">Travelers</h3>
        <div className="travelers-control">
          <button
            className="traveler-btn minus"
            onClick={() => handleTravelersChange(-1)}
            disabled={draft.travelers <= 1}
          >
            −
          </button>
          <div className="traveler-count">
            <span className="count-value">{draft.travelers}</span>
            <span className="count-label">
              {draft.travelers === 1 ? 'Traveler' : 'Travelers'}
            </span>
          </div>
          <button
            className="traveler-btn plus"
            onClick={() => handleTravelersChange(1)}
            disabled={draft.travelers >= 10}
          >
            +
          </button>
        </div>
        <div className="traveler-icons">
          {Array.from({ length: draft.travelers }).map((_, i) => (
            <span key={i} className="traveler-icon">
              👤
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
