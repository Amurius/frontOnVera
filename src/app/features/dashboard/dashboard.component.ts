import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SurveyService } from '../../core/services/survey.service';
import { ClusteringService, GlobalStats, TopCluster } from '../../core/services/clustering.service';
import { DashboardStats } from '../../core/models/survey.model';
import { Navbar } from '../../shared/navbar/navbar';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { LineChart, PieChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

echarts.use([LineChart, PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

// Palette de couleurs orange/gris
const CHART_COLORS = [
  '#F97316', // Orange principal
  '#FB923C', // Orange clair
  '#FDBA74', // Orange tres clair
  '#FED7AA', // Peche
  '#6B7280', // Gris
  '#9CA3AF', // Gris clair
  '#D1D5DB', // Gris tres clair
  '#E5E7EB', // Gris pale
];

interface QuestionResponse {
  questionId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'text' | 'rating';
  options?: string[];
  responses: { option: string; count: number }[];
  totalResponses: number;
}

type ViewMode = 'overview' | 'survey';
type PeriodFilter = '12m' | '30d' | '7d' | 'custom';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, Navbar, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  // Injection des services
  authService = inject(AuthService);
  private surveyService = inject(SurveyService);
  // On met clusteringService en public pour que le template puisse l'utiliser si besoin
  public clusteringService = inject(ClusteringService);

  // --- ÉTAT GLOBAL ---
  currentView = signal<ViewMode>('overview');
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

        // Si on a un sondage actif, charger ses resultats
        if (response.stats.survey?.id) {
          this.activeSurveyId.set(response.stats.survey.id);
          this.loadSurveyResults(response.stats.survey.id);
        } else {
          this.surveyLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Erreur stats sondage:', err);
        this.surveyError.set('Erreur chargement stats sondage');
        this.surveyLoading.set(false);
      }
    });
  }

  loadSurveyResults(surveyId: string): void {
    this.surveyService.getSurveyResults(surveyId).subscribe({
      next: (response) => {
        // Transformer les donnees en QuestionResponse[]
        const questionResponses: QuestionResponse[] = response.questions.map((q: any) => {
          const responses: { option: string; count: number }[] = [];

          if (q.question_type === 'rating') {
            // Pour les notes, creer les options 1-5
            for (let i = 1; i <= 5; i++) {
              const count = q.responses?.[i.toString()] || 0;
              responses.push({ option: i.toString(), count });
            }
          } else if (q.question_type === 'multiple_choice' && q.options) {
            // Pour les choix multiples, utiliser les options definies
            for (const option of q.options) {
              const count = q.responses?.[option] || 0;
              responses.push({ option, count });
            }
          } else if (q.question_type === 'text') {
            // Pour le texte libre, regrouper par reponse
            if (q.responses) {
              Object.entries(q.responses).forEach(([option, count]) => {
                responses.push({ option, count: count as number });
              });
            }
          }

          return {
            questionId: q.id,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options,
            responses,
            totalResponses: responses.reduce((sum, r) => sum + r.count, 0)
          };
        });

        this.questionResponses.set(questionResponses);
        // Vider le cache des options de graphiques pour forcer la regeneration
        this.questionChartOptions.clear();
        this.surveyLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur resultats sondage:', err);
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

    // Charger les stats par pays
    this.clusteringService.getCountryStats().subscribe({
      next: (response) => {
        if (response.success && response.countries) {
          this.countryStats.set(response.countries);
          this.updateCountryChart(response.countries);
        }
      },
      error: (err) => {
        console.error('Erreur stats pays:', err);
      }
    });

    // Charger les stats par langue
    this.clusteringService.getLanguageStats().subscribe({
      next: (response) => {
        if (response.success && response.languages) {
          this.languageStats.set(response.languages);
          this.updateLanguageChart(response.languages);
        }
      },
      error: (err) => {
        console.error('Erreur stats langues:', err);
      }
    });
  }

  updateCountryChart(countries: { country: string; count: number }[]): void {
    const data = countries.slice(0, 6).map((c, i) => ({
      value: c.count,
      name: c.country,
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] }
    }));

    this.countryChartOptions.set({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#374151' }
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        itemGap: 12,
        textStyle: { color: '#374151', fontSize: 13 },
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10
      },
      series: [{
        name: 'Pays',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: false } },
        labelLine: { show: false },
        data
      }]
    });
  }

  updateLanguageChart(languages: { lang: string; count: number }[]): void {
    const data = languages.slice(0, 5).map((l, i) => ({
      value: l.count,
      name: l.lang.toUpperCase(),
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] }
    }));

    this.languageChartOptions.set({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#374151' }
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        itemGap: 16,
        textStyle: { color: '#374151', fontSize: 14 },
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10
      },
      series: [{
        name: 'Langues',
        type: 'pie',
        radius: ['50%', '80%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: false } },
        labelLine: { show: false },
        data
      }]
    });
  }

  askVera(question: string): void {
    // TODO: Naviguer vers le chat avec la question pre-remplie
    console.log('Demander a VERA:', question);
  }

  exportData(): void {
    // TODO: Exporter les donnees
    console.log('Export des donnees');
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatRelativeTime(date: string): string {
    if (!date) return '-';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'A l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return this.formatDateShort(date);
  }

  logout(): void {
    this.authService.logout();
  }

  // Genere les options de graphique pour une question
  getQuestionChartOptions(question: QuestionResponse): EChartsOption {
    if (this.questionChartOptions.has(question.questionId)) {
      return this.questionChartOptions.get(question.questionId)!;
    }

    let options: EChartsOption;

    if (question.questionType === 'rating') {
      // Graphique en barres pour les notes
      options = {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          textStyle: { color: '#374151' },
          formatter: (params: any) => {
            const data = params[0];
            return `Note ${data.name}: <strong>${data.value}</strong> reponses`;
          }
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '10%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: question.responses.map(r => r.option),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#6B7280', fontSize: 14, fontWeight: 'bold' }
        },
        yAxis: {
          type: 'value',
          show: false
        },
        series: [{
          type: 'bar',
          data: question.responses.map((r, i) => ({
            value: r.count,
            itemStyle: {
              color: CHART_COLORS[i % CHART_COLORS.length],
              borderRadius: [6, 6, 0, 0]
            }
          })),
          barWidth: '60%',
          label: {
            show: true,
            position: 'top',
            color: '#374151',
            fontSize: 12,
            fontWeight: 'bold'
          }
        }]
      };
    } else {
      // Graphique en donut pour les choix multiples
      options = {
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          textStyle: { color: '#374151' },
          formatter: (params: any) => {
            const percent = ((params.value / question.totalResponses) * 100).toFixed(1);
            return `${params.name}: <strong>${params.value}</strong> (${percent}%)`;
          }
        },
        legend: {
          orient: 'vertical',
          right: '5%',
          top: 'center',
          itemGap: 12,
          textStyle: { color: '#374151', fontSize: 13 },
          icon: 'circle',
          itemWidth: 10,
          itemHeight: 10
        },
        series: [{
          type: 'pie',
          radius: ['45%', '75%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: { show: false },
          emphasis: { label: { show: false } },
          labelLine: { show: false },
          data: question.responses.map((r, i) => ({
            value: r.count,
            name: r.option,
            itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] }
          }))
        }]
      };
    }

    this.questionChartOptions.set(question.questionId, options);
    return options;
  }

  // Calcule le pourcentage d'une reponse
  getResponsePercentage(count: number, total: number): number {
    return Math.round((count / total) * 100);
  }
}
