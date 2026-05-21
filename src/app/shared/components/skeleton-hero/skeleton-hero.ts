import { Component } from '@angular/core';

@Component({
  selector: 'app-skeleton-hero',
  standalone: true,
  template: `
    <div class="skeleton-hero-wrapper skeleton-base">
      <div class="skeleton-hero-content">
        <div class="skeleton-badge skeleton-base"></div>
        <div class="skeleton-title skeleton-base"></div>
        <div class="skeleton-title short skeleton-base"></div>
        <div class="skeleton-overview skeleton-base"></div>
        <div class="skeleton-overview short skeleton-base"></div>
        <div class="skeleton-button skeleton-base"></div>
      </div>
    </div>
  `,
  styleUrl: './skeleton-hero.css'
})
export class SkeletonHero {}
