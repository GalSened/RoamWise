import type { LatLng, Place, RoutingProvider } from '@/types';
import type { Agent } from './types';

export class MobilityAgent implements Agent {
    id = 'agent_mobility';
    role = 'logistics_specialist';

    constructor(_provider: RoutingProvider) { }

    async process(message: { action: 'optimize_route'; stops: Place[]; origin: LatLng }): Promise<{ optimizedStops: Place[]; totalDistance: number }> {
        const { stops } = message;
        // Simple pass-through for now, can implement TSP logic here
        return {
            optimizedStops: stops,
            totalDistance: 0
        };
    }
}
