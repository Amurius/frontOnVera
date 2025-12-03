import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SurveyService } from '../../core/services/survey.service';
import { ClusteringService, GlobalStats, TopCluster } from '../../core/services/clustering.service';
import { DashboardStats } from '../../core/models/survey.model';
import { Navbar } from '../../shared/navbar/navbar';
import { InviteModalComponent } from '../../shared/components/invite-modal/invite-modal.component';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { LineChart, PieChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

echarts.use([LineChart, PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

// Palette de couleurs VERA - Graphiques
const CHART_COLORS = [
  '#F2AA4B', // Orange (principal)
  '#44A594', // Vert turquoise
  '#F27C82', // Rouge/rose
  '#4B8BD4', // Bleu assorti
  '#D9923F', // Orange plus fonce
  '#3A8F80', // Vert plus fonce
  '#E85D63', // Rouge plus fonce
  '#3D7AC2', // Bleu plus fonce
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
  imports: [CommonModule, RouterLink, FormsModule, Navbar, NgxEchartsDirective, InviteModalComponent],
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
  showInviteModal = signal(false);

  // --- STATS SONDAGES ---
  surveyStats = signal<DashboardStats | null>(null);
  surveyLoading = signal(true);
  surveyError = signal<string | null>(null);

  // --- STATS CLUSTERING (Vera) ---
  clusteringStats = signal<GlobalStats | null>(null);
  topClusters = signal<TopCluster[]>([]);
  clusteringLoading = signal(true);
  clusteringError = signal<string | null>(null);

  // --- STATS PAR PAYS/LANGUE ---
  countryStats = signal<{ country: string; count: number }[]>([]);
  languageStats = signal<{ lang: string; count: number }[]>([]);
  countryChartOptions = signal<EChartsOption | null>(null);
  languageChartOptions = signal<EChartsOption | null>(null);
  areaChartOptions = signal<EChartsOption | null>(null);
  timeSeriesData = signal<{ date: string; label: string; count: number }[]>([]);

  // --- SONDAGES ---
  activeSurveyId = signal<string | null>(null);
  questionResponses = signal<QuestionResponse[]>([]);
  questionChartOptions = new Map<string, EChartsOption>();

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
    this.loadTimeSeriesStats(); // Charge les données du graphique d'évolution
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
        this.loadTimeSeriesStats();
      }
      return;
    }

    // Rechargement immédiat pour Pays, Langue, ou Période standard
    this.loadClusteringStats();

    // Si c'est un changement de période, recharger aussi le graphique temporel
    if (key === 'period') {
      this.loadTimeSeriesStats();
    }
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
      error: (err: Error) => {
        console.error('Erreur top questions:', err);
        this.clusteringError.set('Impossible de charger les questions populaires.');
        this.clusteringLoading.set(false);
      }
    });

    // Charger les stats par pays
    this.clusteringService.getCountryStats().subscribe({
      next: (response: { success: boolean; countries: { country: string; count: number }[] }) => {
        if (response.success && response.countries) {
          this.countryStats.set(response.countries);
          this.updateCountryChart(response.countries);
        }
      },
      error: (err: Error) => {
        console.error('Erreur stats pays:', err);
      }
    });

    // Charger les stats par langue
    this.clusteringService.getLanguageStats().subscribe({
      next: (response: { success: boolean; languages: { lang: string; count: number }[] }) => {
        if (response.success && response.languages) {
          this.languageStats.set(response.languages);
          this.updateLanguageChart(response.languages);
        }
      },
      error: (err: Error) => {
        console.error('Erreur stats langues:', err);
      }
    });
  }

  // Charge les données du graphique d'évolution temporelle
  loadTimeSeriesStats(): void {
    this.clusteringService.getTimeSeriesStats(this.currentFilters.period).subscribe({
      next: (response: { success: boolean; period: string; data: { date: string; label: string; count: number }[] }) => {
        if (response.success && response.data) {
          this.timeSeriesData.set(response.data);
          this.updateAreaChart(response.data);
        }
      },
      error: (err: Error) => {
        console.error('Erreur stats temporelles:', err);
      }
    });
  }

  // Construit les options du graphique d'évolution (Area Chart)
  updateAreaChart(data: { date: string; label: string; count: number }[]): void {
    const labels = data.map(d => d.label);
    const values = data.map(d => Number(d.count));

    this.areaChartOptions.set({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#374151' },
        formatter: (params: any) => {
          const point = params[0];
          return `${point.name}: <strong>${point.value}</strong> questions`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#6B7280', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#9CA3AF', fontSize: 11 }
      },
      series: [{
        name: 'Questions',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        sampling: 'lttb',
        itemStyle: { color: '#F2AA4B' },
        lineStyle: { width: 2, color: '#F2AA4B' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(242, 170, 75, 0.3)' },
              { offset: 1, color: 'rgba(242, 170, 75, 0.05)' }
            ]
          }
        },
        data: values
      }]
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

  // Exporte toutes les questions frequentes en CSV selon les filtres pays/langue
  exportData(): void {
    const clusters = this.topClusters();
    if (clusters.length === 0) {
      console.warn('Aucune donnee a exporter');
      return;
    }

    // Construire les donnees CSV
    const csvLines: string[] = [];
    const csvHeaders = ['Rang', 'Sujet', 'Occurrences', 'Derniere activite', 'Pays filtre', 'Langue filtre'];
    csvLines.push(csvHeaders.join(';'));

    const paysFiltre = this.currentFilters.country ? this.getCountryName(this.currentFilters.country) : 'Tous';
    const langueFiltre = this.currentFilters.lang ? this.getLanguageName(this.currentFilters.lang) : 'Toutes';

    // Parcourir toutes les questions du top
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const csvData = [
        (i + 1).toString(),
        `"${(cluster.question || cluster.representativeText || 'Question sans texte').replace(/"/g, '""')}"`,
        (cluster.frequency || cluster.questionCount || 0).toString(),
        this.formatDateShort(cluster.lastActivityAt || cluster.createdAt || ''),
        paysFiltre,
        langueFiltre
      ];
      csvLines.push(csvData.join(';'));
    }

    // Creer le contenu CSV avec BOM UTF-8
    const csvContent = '\ufeff' + csvLines.join('\n');

    // Telecharger le fichier
    this.downloadCsv(csvContent, 'questions_frequentes.csv');
  }

  // Exporte le nombre de questions sur la periode en CSV
  exportTimeSeriesData(): void {
    const data = this.timeSeriesData();
    if (data.length === 0) {
      console.warn('Aucune donnee temporelle a exporter');
      return;
    }

    // Construire les donnees CSV
    const csvLines: string[] = [];
    const csvHeaders = ['Date', 'Periode', 'Nombre de questions'];
    csvLines.push(csvHeaders.join(';'));

    // Calculer le total
    let total = 0;
    for (const item of data) {
      const csvData = [
        item.date,
        item.label,
        item.count.toString()
      ];
      csvLines.push(csvData.join(';'));
      total += item.count;
    }

    // Ajouter une ligne de total
    csvLines.push(['', 'TOTAL', total.toString()].join(';'));

    // Creer le contenu CSV avec BOM UTF-8
    const csvContent = '\ufeff' + csvLines.join('\n');

    // Nom du fichier avec la periode
    const periodLabel = this.currentFilters.period === '12m' ? '12_mois' :
                        this.currentFilters.period === '30d' ? '30_jours' : '7_jours';
    this.downloadCsv(csvContent, `questions_periode_${periodLabel}.csv`);
  }

  // Exporte les resultats du sondage en CSV
  exportSurveyResults(): void {
    const responses = this.questionResponses();
    if (responses.length === 0) {
      console.warn('Aucun resultat de sondage a exporter');
      return;
    }

    // Construire les donnees CSV
    const csvLines: string[] = [];
    const csvHeaders = ['Question', 'Type', 'Option', 'Nombre de reponses', 'Pourcentage'];
    csvLines.push(csvHeaders.join(';'));

    for (const question of responses) {
      for (const response of question.responses) {
        const percentage = question.totalResponses > 0
          ? Math.round((response.count / question.totalResponses) * 100)
          : 0;

        const line = [
          `"${question.questionText.replace(/"/g, '""')}"`,
          question.questionType,
          `"${response.option.replace(/"/g, '""')}"`,
          response.count.toString(),
          percentage + '%'
        ];
        csvLines.push(line.join(';'));
      }
    }

    // Creer le contenu CSV avec BOM UTF-8
    const csvContent = '\ufeff' + csvLines.join('\n');

    // Telecharger le fichier
    const surveyTitle = this.surveyStats()?.survey?.title || 'sondage';
    const filename = `resultats_${surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    this.downloadCsv(csvContent, filename);
  }

  // Methode utilitaire pour telecharger un fichier CSV
  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  // Retourne la couleur du graphique pour un index donne
  getChartColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length];
  }

  // Calcule le pourcentage d'une reponse
  getResponsePercentage(count: number, total: number): number {
    return Math.round((count / total) * 100);
  }
}
