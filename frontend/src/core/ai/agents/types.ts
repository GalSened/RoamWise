import type {
    PlacesProvider,
    RoutingProvider,
    WeatherProvider
} from '@/types';

export interface Agent {
    id: string;
    role: string;
    process(message: any): Promise<any>;
}

export interface AgentContext {
    weatherProvider: WeatherProvider;
    placesProvider: PlacesProvider;
    routingProvider: RoutingProvider;
}
