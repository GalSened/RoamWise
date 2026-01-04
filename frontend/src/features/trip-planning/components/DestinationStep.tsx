/**
 * DestinationStep - Step 1: Choose destination
 * Features: Search, popular destinations, recent searches
 */
import { useState, useCallback } from 'react';
import type { TripDraft } from './TripPlanningWizard';

interface DestinationStepProps {
  draft: TripDraft;
  updateDraft: (updates: Partial<TripDraft>) => void;
}

interface Destination {
  name: string;
  country: string;
  emoji: string;
  location: { lat: number; lng: number };
}

const POPULAR_DESTINATIONS: Destination[] = [
  { name: 'Paris', country: 'France', emoji: '🗼', location: { lat: 48.8566, lng: 2.3522 } },
  { name: 'Tokyo', country: 'Japan', emoji: '🗾', location: { lat: 35.6762, lng: 139.6503 } },
  { name: 'New York', country: 'USA', emoji: '🗽', location: { lat: 40.7128, lng: -74.006 } },
  { name: 'Barcelona', country: 'Spain', emoji: '🏖️', location: { lat: 41.3851, lng: 2.1734 } },
  { name: 'Rome', country: 'Italy', emoji: '🏛️', location: { lat: 41.9028, lng: 12.4964 } },
  { name: 'London', country: 'UK', emoji: '🎡', location: { lat: 51.5074, lng: -0.1278 } },
  { name: 'Dubai', country: 'UAE', emoji: '🏙️', location: { lat: 25.2048, lng: 55.2708 } },
  { name: 'Sydney', country: 'Australia', emoji: '🦘', location: { lat: -33.8688, lng: 151.2093 } },
];

const RECENT_SEARCHES = ['Tel Aviv, Israel', 'Amsterdam, Netherlands'];

export function DestinationStep({ draft, updateDraft }: DestinationStepProps) {
  const [searchQuery, setSearchQuery] = useState(draft.destination);
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    // Simulate search - in real app, call Places API
    await new Promise((r) => setTimeout(r, 300));

    const filtered = POPULAR_DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.country.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
    setIsSearching(false);
  }, []);

  const selectDestination = useCallback(
    (dest: Destination) => {
      setSearchQuery(`${dest.name}, ${dest.country}`);
      setSearchResults([]);
      updateDraft({
        destination: `${dest.name}, ${dest.country}`,
        destinationLocation: dest.location,
        tripName: `Trip to ${dest.name}`,
      });
    },
    [updateDraft]
  );

  const handlePopularClick = useCallback(
    (dest: Destination) => {
      selectDestination(dest);
    },
    [selectDestination]
  );

  return (
    <div className="destination-step">
      <div className="step-header">
        <span className="step-icon">🌍</span>
        <h2 className="step-title">Where do you want to go?</h2>
        <p className="step-subtitle">Search for a city or country</p>
      </div>

      {/* Search Input */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                updateDraft({ destination: '', destinationLocation: null });
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((dest) => (
              <button
                key={dest.name}
                className="search-result-item"
                onClick={() => selectDestination(dest)}
              >
                <span className="result-emoji">{dest.emoji}</span>
                <div className="result-info">
                  <span className="result-name">{dest.name}</span>
                  <span className="result-country">{dest.country}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {isSearching && (
          <div className="search-loading">
            <span className="loading-spinner">⏳</span>
            <span>Searching...</span>
          </div>
        )}
      </div>

      {/* Selected Destination Card */}
      {draft.destinationLocation && (
        <div className="selected-destination">
          <span className="selected-icon">✓</span>
          <span className="selected-name">{draft.destination}</span>
        </div>
      )}

      {/* Recent Searches */}
      {!draft.destinationLocation && RECENT_SEARCHES.length > 0 && (
        <section className="recent-section">
          <h3 className="section-label">Recent Searches</h3>
          <div className="recent-list">
            {RECENT_SEARCHES.map((search) => (
              <button key={search} className="recent-item" onClick={() => handleSearch(search)}>
                <span className="recent-icon">🕐</span>
                <span>{search}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Popular Destinations */}
      {!draft.destinationLocation && (
        <section className="popular-section">
          <h3 className="section-label">Popular Destinations</h3>
          <div className="popular-grid">
            {POPULAR_DESTINATIONS.map((dest) => (
              <button
                key={dest.name}
                className="popular-card"
                onClick={() => handlePopularClick(dest)}
              >
                <span className="popular-emoji">{dest.emoji}</span>
                <span className="popular-name">{dest.name}</span>
                <span className="popular-country">{dest.country}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
