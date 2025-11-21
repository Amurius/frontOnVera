import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { SurveyService } from '../../core/services/survey.service';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './survey.component.html',
  styleUrl: './survey.component.css'
})
export class SurveyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private surveyService = inject(SurveyService);
  private router = inject(Router);

  surveyForm!: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // Questions du sondage (à personnaliser)
  questions = [
    {
      id: 'q1',
      text: 'Comment évaluez-vous notre service ?',
      type: 'rating',
      required: true
    },
    {
      id: 'q2',
      text: 'Quelle est votre fonction ?',
      type: 'select',
      options: ['Étudiant', 'Enseignant', 'Personnel administratif', 'Autre'],
      required: true
    },
    {
      id: 'q3',
      text: 'Quelles améliorations souhaiteriez-vous voir ?',
      type: 'textarea',
      required: false
    }
  ];

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    const formGroup: any = {};

    this.questions.forEach(q => {
      formGroup[q.id] = [
        '',
        q.required ? [Validators.required] : []
      ];
    });

    this.surveyForm = this.fb.group(formGroup);
  }

  onSubmit(): void {
    if (this.surveyForm.invalid) {
      Object.keys(this.surveyForm.controls).forEach(key => {
        this.surveyForm.get(key)?.markAsTouched();
      });
      this.error.set('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // TODO: Remplacer par l'ID réel du sondage depuis la base de données
    const surveyId = 1;

    this.surveyService.submitResponse(surveyId, {
      surveyId,
      responses: this.surveyForm.value
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur lors de l\'envoi de votre réponse');
      }
    });
  }

  getErrorMessage(field: string): string {
    const control = this.surveyForm.get(field);
    if (!control || !control.errors || !control.touched) return '';
    if (control.errors['required']) return 'Ce champ est requis';
    return '';
  }
}
