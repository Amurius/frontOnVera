import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-politique-confidentialite',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './politique-confidentialite.component.html',
  host: { 'class': 'block' }
})
export class PolitiqueConfidentialiteComponent {
  private translate = inject(TranslateService);

  showBanner = true;
  menuOpen = false;
  currentLang = 'fr';

  constructor() {
    this.translate.setDefaultLang('fr');
    this.translate.use('fr');
  }

  closeBanner(): void {
    this.showBanner = false;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  switchLanguage(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
  }
}
