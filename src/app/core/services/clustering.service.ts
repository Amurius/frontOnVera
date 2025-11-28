import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

export interface TopCluster {
  id: string;
  representativeText: string;
  questionCount: number;
  questionsToday: number;
  createdAt: string;
  lastActivityAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClusteringService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/clustering`;

  getTrendingClusters(days: number = 7, limit: number = 3): Observable<TrendingResponse> {
    return this.http.get<TrendingResponse>(
      `${this.API_URL}/clusters/trending`,
      { params: { days: days.toString(), limit: limit.toString() } }
    );
  }

  submitQuestion(question: string): Observable<QuestionSubmitResponse> {
    return this.http.post<QuestionSubmitResponse>(
      `${this.API_URL}/questions`,
      { question }
    );
  }

  getGlobalStats(): Observable<{ success: boolean; stats: GlobalStats }> {
    return this.http.get<{ success: boolean; stats: GlobalStats }>(
      `${this.API_URL}/stats/global`
    );
  }

  getTopClusters(limit: number = 10): Observable<{ success: boolean; count: number; clusters: TopCluster[] }> {
    return this.http.get<{ success: boolean; count: number; clusters: TopCluster[] }>(
      `${this.API_URL}/clusters/top`,
      { params: { limit: limit.toString() } }
    );
  }
}
