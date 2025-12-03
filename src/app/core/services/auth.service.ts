import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../models/user.model';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private readonly API_URL = `${environment.apiUrl}/auth`;

  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkAuthStatus();
    }
  }

  private checkAuthStatus(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = this.getToken();
    const userJson = localStorage.getItem('user');

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch (error) {
        this.logout();
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, data)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  private setSession(response: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  getProfile(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.API_URL}/profile`);
  }

  inviteModerator(email: string, firstName?: string): Observable<{ message: string; warning?: string }> {
    return this.http.post<{ message: string; warning?: string }>(`${this.API_URL}/invite`, {
      email,
      firstName
    });
  }
}
