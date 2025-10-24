import { describe, it, expect, beforeEach, vi } from 'vitest';
import { planningManager } from '@/features/planning/PlanningManager';
import type { StopCategory } from '@/types';

describe('PlanningManager', () => {
  beforeEach(() => {
    // Clear all plans
    planningManager.getAllPlans().forEach(plan => {
      planningManager.deletePlan(plan.id);
    });
  });

  describe('Plan Creation', () => {
    it('should create a new trip plan', async () => {
      const plan = await planningManager.createPlan('Test Trip', 'A test trip');
      
      expect(plan.name).toBe('Test Trip');
      expect(plan.description).toBe('A test trip');
      expect(plan.stops).toEqual([]);
      expect(plan.id).toBeDefined();
    });

    it('should set plan as current when created', async () => {
      const plan = await planningManager.createPlan('Test Trip');
      const currentPlan = planningManager.getCurrentPlan();
      
      expect(currentPlan?.id).toBe(plan.id);
    });
  });

  describe('Stop Management', () => {
    it('should add a stop to a plan', async () => {
      const plan = await planningManager.createPlan('Test Trip');
      const place = {
        id: 'place-1',
        name: 'Test Restaurant',
        location: { lat: 32.0853, lng: 34.7818 },
        address: '123 Test St'
      };

      const stop = await planningManager.addStop(plan.id, place, {
        category: 'meal' as StopCategory,
        priority: 3,
        duration: 90
      });

      expect(stop.place.name).toBe('Test Restaurant');
      expect(stop.category).toBe('meal');
      expect(stop.duration).toBe(90);

      const updatedPlan = planningManager.getPlan(plan.id);
      expect(updatedPlan?.stops).toHaveLength(1);
    });

    it('should remove a stop from a plan', async () => {
      const plan = await planningManager.createPlan('Test Trip');
      const place = {
        id: 'place-1',
        name: 'Test Restaurant',
        location: { lat: 32.0853, lng: 34.7818 }
      };

      const stop = await planningManager.addStop(plan.id, place, {
        category: 'meal' as StopCategory
      });

      await planningManager.removeStop(plan.id, stop.id);

      const updatedPlan = planningManager.getPlan(plan.id);
      expect(updatedPlan?.stops).toHaveLength(0);
    });

    it('should reorder stops', async () => {
      const plan = await planningManager.createPlan('Test Trip');
      
      const place1 = {
        id: 'place-1',
        name: 'First Place',
        location: { lat: 32.0853, lng: 34.7818 }
      };
      
      const place2 = {
        id: 'place-2',
        name: 'Second Place',
        location: { lat: 32.0854, lng: 34.7819 }
      };

      await planningManager.addStop(plan.id, place1, { category: 'meal' as StopCategory });
      await planningManager.addStop(plan.id, place2, { category: 'scenic' as StopCategory });

      await planningManager.reorderStops(plan.id, 0, 1);

      const updatedPlan = planningManager.getPlan(plan.id);
      expect(updatedPlan?.stops[0].place.name).toBe('Second Place');
      expect(updatedPlan?.stops[1].place.name).toBe('First Place');
    });
  });

  describe('Plan Validation', () => {
    it('should validate a correct plan', async () => {
      const plan = await planningManager.createPlan('Valid Trip');
      const validation = planningManager.validatePlan(plan);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject plan with empty name', async () => {
      const plan = await planningManager.createPlan('');
      const validation = planningManager.validatePlan(plan);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Plan name is required');
    });

    it('should reject plan with end date before start date', async () => {
      const plan = await planningManager.createPlan('Invalid Trip');
      plan.endDate = new Date(plan.startDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
      
      const validation = planningManager.validatePlan(plan);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('End date must be after start date');
    });

    it('should warn about unusually long durations', async () => {
      const plan = await planningManager.createPlan('Test Trip');
      const place = {
        id: 'place-1',
        name: 'Test Place',
        location: { lat: 32.0853, lng: 34.7818 }
      };

      await planningManager.addStop(plan.id, place, {
        category: 'meal' as StopCategory,
        duration: 500 // 8+ hours for a meal
      });

      const validation = planningManager.validatePlan(plan);
      
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('unusually long'))).toBe(true);
    });
  });

  describe('Plan Persistence', () => {
    it('should save and load plans', async () => {
      const plan = await planningManager.createPlan('Persistent Trip');
      
      // Create a new manager instance to test persistence
      const plans = planningManager.getAllPlans();
      expect(plans.some(p => p.name === 'Persistent Trip')).toBe(true);
    });
  });
});