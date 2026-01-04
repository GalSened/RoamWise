/**
 * CompleteStep - Onboarding completion celebration
 */

interface CompleteStepProps {
  name: string;
  onComplete: () => void;
}

export function CompleteStep({ name, onComplete }: CompleteStepProps) {
  const displayName = name || 'Traveler';

  return (
    <div className="complete-step">
      <div className="celebration">
        <span className="confetti">🎉</span>
        <h1 className="complete-title">You're all set, {displayName}!</h1>
        <p className="complete-subtitle">
          Your travel companion is ready to help you explore the world
        </p>
      </div>

      <div className="welcome-card">
        <div className="card-content">
          <span className="card-icon">🌍</span>
          <div className="card-text">
            <h3>Welcome Bonus</h3>
            <p>You've earned your first 50 XP!</p>
          </div>
          <span className="card-xp">+50 XP</span>
        </div>
      </div>

      <div className="quick-tips">
        <h3 className="tips-title">Quick Tips</h3>
        <div className="tips-list">
          <div className="tip-item">
            <span className="tip-icon">✈️</span>
            <span className="tip-text">Start by planning your first trip</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🤖</span>
            <span className="tip-text">Ask the AI assistant for recommendations</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🏆</span>
            <span className="tip-text">Complete trips to earn XP and achievements</span>
          </div>
        </div>
      </div>

      <button className="start-btn" onClick={onComplete}>
        Start Exploring 🚀
      </button>
    </div>
  );
}
