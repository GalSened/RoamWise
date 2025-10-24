import type { 
  TripPlan, 
  TripStop, 
  PlanningConstraints, 
  LatLng, 
  StopCategory,
  Place 
} from '@/types';
import { AppError } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';
import { storage } from '@/lib/storage';

interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class PlanningManager extends EventBus {
  private currentPlan?: TripPlan;
  private plans = new Map<string, TripPlan>();

  constructor() {
    super();
    this.loadPlans();
  }

  async createPlan(
    name: string,
    description?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TripPlan> {
    const plan: TripPlan = {
      id: this.generateId(),
      name,
      description,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: 1 day
      stops: [],
      metadata: {
        created: new Date(),
        updated: new Date(),
        version: 1
      }
    };

    this.plans.set(plan.id, plan);
    this.currentPlan = plan;
    await this.savePlans();

    telemetry.track('trip_plan_created', {
      plan_id: plan.id,
      has_description: !!description,
      duration_days: Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / (24 * 60 * 60 * 1000))
    });

    this.emit('plan-created', plan);
    return plan;
  }

  async updatePlan(planId: string, updates: Partial<TripPlan>): Promise<TripPlan> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new AppError('Trip plan not found', 'PLAN_NOT_FOUND');
    }

    const updatedPlan: TripPlan = {
      ...plan,
      ...updates,
      id: plan.id, // Ensure ID cannot be changed
      metadata: {
        ...plan.metadata,
        updated: new Date(),
        version: plan.metadata.version + 1
      }
    };

    // Validate the updated plan
    const validation = this.validatePlan(updatedPlan);
    if (!validation.valid) {
      throw new AppError(
        `Plan validation failed: ${validation.errors.join(', ')}`,
        'PLAN_VALIDATION_FAILED'
      );
    }

    this.plans.set(planId, updatedPlan);
    if (this.currentPlan?.id === planId) {
      this.currentPlan = updatedPlan;
    }
    await this.savePlans();

    telemetry.track('trip_plan_updated', {
      plan_id: planId,
      stops_count: updatedPlan.stops.length,
      has_route: !!updatedPlan.route
    });

    this.emit('plan-updated', updatedPlan);
    return updatedPlan;
  }

  async deletePlan(planId: string): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new AppError('Trip plan not found', 'PLAN_NOT_FOUND');
    }

    this.plans.delete(planId);
    if (this.currentPlan?.id === planId) {
      this.currentPlan = undefined;
    }
    await this.savePlans();

    telemetry.track('trip_plan_deleted', { plan_id: planId });
    this.emit('plan-deleted', planId);
  }

  async addStop(
    planId: string,
    place: Place,
    options: {
      category: StopCategory;
      priority?: number;
      arrivalTime?: Date;
      departureTime?: Date;
      duration?: number;
      notes?: string;
      weatherDependent?: boolean;
      insertIndex?: number;
    }
  ): Promise<TripStop> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new AppError('Trip plan not found', 'PLAN_NOT_FOUND');
    }

    const stop: TripStop = {
      id: this.generateId(),
      place,
      category: options.category,
      priority: options.priority || 3,
      arrivalTime: options.arrivalTime,
      departureTime: options.departureTime,
      duration: options.duration,
      notes: options.notes,
      weatherDependent: options.weatherDependent || false
    };

    // Insert at specified index or append
    if (options.insertIndex !== undefined && options.insertIndex >= 0) {
      plan.stops.splice(options.insertIndex, 0, stop);
    } else {
      plan.stops.push(stop);
    }

    await this.updatePlan(planId, { stops: plan.stops });

    telemetry.track('trip_stop_added', {
      plan_id: planId,
      stop_id: stop.id,
      category: stop.category,
      has_timing: !!(stop.arrivalTime || stop.departureTime),
      weather_dependent: stop.weatherDependent
    });

    this.emit('stop-added', { planId, stop });
    return stop;
  }

  async updateStop(
    planId: string,
    stopId: string,
    updates: Partial<TripStop>
  ): Promise<TripStop> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new AppError('Trip plan not found', 'PLAN_NOT_FOUND');
    }

    const stopIndex = plan.stops.findIndex(s => s.id === stopId);
    if (stopIndex === -1) {
      throw new AppError('Stop not found', 'STOP_NOT_FOUND');
    }

    const updatedStop: TripStop = {
      ...plan.stops[stopIndex],
      ...updates,
      id: stopId // Ensure ID cannot be changed
    };

    plan.stops[stopIndex] = updatedStop;
    await this.updatePlan(planId, { stops: plan.stops });

    telemetry.track('trip_stop_updated', {
      plan_id: planId,
      stop_id: stopId
    });

    this.emit('stop-updated', { planId, stop: updatedStop });
    return updatedStop;
  }

  async removeStop(planId: string, stopId: string): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new AppError('Trip plan not found', 'PLAN_NOT_FOUND');
    }

    const stopIndex = plan.stops.findIndex(s => s.id === stopId);
    if (stopIndex === -1) {
      throw new AppError('Stop not found', 'STOP_NOT_FOUND');
    }

    plan.stops.splice(stopIndex, 1);
    await this.updatePlan(planId, { stops: plan.stops });

    telemetry.track('trip_stop_removed', {
      plan_id: planId,
      stop_id: stopId
    });

    this.emit('stop-removed', { planId, stopId });
  }

  async reorderStops(planId: string, fromIndex: number, toIndex: number): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new AppError('Trip plan not found', 'PLAN_NOT_FOUND');
    }

    if (fromIndex < 0 || fromIndex >= plan.stops.length ||
        toIndex < 0 || toIndex >= plan.stops.length) {
      throw new AppError('Invalid stop indices', 'INVALID_INDICES');
    }

    const [movedStop] = plan.stops.splice(fromIndex, 1);
    plan.stops.splice(toIndex, 0, movedStop);

    await this.updatePlan(planId, { stops: plan.stops });

    telemetry.track('trip_stops_reordered', {
      plan_id: planId,
      from_index: fromIndex,
      to_index: toIndex
    });

    this.emit('stops-reordered', { planId, fromIndex, toIndex });
  }

  validatePlan(plan: TripPlan): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!plan.name.trim()) {
      errors.push('Plan name is required');
    }

    if (plan.endDate <= plan.startDate) {
      errors.push('End date must be after start date');
    }

    // Stop validation
    for (let i = 0; i < plan.stops.length; i++) {
      const stop = plan.stops[i];
      const stopPrefix = `Stop ${i + 1}`;

      if (!stop.place.name) {
        errors.push(`${stopPrefix}: Place name is required`);
      }

      if (!stop.place.location.lat || !stop.place.location.lng) {
        errors.push(`${stopPrefix}: Valid location coordinates are required`);
      }

      // Time validation
      if (stop.arrivalTime && stop.departureTime) {
        if (stop.departureTime <= stop.arrivalTime) {
          errors.push(`${stopPrefix}: Departure time must be after arrival time`);
        }

        const actualDuration = stop.departureTime.getTime() - stop.arrivalTime.getTime();
        const expectedDuration = (stop.duration || 60) * 60 * 1000; // Convert minutes to ms

        if (Math.abs(actualDuration - expectedDuration) > 30 * 60 * 1000) { // 30 min tolerance
          warnings.push(`${stopPrefix}: Duration mismatch between times and specified duration`);
        }
      }

      // Check for overlapping times with next stop
      if (i < plan.stops.length - 1) {
        const nextStop = plan.stops[i + 1];
        if (stop.departureTime && nextStop.arrivalTime) {
          if (stop.departureTime > nextStop.arrivalTime) {
            errors.push(`${stopPrefix}: Departure time overlaps with next stop's arrival time`);
          }
        }
      }

      // Realistic duration validation
      if (stop.duration) {
        const maxDurations: Record<StopCategory, number> = {
          meal: 180,        // 3 hours max
          scenic: 120,      // 2 hours max
          activity: 480,    // 8 hours max
          accommodation: 720, // 12 hours max (half day)
          fuel: 30,         // 30 minutes max
          shopping: 240,    // 4 hours max
          cultural: 360,    // 6 hours max
          other: 480        // 8 hours max
        };

        const maxDuration = maxDurations[stop.category];
        if (stop.duration > maxDuration) {
          warnings.push(`${stopPrefix}: Duration (${stop.duration} min) seems unusually long for ${stop.category}`);
        }

        if (stop.duration < 5 && stop.category !== 'fuel') {
          warnings.push(`${stopPrefix}: Duration (${stop.duration} min) seems too short`);
        }
      }
    }

    // Check total trip duration
    const totalDays = Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / (24 * 60 * 60 * 1000));
    if (totalDays > 30) {
      warnings.push('Trip duration is very long (> 30 days)');
    }

    // Check for reasonable number of stops per day
    const stopsPerDay = plan.stops.length / totalDays;
    if (stopsPerDay > 10) {
      warnings.push('Very high number of stops per day - consider reducing for a more relaxed trip');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  optimizeStopOrder(planId: string, constraints?: PlanningConstraints): Promise<TripPlan> {
    // This would implement a traveling salesman problem solver
    // For now, return a simple implementation
    return Promise.resolve(this.plans.get(planId)!);
  }

  getPlan(planId: string): TripPlan | undefined {
    return this.plans.get(planId);
  }

  getCurrentPlan(): TripPlan | undefined {
    return this.currentPlan;
  }

  getAllPlans(): TripPlan[] {
    return Array.from(this.plans.values()).sort(
      (a, b) => b.metadata.updated.getTime() - a.metadata.updated.getTime()
    );
  }

  setCurrentPlan(planId: string): void {
    const plan = this.plans.get(planId);
    if (plan) {
      this.currentPlan = plan;
      this.emit('current-plan-changed', plan);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadPlans(): Promise<void> {
    try {
      const saved = await storage.get('trip-plans') as TripPlan[] || [];
      saved.forEach(plan => {
        // Deserialize dates
        plan.startDate = new Date(plan.startDate);
        plan.endDate = new Date(plan.endDate);
        plan.metadata.created = new Date(plan.metadata.created);
        plan.metadata.updated = new Date(plan.metadata.updated);
        
        plan.stops.forEach(stop => {
          if (stop.arrivalTime) stop.arrivalTime = new Date(stop.arrivalTime);
          if (stop.departureTime) stop.departureTime = new Date(stop.departureTime);
        });

        this.plans.set(plan.id, plan);
      });

      const currentPlanId = await storage.get('current-plan-id') as string;
      if (currentPlanId) {
        this.currentPlan = this.plans.get(currentPlanId);
      }
    } catch (error) {
      console.warn('Failed to load plans:', error);
    }
  }

  private async savePlans(): Promise<void> {
    try {
      const plans = Array.from(this.plans.values());
      await storage.set('trip-plans', plans);
      
      if (this.currentPlan) {
        await storage.set('current-plan-id', this.currentPlan.id);
      }
    } catch (error) {
      console.warn('Failed to save plans:', error);
    }
  }
}

// Global singleton
export const planningManager = new PlanningManager();

// Hook for easier usage
export function usePlanning() {
  return {
    createPlan: planningManager.createPlan.bind(planningManager),
    updatePlan: planningManager.updatePlan.bind(planningManager),
    deletePlan: planningManager.deletePlan.bind(planningManager),
    addStop: planningManager.addStop.bind(planningManager),
    updateStop: planningManager.updateStop.bind(planningManager),
    removeStop: planningManager.removeStop.bind(planningManager),
    reorderStops: planningManager.reorderStops.bind(planningManager),
    validatePlan: planningManager.validatePlan.bind(planningManager),
    optimizeStopOrder: planningManager.optimizeStopOrder.bind(planningManager),
    getPlan: planningManager.getPlan.bind(planningManager),
    getCurrentPlan: planningManager.getCurrentPlan.bind(planningManager),
    getAllPlans: planningManager.getAllPlans.bind(planningManager),
    setCurrentPlan: planningManager.setCurrentPlan.bind(planningManager),
    subscribe: (event: string, callback: Function) => {
      planningManager.on(event, callback);
      return () => planningManager.off(event, callback);
    }
  };
}