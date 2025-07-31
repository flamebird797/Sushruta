import { Routes } from '@angular/router';
import { provideRouter } from '@angular/router';

import { BodyMapComponent } from './body-map/body-map';
import { AnalyticsPageComponent } from './analytics-page.component/analytics-page.component';

export const appRoutes: Routes = [
  { path: '', component: BodyMapComponent },
  { path: 'analytics', component: AnalyticsPageComponent }
];

export const appRouterProvider = provideRouter(appRoutes);