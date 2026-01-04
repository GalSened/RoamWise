/**
 * ProfileView - User profile with stats, achievements, settings
 */
import { useMemo } from 'react';
import { useUserStore, useTripStore, useAppStore } from '@/stores';
import { TRAVELER_LEVEL_LABELS, TRAVELER_LEVEL_XP, TRAVEL_DNA_LABELS, TravelerLevel } from '@/domain';
import type { TravelDNA } from '@/domain';
import { TravelStats } from './TravelStats';
import { AchievementsList } from './AchievementsList';
import { SettingsSection } from './SettingsSection';

export function ProfileView() {
  const { user } = useUserStore();
  const { trips } = useTripStore();
  const { theme, language, toggleTheme, setLanguage } = useAppStore();

  // Calculate XP progress to next level
  const xpProgress = useMemo(() => {
    if (!user) return { current: 0, needed: 100, percentage: 0 };

    const levels = Object.entries(TRAVELER_LEVEL_XP)
      .sort(([, a], [, b]) => (a as number) - (b as number)) as [string, number][];

    let currentLevelXP = 0;
    let nextLevelXP = 100;

    for (let i = 0; i < levels.length; i++) {
      if (user.xp >= levels[i][1]) {
        currentLevelXP = levels[i][1];
        nextLevelXP = levels[i + 1]?.[1] ?? levels[i][1] * 2;
      }
    }

    const progress = user.xp - currentLevelXP;
    const needed = nextLevelXP - currentLevelXP;
    const percentage = Math.round((progress / needed) * 100);

    return { current: progress, needed, percentage };
  }, [user]);

  const stats = useMemo(() => {
    const completedTrips = trips.filter((t) => t.state === 'completed');
    const totalActivities = completedTrips.reduce(
      (sum, t) => sum + t.days.reduce((d, day) => d + day.activities.length, 0),
      0
    );
    const uniqueDestinations = new Set(completedTrips.map((t) => t.destination)).size;

    return {
      tripsCompleted: completedTrips.length,
      activitiesCompleted: totalActivities,
      destinationsVisited: uniqueDestinations,
      countriesVisited: user?.stats?.countriesVisited?.length || 1,
      daysOnTrips: completedTrips.reduce((sum, t) => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }, 0),
    };
  }, [trips, user]);

  // Get top travel DNA traits (highest scoring categories)
  const topTraits = useMemo(() => {
    if (!user?.travelDNA) return [];

    const dna = user.travelDNA;
    const entries = Object.entries(dna) as [keyof TravelDNA, number][];
    return entries
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, value]) => ({
        key,
        label: TRAVEL_DNA_LABELS[key] || key,
        value,
      }));
  }, [user?.travelDNA]);

  const levelName = user?.level ? TRAVELER_LEVEL_LABELS[user.level] : 'Newbie Traveler';

  return (
    <div className="profile-view">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <span className="avatar-emoji">👤</span>
          {user?.level && (
            <span className="level-badge">{getLevelEmoji(user.level)}</span>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user?.name || 'Traveler'}</h1>
          <span className="profile-level">{levelName}</span>
        </div>
        <button className="edit-profile-btn">
          ✏️
        </button>
      </div>

      {/* XP Progress */}
      <div className="xp-card">
        <div className="xp-header">
          <span className="xp-icon">⭐</span>
          <span className="xp-value">{user?.xp || 0} XP</span>
        </div>
        <div className="xp-progress-bar">
          <div
            className="xp-progress-fill"
            style={{ width: `${xpProgress.percentage}%` }}
          />
        </div>
        <span className="xp-label">
          {xpProgress.current} / {xpProgress.needed} XP to next level
        </span>
      </div>

      {/* Travel Stats */}
      <TravelStats stats={stats} />

      {/* Achievements */}
      <AchievementsList />

      {/* Travel DNA Summary */}
      {user?.travelDNA && (
        <section className="travel-dna-section">
          <h2 className="section-title">🧬 Your Travel DNA</h2>
          <div className="dna-grid">
            {topTraits.map((trait) => (
              <div key={trait.key} className="dna-item">
                <div className="dna-bar">
                  <div
                    className="dna-bar-fill"
                    style={{ width: `${trait.value}%` }}
                  />
                </div>
                <span className="dna-label">{trait.label}</span>
                <span className="dna-value">{trait.value}%</span>
              </div>
            ))}
          </div>
          <p className="dna-hint">Based on your trip history and preferences</p>
        </section>
      )}

      {/* Settings */}
      <SettingsSection
        theme={theme}
        language={language}
        onThemeToggle={toggleTheme}
        onLanguageChange={(lang) => setLanguage(lang as 'en' | 'he')}
      />

      {/* Account Actions */}
      <section className="account-section">
        <h2 className="section-title">Account</h2>
        <div className="account-actions">
          <button className="account-btn">
            <span className="btn-icon">📤</span>
            <span>Export Data</span>
          </button>
          <button className="account-btn">
            <span className="btn-icon">❓</span>
            <span>Help & Support</span>
          </button>
          <button className="account-btn">
            <span className="btn-icon">📝</span>
            <span>Privacy Policy</span>
          </button>
          <button className="account-btn danger">
            <span className="btn-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      {/* App Version */}
      <div className="app-version">
        <span>RoamWise v2.0.0</span>
      </div>
    </div>
  );
}

function getLevelEmoji(level: TravelerLevel): string {
  const emojis: Record<TravelerLevel, string> = {
    [TravelerLevel.NEWBIE]: '🌱',
    [TravelerLevel.EXPLORER]: '🧭',
    [TravelerLevel.ADVENTURER]: '⛰️',
    [TravelerLevel.GLOBETROTTER]: '🌍',
    [TravelerLevel.WANDERER]: '✨',
    [TravelerLevel.LEGEND]: '👑',
  };
  return emojis[level] || '🌱';
}
