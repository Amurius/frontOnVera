import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Routes protegees - rendu cote client uniquement (auth requise)
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'surveys',
    renderMode: RenderMode.Client
  },
  {
    path: 'surveys/create',
    renderMode: RenderMode.Client
  },
  {
    path: 'surveys/results/:id',
    renderMode: RenderMode.Client
  },
  // Routes publiques - pre-rendu
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
