import type { Agent, AgentContext } from './types';
import { WeatherAgent } from './WeatherAgent';
import { AttractionsAgent } from './AttractionsAgent';
import { MobilityAgent } from './MobilityAgent';
import { groqProvider } from '../providers/GroqProvider';

export class ItineraryAgent implements Agent {
    id = 'agent_itinerary';
    role = 'coordinator';

    private weatherAgent: WeatherAgent;
    private attractionsAgent: AttractionsAgent;
    private mobilityAgent: MobilityAgent;

    constructor(context: AgentContext) {
        this.weatherAgent = new WeatherAgent(context.weatherProvider);
        this.attractionsAgent = new AttractionsAgent(context.placesProvider);
        this.mobilityAgent = new MobilityAgent(context.routingProvider);
    }

    async process(message: { action: 'create_plan'; input: any }): Promise<any> {
        const { input } = message; // destination, origin, constraints...

        // 1. Gather Candidates (A2A -> Attractions)
        const candidates = await this.attractionsAgent.process({
            action: 'find_candidates',
            location: input.origin || { lat: 0, lng: 0 },
            categories: input.constraints.categories || ['scenic', 'meal'],
            constraints: input.constraints
        });

        // 2. Assess Suitability (A2A -> Weather)
        const weatherAnalysis = await this.weatherAgent.process({
            action: 'analyze_suitability',
            location: input.origin || { lat: 0, lng: 0 }
        });

        // 3. Filter & Rank (Internal Logic + Weather Input)
        const ranked = candidates.map(place => {
            let score = (place.rating || 0) / 5;
            // Adjust by weather score if outdoor (heuristic)
            if (place.types?.includes('park') && weatherAnalysis.score < 0.5) {
                score *= 0.5;
            }
            return { place, score };
        }).sort((a, b) => b.score - a.score).slice(0, 5);

        // 4. Logistics (A2A -> Mobility)
        const logistics = await this.mobilityAgent.process({
            action: 'optimize_route',
            stops: ranked.map(r => r.place),
            origin: input.origin
        });

        // 5. Generate Description (Groq via Provider)
        const contextStr = `Weather: ${weatherAnalysis.reasoning.join(', ')}. Top stops: ${ranked.map(r => r.place.name).join(', ')}.`;
        const aiDescription = await groqProvider.generateCompletion(
            `Write a 1-sentence exciting description for a trip to ${input.destination}. Context: ${contextStr}`
        );

        return {
            plan: {
                name: `Trip to ${input.destination || 'Destination'}`,
                description: aiDescription,
                stops: logistics.optimizedStops.map((p, i) => ({
                    id: `stop-${i}`,
                    place: p,
                    priority: 1,
                    duration: 60,
                    notes: 'Recommended by AI'
                }))
            },
            reasoning: `Selected ${ranked.length} places. Weather factor: ${weatherAnalysis.reasoning}`,
            confidence: 0.9
        };
    }
}
