/**
 * TripPlanningWizard - 5-step trip planning flow
 * Steps: Destination → Dates → Preferences → AI Itinerary → Review
 */
import { useState, useCallback, useMemo } from 'react';
import type { Trip, TripDay, ActivityCategory } from '@/domain';
import { TripState } from '@/domain';
import { useTripStore, useUserStore, useAppStore } from '@/stores';
import { DestinationStep } from './DestinationStep';
import { DatesStep } from './DatesStep';
import { PreferencesStep } from './PreferencesStep';
import { ItineraryStep } from './ItineraryStep';
import { ReviewStep } from './ReviewStep';

export type WizardStep = 'destination' | 'dates' | 'preferences' | 'itinerary' | 'review';

const STEPS: WizardStep[] = ['destination', 'dates', 'preferences', 'itinerary', 'review'];

const STEP_LABELS: Record<WizardStep, string> = {
  destination: 'Where',
  dates: 'When',
  preferences: 'What',
  itinerary: 'Plan',
  review: 'Confirm',
};

export interface TripDraft {
  destination: string;
  destinationLocation: { lat: number; lng: number } | null;
  startDate: Date | null;
  endDate: Date | null;
  tripName: string;
  travelers: number;
  budget: 'budget' | 'moderate' | 'luxury';
  pace: 'relaxed' | 'moderate' | 'intensive';
  interests: string[];
  mustSeeSpots: string[];
  generatedDays: TripDay[];
  isGenerating: boolean;
}

const INITIAL_DRAFT: TripDraft = {
  destination: '',
  destinationLocation: null,
  startDate: null,
  endDate: null,
  tripName: '',
  travelers: 1,
  budget: 'moderate',
  pace: 'moderate',
  interests: [],
  mustSeeSpots: [],
  generatedDays: [],
  isGenerating: false,
};

export function TripPlanningWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('destination');
  const [draft, setDraft] = useState<TripDraft>(INITIAL_DRAFT);
  const { addTrip } = useTripStore();
  const { user } = useUserStore();
  const { setCurrentView } = useAppStore();

  const currentStepIndex = STEPS.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const updateDraft = useCallback((updates: Partial<TripDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useMemo((): boolean => {
    switch (currentStep) {
      case 'destination':
        return Boolean(draft.destination && draft.destinationLocation);
      case 'dates':
        return Boolean(draft.startDate && draft.endDate);
      case 'preferences':
        return draft.interests.length > 0;
      case 'itinerary':
        return draft.generatedDays.length > 0 && !draft.isGenerating;
      case 'review':
        return Boolean(draft.tripName);
      default:
        return false;
    }
  }, [currentStep, draft]);

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [canProceed, currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const handleCreateTrip = useCallback(() => {
    if (!draft.startDate || !draft.endDate || !draft.destinationLocation) return;

    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      name: draft.tripName || `Trip to ${draft.destination}`,
      destination: draft.destination,
      destinationLocation: draft.destinationLocation,
      state: TripState.PLANNED,
      startDate: draft.startDate,
      endDate: draft.endDate,
      days: draft.generatedDays,
      travelers: draft.travelers,
      preferences: {
        pace: draft.pace,
        budget: draft.budget,
        interests: draft.interests as ActivityCategory[],
        mustVisit: draft.mustSeeSpots,
        avoidCategories: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addTrip(newTrip);
    setCurrentView('home');
  }, [draft, addTrip, setCurrentView]);

  const handleGoToStep = useCallback((step: WizardStep) => {
    const targetIndex = STEPS.indexOf(step);
    // Can only go back to previous steps
    if (targetIndex <= currentStepIndex) {
      setCurrentStep(step);
    }
  }, [currentStepIndex]);

  return (
    <div className="trip-planning-wizard">
      {/* Progress Header */}
      <div className="wizard-header">
        <button className="wizard-close" onClick={() => setCurrentView('home')}>
          ✕
        </button>
        <h1 className="wizard-title">Plan Your Trip</h1>
        <div className="wizard-progress">
          {STEPS.map((step, idx) => (
            <button
              key={step}
              className={`progress-step ${idx <= currentStepIndex ? 'active' : ''} ${step === currentStep ? 'current' : ''}`}
              onClick={() => handleGoToStep(step)}
              disabled={idx > currentStepIndex}
            >
              <span className="step-number">{idx + 1}</span>
              <span className="step-label">{STEP_LABELS[step]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {currentStep === 'destination' && (
          <DestinationStep draft={draft} updateDraft={updateDraft} />
        )}
        {currentStep === 'dates' && (
          <DatesStep draft={draft} updateDraft={updateDraft} />
        )}
        {currentStep === 'preferences' && (
          <PreferencesStep draft={draft} updateDraft={updateDraft} />
        )}
        {currentStep === 'itinerary' && (
          <ItineraryStep draft={draft} updateDraft={updateDraft} />
        )}
        {currentStep === 'review' && (
          <ReviewStep draft={draft} updateDraft={updateDraft} />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="wizard-footer">
        {!isFirstStep && (
          <button className="wizard-btn back" onClick={handleBack}>
            ← Back
          </button>
        )}
        <div className="wizard-footer-spacer" />
        {!isLastStep ? (
          <button
            className="wizard-btn next"
            onClick={handleNext}
            disabled={!canProceed}
          >
            Next →
          </button>
        ) : (
          <button
            className="wizard-btn create"
            onClick={handleCreateTrip}
            disabled={!canProceed}
          >
            Create Trip ✓
          </button>
        )}
      </div>
    </div>
  );
}
