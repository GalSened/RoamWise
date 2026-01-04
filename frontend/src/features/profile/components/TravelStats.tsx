/**
 * TravelStats - User travel statistics grid
 */

interface TravelStatsProps {
  stats: {
    tripsCompleted: number;
    activitiesCompleted: number;
    destinationsVisited: number;
    countriesVisited: number;
    daysOnTrips: number;
  };
}

export function TravelStats({ stats }: TravelStatsProps) {
  return (
    <section className="travel-stats-section">
      <h2 className="section-title">📊 Travel Stats</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">✈️</span>
          <span className="stat-value">{stats.tripsCompleted}</span>
          <span className="stat-label">Trips</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📍</span>
          <span className="stat-value">{stats.destinationsVisited}</span>
          <span className="stat-label">Cities</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🌍</span>
          <span className="stat-value">{stats.countriesVisited}</span>
          <span className="stat-label">Countries</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <span className="stat-value">{stats.daysOnTrips}</span>
          <span className="stat-label">Days</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <span className="stat-value">{stats.activitiesCompleted}</span>
          <span className="stat-label">Activities</span>
        </div>
      </div>
    </section>
  );
}
