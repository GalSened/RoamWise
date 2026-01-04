/**
 * SettingsSection - App settings (theme, language, notifications)
 */

type Theme = 'light' | 'dark' | 'system';

interface SettingsSectionProps {
  theme: Theme;
  language: string;
  onThemeToggle: () => void;
  onLanguageChange: (lang: string) => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function SettingsSection({
  theme,
  language,
  onThemeToggle,
  onLanguageChange,
}: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <h2 className="section-title">⚙️ Settings</h2>

      <div className="settings-list">
        {/* Theme Toggle */}
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">
              {theme === 'dark' ? '🌙' : theme === 'system' ? '🖥️' : '☀️'}
            </span>
            <div className="setting-text">
              <span className="setting-label">Theme</span>
              <span className="setting-desc">
                {theme === 'dark' ? 'Dark mode' : theme === 'system' ? 'System default' : 'Light mode'}
              </span>
            </div>
          </div>
          <button
            className="theme-toggle-btn"
            onClick={onThemeToggle}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️'}
          </button>
        </div>

        {/* Language Selection */}
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">🌐</span>
            <div className="setting-text">
              <span className="setting-label">Language</span>
              <span className="setting-desc">Choose your preferred language</span>
            </div>
          </div>
          <select
            className="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications */}
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">🔔</span>
            <div className="setting-text">
              <span className="setting-label">Notifications</span>
              <span className="setting-desc">Manage push notifications</span>
            </div>
          </div>
          <button className="setting-arrow">→</button>
        </div>

        {/* Location */}
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">📍</span>
            <div className="setting-text">
              <span className="setting-label">Location Services</span>
              <span className="setting-desc">Allow location access for navigation</span>
            </div>
          </div>
          <button className="toggle-switch active">
            <span className="toggle-thumb" />
          </button>
        </div>

        {/* Units */}
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">📏</span>
            <div className="setting-text">
              <span className="setting-label">Units</span>
              <span className="setting-desc">Distance and temperature units</span>
            </div>
          </div>
          <span className="setting-value">Metric</span>
        </div>

        {/* Data & Privacy */}
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">🔒</span>
            <div className="setting-text">
              <span className="setting-label">Data & Privacy</span>
              <span className="setting-desc">Manage your data and preferences</span>
            </div>
          </div>
          <button className="setting-arrow">→</button>
        </div>
      </div>
    </section>
  );
}
