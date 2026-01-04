/**
 * AchievementsList - User earned achievements
 */
import { useUserStore } from '@/stores';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlockedAt?: Date;
  locked?: boolean;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-trip',
    title: 'First Adventure',
    description: 'Complete your first trip',
    icon: '🎉',
    xp: 100,
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Start an activity before 8 AM',
    icon: '🌅',
    xp: 25,
  },
  {
    id: 'foodie',
    title: 'Foodie Explorer',
    description: 'Visit 10 restaurants',
    icon: '🍽️',
    xp: 50,
  },
  {
    id: 'culture-vulture',
    title: 'Culture Vulture',
    description: 'Visit 5 museums or cultural sites',
    icon: '🏛️',
    xp: 50,
  },
  {
    id: 'marathon-traveler',
    title: 'Marathon Traveler',
    description: 'Complete a 7+ day trip',
    icon: '🏃',
    xp: 75,
  },
  {
    id: 'globe-trotter',
    title: 'Globe Trotter',
    description: 'Visit 5 different countries',
    icon: '🌍',
    xp: 200,
  },
  {
    id: 'perfect-planner',
    title: 'Perfect Planner',
    description: 'Complete all activities in a trip',
    icon: '⭐',
    xp: 100,
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete an activity after 10 PM',
    icon: '🦉',
    xp: 25,
  },
  {
    id: 'ai-buddy',
    title: 'AI Buddy',
    description: 'Use AI assistant 10 times',
    icon: '🤖',
    xp: 30,
  },
  {
    id: 'local-expert',
    title: 'Local Expert',
    description: 'Visit the same destination 3 times',
    icon: '🎯',
    xp: 75,
  },
];

export function AchievementsList() {
  const { user } = useUserStore();

  // In real app, would check user.achievements
  const earnedIds = new Set(['first-trip', 'foodie']); // Mock data

  const achievements = ALL_ACHIEVEMENTS.map((a) => ({
    ...a,
    locked: !earnedIds.has(a.id),
    unlockedAt: earnedIds.has(a.id) ? new Date() : undefined,
  }));

  const earned = achievements.filter((a) => !a.locked);
  const locked = achievements.filter((a) => a.locked);

  return (
    <section className="achievements-section">
      <div className="achievements-header">
        <h2 className="section-title">🏆 Achievements</h2>
        <span className="achievements-count">
          {earned.length}/{achievements.length}
        </span>
      </div>

      {/* Earned Achievements */}
      {earned.length > 0 && (
        <div className="achievements-group">
          <h3 className="group-label">Unlocked</h3>
          <div className="achievements-list">
            {earned.map((achievement) => (
              <div key={achievement.id} className="achievement-card earned">
                <span className="achievement-icon">{achievement.icon}</span>
                <div className="achievement-info">
                  <span className="achievement-title">{achievement.title}</span>
                  <span className="achievement-desc">{achievement.description}</span>
                </div>
                <span className="achievement-xp">+{achievement.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {locked.length > 0 && (
        <div className="achievements-group">
          <h3 className="group-label">Locked</h3>
          <div className="achievements-list">
            {locked.slice(0, 4).map((achievement) => (
              <div key={achievement.id} className="achievement-card locked">
                <span className="achievement-icon locked">🔒</span>
                <div className="achievement-info">
                  <span className="achievement-title">{achievement.title}</span>
                  <span className="achievement-desc">{achievement.description}</span>
                </div>
                <span className="achievement-xp">+{achievement.xp} XP</span>
              </div>
            ))}
            {locked.length > 4 && (
              <button className="view-all-btn">
                View all {locked.length} locked achievements →
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
