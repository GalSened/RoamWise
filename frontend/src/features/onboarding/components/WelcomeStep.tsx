/**
 * WelcomeStep - Initial welcome screen
 */

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="welcome-step">
      <div className="welcome-hero">
        <span className="welcome-logo">🌍</span>
        <h1 className="welcome-title">Welcome to RoamWise</h1>
        <p className="welcome-subtitle">
          Your AI-powered travel companion for unforgettable adventures
        </p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon">🤖</span>
          <h3 className="feature-title">AI Travel Assistant</h3>
          <p className="feature-desc">Get personalized recommendations and real-time help</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">✨</span>
          <h3 className="feature-title">Smart Itineraries</h3>
          <p className="feature-desc">AI-generated trip plans tailored to your style</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📍</span>
          <h3 className="feature-title">Live Navigation</h3>
          <p className="feature-desc">Turn-by-turn guidance during your trips</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🏆</span>
          <h3 className="feature-title">Travel Rewards</h3>
          <p className="feature-desc">Earn XP and unlock achievements as you explore</p>
        </div>
      </div>

      <div className="welcome-actions">
        <button className="primary-btn" onClick={onNext}>
          Let's Get Started
        </button>
        <button className="skip-btn" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
