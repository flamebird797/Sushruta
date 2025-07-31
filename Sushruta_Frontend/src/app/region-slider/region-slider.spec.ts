import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegionSliderComponent } from './region-slider';

describe('RegionSlider', () => {
  let component: RegionSliderComponent;
  let fixture: ComponentFixture<RegionSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegionSliderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegionSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});


