import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartExportComponent } from './chart-export';

describe('ChartExport', () => {
  let component: ChartExportComponent;
  let fixture: ComponentFixture<ChartExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartExportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
