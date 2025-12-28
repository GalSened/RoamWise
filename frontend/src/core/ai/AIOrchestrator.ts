import type {
  PlacesProvider,
  RoutingProvider,
  WeatherProvider,
  VoiceIntent
} from '@/types';

import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';
import { ItineraryAgent } from './agents/ItineraryAgent';

// --- Main Orchestrator ---

export class AIOrchestrator extends EventBus {
  private itineraryAgent: ItineraryAgent;

  constructor(
    placesProvider: PlacesProvider,
    routingProvider: RoutingProvider,
    weatherProvider: WeatherProvider
  ) {
    super();
    // Initialize the Root Agent hierarchy
    this.itineraryAgent = new ItineraryAgent({
      placesProvider,
      routingProvider,
      weatherProvider
    });
  }

  // --- Public API maintained ---

  async processVoiceIntent(intent: VoiceIntent, context?: any): Promise<any> {
    telemetry.track('ai_agent_intent', { type: intent.type });

    if (intent.type === 'plan_create') {
      return this.itineraryAgent.process({
        action: 'create_plan',
        input: {
          destination: intent.parameters.destination,
          origin: context?.location,
          constraints: { weatherAware: true, ...context?.constraints }
        }
      });
    }

    // Fallback/Legacy for other intents (Search/Weather direct calls)
    // In a full refactor, these would also go through agents
    return { message: "Intent handled by legacy system", intent };
  }
}

export function createAIOrchestrator(
  placesProvider: PlacesProvider,
  routingProvider: RoutingProvider,
  weatherProvider: WeatherProvider
): AIOrchestrator {
  return new AIOrchestrator(placesProvider, routingProvider, weatherProvider);
}
