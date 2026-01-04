/**
 * ItineraryStep - Step 4: AI generates itinerary
 * Features: Generate button, loading animation, day-by-day preview
 */
import { useState, useCallback, useMemo } from 'react';
import type { TripDay, Activity } from '@/domain';
import type { TripDraft } from './TripPlanningWizard';

interface ItineraryStepProps {
  draft: TripDraft;
  updateDraft: (updates: Partial<TripDraft>) => void;
}

// Sample generated activities (in real app, would come from AI)
function generateMockItinerary(draft: TripDraft): TripDay[] {
  if (!draft.startDate || !draft.endDate) return [];

  const dayCount = Math.ceil(
    (draft.endDate.getTime() - draft.startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const sampleActivities = getSampleActivities(draft.interests);
  const days: TripDay[] = [];

  for (let i = 0; i < dayCount; i++) {
    const date = new Date(draft.startDate);
    date.setDate(date.getDate() + i);

    const dayActivities: Activity[] = [];
    const activitiesPerDay = draft.pace === 'relaxed' ? 3 : draft.pace === 'moderate' ? 5 : 6;

    for (let j = 0; j < activitiesPerDay; j++) {
      const activityIndex = (i * activitiesPerDay + j) % sampleActivities.length;
      const template = sampleActivities[activityIndex];

      const scheduledTime = new Date(date);
      scheduledTime.setHours(9 + j * 2, 0, 0, 0);

      dayActivities.push({
        id: `activity-${i}-${j}`,
        name: template.name,
        category: template.category,
        description: template.description,
        location: template.location,
        address: template.address,
        scheduledTime,
        duration: template.duration,
        status: 'pending',
        cost: template.cost,
        rating: template.rating,
        imageUrl: template.imageUrl,
      });
    }

    days.push({
      id: `day-${i}`,
      dayNumber: i + 1,
      date,
      theme: i === 0 ? 'Arrival & Exploration' : i === dayCount - 1 ? 'Last Day Highlights' : `Day ${i + 1} Adventure`,
      activities: dayActivities,
    });
  }

  return days;
}

interface ActivityTemplate {
  name: string;
  category: Activity['category'];
  description: string;
  location: { lat: number; lng: number };
  address: string;
  duration: number;
  cost: number;
  rating: number;
  imageUrl?: string;
}

function getSampleActivities(interests: string[]): ActivityTemplate[] {
  const activities: ActivityTemplate[] = [
    {
      name: 'Historical Walking Tour',
      category: 'culture',
      description: 'Explore the historic city center with a local guide',
      location: { lat: 0, lng: 0 },
      address: 'City Center',
      duration: 120,
      cost: 25,
      rating: 4.8,
    },
    {
      name: 'Local Food Market',
      category: 'food',
      description: 'Taste authentic local cuisine and street food',
      location: { lat: 0, lng: 0 },
      address: 'Central Market',
      duration: 90,
      cost: 30,
      rating: 4.6,
    },
    {
      name: 'Art Museum',
      category: 'culture',
      description: 'World-renowned art collection',
      location: { lat: 0, lng: 0 },
      address: 'Museum District',
      duration: 150,
      cost: 20,
      rating: 4.9,
    },
    {
      name: 'Scenic Park Visit',
      category: 'outdoor',
      description: 'Beautiful gardens and nature trails',
      location: { lat: 0, lng: 0 },
      address: 'City Park',
      duration: 60,
      cost: 0,
      rating: 4.5,
    },
    {
      name: 'Traditional Restaurant',
      category: 'food',
      description: 'Authentic local dining experience',
      location: { lat: 0, lng: 0 },
      address: 'Old Town',
      duration: 90,
      cost: 45,
      rating: 4.7,
    },
    {
      name: 'Landmark Visit',
      category: 'attraction',
      description: 'Iconic city landmark and viewpoint',
      location: { lat: 0, lng: 0 },
      address: 'Tourist District',
      duration: 60,
      cost: 15,
      rating: 4.8,
    },
  ];

  return activities;
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    culture: '🏛️',
    food: '🍽️',
    outdoor: '🌳',
    attraction: '📍',
    shopping: '🛍️',
    entertainment: '🎭',
  };
  return icons[category] || '📍';
}

export function ItineraryStep({ draft, updateDraft }: ItineraryStepProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    updateDraft({ isGenerating: true, generatedDays: [] });

    // Simulate AI generation delay
    await new Promise((r) => setTimeout(r, 2500));

    const days = generateMockItinerary(draft);
    updateDraft({ isGenerating: false, generatedDays: days });
  }, [draft, updateDraft]);

  const handleRegenerate = useCallback(async () => {
    await handleGenerate();
  }, [handleGenerate]);

  const toggleDay = useCallback((dayId: string) => {
    setExpandedDay((prev) => (prev === dayId ? null : dayId));
  }, []);

  const totalActivities = useMemo(() => {
    return draft.generatedDays.reduce((sum, day) => sum + day.activities.length, 0);
  }, [draft.generatedDays]);

  return (
    <div className="itinerary-step">
      <div className="step-header">
        <span className="step-icon">🤖</span>
        <h2 className="step-title">AI-Powered Itinerary</h2>
        <p className="step-subtitle">
          Let AI create a personalized plan based on your preferences
        </p>
      </div>

      {/* Generate Button / Loading State */}
      {draft.generatedDays.length === 0 && !draft.isGenerating && (
        <div className="generate-section">
          <div className="generate-preview">
            <div className="preview-item">
              <span className="preview-icon">📍</span>
              <span className="preview-text">{draft.destination}</span>
            </div>
            <div className="preview-item">
              <span className="preview-icon">📅</span>
              <span className="preview-text">
                {draft.startDate?.toLocaleDateString()} - {draft.endDate?.toLocaleDateString()}
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-icon">🎯</span>
              <span className="preview-text">{draft.interests.length} interests</span>
            </div>
          </div>

          <button className="generate-btn" onClick={handleGenerate}>
            <span className="btn-icon">✨</span>
            <span className="btn-text">Generate Itinerary</span>
          </button>
        </div>
      )}

      {/* Loading Animation */}
      {draft.isGenerating && (
        <div className="generating-state">
          <div className="ai-loader">
            <span className="loader-icon">🤖</span>
            <div className="loader-pulse" />
          </div>
          <h3 className="generating-title">Creating your perfect trip...</h3>
          <div className="generating-steps">
            <span className="gen-step active">Analyzing preferences</span>
            <span className="gen-step">Finding best activities</span>
            <span className="gen-step">Optimizing schedule</span>
          </div>
        </div>
      )}

      {/* Generated Itinerary */}
      {draft.generatedDays.length > 0 && !draft.isGenerating && (
        <div className="itinerary-result">
          {/* Summary Header */}
          <div className="itinerary-summary">
            <span className="summary-icon">✅</span>
            <div className="summary-info">
              <span className="summary-title">Itinerary Ready!</span>
              <span className="summary-stats">
                {draft.generatedDays.length} days • {totalActivities} activities
              </span>
            </div>
            <button className="regenerate-btn" onClick={handleRegenerate}>
              ↻ Regenerate
            </button>
          </div>

          {/* Day Cards */}
          <div className="days-list">
            {draft.generatedDays.map((day) => (
              <div key={day.id} className="day-card">
                <button
                  className="day-header"
                  onClick={() => toggleDay(day.id)}
                >
                  <div className="day-info">
                    <span className="day-number">Day {day.dayNumber}</span>
                    <span className="day-date">
                      {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span className="day-theme">{day.theme}</span>
                  <span className="day-count">{day.activities.length} stops</span>
                  <span className={`day-expand ${expandedDay === day.id ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </button>

                {expandedDay === day.id && (
                  <div className="day-activities">
                    {day.activities.map((activity, idx) => (
                      <div key={activity.id} className="activity-item">
                        <span className="activity-time">
                          {activity.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="activity-line" />
                        <div className="activity-content">
                          <span className="activity-icon">
                            {getCategoryIcon(activity.category)}
                          </span>
                          <div className="activity-details">
                            <span className="activity-name">{activity.name}</span>
                            <span className="activity-duration">{activity.duration} min</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
