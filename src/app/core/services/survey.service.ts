import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Survey, SurveyDetail, SurveyResponse, DashboardStats, SurveyListItem } from '../models/survey.model';
import { environment } from '../../../environments/environment';

export interface CreateSurveyRequest {
  title: string;
  description: string;
  questions: {
    text: string;
    type: 'multiple_choice' | 'text' | 'rating';
    options?: string[];
    isRequired?: boolean;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class SurveyService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/surveys`;
  private readonly DASHBOARD_URL = `${environment.apiUrl}/dashboard`;

  // Sondages actifs uniquement (public)
  getSurveys(): Observable<{ surveys: Survey[] }> {
    return this.http.get<{ surveys: Survey[] }>(this.API_URL);
  }

  // Tous les sondages (admin)
  getAllSurveys(): Observable<{ surveys: SurveyListItem[] }> {
    return this.http.get<{ surveys: SurveyListItem[] }>(`${this.API_URL}/all`);
  }

  // Sondage actif
  getActiveSurvey(): Observable<{ survey: Survey; questions: any[] }> {
    return this.http.get<{ survey: Survey; questions: any[] }>(`${this.API_URL}/active`);
  }

  getSurveyById(id: string): Observable<SurveyDetail> {
    return this.http.get<SurveyDetail>(`${this.API_URL}/${id}`);
  }

  getMySurveys(): Observable<{ surveys: Survey[] }> {
    return this.http.get<{ surveys: Survey[] }>(`${this.API_URL}/my-surveys`);
  }

  createSurvey(survey: CreateSurveyRequest): Observable<{ message: string; surveyId: string }> {
    return this.http.post<{ message: string; surveyId: string }>(this.API_URL, survey);
  }

  // Activer un sondage (desactive les autres)
  activateSurvey(id: string): Observable<{ message: string; survey: Survey }> {
    return this.http.put<{ message: string; survey: Survey }>(`${this.API_URL}/${id}/activate`, {});
  }

  // Desactiver un sondage
  deactivateSurvey(id: string): Observable<{ message: string; survey: Survey }> {
    return this.http.put<{ message: string; survey: Survey }>(`${this.API_URL}/${id}/deactivate`, {});
  }

  // Supprimer un sondage
  deleteSurvey(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${id}`);
  }

  submitResponse(surveyId: string, responses: SurveyResponse): Observable<any> {
    return this.http.post(`${this.API_URL}/${surveyId}/responses`, responses);
  }

  submitPublicResponse(surveyId: string, responses: { questionId: string; answer: string }[]): Observable<any> {
    return this.http.post(`${this.API_URL}/public-response`, { surveyId, responses });
  }

  getSurveyResponses(surveyId: string): Observable<{ responses: any[] }> {
    return this.http.get<{ responses: any[] }>(`${this.API_URL}/${surveyId}/responses`);
  }

  getSurveyResults(surveyId: string): Observable<{ survey: Survey; totalResponses: number; questions: any[] }> {
    return this.http.get<{ survey: Survey; totalResponses: number; questions: any[] }>(`${this.API_URL}/${surveyId}/results`);
  }

  getDashboardStats(): Observable<{ stats: DashboardStats }> {
    return this.http.get<{ stats: DashboardStats }>(`${this.DASHBOARD_URL}/stats`);
  }
}
