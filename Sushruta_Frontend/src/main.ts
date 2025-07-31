import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app-component';
import { AnalyticsPageComponent } from './app/analytics-page.component/analytics-page.component';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  PieController,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

// ✅ Register necessary components
Chart.register(
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  PieController,
  ArcElement,
  Tooltip,
  Legend
);
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
