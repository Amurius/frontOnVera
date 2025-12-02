import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TrendingCluster {
  id: string;
  representativeText: string;
  totalCount: number;
  periodCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface QuestionSubmitResponse {
  success: boolean;
  question: {
    id: string;
    text: string;
    normalizedText: string;
    createdAt: string;
  };
  cluster: {
    id: string;
    representativeText: string;
    questionCount: number;
    isNew: boolean;
  };
  similarity: number;
  threshold: number;
}

export interface TrendingResponse {
  success: boolean;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  count: number;
  clusters: TrendingCluster[];
}

export interface GlobalStats {
  totalQuestions: number;
  totalClusters: number;
  avgQuestionsPerCluster: number;
  maxQuestionsInCluster: number;
  questionsToday: number;
  overallAvgSimilarity: number;
}

// Interface complète pour le Dashboard
export interface TopCluster {
  // Champs principaux (Nouveau Backend)
  question: string;
  frequency: number;
  lastActivityAt: string;
  
  // Champs optionnels (Clustering & Localisation)
  clusterId?: string;
  similarityScore?: number;
  country?: string;
  language?: string;

  // Champs de rétro-compatibilité (Ancien Backend / Autres formats)
  id?: string;
  representativeText?: string;
  questionCount?: number;
  questionsToday?: number;
  createdAt?: string;
  
  // Champs tolérés pour le template HTML (évite les erreurs TS2339)
  question_text?: string; 
  created_at?: string;    
}

@Injectable({
  providedIn: 'root'
})
export class ClusteringService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/clustering`;
  private readonly DASHBOARD_API_URL = `${environment.apiUrl}/dashboard`;

  getTrendingClusters(days: number = 7, limit: number = 3): Observable<TrendingResponse> {
    return this.http.get<TrendingResponse>(
      `${this.API_URL}/clusters/trending`,
      { params: { days: days.toString(), limit: limit.toString() } }
    );
  }

  submitQuestion(question: string, country: string = 'XX', lang: string = 'xx'): Observable<QuestionSubmitResponse> {
    return this.http.post<QuestionSubmitResponse>(
      `${this.API_URL}/questions`,
      { 
        question, 
        country, 
        lang 
      }
    );
  }

  getGlobalStats(): Observable<{ success: boolean; stats: GlobalStats }> {
    return this.http.get<{ success: boolean; stats: GlobalStats }>(
      `${this.API_URL}/stats/global`
    );
  }

  getTopClusters(limit: number = 10, filters?: any): Observable<any> {
    let params = new HttpParams().set('limit', limit.toString());

    if (filters) {
      if (filters.period) params = params.set('period', filters.period);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.country) params = params.set('country', filters.country);
      if (filters.lang) params = params.set('lang', filters.lang);
    }

    return this.http.get<any>(
      `${this.DASHBOARD_API_URL}/top-questions`,
      { params }
    );
  }

  // Récupère les options de filtres disponibles
  getFilterOptions(): Observable<{ countries: string[], languages: string[] }> {
    return this.http.get<{ countries: string[], languages: string[] }>(
      `${this.DASHBOARD_API_URL}/filters`
    );
  }

  // Statistiques par pays
  getCountryStats(): Observable<{ success: boolean; countries: { country: string; count: number }[] }> {
    return this.http.get<{ success: boolean; countries: { country: string; count: number }[] }>(
      `${this.DASHBOARD_API_URL}/stats/countries`
    );
  }

  // Statistiques par langue
  getLanguageStats(): Observable<{ success: boolean; languages: { lang: string; count: number }[] }> {
    return this.http.get<{ success: boolean; languages: { lang: string; count: number }[] }>(
      `${this.DASHBOARD_API_URL}/stats/languages`
    );
  }

  // Statistiques temporelles (graphique d'évolution)
  getTimeSeriesStats(period: string = '7d'): Observable<{ success: boolean; period: string; data: { date: string; label: string; count: number }[] }> {
    return this.http.get<{ success: boolean; period: string; data: { date: string; label: string; count: number }[] }>(
      `${this.DASHBOARD_API_URL}/stats/timeseries`,
      { params: { period } }
    );
  }
}