import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Survey, SurveyDetail, SurveyResponse, DashboardStats } from '../models/survey.model';

@Injectable({
  providedIn: 'root'
})
export class SurveyService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/surveys';
  private readonly DASHBOARD_URL = 'http://localhost:3000/api/dashboard';

  getSurveys(): Observable<{ surveys: Survey[] }> {
    return this.http.get<{ surveys: Survey[] }>(this.API_URL);
  }

  getSurveyById(id: number): Observable<SurveyDetail> {
    return this.http.get<SurveyDetail>(`${this.API_URL}/${id}`);
  }

  getMySurveys(): Observable<{ surveys: Survey[] }> {
    return this.http.get<{ surveys: Survey[] }>(`${this.API_URL}/my-surveys`);
  }

  createSurvey(survey: any): Observable<{ message: string; survey: Survey }> {
    return this.http.post<{ message: string; survey: Survey }>(this.API_URL, survey);
  }

  submitResponse(surveyId: number, responses: SurveyResponse): Observable<any> {
    return this.http.post(`${this.API_URL}/${surveyId}/responses`, responses);
  }

  getSurveyResponses(surveyId: number): Observable<{ responses: any[] }> {
    return this.http.get<{ responses: any[] }>(`${this.API_URL}/${surveyId}/responses`);
  }

  getDashboardStats(): Observable<{ stats: DashboardStats }> {
    return this.http.get<{ stats: DashboardStats }>(`${this.DASHBOARD_URL}/stats`);
  }
}
