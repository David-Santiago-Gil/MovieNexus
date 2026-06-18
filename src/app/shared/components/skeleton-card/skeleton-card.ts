import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  template: `
    <div class="skeleton-card">
      <div class="skeleton-poster skeleton-base"></div>
      <div class="skeleton-info">
        <div class="skeleton-title skeleton-base"></div>
        <div class="skeleton-date skeleton-base"></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './skeleton-card.css',
})
export class SkeletonCard {}
