/**
 * PlannedTripState - Home view when user has an upcoming planned trip
 * Shows countdown, checklist, weather forecast
 */
import { useMemo, useState } from 'react';
import type { Trip } from '@/domain';
import { useTripStore } from '@/stores';
import { TripState } from '@/domain';

interface PlannedTripStateProps {
  trip: Trip;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  category: 'essential' | 'optional';
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'Pack passport/ID', checked: false, category: 'essential' },
  { id: '2', label: 'Book accommodation', checked: false, category: 'essential' },
  { id: '3', label: 'Download offline maps', checked: false, category: 'essential' },
  { id: '4', label: 'Check weather forecast', checked: false, category: 'optional' },
  { id: '5', label: 'Exchange currency', checked: false, category: 'optional' },
  { id: '6', label: 'Notify bank of travel', checked: false, category: 'optional' },
];

export function PlannedTripState({ trip }: PlannedTripStateProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const { updateTripState, setActiveTrip } = useTripStore();

  // Calculate countdown
  const countdown = useMemo(() => {
    const now = new Date();
    const start = new Date(trip.startDate);
    const diff = start.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, isToday: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, isToday: days === 0 };
  }, [trip.startDate]);

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleStartTrip = () => {
    updateTripState(trip.id, TripState.ACTIVE);
    setActiveTrip(trip);
  };

  const completedCount = checklist.filter((item) => item.checked).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="planned-trip-state">
      {/* Trip Header Card */}
      <div className="trip-hero-card">
        <div className="trip-destination">
          <h1>{trip.destination}</h1>
          <span className="trip-name">{trip.name}</span>
        </div>

        {/* Countdown */}
        <div className="countdown-container">
          {countdown.isToday ? (
            <div className="countdown-today">
              <span className="countdown-emoji">🎉</span>
              <span className="countdown-text">Trip starts today!</span>
            </div>
          ) : (
            <div className="countdown-grid">
              <div className="countdown-item">
                <span className="countdown-value">{countdown.days}</span>
                <span className="countdown-label">days</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-value">{countdown.hours}</span>
                <span className="countdown-label">hours</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-value">{countdown.minutes}</span>
                <span className="countdown-label">mins</span>
              </div>
            </div>
          )}
        </div>

        {/* Start Trip Button (when it's trip day) */}
        {countdown.isToday && (
          <button className="start-trip-btn" onClick={handleStartTrip}>
            🚀 Start Trip
          </button>
        )}
      </div>

      {/* Weather Forecast Preview */}
      <section className="weather-section">
        <h2 className="section-title">☀️ Weather Forecast</h2>
        <div className="weather-preview">
          <div className="weather-day">
            <span className="weather-icon">🌤️</span>
            <span className="weather-temp">24°C</span>
            <span className="weather-label">Day 1</span>
          </div>
          <div className="weather-day">
            <span className="weather-icon">☀️</span>
            <span className="weather-temp">26°C</span>
            <span className="weather-label">Day 2</span>
          </div>
          <div className="weather-day">
            <span className="weather-icon">🌤️</span>
            <span className="weather-temp">23°C</span>
            <span className="weather-label">Day 3</span>
          </div>
        </div>
      </section>

      {/* Pre-Trip Checklist */}
      <section className="checklist-section">
        <div className="checklist-header">
          <h2 className="section-title">✅ Pre-Trip Checklist</h2>
          <span className="checklist-progress">{progress}%</span>
        </div>

        <div className="checklist-progress-bar">
          <div
            className="checklist-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="checklist-items">
          {checklist.map((item) => (
            <label key={item.id} className="checklist-item">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleChecklistItem(item.id)}
              />
              <span className={`checklist-label ${item.checked ? 'checked' : ''}`}>
                {item.label}
              </span>
              {item.category === 'essential' && !item.checked && (
                <span className="essential-badge">Essential</span>
              )}
            </label>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-btn">
          <span>📝</span>
          <span>Edit Trip</span>
        </button>
        <button className="action-btn">
          <span>🗺️</span>
          <span>View Map</span>
        </button>
        <button className="action-btn">
          <span>📤</span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
