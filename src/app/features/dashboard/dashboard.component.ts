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
  // Injection des services
  authService = inject(AuthService);
  private surveyService = inject(SurveyService);
  // On met clusteringService en public pour que le template puisse l'utiliser si besoin
  public clusteringService = inject(ClusteringService);

  // --- ÉTAT GLOBAL ---
  currentView = signal<ViewMode>('survey');
  currentUser = computed(() => this.authService.currentUser());

  // --- STATS SONDAGES ---
  surveyStats = signal<DashboardStats | null>(null);
  surveyLoading = signal(true);
  surveyError = signal<string | null>(null);

  // --- STATS CLUSTERING (Vera) ---
  clusteringStats = signal<GlobalStats | null>(null);
  topClusters = signal<TopCluster[]>([]);
  clusteringLoading = signal(true);
  clusteringError = signal<string | null>(null);

  // --- FILTRES ---
  currentFilters = {
    period: '7d',
    startDate: '',
    endDate: '',
    country: '',
    lang: ''
  };

  // Listes pour les menus déroulants dynamiques
  availableCountries = signal<string[]>([]);
  availableLanguages = signal<string[]>([]);

  // --- INITIALISATION ---
  ngOnInit(): void {
    this.loadSurveyStats();
    this.loadClusteringStats();
    this.loadFilters(); // Charge les pays/langues dispos en BDD
  }

  // --- NAVIGATION ---
  setView(view: ViewMode): void {
    this.currentView.set(view);
  }

  // --- LOGIQUE FILTRES ---
  
  // Charge les options depuis le backend
  loadFilters(): void {
    // Vérifie si la méthode existe dans ton service (on l'a ajoutée tout à l'heure)
    if (this.clusteringService.getFilterOptions) {
      this.clusteringService.getFilterOptions().subscribe({
        next: (data) => {
          this.availableCountries.set(data.countries || []);
          this.availableLanguages.set(data.languages || []);
        },
        error: (err) => console.error('Erreur chargement filtres:', err)
      });
    }
  }

  // Gère le changement d'un filtre par l'utilisateur
  onFilterChange(key: string, value: string): void {
    // @ts-ignore
    this.currentFilters[key] = value;

    // Logique intelligente de rechargement
    if (key === 'period' && value === 'custom') {
      return; // On attend les dates
    }

    if ((key === 'startDate' || key === 'endDate')) {
      if (this.currentFilters.period === 'custom' && this.currentFilters.startDate && this.currentFilters.endDate) {
        this.loadClusteringStats();
      }
      return;
    }

    // Rechargement immédiat pour Pays, Langue, ou Période standard
    this.loadClusteringStats();
  }

  // --- CHARGEMENT DES DONNÉES ---

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
        this.surveyError.set('Erreur chargement stats sondage');
        this.surveyLoading.set(false);
      }
    });
  }

  loadClusteringStats(): void {
    this.clusteringLoading.set(true);
    this.clusteringError.set(null);

    // 1. Stats globales (Cartes colorées)
    this.clusteringService.getGlobalStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.clusteringStats.set(response.stats);
        }
      },
      error: (err) => console.error('Erreur stats globales:', err)
    });

    // 2. Top Questions (Tableau) avec filtres
    this.clusteringService.getTopClusters(10, this.currentFilters).subscribe({
      next: (response: any) => {
        // Gestion souple du format de réponse (Tableau ou Objet)
        if (Array.isArray(response)) {
          this.topClusters.set(response);
        } else if (response.clusters) {
          this.topClusters.set(response.clusters);
        } else {
          this.topClusters.set([]);
        }
        this.clusteringLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur top questions:', err);
        this.clusteringError.set('Impossible de charger les questions populaires.');
        this.clusteringLoading.set(false);
      }
    });
  }

  // --- HELPERS D'AFFICHAGE ---

  // Convertit "FR" en "France"
  getCountryName(code: string): string {
    try {
      const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
      return regionNames.of(code) || code;
    } catch {
      return code;
    }
  }

  // Convertit "fr" en "Français"
  getLanguageName(code: string): string {
    try {
      const languageNames = new Intl.DisplayNames(['fr'], { type: 'language' });
      return languageNames.of(code) || code;
    } catch {
      return code;
    }
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateShort(date: string | undefined): string {
    if (!date) return '-';
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