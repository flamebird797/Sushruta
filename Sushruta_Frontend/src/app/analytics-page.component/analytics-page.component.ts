import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimelineComponent } from '../timeline/timeline';
import { AnalyticsComponent } from '../analytics.component/analytics.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TimelineComponent, AnalyticsComponent],
  templateUrl: './analytics-page.component.html',
  styleUrls: ['./analytics-page.component.css']
})
export class AnalyticsPageComponent {
  userId: string = '';
   constructor(private route: ActivatedRoute) {
    this.route.queryParams.subscribe(params => {
      this.userId = params['userId'] || '';
    });
  }
  
}