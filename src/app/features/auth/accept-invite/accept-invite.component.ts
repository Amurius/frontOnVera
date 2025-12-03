import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-vera-sugar flex items-center justify-center p-4">
      <div class="w-full max-w-[440px]">
        <!-- Logo -->
        <div class="text-center mb-8">
          <h1 class="text-[40px] font-heading font-bold text-vera-dark">VERA</h1>
          <p class="text-small text-gray-500 mt-2">Activation de votre compte</p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-[16px] p-8 shadow-lg">
          @if (!token()) {
            <!-- Erreur: pas de token -->
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-red-600">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 class="text-large font-medium text-vera-dark mb-2">Lien invalide</h2>
              <p class="text-small text-gray-500 mb-6">Ce lien d'invitation est invalide ou a expire.</p>
              <a routerLink="/login" class="inline-block px-6 py-3 bg-vera-dark text-white text-small font-medium rounded-[8px] hover:opacity-90 transition-opacity">
                Retour a la connexion
              </a>
            </div>
          } @else if (success()) {
            <!-- Succes -->
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-green-600">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h2 class="text-large font-medium text-vera-dark mb-2">Compte active !</h2>
              <p class="text-small text-gray-500 mb-6">Votre compte moderateur est maintenant actif. Vous pouvez vous connecter.</p>
              <a routerLink="/login" class="inline-block px-6 py-3 bg-vera-dark text-white text-small font-medium rounded-[8px] hover:opacity-90 transition-opacity">
                Se connecter
              </a>
            </div>
          } @else {
            <!-- Formulaire -->
            <div>
              <h2 class="text-large font-medium text-vera-dark mb-2">Creez votre mot de passe</h2>
              <p class="text-small text-gray-500 mb-6">Choisissez un mot de passe securise pour activer votre compte moderateur.</p>

              @if (errorMessage()) {
                <div class="bg-red-50 border border-red-200 rounded-[8px] p-4 mb-6">
                  <p class="text-small text-red-700">{{ errorMessage() }}</p>
                </div>
              }

              <form (ngSubmit)="onSubmit()" class="space-y-4">
                <!-- Nom (optionnel) -->
                <div>
                  <label for="lastName" class="block text-small font-medium text-vera-dark mb-2">
                    Nom de famille
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    [(ngModel)]="lastName"
                    name="lastName"
                    placeholder="Votre nom"
                    class="w-full px-4 py-3 rounded-[8px] border border-gray-200 text-small text-vera-dark placeholder:text-gray-400 focus:outline-none focus:border-vera-dark transition-colors"
                    [disabled]="loading()">
                </div>

                <!-- Mot de passe -->
                <div>
                  <label for="password" class="block text-small font-medium text-vera-dark mb-2">
                    Mot de passe <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    [(ngModel)]="password"
                    name="password"
                    required
                    minlength="6"
                    placeholder="Minimum 6 caracteres"
                    class="w-full px-4 py-3 rounded-[8px] border border-gray-200 text-small text-vera-dark placeholder:text-gray-400 focus:outline-none focus:border-vera-dark transition-colors"
                    [disabled]="loading()">
                </div>

                <!-- Confirmation mot de passe -->
                <div>
                  <label for="confirmPassword" class="block text-small font-medium text-vera-dark mb-2">
                    Confirmer le mot de passe <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    required
                    placeholder="Retapez votre mot de passe"
                    class="w-full px-4 py-3 rounded-[8px] border border-gray-200 text-small text-vera-dark placeholder:text-gray-400 focus:outline-none focus:border-vera-dark transition-colors"
                    [disabled]="loading()">
                </div>

                <!-- Bouton submit -->
                <button
                  type="submit"
                  class="w-full py-3 bg-vera-dark text-white text-small font-medium rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 mt-6"
                  [disabled]="loading() || !password || !confirmPassword">
                  @if (loading()) {
                    <span class="flex items-center justify-center gap-2">
                      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Activation...
                    </span>
                  } @else {
                    Activer mon compte
                  }
                </button>
              </form>
            </div>
          }
        </div>

        <!-- Footer -->
        <p class="text-center text-small text-gray-400 mt-6">
          VERA - Plateforme de sondages
        </p>
      </div>
    </div>
  `
})
export class AcceptInviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  token = signal<string | null>(null);
  loading = signal(false);
  success = signal(false);
  errorMessage = signal<string | null>(null);

  password = '';
  confirmPassword = '';
  lastName = '';

  ngOnInit(): void {
    // Recuperer le token depuis l'URL
    this.route.queryParams.subscribe(params => {
      this.token.set(params['token'] || null);
    });
  }

  onSubmit(): void {
    if (!this.token() || this.loading()) return;

    // Validation
    if (this.password.length < 6) {
      this.errorMessage.set('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Les mots de passe ne correspondent pas');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.acceptInvitation(this.token()!, this.password, this.lastName || undefined).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err.error?.message || 'Erreur lors de l\'activation du compte';
        this.errorMessage.set(message);
      }
    });
  }
}
