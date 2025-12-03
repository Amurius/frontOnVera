import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-invite-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Overlay -->
    <div
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      (click)="onOverlayClick($event)">

      <!-- Modal -->
      <div class="bg-white rounded-[16px] w-full max-w-[480px] overflow-hidden shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 class="text-large font-medium text-vera-dark">Inviter un moderateur</h2>
          <button
            (click)="close.emit()"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-500">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          @if (successMessage()) {
            <div class="bg-green-50 border border-green-200 rounded-[8px] p-4 mb-4">
              <div class="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-green-600">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p class="text-small text-green-700">{{ successMessage() }}</p>
              </div>
            </div>
          }

          @if (errorMessage()) {
            <div class="bg-red-50 border border-red-200 rounded-[8px] p-4 mb-4">
              <div class="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-red-600">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p class="text-small text-red-700">{{ errorMessage() }}</p>
              </div>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Email -->
            <div>
              <label for="email" class="block text-small font-medium text-vera-dark mb-2">
                Email <span class="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="email@exemple.com"
                class="w-full px-4 py-3 rounded-[8px] border border-gray-200 text-small text-vera-dark placeholder:text-gray-400 focus:outline-none focus:border-vera-dark transition-colors"
                [disabled]="loading()">
            </div>

            <!-- Prenom -->
            <div>
              <label for="firstName" class="block text-small font-medium text-vera-dark mb-2">
                Prenom
              </label>
              <input
                type="text"
                id="firstName"
                [(ngModel)]="firstName"
                name="firstName"
                placeholder="Prenom du moderateur"
                class="w-full px-4 py-3 rounded-[8px] border border-gray-200 text-small text-vera-dark placeholder:text-gray-400 focus:outline-none focus:border-vera-dark transition-colors"
                [disabled]="loading()">
            </div>

            <!-- Info -->
            <div class="bg-gray-50 rounded-[8px] p-4">
              <p class="text-small text-gray-600">
                Un email sera envoye a cette adresse avec un lien pour creer son mot de passe et activer son compte moderateur.
              </p>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-2 rounded-[8px] border border-gray-200 text-small font-medium text-vera-dark hover:bg-gray-100 transition-colors"
            [disabled]="loading()">
            Annuler
          </button>
          <button
            type="submit"
            (click)="onSubmit()"
            class="px-4 py-2 rounded-[8px] bg-vera-dark text-small font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            [disabled]="loading() || !email">
            @if (loading()) {
              <span class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi...
              </span>
            } @else {
              Envoyer l'invitation
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class InviteModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() invited = new EventEmitter<void>();

  private authService = inject(AuthService);

  email = '';
  firstName = '';
  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  onSubmit(): void {
    if (!this.email || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.inviteModerator(this.email, this.firstName || undefined).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage.set(response.message);
        this.invited.emit();

        // Reset form apres 2 secondes
        setTimeout(() => {
          this.email = '';
          this.firstName = '';
          this.successMessage.set(null);
        }, 2000);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.message || 'Erreur lors de l\'envoi de l\'invitation';
        this.errorMessage.set(message);
      }
    });
  }
}
