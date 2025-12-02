import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SurveyService } from '../../core/services/survey.service';
import { CryptoService } from '../../core/services/crypto.service';
import { SurveyListItem } from '../../core/models/survey.model';
import { Navbar } from '../../shared/navbar/navbar';

@Component({
  selector: 'app-surveys-list',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar],
  templateUrl: './surveys-list.component.html'
})
export class SurveysListComponent implements OnInit {
  private surveyService = inject(SurveyService);
  private cryptoService = inject(CryptoService);

  surveys = signal<SurveyListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  actionLoading = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSurveys();
  }

  loadSurveys(): void {
    this.loading.set(true);
    this.error.set(null);

    this.surveyService.getAllSurveys().subscribe({
      next: (response) => {
        this.surveys.set(response.surveys);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement sondages:', err);
        this.error.set('Erreur lors du chargement des sondages');
        this.loading.set(false);
      }
    });
  }

  activateSurvey(survey: SurveyListItem): void {
    if (survey.is_active) return;

    this.actionLoading.set(survey.id);

    this.surveyService.activateSurvey(survey.id).subscribe({
      next: () => {
        // Met a jour localement
        this.surveys.update(surveys =>
          surveys.map(s => ({
            ...s,
            is_active: s.id === survey.id
          }))
        );
        this.actionLoading.set(null);
      },
      error: (err) => {
        console.error('Erreur activation:', err);
        this.actionLoading.set(null);
      }
    });
  }

  deactivateSurvey(survey: SurveyListItem): void {
    if (!survey.is_active) return;

    this.actionLoading.set(survey.id);

    this.surveyService.deactivateSurvey(survey.id).subscribe({
      next: () => {
        this.surveys.update(surveys =>
          surveys.map(s => ({
            ...s,
            is_active: s.id === survey.id ? false : s.is_active
          }))
        );
        this.actionLoading.set(null);
      },
      error: (err) => {
        console.error('Erreur desactivation:', err);
        this.actionLoading.set(null);
      }
    });
  }

  deleteSurvey(survey: SurveyListItem): void {
    if (!confirm(`Supprimer le sondage "${survey.title}" ? Cette action est irreversible.`)) {
      return;
    }

    this.actionLoading.set(survey.id);

    this.surveyService.deleteSurvey(survey.id).subscribe({
      next: () => {
        this.surveys.update(surveys => surveys.filter(s => s.id !== survey.id));
        this.actionLoading.set(null);
      },
      error: (err) => {
        console.error('Erreur suppression:', err);
        this.actionLoading.set(null);
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Retourne l'URL cryptee pour les resultats d'un sondage
  getResultsUrl(surveyId: string): string {
    const encryptedId = this.cryptoService.encryptId(surveyId);
    return `/surveys/results/${encryptedId}`;
  }
}
