import { useState, useCallback } from 'react';
import { mlApi } from '@/lib/ml-api';

const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000';

// Rule-based tag suggestions when ML API fails
const RULE_BASED_TAGS: Record<string, string[]> = {
  'study': ['Study', 'Academic', 'Study Group'],
  'group': ['Study Group', 'Social', 'Club'],
  'meeting': ['Club', 'RSO', 'Leadership', 'Networking'],
  'computer': ['Computer Science', 'Engineering', 'Academic'],
  'engineering': ['Engineering', 'Academic', 'Undergraduate'],
  'food': ['Food', 'Free', 'Social'],
  'free': ['Free', 'Social', 'Pizza'],
  'pizza': ['Pizza', 'Food', 'Free', 'Social'],
  'career': ['Career', 'Networking', 'Professional'],
  'internship': ['Internship', 'Career', 'Professional'],
  'volunteer': ['Volunteer', 'Community', 'Social'],
  'music': ['Music', 'Cultural', 'Entertainment'],
  'dance': ['Dance', 'Cultural', 'Social'],
  'game': ['Games', 'Social', 'Entertainment'],
  'graduate': ['Graduate', 'Academic', 'Professional'],
  'undergraduate': ['Undergraduate', 'Academic', 'Social'],
  'coffee': ['Coffee', 'Social', 'Free'],
  'networking': ['Networking', 'Professional', 'Career'],
  'leadership': ['Leadership', 'Professional', 'Club'],
  'cultural': ['Cultural', 'Social', 'Diversity'],
  'boiler': ['Boiler Gold Rush', 'Social', 'School Spirit'],
  'rush': ['Boiler Gold Rush', 'Social', 'School Spirit'],
  'sport': ['Sports', 'Recreation', 'Social'],
  'recreation': ['Recreation', 'Sports', 'Social'],
  'tutorial': ['Academic', 'Study', 'Learning'],
  'workshop': ['Academic', 'Professional', 'Learning'],
  'seminar': ['Academic', 'Professional', 'Networking']
};

const getBaseTagFromContent = (content: string): string[] => {
  const lowercaseContent = content.toLowerCase();
  const suggestedTags = new Set<string>();
  
  // Check for keyword matches
  Object.entries(RULE_BASED_TAGS).forEach(([keyword, tags]) => {
    if (lowercaseContent.includes(keyword)) {
      tags.forEach(tag => suggestedTags.add(tag));
    }
  });
  
  // If no specific matches, provide general tags
  if (suggestedTags.size === 0) {
    suggestedTags.add('Other');
    suggestedTags.add('Social');
    suggestedTags.add('Academic');
  }
  
  return Array.from(suggestedTags).slice(0, 5);
};

interface MLResult {
  tags: string[];
  confidences: Record<string, number>;
}

export function useMLAutoTag() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentController, setCurrentController] = useState<AbortController | null>(null);

  const autoTag = useCallback(async (title: string, description: string): Promise<MLResult> => {
    // Cancel any ongoing request
    if (currentController) {
      currentController.abort();
    }

    // Create new controller for this request
    const controller = new AbortController();
    setCurrentController(controller);

    setIsLoading(true);
    setError(null);

    // Rule-based fallback tags
    const fallbackTags = getBaseTagFromContent(title + ' ' + description);
    const fallbackResult: MLResult = {
      tags: fallbackTags,
      confidences: fallbackTags.reduce((acc, tag) => ({ ...acc, [tag]: 0.5 }), {})
    };

    try {
      // Create a promise that will timeout after 2 seconds
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ML API timeout')), 2000)
      );

      const apiPromise = fetch(`${ML_API_URL}/tag-event`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim()
        }),
        signal: controller.signal // Add abort signal
      });

      // Race between API call and timeout
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      // Check if request was aborted
      if (controller.signal.aborted) {
        return fallbackResult;
      }
      
      if (!response.ok) {
        console.warn(`ML Tagging API error: ${response.status}`);
        return fallbackResult;
      }

      const data = await response.json();
      
      // Check again if request was aborted after parsing
      if (controller.signal.aborted) {
        return fallbackResult;
      }
      
      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        const mlTags = data.tags.slice(0, 5); // Limit to 5 tags
        const confidences = data.confidence_scores || {};
        
        console.log('🏷️ ML Auto-tag success:', { tags: mlTags, confidences });
        return {
          tags: mlTags,
          confidences
        };
      } else {
        console.log('🔄 ML returned empty tags, using rule-based fallback');
        return fallbackResult;
      }
    } catch (error) {
      // Don't show error if request was aborted (user is still typing)
      if (error instanceof DOMException && error.name === 'AbortError') {
        return fallbackResult;
      }
      
      if (error instanceof Error && error.message === 'ML API timeout') {
        console.log('⏰ ML API timeout after 2s, using rule-based tags');
      } else {
        console.warn('ML Auto-tag error, using rule-based fallback:', error);
      }
      return fallbackResult;
    } finally {
      setIsLoading(false);
      setCurrentController(null);
    }
  }, [currentController]);

  return { autoTag, isLoading, error };
}

export function useMLQualityCheck() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkQuality = useCallback(async (title: string, description: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await mlApi.scoreQuality({ title, description });
      return {
        qualityScore: response.quality_score,
        spamProbability: response.spam_probability,
        isSpam: response.is_spam,
        isHighQuality: response.quality_score > 0.7 && !response.is_spam
      };
    } catch (err: any) {
      console.warn('Quality check error:', err);
      
      // Check if it's a network/API availability issue
      if (err.message?.includes('Load failed') || 
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('429') ||
          err.message?.includes('503')) {
        setError('AI quality check temporarily unavailable');
      } else {
        setError('Quality check failed');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { checkQuality, isLoading, error };
}

export function useMLRecommendations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = async (userId: string, preferences: string[] = [], limit = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await mlApi.getRecommendations({
        user_id: userId,
        preferences,
        limit
      });
      return response.recommended_events;
    } catch (err: any) {
      console.warn('Recommendations error:', err);
      
      // Check if it's a network/API availability issue
      if (err.message?.includes('Load failed') || 
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('429') ||
          err.message?.includes('503')) {
        setError('AI recommendations temporarily unavailable');
      } else {
        setError('Failed to load recommendations');
      }
      
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { getRecommendations, isLoading, error };
} 