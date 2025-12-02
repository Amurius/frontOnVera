import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { SurveyService } from '../../core/services/survey.service';
import { CryptoService } from '../../core/services/crypto.service';
import { Survey } from '../../core/models/survey.model';
import { Navbar } from '../../shared/navbar/navbar';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

echarts.use([PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

// Palette de couleurs VERA
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

interface QuestionResult {
  questionId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'text' | 'rating';
  options?: string[];
  responses: { option: string; count: number }[];
  totalResponses: number;
}

@Component({
  selector: 'app-survey-results',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './survey-results.component.html'
})
export class SurveyResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);
  private cryptoService = inject(CryptoService);

  // Etat
  loading = signal(true);
  error = signal<string | null>(null);
  survey = signal<Survey | null>(null);
  totalResponses = signal(0);
  questionResults = signal<QuestionResult[]>([]);
  questionChartOptions = new Map<string, EChartsOption>();

  ngOnInit(): void {
    // Recuperer l'ID crypte depuis l'URL
    const encryptedId = this.route.snapshot.paramMap.get('id');
    if (encryptedId) {
      const surveyId = this.cryptoService.decryptId(encryptedId);
      if (surveyId) {
        this.loadResults(surveyId);
      } else {
        this.error.set('Identifiant de sondage invalide');
        this.loading.set(false);
      }
    } else {
      this.error.set('Aucun identifiant de sondage fourni');
      this.loading.set(false);
    }
  }

  loadResults(surveyId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.surveyService.getSurveyResults(surveyId).subscribe({
      next: (response) => {
        this.survey.set(response.survey);
        this.totalResponses.set(response.totalResponses);

        // Transformer les donnees en QuestionResult[]
        const results: QuestionResult[] = response.questions.map((q: any) => {
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

        this.questionResults.set(results);
        this.questionChartOptions.clear();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement resultats:', err);
        this.error.set('Impossible de charger les resultats du sondage');
        this.loading.set(false);
      }
    });
  }

  // Export CSV des resultats
  exportResults(): void {
    const results = this.questionResults();
    if (results.length === 0) {
      return;
    }

    const csvLines: string[] = [];
    const csvHeaders = ['Question', 'Type', 'Option', 'Nombre de reponses', 'Pourcentage'];
    csvLines.push(csvHeaders.join(';'));

    for (const question of results) {
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

    const csvContent = '\ufeff' + csvLines.join('\n');
    const surveyTitle = this.survey()?.title || 'sondage';
    const filename = `resultats_${surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

  // Genere les options de graphique pour une question
  getQuestionChartOptions(question: QuestionResult): EChartsOption {
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

  getChartColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length];
  }

  getResponsePercentage(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  formatDate(date: string | Date): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
