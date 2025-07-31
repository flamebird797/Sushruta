import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <nav class="nav-bar">
      <a routerLink="/" routerLinkActive="active">🧍 Body Map</a>
      <a routerLink="/analytics" routerLinkActive="active">📊 Analytics</a>
    </nav>
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app-component.css']
})
export class AppComponent {}