import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Question {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
}

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './survey.component.html',
  styleUrl: './survey.component.css'
})
export class SurveyComponent implements OnInit {
  survey = signal<Survey | null>(null);
  questions = signal<Question[]>([]);
  surveyForm!: FormGroup;
  loading = signal(true);
  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadActiveSurvey();
  }

  async loadActiveSurvey() {
    try {
      this.loading.set(true);
      const response: any = await this.http.get(`${environment.apiUrl}/surveys/active`).toPromise();

      this.survey.set(response.survey);
      this.questions.set(response.questions);

      this.buildForm();
    } catch (err: any) {
      this.error.set(err.error?.message || 'Erreur lors du chargement du sondage');
    } finally {
      this.loading.set(false);
    }
  }

  buildForm() {
    const formControls: any = {};

    this.questions().forEach(question => {
      const validators = question.is_required ? [Validators.required] : [];
      formControls[question.id] = ['', validators];
    });

    this.surveyForm = this.fb.group(formControls);
  }

  getErrorMessage(questionId: string): string | null {
    const control = this.surveyForm.get(questionId);
    if (control?.hasError('required') && control.touched) {
      return 'Ce champ est requis';
    }
    return null;
  }

  async onSubmit() {
    if (this.surveyForm.invalid) {
      Object.keys(this.surveyForm.controls).forEach(key => {
        this.surveyForm.get(key)?.markAsTouched();
      });
      return;
    }

    try {
      this.submitting.set(true);
      this.error.set(null);

      const formValues = this.surveyForm.value;
      const responses = Object.keys(formValues).map(questionId => ({
        questionId,
        answer: String(formValues[questionId])
      }));

      await this.http.post(`${environment.apiUrl}/surveys/public-response`, {
        surveyId: this.survey()!.id,
        responses
      }).toPromise();

      this.success.set(true);

      setTimeout(() => {
        this.router.navigate(['/']);
      }, 3000);
    } catch (err: any) {
      this.error.set(err.error?.message || 'Erreur lors de la soumission du sondage');
    } finally {
      this.submitting.set(false);
    }
  }
}
