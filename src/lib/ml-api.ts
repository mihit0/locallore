// ML API Client for LocalLore
const ML_API_BASE = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000';

export interface EventTagRequest {
  title: string;
  description: string;
}

export interface EventTagResponse {
  tags: string[];
  confidence_scores: Record<string, number>;
  processing_time?: number;
}

export interface RecommendationRequest {
  user_id: string;
  preferences?: string[];
  limit?: number;
}

export interface RecommendationResponse {
  recommended_events: Array<{
    event_id?: string;
    score?: number;
    title: string;
    description: string;
    category?: string;
    tags?: string[];
  }>;
  scores?: number[];
  processing_time?: number;
}

export interface QualityScoreRequest {
  title: string;
  description: string;
}

export interface QualityScoreResponse {
  quality_score: number;
  spam_probability: number;
  is_spam: boolean;
  processing_time: number;
}

class MLApiClient {
  private async request<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${ML_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`ML API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async tagEvent(request: EventTagRequest): Promise<EventTagResponse> {
    return this.request<EventTagResponse>('/tag-event', request);
  }

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    return this.request<RecommendationResponse>('/recommend-events', request);
  }

  async scoreQuality(request: QualityScoreRequest): Promise<QualityScoreResponse> {
    return this.request<QualityScoreResponse>('/score-quality', request);
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${ML_API_BASE}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const mlApi = new MLApiClient(); 