import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovieSlider } from './movie-slider';

describe('MovieSlider', () => {
  let component: MovieSlider;
  let fixture: ComponentFixture<MovieSlider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovieSlider],
    }).compileComponents();

    fixture = TestBed.createComponent(MovieSlider);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
