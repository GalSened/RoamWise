import type { LatLng, WeatherProvider } from '@/types';
import type { Agent } from './types';

export class WeatherAgent implements Agent {
    id = 'agent_weather';
    role = 'weather_specialist';

    constructor(private provider: WeatherProvider) { }

    async process(message: { action: 'analyze_suitability'; location: LatLng; date?: string; activityType?: string }): Promise<{ score: number; reasoning: string[]; context: any }> {
        const { location } = message;

        // Get weather context
        const forecast = await this.provider.getForecast(location.lat, location.lng);
        const current = forecast.hourly?.[0];

        if (!current) {
            return { score: 0.5, reasoning: ['No weather data available'], context: null };
        }

        let score = 1.0;
        const reasons: string[] = [];

        // Basic heuristic analysis
        if (current.precipitation > 5) {
            score = 0.2;
            reasons.push('Heavy rain likely');
        } else if (current.temperature > 30) {
            score = 0.6;
            reasons.push('High heat');
        } else if (current.temperature < 5) {
            score = 0.4;
            reasons.push('Very cold');
        } else {
            reasons.push('Mild weather');
        }

        return { score, reasoning: reasons, context: forecast };
    }
}
