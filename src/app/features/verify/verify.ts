import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-verify',
  imports: [CommonModule, FormsModule],
  templateUrl: './verify.html',
  styleUrl: './verify.css',
})
export class Verify {
  verifyType = signal<'text' | 'image' | 'video'>('text');
  textInput = signal('');
  selectedFile = signal<File | null>(null);
  loading = signal(false);
  result = signal<{analysis: string, transcription?: string} | null>(null);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  setVerifyType(type: 'text' | 'image' | 'video') {
    this.verifyType.set(type);
    this.selectedFile.set(null);
    this.textInput.set('');
    this.result.set(null);
    this.error.set(null);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  async onSubmit() {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    try {
      let response: any;

      if (this.verifyType() === 'text') {
        if (!this.textInput()) {
          this.error.set('Veuillez saisir un texte à vérifier');
          this.loading.set(false);
          return;
        }

        response = await this.http.post(`${environment.apiUrl}/fact-check/text`, {
          text: this.textInput()
        }).toPromise();
      } else {
        if (!this.selectedFile()) {
          this.error.set('Veuillez sélectionner un fichier');
          this.loading.set(false);
          return;
        }

        const formData = new FormData();
        formData.append(this.verifyType(), this.selectedFile()!);

        const endpoint = this.verifyType() === 'image' ? 'image' : 'video';
        response = await this.http.post(`${environment.apiUrl}/fact-check/${endpoint}`, formData).toPromise();
      }

      this.result.set({
        analysis: response.analysis,
        transcription: response.transcription
      });
    } catch (err: any) {
      this.error.set(err.error?.message || 'Une erreur est survenue lors de la vérification');
    } finally {
      this.loading.set(false);
    }
  }

  reset() {
    this.textInput.set('');
    this.selectedFile.set(null);
    this.result.set(null);
    this.error.set(null);
  }
}
