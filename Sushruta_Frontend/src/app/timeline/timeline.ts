import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BodyMapComponent } from '../body-map/body-map';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule,BodyMapComponent,FormsModule],
  templateUrl: './timeline.html',
  styleUrls: ['./timeline.css']
})
export class TimelineComponent implements OnInit {
  @Input() userId!: string;
  activeMode: 'pain' | 'scar' | 'bruise' | 'burn' | 'discoloration' = 'pain';
  chartHistory: any[] = [];
  selectedChart: any = null;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (this.userId) {
      this.http.get<any[]>(`/api/chart/${this.userId}/history`).subscribe(res => {
        this.chartHistory = res.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
    }
  }

  selectChart(chart: any): void {
    console.log('[DEBUG] Selected chart:', chart);
    this.selectedChart = {
      ...chart,
      svgFront: this.sanitizer.bypassSecurityTrustHtml(chart.svgFront || ''),
      svgBack: this.sanitizer.bypassSecurityTrustHtml(chart.svgBack || '')
    };
  }

  regionNotes(chart: any): { region: string; notes: string }[] {
    if (!chart.regions) return [];

    return Object.entries(chart.regions)
      .filter(([_, data]: any) => data.note?.trim())
      .map(([region, data]: any) => ({ region, notes: data.note }));
  }

 regionTable(chart: any): { region: string; level: number; note: string }[] {
  if (!chart.regions) return [];

  return Object.entries(chart.regions).map(([region, data]: any) => ({
    region,
    level: data[this.activeMode] ?? 0,
    note: data.note ?? ''
  }));
}
}