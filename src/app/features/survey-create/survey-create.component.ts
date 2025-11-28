import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SurveyService, CreateSurveyRequest } from '../../core/services/survey.service';
import { Navbar } from '../../shared/navbar/navbar';

interface QuestionForm {
  id: number;
  text: string;
  type: 'multiple_choice' | 'text' | 'rating';
  options: string[];
  isRequired: boolean;
}

@Component({
  selector: 'app-survey-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar],
  templateUrl: './survey-create.component.html',
  styleUrl: './survey-create.component.css'
})
export class SurveyCreateComponent {
  private surveyService = inject(SurveyService);
  private router = inject(Router);

  title = signal('');
  description = signal('');
  questions = signal<QuestionForm[]>([
    { id: 1, text: '', type: 'multiple_choice', options: ['', ''], isRequired: true }
  ]);

  loading = signal(false);
  error = signal<string | null>(null);
  private questionIdCounter = 1;

  addQuestion(): void {
    this.questionIdCounter++;
    this.questions.update(qs => [
      ...qs,
      { id: this.questionIdCounter, text: '', type: 'multiple_choice', options: ['', ''], isRequired: true }
    ]);
  }

  removeQuestion(questionId: number): void {
    if (this.questions().length <= 1) return;
    this.questions.update(qs => qs.filter(q => q.id !== questionId));
  }

  addOption(questionId: number): void {
    this.questions.update(qs =>
      qs.map(q => {
        if (q.id === questionId && q.options.length < 6) {
          return { ...q, options: [...q.options, ''] };
        }
        return q;
      })
    );
  }

  removeOption(questionId: number, optionIndex: number): void {
    this.questions.update(qs =>
      qs.map(q => {
        if (q.id === questionId && q.options.length > 2) {
          const newOptions = [...q.options];
          newOptions.splice(optionIndex, 1);
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  }

  updateQuestionText(questionId: number, text: string): void {
    this.questions.update(qs =>
      qs.map(q => q.id === questionId ? { ...q, text } : q)
    );
  }

  updateQuestionType(questionId: number, type: 'multiple_choice' | 'text' | 'rating'): void {
    this.questions.update(qs =>
      qs.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            type,
            options: type === 'multiple_choice' ? (q.options.length >= 2 ? q.options : ['', '']) : []
          };
        }
        return q;
      })
    );
  }

  updateQuestionRequired(questionId: number, isRequired: boolean): void {
    this.questions.update(qs =>
      qs.map(q => q.id === questionId ? { ...q, isRequired } : q)
    );
  }

  updateOption(questionId: number, optionIndex: number, value: string): void {
    this.questions.update(qs =>
      qs.map(q => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  }

  isValid(): boolean {
    if (!this.title().trim()) return false;
    if (this.questions().length === 0) return false;

    for (const q of this.questions()) {
      if (!q.text.trim()) return false;
      if (q.type === 'multiple_choice') {
        const validOptions = q.options.filter(o => o.trim());
        if (validOptions.length < 2) return false;
      }
    }

    return true;
  }

  submit(): void {
    if (!this.isValid()) {
      this.error.set('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const survey: CreateSurveyRequest = {
      title: this.title().trim(),
      description: this.description().trim(),
      questions: this.questions().map(q => ({
        text: q.text.trim(),
        type: q.type,
        options: q.type === 'multiple_choice' ? q.options.filter(o => o.trim()) : undefined,
        isRequired: q.isRequired
      }))
    };

    this.surveyService.createSurvey(survey).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.router.navigate(['/surveys']);
      },
      error: (err) => {
        console.error('Erreur creation sondage:', err);
        this.error.set('Erreur lors de la creation du sondage');
        this.loading.set(false);
      }
    });
  }
}
