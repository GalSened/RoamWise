/**
 * PostTripState - Home view after completing a trip
 * Shows trip summary, photos, achievements earned
 */
import { useMemo } from 'react';
import type { Trip } from '@/domain';
import { useUserStore, useAppStore } from '@/stores';

interface PostTripStateProps {
  trip: Trip;
}

interface Achievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  xp: number;
}

const POTENTIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-trip', title: 'First Adventure', icon: '🎉', description: 'Completed your first trip!', xp: 100 },
  { id: 'early-bird', title: 'Early Bird', icon: '🌅', description: 'Started an activity before 8 AM', xp: 25 },
  { id: 'foodie', title: 'Foodie Explorer', icon: '🍽️', description: 'Visited 5+ restaurants', xp: 50 },
  { id: 'culture-vulture', title: 'Culture Vulture', icon: '🏛️', description: 'Visited 3+ cultural sites', xp: 50 },
  { id: 'on-schedule', title: 'Punctual Traveler', icon: '⏰', description: 'Completed all activities on time', xp: 75 },
];

export function PostTripState({ trip }: PostTripStateProps) {
  const { user, addXP } = useUserStore();
  const { setCurrentView } = useAppStore();

  // Calculate trip statistics
  const tripStats = useMemo(() => {
    const allActivities = trip.days.flatMap((day) => day.activities);
    const completed = allActivities.filter((a) => a.status === 'completed');
    const skipped = allActivities.filter((a) => a.status === 'skipped');

    const categories = completed.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)[0];

    const duration = Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalActivities: allActivities.length,
      completed: completed.length,
      skipped: skipped.length,
      duration,
      topCategory: topCategory?.[0] || 'attractions',
      completionRate: allActivities.length > 0
        ? Math.round((completed.length / allActivities.length) * 100)
        : 0,
    };
  }, [trip]);

  // Determine achievements earned (simplified logic)
  const earnedAchievements = useMemo(() => {
    const achievements: Achievement[] = [];

    // First trip achievement
    if (!user || user.stats.tripsCompleted === 0) {
      achievements.push(POTENTIAL_ACHIEVEMENTS.find((a) => a.id === 'first-trip')!);
    }

    // High completion rate
    if (tripStats.completionRate >= 90) {
      achievements.push(POTENTIAL_ACHIEVEMENTS.find((a) => a.id === 'on-schedule')!);
    }

    return achievements.filter(Boolean);
  }, [user, tripStats]);

  const totalXPEarned = useMemo(() => {
    const baseXP = 100; // Base XP for completing a trip
    const activityXP = tripStats.completed * 10;
    const achievementXP = earnedAchievements.reduce((sum, a) => sum + a.xp, 0);
    return baseXP + activityXP + achievementXP;
  }, [tripStats, earnedAchievements]);

  return (
    <div className="post-trip-state">
      {/* Celebration Header */}
      <div className="celebration-header">
        <div className="confetti-emoji">🎊</div>
        <h1 className="celebration-title">Trip Complete!</h1>
        <p className="celebration-subtitle">You explored {trip.destination}</p>
      </div>

      {/* Trip Summary Card */}
      <div className="trip-summary-card">
        <h2 className="trip-name">{trip.name}</h2>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-icon">📅</span>
            <span className="stat-value">{tripStats.duration}</span>
            <span className="stat-label">Days</span>
          </div>
          <div className="summary-stat">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{tripStats.completed}</span>
            <span className="stat-label">Activities</span>
          </div>
          <div className="summary-stat">
            <span className="stat-icon">📊</span>
            <span className="stat-value">{tripStats.completionRate}%</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* XP Earned */}
      <div className="xp-earned-card">
        <div className="xp-header">
          <span className="xp-icon">⭐</span>
          <span className="xp-label">XP Earned</span>
        </div>
        <div className="xp-value">+{totalXPEarned}</div>
        <div className="xp-breakdown">
          <span>Trip completion: +100</span>
          <span>Activities: +{tripStats.completed * 10}</span>
          {earnedAchievements.length > 0 && (
            <span>Achievements: +{earnedAchievements.reduce((s, a) => s + a.xp, 0)}</span>
          )}
        </div>
      </div>

      {/* Achievements */}
      {earnedAchievements.length > 0 && (
        <section className="achievements-section">
          <h2 className="section-title">🏆 Achievements Unlocked</h2>
          <div className="achievements-list">
            {earnedAchievements.map((achievement) => (
              <div key={achievement.id} className="achievement-card new">
                <span className="achievement-icon">{achievement.icon}</span>
                <div className="achievement-info">
                  <h3 className="achievement-title">{achievement.title}</h3>
                  <p className="achievement-desc">{achievement.description}</p>
                </div>
                <span className="achievement-xp">+{achievement.xp} XP</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trip Highlights */}
      <section className="highlights-section">
        <h2 className="section-title">📸 Trip Highlights</h2>
        <div className="highlights-grid">
          <div className="highlight-placeholder">
            <span className="placeholder-icon">📷</span>
            <span className="placeholder-text">Add photos</span>
          </div>
          <div className="highlight-placeholder">
            <span className="placeholder-icon">📷</span>
            <span className="placeholder-text">Add photos</span>
          </div>
          <div className="highlight-placeholder">
            <span className="placeholder-icon">📷</span>
            <span className="placeholder-text">Add photos</span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="post-trip-actions">
        <button className="action-btn primary" onClick={() => setCurrentView('trip')}>
          <span>✈️</span>
          <span>Plan Next Trip</span>
        </button>
        <button className="action-btn secondary">
          <span>📤</span>
          <span>Share Trip</span>
        </button>
        <button className="action-btn secondary" onClick={() => setCurrentView('profile')}>
          <span>👤</span>
          <span>View Profile</span>
        </button>
      </div>
    </div>
  );
}
