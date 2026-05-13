import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CastMember } from '../../../core/models/cast.model';

@Component({
  selector: 'app-cast-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cast-card.html',
  styleUrl: './cast-card.css'
})
export class CastCard {
  @Input({ required: true }) actor!: CastMember;

  get profileUrl() {
    return this.actor.profile_path
      ? `https://image.tmdb.org/t/p/w200${this.actor.profile_path}`
      : 'assets/no-profile.png';
  }
}
