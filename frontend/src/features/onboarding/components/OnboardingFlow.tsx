/**
 * OnboardingFlow - New user onboarding experience
 * Steps: Welcome → Interests → Preferences → Profile → Complete
 */
import { useState, useCallback } from 'react';
import { useUserStore, useAppStore } from '@/stores';
import { TravelerLevel } from '@/domain';
import { WelcomeStep } from './WelcomeStep';
import { InterestsStep } from './InterestsStep';
import { OnboardingPreferencesStep } from './PreferencesStep';
import { ProfileStep } from './ProfileStep';
import { CompleteStep } from './CompleteStep';

export type OnboardingStep = 'welcome' | 'interests' | 'preferences' | 'profile' | 'complete';

const STEPS: OnboardingStep[] = ['welcome', 'interests', 'preferences', 'profile', 'complete'];

export interface OnboardingData {
  name: string;
  interests: string[];
  budgetPreference: 'budget' | 'moderate' | 'luxury';
  pacePreference: 'relaxed' | 'moderate' | 'intensive';
  travelStyle: 'solo' | 'couple' | 'family' | 'friends' | 'group';
  notifications: boolean;
}

const INITIAL_DATA: OnboardingData = {
  name: '',
  interests: [],
  budgetPreference: 'moderate',
  pacePreference: 'moderate',
  travelStyle: 'solo',
  notifications: true,
};

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const { setUser, completeOnboarding } = useUserStore();
  const { setCurrentView } = useAppStore();

  const currentStepIndex = STEPS.indexOf(currentStep);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const handleComplete = useCallback(() => {
    // Create user from onboarding data
    // Convert interests to TravelDNA numeric scores
    const interestToCategory: Record<string, keyof typeof travelDNA> = {
      culture: 'cultural',
      food: 'culinary',
      adventure: 'adventure',
      relax: 'relaxation',
      nightlife: 'nightlife',
      nature: 'nature',
      shopping: 'shopping',
    };

    const travelDNA = {
      cultural: 50,
      culinary: 50,
      adventure: 50,
      relaxation: 50,
      nightlife: 50,
      nature: 50,
      shopping: 50,
    };

    // Boost scores for selected interests
    data.interests.forEach((interest) => {
      const category = interestToCategory[interest];
      if (category) {
        travelDNA[category] = 80;
      }
    });

    setUser({
      id: `user-${Date.now()}`,
      name: data.name || 'Traveler',
      email: '',
      level: TravelerLevel.NEWBIE,
      xp: 50, // Welcome bonus
      travelDNA,
      stats: {
        tripsCompleted: 0,
        activitiesCompleted: 0,
        totalDistance: 0,
        totalTravelDays: 0,
        countriesVisited: [],
        continentsVisited: [],
        achievements: [],
      },
      preferences: {
        language: 'en',
        theme: 'system',
        pace: data.pacePreference,
        budget: data.budgetPreference,
        notifications: data.notifications,
        locationSharing: false,
      },
      bucketList: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    completeOnboarding();
    setCurrentView('home');
  }, [data, setUser, completeOnboarding, setCurrentView]);

  const handleSkip = useCallback(() => {
    // Skip to complete with defaults
    handleComplete();
  }, [handleComplete]);

  return (
    <div className="onboarding-flow">
      {/* Progress Dots (skip on welcome & complete) */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <div className="onboarding-progress">
          {STEPS.slice(1, -1).map((step, idx) => (
            <span
              key={step}
              className={`progress-dot ${idx <= currentStepIndex - 1 ? 'active' : ''}`}
            />
          ))}
        </div>
      )}

      {/* Step Content */}
      <div className="onboarding-content">
        {currentStep === 'welcome' && (
          <WelcomeStep onNext={handleNext} onSkip={handleSkip} />
        )}
        {currentStep === 'interests' && (
          <InterestsStep
            selected={data.interests}
            onUpdate={(interests) => updateData({ interests })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 'preferences' && (
          <OnboardingPreferencesStep
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 'profile' && (
          <ProfileStep
            name={data.name}
            onUpdate={(name) => updateData({ name })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 'complete' && (
          <CompleteStep name={data.name} onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}
