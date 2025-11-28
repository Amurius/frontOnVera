import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Verifier le signal d'abord
  if (authService.isAuthenticated()) {
    return true;
  }

  // Si pas authentifie via signal, verifier directement le localStorage
  // (utile au rechargement de page avant que le service soit initialise)
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      return true;
    }
  }

  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
