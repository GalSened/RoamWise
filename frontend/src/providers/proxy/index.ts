import type {
    PlacesProvider,
    RoutingProvider,
    WeatherProvider,
    Place,
    PlaceDetail,
    PhotoRef,
    Route,
    LatLng
} from '@/types';
import { AppError } from '@/types';

const BASE_URL = '/api';

export class ProxyPlacesProvider implements PlacesProvider {
    async search(query: string, options: { near?: LatLng; radius?: number } = {}): Promise<Place[]> {
        const params = new URLSearchParams({
            keyword: query,
            ...(options.near && { lat: options.near.lat.toString(), lng: options.near.lng.toString() })
        });

        const res = await fetch(`${BASE_URL}/places?${params}`);
        if (!res.ok) return [];

        const data = await res.json();
        // Proxy mock returns { items: [...] } based on previous server.js analysis
        return data.items || data.results || [];
    }

    async details(placeId: string): Promise<PlaceDetail> {
        const res = await fetch(`${BASE_URL}/place-details?placeId=${placeId}`);
        if (!res.ok) throw new AppError('Proxy details failed', 'PROXY_ERROR');
        return res.json();
    }

    async photos(_placeId: string): Promise<PhotoRef[]> {
        // Proxy might not mock this perfectly, return empty for now or impl if needed
        return [];
    }
}

export class ProxyRoutingProvider implements RoutingProvider {
    async route(input: { origin: LatLng; destination: LatLng; mode?: string }): Promise<Route> {
        const res = await fetch(`${BASE_URL}/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        if (!res.ok) throw new AppError('Proxy route failed', 'PROXY_ERROR');
        return res.json();
    }
}

export class ProxyWeatherProvider implements WeatherProvider {
    async getCurrent(lat: number, lng: number): Promise<any> {
        const res = await fetch(`${BASE_URL}/weather?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new AppError('Proxy weather failed', 'PROXY_ERROR');
        return res.json();
    }

    async getForecast(lat: number, lng: number): Promise<any> {
        const res = await fetch(`${BASE_URL}/weather?lat=${lat}&lng=${lng}&forecast=true`);
        if (!res.ok) throw new AppError('Proxy weather failed', 'PROXY_ERROR');
        return res.json();
    }
}

export function createProxyProviders() {
    return {
        places: new ProxyPlacesProvider(),
        routing: new ProxyRoutingProvider(),
        weather: new ProxyWeatherProvider()
    };
}
