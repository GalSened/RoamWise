/**
 * ActiveTripState - Home view when user has an active trip in progress
 * Shows current activity, navigation, alerts, timeline
 */
import { useMemo, useState, useEffect } from 'react';
import type { Trip, Activity, TripAlert } from '@/domain';
import { useTripStore, selectActiveAlerts } from '@/stores';
import { TripState, AlertPriority, ALERT_PRIORITY_COLORS } from '@/domain';

interface ActiveTripStateProps {
  trip: Trip;
}

export function ActiveTripState({ trip }: ActiveTripStateProps) {
  const { updateTripState, setActiveTrip, addAlert, dismissAlert } = useTripStore();
  const alerts = useTripStore(selectActiveAlerts);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Get all activities from all days, flattened
  const allActivities = useMemo(() => {
    return trip.days.flatMap((day) => day.activities);
  }, [trip.days]);

  // Find current activity
  const currentActivity = useMemo(() => {
    return allActivities.find((a) => a.status === 'current');
  }, [allActivities]);

  // Find next pending activity
  const nextActivity = useMemo(() => {
    return allActivities.find((a) => a.status === 'pending');
  }, [allActivities]);

  // Calculate progress
  const progress = useMemo(() => {
    const completed = allActivities.filter((a) => a.status === 'completed').length;
    return {
      completed,
      total: allActivities.length,
      percentage: allActivities.length > 0 ? Math.round((completed / allActivities.length) * 100) : 0,
    };
  }, [allActivities]);

  const handleCompleteActivity = () => {
    // TODO: Mark current activity as complete, move to next
    console.log('Complete activity');
  };

  const handleSkipActivity = () => {
    // TODO: Skip current activity
    console.log('Skip activity');
  };

  const handleNavigate = () => {
    if (currentActivity) {
      const { lat, lng } = currentActivity.location;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  const handlePauseTrip = () => {
    updateTripState(trip.id, TripState.PAUSED);
  };

  const handleEndTrip = () => {
    updateTripState(trip.id, TripState.COMPLETED);
    setActiveTrip(null);
  };

  return (
    <div className="active-trip-state">
      {/* Trip Status Bar */}
      <div className="trip-status-bar">
        <div className="trip-status-info">
          <span className="trip-status-badge active">● Live</span>
          <span className="trip-name">{trip.name}</span>
        </div>
        <div className="trip-progress">
          <span>{progress.completed}/{progress.total}</span>
          <span>stops</span>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="alert-card"
              style={{ borderLeftColor: ALERT_PRIORITY_COLORS[alert.priority] }}
            >
              <div className="alert-header">
                <span className="alert-type">{getAlertIcon(alert.type)}</span>
                <span className="alert-title">{alert.title}</span>
                <button
                  className="alert-dismiss"
                  onClick={() => dismissAlert(alert.id)}
                >
                  ✕
                </button>
              </div>
              <p className="alert-message">{alert.message}</p>
              {alert.actionLabel && (
                <button className="alert-action">{alert.actionLabel}</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Current Activity Card */}
      {currentActivity ? (
        <div className="current-activity-card">
          <div className="activity-header">
            <span className="activity-badge now">NOW</span>
            <span className="activity-time">
              {formatTime(currentActivity.scheduledTime)}
            </span>
          </div>

          <div className="activity-info">
            <span className="activity-category-icon">
              {getCategoryIcon(currentActivity.category)}
            </span>
            <div className="activity-details">
              <h3 className="activity-name">{currentActivity.name}</h3>
              {currentActivity.address && (
                <p className="activity-address">{currentActivity.address}</p>
              )}
              <span className="activity-duration">
                ⏱️ {currentActivity.duration} min
              </span>
            </div>
          </div>

          <div className="activity-actions">
            <button className="action-btn primary" onClick={handleNavigate}>
              📍 Navigate
            </button>
            <button className="action-btn success" onClick={handleCompleteActivity}>
              ✓ Done
            </button>
            <button className="action-btn secondary" onClick={handleSkipActivity}>
              ⏭ Skip
            </button>
          </div>
        </div>
      ) : (
        <div className="no-activity-card">
          <span className="emoji">🎉</span>
          <h3>All activities completed!</h3>
          <p>You've finished all planned activities for today.</p>
        </div>
      )}

      {/* Next Up Preview */}
      {nextActivity && (
        <div className="next-up-card">
          <span className="next-label">Next up:</span>
          <div className="next-info">
            <span className="next-icon">{getCategoryIcon(nextActivity.category)}</span>
            <span className="next-name">{nextActivity.name}</span>
            <span className="next-time">{formatTime(nextActivity.scheduledTime)}</span>
          </div>
        </div>
      )}

      {/* Mini Timeline */}
      <section className="timeline-section">
        <h2 className="section-title">Today's Timeline</h2>
        <div className="timeline">
          {allActivities.slice(0, 5).map((activity, idx) => (
            <div
              key={activity.id}
              className={`timeline-item ${activity.status}`}
            >
              <div className="timeline-marker">
                {activity.status === 'completed' ? '✓' : idx + 1}
              </div>
              <div className="timeline-content">
                <span className="timeline-name">{activity.name}</span>
                <span className="timeline-time">{formatTime(activity.scheduledTime)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trip Controls */}
      <div className="trip-controls">
        <button className="control-btn pause" onClick={handlePauseTrip}>
          ⏸️ Pause Trip
        </button>
        <button className="control-btn end" onClick={handleEndTrip}>
          🏁 End Trip
        </button>
      </div>
    </div>
  );
}

// Helper functions
function getAlertIcon(type: string): string {
  const icons: Record<string, string> = {
    weather: '🌧️',
    traffic: '🚗',
    closure: '🚫',
    recommendation: '💡',
    timing: '⏰',
  };
  return icons[type] || '⚠️';
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    attraction: '🏛️',
    restaurant: '🍽️',
    hotel: '🏨',
    transport: '🚗',
    shopping: '🛍️',
    nature: '🌲',
    culture: '🎭',
    entertainment: '🎪',
  };
  return icons[category] || '📍';
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
