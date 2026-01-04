/**
 * NewUserState - Home view for new users
 * Shows inspiration, search, and popular destinations
 */
import { useState } from 'react';
import { useAppStore } from '@/stores';

const POPULAR_DESTINATIONS = [
  { id: '1', name: 'Paris', country: 'France', emoji: '🇫🇷', image: '🗼' },
  { id: '2', name: 'Tokyo', country: 'Japan', emoji: '🇯🇵', image: '🗾' },
  { id: '3', name: 'New York', country: 'USA', emoji: '🇺🇸', image: '🗽' },
  { id: '4', name: 'Rome', country: 'Italy', emoji: '🇮🇹', image: '🏛️' },
  { id: '5', name: 'Barcelona', country: 'Spain', emoji: '🇪🇸', image: '🏖️' },
  { id: '6', name: 'London', country: 'UK', emoji: '🇬🇧', image: '🎡' },
];

const INSPIRATION_QUOTES = [
  "The world is a book, and those who do not travel read only one page.",
  "Adventure awaits! Where will your next journey take you?",
  "Travel far, travel wide, travel often.",
  "Life is short and the world is wide.",
];

export function NewUserState() {
  const [searchQuery, setSearchQuery] = useState('');
  const { setCurrentView } = useAppStore();
  const randomQuote = INSPIRATION_QUOTES[Math.floor(Math.random() * INSPIRATION_QUOTES.length)];

  const handleDestinationClick = (destination: typeof POPULAR_DESTINATIONS[0]) => {
    // Navigate to trip planning with destination pre-filled
    setCurrentView('trip');
    // TODO: Pre-fill destination in wizard
  };

  const handleSurpriseMe = () => {
    const randomDest = POPULAR_DESTINATIONS[Math.floor(Math.random() * POPULAR_DESTINATIONS.length)];
    handleDestinationClick(randomDest);
  };

  return (
    <div className="new-user-state">
      {/* Hero Section with Inspiration */}
      <div className="hero-section">
        <h1 className="hero-title">✈️ Where to next?</h1>
        <p className="hero-quote">{randomQuote}</p>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search destinations, activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="surprise-btn" onClick={handleSurpriseMe}>
          🎲 Surprise Me!
        </button>
      </div>

      {/* Quick Categories */}
      <div className="quick-categories">
        <button className="category-chip" data-category="beach">🏖️ Beach</button>
        <button className="category-chip" data-category="city">🌆 City</button>
        <button className="category-chip" data-category="nature">🏔️ Nature</button>
        <button className="category-chip" data-category="culture">🏛️ Culture</button>
      </div>

      {/* Popular Destinations */}
      <section className="destinations-section">
        <h2 className="section-title">Popular Destinations</h2>
        <div className="destinations-grid">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.id}
              className="destination-card"
              onClick={() => handleDestinationClick(dest)}
            >
              <span className="destination-image">{dest.image}</span>
              <div className="destination-info">
                <span className="destination-name">{dest.name}</span>
                <span className="destination-country">{dest.emoji} {dest.country}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* AI Recommendation Teaser */}
      <section className="ai-teaser">
        <div className="ai-teaser-content">
          <span className="ai-icon">🤖</span>
          <div>
            <h3>AI Trip Planner</h3>
            <p>Let our AI create a personalized itinerary just for you</p>
          </div>
        </div>
        <button className="start-planning-btn" onClick={() => setCurrentView('trip')}>
          Start Planning
        </button>
      </section>
    </div>
  );
}
