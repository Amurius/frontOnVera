import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component')
      .then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'verify',
    loadComponent: () => import('./features/chat/chat.component')
      .then(m => m.ChatComponent)
  },
  {
    path: 'survey',
    loadComponent: () => import('./features/survey/survey.component')
      .then(m => m.SurveyComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'surveys',
    loadComponent: () => import('./features/surveys-list/surveys-list.component')
      .then(m => m.SurveysListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'surveys/create',
    loadComponent: () => import('./features/survey-create/survey-create.component')
      .then(m => m.SurveyCreateComponent),
    canActivate: [authGuard]
  },
  {
    path: 'surveys/results/:id',
    loadComponent: () => import('./features/survey-results/survey-results.component')
      .then(m => m.SurveyResultsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'legales/cgu',
    loadComponent: () => import('./features/legales/cgu/cgu.component')
      .then(m => m.CguComponent)
  },
  {
    path: 'legales/politique-confidentialite',
    loadComponent: () => import('./features/legales/politique-confidentialite/politique-confidentialite.component')
      .then(m => m.PolitiqueConfidentialiteComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
