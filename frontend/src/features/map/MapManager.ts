import type { LatLng, Route, Place } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { themeProvider } from '@/core/theme/ThemeProvider';
import { telemetry } from '@/lib/telemetry';
import * as L from 'leaflet';

interface MapConfig {
  providers: any;
  center?: LatLng;
  zoom?: number;
}

export class MapManager extends EventBus {
  private map?: L.Map;
  private config: MapConfig;
  private layers = {
    route: L.layerGroup(),
    places: L.layerGroup(),
    user: L.layerGroup()
  };
  private currentLocation?: LatLng;

  constructor(config: MapConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      throw new Error('Map container not found');
    }

    // Initialize Leaflet map
    this.map = L.map(mapContainer, {
      center: this.config.center || [32.0853, 34.7818], // Tel Aviv default
      zoom: this.config.zoom || 13,
      zoomControl: true,
      attributionControl: true
    });

    // Add tile layer based on theme
    this.updateMapTiles();

    // Add layer groups
    Object.values(this.layers).forEach(layer => {
      layer.addTo(this.map!);
    });

    // Setup event handlers
    this.setupMapEvents();

    telemetry.track('map_initialized', {
      center: this.config.center,
      zoom: this.config.zoom
    });
  }

  private updateMapTiles(): void {
    if (!this.map) return;

    // Remove existing tile layers
    this.map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        this.map!.removeLayer(layer);
      }
    });

    // Add new tile layer based on theme
    const tileLayer = L.tileLayer(themeProvider.getMapTileURL(), {
      attribution: themeProvider.getMapTileAttribution(),
      maxZoom: 19
    });

    tileLayer.addTo(this.map);
  }

  private setupMapEvents(): void {
    if (!this.map) return;

    this.map.on('click', (e) => {
      this.emit('map-clicked', { location: e.latlng });
      telemetry.track('map_clicked', {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        zoom: this.map!.getZoom()
      });
    });

    this.map.on('zoomend', () => {
      this.emit('zoom-changed', { zoom: this.map!.getZoom() });
    });

    this.map.on('moveend', () => {
      const center = this.map!.getCenter();
      this.emit('center-changed', { center });
    });
  }

  updateTheme(theme: 'light' | 'dark'): void {
    this.updateMapTiles();
    telemetry.track('map_theme_updated', { theme });
  }

  setCenter(location: LatLng, zoom?: number): void {
    if (!this.map) return;
    
    this.map.setView([location.lat, location.lng], zoom || this.map.getZoom());
    this.emit('center-changed', { center: location });
  }

  addPlace(place: Place, options: { showPopup?: boolean; focus?: boolean } = {}): L.Marker {
    if (!this.map) throw new Error('Map not initialized');

    const marker = L.marker([place.location.lat, place.location.lng])
      .bindPopup(`
        <div class="place-popup">
          <h3>${place.name}</h3>
          ${place.address ? `<p>${place.address}</p>` : ''}
          ${place.rating ? `<div>⭐ ${place.rating} (${place.userRatingsTotal || 0} reviews)</div>` : ''}
          <div class="popup-actions">
            <button onclick="window.mapManager.focusPlace('${place.id}')">Details</button>
            <button onclick="window.mapManager.navigateToPlace('${place.id}')">Navigate</button>
          </div>
        </div>
      `);

    marker.addTo(this.layers.places);

    if (options.showPopup) {
      marker.openPopup();
    }

    if (options.focus) {
      this.setCenter(place.location, 16);
    }

    telemetry.track('place_added_to_map', {
      place_id: place.id,
      show_popup: options.showPopup,
      focus: options.focus
    });

    return marker;
  }

  addRoute(route: Route, options: { color?: string; weight?: number } = {}): L.Polyline {
    if (!this.map) throw new Error('Map not initialized');

    // Decode polyline and create Leaflet polyline
    const coordinates = this.decodePolyline(route.overview.polyline);
    const polyline = L.polyline(coordinates, {
      color: options.color || '#3b82f6',
      weight: options.weight || 5,
      opacity: 0.8
    });

    polyline.addTo(this.layers.route);

    // Add markers for start and end
    if (route.legs.length > 0) {
      const firstLeg = route.legs[0];
      const lastLeg = route.legs[route.legs.length - 1];

      L.marker([firstLeg.start.lat, firstLeg.start.lng])
        .bindPopup('Start')
        .addTo(this.layers.route);

      L.marker([lastLeg.end.lat, lastLeg.end.lng])
        .bindPopup('Destination')
        .addTo(this.layers.route);
    }

    // Fit map to route bounds
    this.map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

    telemetry.track('route_added_to_map', {
      distance: route.overview.distance,
      duration: route.overview.duration,
      legs_count: route.legs.length
    });

    return polyline;
  }

  setUserLocation(location: LatLng, accuracy?: number): void {
    if (!this.map) return;

    this.currentLocation = location;

    // Clear existing user location markers
    this.layers.user.clearLayers();

    // Add user location marker
    const userMarker = L.marker([location.lat, location.lng], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: '<div class="user-location-dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).bindPopup('Your location');

    userMarker.addTo(this.layers.user);

    // Add accuracy circle if provided
    if (accuracy) {
      const accuracyCircle = L.circle([location.lat, location.lng], {
        radius: accuracy,
        weight: 1,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1
      });

      accuracyCircle.addTo(this.layers.user);
    }

    this.emit('user-location-updated', { location, accuracy });
  }

  getCurrentLocation(): LatLng | undefined {
    return this.currentLocation;
  }

  clearPlaces(): void {
    this.layers.places.clearLayers();
  }

  clearRoute(): void {
    this.layers.route.clearLayers();
  }

  clearAll(): void {
    Object.values(this.layers).forEach(layer => layer.clearLayers());
  }

  focusPlace(placeId: string): void {
    // Implementation would focus on a specific place
    this.emit('place-focused', { placeId });
  }

  navigateToPlace(placeId: string): void {
    // Implementation would start navigation to place
    this.emit('navigation-requested', { placeId });
  }

  // Utility method to decode Google polyline
  private decodePolyline(encoded: string): [number, number][] {
    const poly: [number, number][] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push([lat / 1e5, lng / 1e5]);
    }

    return poly;
  }

  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    super.destroy();
  }
}

// Global reference for popup callbacks
if (typeof window !== 'undefined') {
  (window as any).mapManager = {
    focusPlace: (placeId: string) => {
      // Global event for place focus
      window.dispatchEvent(new CustomEvent('place-focus', { detail: { placeId } }));
    },
    navigateToPlace: (placeId: string) => {
      // Global event for navigation request
      window.dispatchEvent(new CustomEvent('navigation-request', { detail: { placeId } }));
    }
  };
}