import type { LatLng, Place, PlanningConstraints, PlacesProvider } from '@/types';
import type { Agent } from './types';

export class AttractionsAgent implements Agent {
    id = 'agent_attractions';
    role = 'attractions_specialist';

    constructor(private provider: PlacesProvider) { }

    async process(message: { action: 'find_candidates'; location: LatLng; categories: string[]; constraints: PlanningConstraints }): Promise<Place[]> {
        const { location, categories } = message;
        const candidates: Place[] = [];
        const searchRadius = 5000; // 5km default

        for (const category of categories) {
            try {
                const results = await this.provider.search(this.getSearchTerm(category), {
                    near: location,
                    radius: searchRadius,
                    openNow: true
                });
                candidates.push(...results.map(p => ({ ...p, _inferredCategory: category })));
            } catch (e) {
                console.warn(`AttractionsAgent: Failed to search ${category}`, e);
            }
        }
        return candidates;
    }

    private getSearchTerm(category: string): string {
        const terms: Record<string, string> = {
            meal: 'food restaurants',
            scenic: 'viewpoint park',
            cultural: 'museum historic',
            activity: 'entertainment',
            shopping: 'mall market'
        };
        return terms[category] || category;
    }
}
