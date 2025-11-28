import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SurveyService } from '../../core/services/survey.service';
import { ClusteringService, GlobalStats, TopCluster } from '../../core/services/clustering.service';
import { DashboardStats } from '../../core/models/survey.model';
import { Navbar } from '../../shared/navbar/navbar';

type ViewMode = 'survey' | 'clustering';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private surveyService = inject(SurveyService);
  private clusteringService = inject(ClusteringService);

  // Vue active
  currentView = signal<ViewMode>('survey');

  // Stats sondage
  surveyStats = signal<DashboardStats | null>(null);
  surveyLoading = signal(true);
  surveyError = signal<string | null>(null);

  // Stats clustering
  clusteringStats = signal<GlobalStats | null>(null);
  topClusters = signal<TopCluster[]>([]);
  clusteringLoading = signal(true);
  clusteringError = signal<string | null>(null);

  currentUser = computed(() => this.authService.currentUser());

  ngOnInit(): void {
    this.loadSurveyStats();
    this.loadClusteringStats();
  }

  setView(view: ViewMode): void {
    this.currentView.set(view);
  }

  loadSurveyStats(): void {
    this.surveyLoading.set(true);
    this.surveyError.set(null);

    this.surveyService.getDashboardStats().subscribe({
      next: (response) => {
        this.surveyStats.set(response.stats);
        this.surveyLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur stats sondage:', err);
        this.surveyError.set('Erreur lors du chargement des statistiques du sondage');
        this.surveyLoading.set(false);
      }
    });
  }

  loadClusteringStats(): void {
    this.clusteringLoading.set(true);
    this.clusteringError.set(null);

    // Charge les stats globales et les top clusters en parallele
    this.clusteringService.getGlobalStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.clusteringStats.set(response.stats);
        }
      },
      error: (err) => {
        console.error('Erreur stats clustering:', err);
        this.clusteringError.set('Erreur lors du chargement des statistiques');
      }
    });

    this.clusteringService.getTopClusters(10).subscribe({
      next: (response) => {
        if (response.success) {
          this.topClusters.set(response.clusters);
        }
        this.clusteringLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur top clusters:', err);
        this.clusteringLoading.set(false);
      }
    });
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateShort(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
