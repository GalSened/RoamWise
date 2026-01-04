/**
 * BetweenTripsState - Home view when user has completed trips but none active
 * Shows AI recommendations, travel stats, inspiration
 */
import { useMemo } from 'react';
import { useUserStore, useTripStore, useAppStore } from '@/stores';
import { TRAVELER_LEVEL_LABELS } from '@/domain';

const AI_RECOMMENDATIONS = [
  {
    id: '1',
    type: 'destination',
    title: 'Based on your travel DNA',
    destination: 'Barcelona',
    reason: 'You love cultural experiences and food tours',
    match: 92,
  },
  {
    id: '2',
    type: 'experience',
    title: 'Trending this season',
    destination: 'Iceland',
    reason: 'Northern lights peak season starts soon',
    match: 88,
  },
  {
    id: '3',
    type: 'bucket-list',
    title: 'From your bucket list',
    destination: 'Tokyo',
    reason: 'Cherry blossom season in April',
    match: 95,
  },
];

export function BetweenTripsState() {
  const { user } = useUserStore();
  const { trips } = useTripStore();
  const { setCurrentView } = useAppStore();

  // Calculate travel statistics
  const stats = useMemo(() => {
    const completedTrips = trips.filter((t) => t.state === 'completed');
    const uniqueDestinations = new Set(completedTrips.map((t) => t.destination));

    return {
      tripsCount: completedTrips.length,
      destinations: uniqueDestinations.size,
      totalDays: completedTrips.reduce((sum, t) => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }, 0),
    };
  }, [trips]);

  const levelName = user?.level ? TRAVELER_LEVEL_LABELS[user.level] : 'Traveler';

  return (
    <div className="between-trips-state">
      {/* Welcome Back Header */}
      <div className="welcome-header">
        <h1 className="welcome-title">Welcome back! 👋</h1>
        <p className="welcome-subtitle">Ready for your next adventure?</p>
      </div>

      {/* Travel Stats Summary */}
      <div className="stats-card">
        <div className="stats-header">
          <span className="stats-level">{levelName}</span>
          <span className="stats-xp">{user?.xp || 0} XP</span>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{stats.tripsCount}</span>
            <span className="stat-label">Trips</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.destinations}</span>
            <span className="stat-label">Destinations</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalDays}</span>
            <span className="stat-label">Days</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{user?.stats?.countriesVisited?.length || 1}</span>
            <span className="stat-label">Countries</span>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <section className="recommendations-section">
        <div className="section-header">
          <h2 className="section-title">🤖 AI Picks for You</h2>
          <button className="refresh-btn">↻</button>
        </div>

        <div className="recommendations-list">
          {AI_RECOMMENDATIONS.map((rec) => (
            <div key={rec.id} className="recommendation-card">
              <div className="rec-header">
                <span className="rec-type">{getRecommendationIcon(rec.type)}</span>
                <span className="rec-match">{rec.match}% match</span>
              </div>
              <h3 className="rec-destination">{rec.destination}</h3>
              <p className="rec-reason">{rec.reason}</p>
              <button
                className="rec-explore-btn"
                onClick={() => setCurrentView('trip')}
              >
                Explore →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Start Actions */}
      <div className="quick-start">
        <button
          className="quick-start-btn primary"
          onClick={() => setCurrentView('trip')}
        >
          <span className="btn-icon">✈️</span>
          <span className="btn-text">Plan New Trip</span>
        </button>
        <button
          className="quick-start-btn secondary"
          onClick={() => setCurrentView('ai')}
        >
          <span className="btn-icon">🤖</span>
          <span className="btn-text">Ask AI</span>
        </button>
      </div>

      {/* Travel Insights */}
      <section className="insights-section">
        <h2 className="section-title">📊 Your Travel Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <span className="insight-emoji">🌍</span>
            <p className="insight-text">
              You've explored <strong>{stats.destinations}</strong> unique destinations
            </p>
          </div>
          <div className="insight-card">
            <span className="insight-emoji">🍽️</span>
            <p className="insight-text">
              Food experiences are your top activity type
            </p>
          </div>
          <div className="insight-card">
            <span className="insight-emoji">⭐</span>
            <p className="insight-text">
              Your trips average 4.5 star activities
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function getRecommendationIcon(type: string): string {
  const icons: Record<string, string> = {
    destination: '🎯',
    experience: '✨',
    'bucket-list': '📋',
  };
  return icons[type] || '💡';
}
