import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
  host: { 'class': 'block' }
})
export class LandingComponent {
  showBanner = true;
  menuOpen = false;

  closeBanner(): void {
    this.showBanner = false;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
}
