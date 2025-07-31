import {
  Component,
  Input,
  OnInit,
  inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  ChartConfiguration,
  ChartOptions,
  ChartTypeRegistry,
  TooltipItem
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { Chart as ChartJS, registerables } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';

ChartJS.register(...registerables, MatrixController, MatrixElement);
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import ChartDataLabels from 'chartjs-plugin-datalabels';
ChartJS.register(ChartDataLabels);

import { BodyMapComponent } from '../body-map/body-map';
//@ts-ignore
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';


// Extend Chart.js to accept 'matrix' chart type

const ASYMMETRY_THRESHOLD = 5;
interface RegionData {
  pain?: number;
  scar?: number;
  bruise?: number;
  burn?: number;
  discoloration?: number;
  note?: string;
}

const PAIN_COLORS = [
  '#d1fae5', // 0 - very light green
  '#a7f3d0', // 1
  '#6ee7b7', // 2
  '#34d399', // 3
  '#10b981', // 4
  '#06b6d4', // 5
  '#3b82f6', // 6
  '#6366f1', // 7
  '#8b5cf6', // 8
  '#ec4899', // 9
  '#ef4444'  // 10 - red
];

interface Snapshot {
  timestamp: string;
  regions: Record<string, RegionData>;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {

  coPairs: {
  regionA: string;
  regionB: string;
  raw: number;
  normalized: number;
}[] = [];

  @Input() activeMode: 'pain' | 'scar' | 'bruise' | 'burn' | 'discoloration' = 'pain';
  
@ViewChild('threeContainer', { static: false }) threeContainer!: ElementRef;

scene!: THREE.Scene;
camera!: THREE.PerspectiveCamera;
renderer!: THREE.WebGLRenderer;
controls!: OrbitControls;
model!: THREE.Group;
raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();
playbackData: Snapshot[] = [];
playbackSpeed = 1;
sortedSlopesForTooltip: { region: string; slope: number; predicted: number }[] = [];

// Playback

currentPlaybackIndex = 0;
isPlaying = false;
playbackInterval: any = null;
  @Input() userId!: string;
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Chart data
  avgPainChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  freqChartData: ChartConfiguration<'pie'>['data'] = { labels: [], datasets: [] };
  painOverTimeChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  symmetryChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  fluctuationChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
coOccurrenceData: ChartConfiguration<'bubble'>['data'] = { datasets: [] };

  // Chart options
  barChartOptions: ChartOptions<'bar'> = { responsive: true, scales: { x: {}, y: { beginAtZero: true, max: 10 } }, plugins: { legend: { display: true } } };
  pieChartOptions: ChartOptions<'pie'> = { responsive: true, plugins: { legend: { position: 'right' } } };
  lineChartOptions: ChartOptions<'line'> = { responsive: true, scales: { y: { beginAtZero: true, max: 10 } }, plugins: { legend: { display: true } } };
  symmetryChartOptions: ChartOptions<'bar'> = { indexAxis: 'y', responsive: true, scales: { x: { beginAtZero: true, max: 10 } }, plugins: { legend: { position: 'bottom' } } };
  fluctuationChartOptions!: ChartOptions<'bar'>;
  coOccurrenceOptions!: ChartOptions<'bubble'>;
 persistenceChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
persistenceChartOptions!: ChartOptions<'bar'>;
timeToResolutionChartData: ChartConfiguration<'bar'>['data'] = {
  labels: [],
  datasets: [{
    label: `Days to Resolution (${this.activeMode} < 3)`,
    data: [],
    backgroundColor: '#60a5fa'
  }]
};

timeToResolutionChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  scales: {
    y: { beginAtZero: true },
    x: {}
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: ctx => {
          const value = ctx.raw as number;
          return value === -1
            ? 'Still active'
            : `${value} day(s) to resolution`;
        }
      }
    },
    legend: { display: false }
  }
};

trendSlopeChartData: ChartConfiguration<'bar'>['data'] = {
  labels: [],
  datasets: [{
    label: 'Predicted Pain (Next Day)',
    data: [],
    backgroundColor: []
  }]
};

trendSlopeChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  scales: {
    x: {
    ticks: {
      autoSkip: false,
      maxRotation: 90,
      minRotation: 45,
      align: 'end'
    }
  },
  y: {
    beginAtZero: true,
    max: 10,
    title: {
      display: true,
      text: 'Predicted Pain Level'
    }
  }
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => {
  const index = ctx.dataIndex;
  const d = this.sortedSlopesForTooltip[index];
  return [
    `📍 Region: ${d.region.replaceAll('_', ' ')}`,
    `🔺 Slope: ${d.slope >= 0 ? '+' : ''}${d.slope.toFixed(4)} / day`,
    `🔮 Predicted: ${d.predicted.toFixed(2)} pain`
  ];
}
      }
    },
    legend: { display: false }
  }
};

odeSimChartData: ChartConfiguration<'line'>['data'] = {
  labels: [],
  datasets: []
};

odeSimChartOptions: ChartOptions<'line'> = {
  responsive: true,
  scales: {
    x: {
      title: { display: true, text: 'Time (days)' }
    },
    y: {
      title: { display: true, text: 'Predicted Pain Level' },
      beginAtZero: true,
      max: 10
    }
  },
  plugins: {
    legend: { position: 'bottom' }
  }
};
showPersistentOnly = false;
regionPersistenceMap: { [region: string]: number } = {};

  // Labels and tracking
  selectedRegion = '';
  availableRegions: string[] = [];
  fluctuationMeans: number[] = [];
  coOccurrenceLabels: string[] = [];

  // Clinical stats
  totalPainBurden = 0;
  severeRegionCount = 0;
  intensityPercentages = { mild: 0, moderate: 0, severe: 0 };
  persistentPainRegions: string[] = [];
  progression = { improved: 0, worsened: 0, stable: 0 };
  asymmetryFlags: string[] = [];

  constructor(private http: HttpClient) {}

  simulateODE(level: number): { x: number, y: number }[] {
  const r = 0.2;  // pain growth rate
  const h = 1;    // step size (1 day)
  const steps = 10;

  let y = level;
  let t = 0;

  const result = [];
  for (let i = 0; i <= steps; i++) {
    result.push({ x: t, y: +y.toFixed(2) });
    y += h * r * y;
    t += h;
  }

  return result;
}

 ngOnInit(): void {
  if (!this.isBrowser || !this.userId) return;

  this.http.get<any[]>(`/api/chart/${this.userId}/history`).subscribe({
    next: charts => {
      if (!charts.length) return;

      const modes: { [key: string]: string } = {};
      Object.keys(this.chartToggles).forEach(key => {
        modes[key] = this.chartToggles[key].mode || 'pain';
      });

      const chartMaps: { [key: string]: { [region: string]: number[] } } = {};
      const chartCounts: { [key: string]: { [region: string]: number } } = {};
     const nonZeroRegions = new Set<string>();

for (const chart of charts) {
  if (!chart.regions) continue;
  for (const [region, data] of Object.entries(chart.regions)) {
    const regionData = data as RegionData;

    let hasNonZero = false;

    Object.keys(modes).forEach(chartKey => {
      const mode = modes[chartKey];
      const level = Number(regionData[mode as keyof RegionData] ?? 0);

      if (!chartMaps[chartKey]) chartMaps[chartKey] = {};
      if (!chartMaps[chartKey][region]) chartMaps[chartKey][region] = [];
      chartMaps[chartKey][region].push(level);

      if (level > 0) {
        hasNonZero = true;

        if (!chartCounts[chartKey]) chartCounts[chartKey] = {};
        chartCounts[chartKey][region] = (chartCounts[chartKey][region] || 0) + 1;
      }
    });

    if (hasNonZero) nonZeroRegions.add(region);
  }
}

const regionList = Array.from(nonZeroRegions).sort();
this.availableRegions = regionList;
if (!this.selectedRegion || !regionList.includes(this.selectedRegion)) {
  this.selectedRegion = regionList[0] || '';
}

const odeSimTraces = regionList
  .map(region => {
    const levels = chartMaps['avgPain']?.[region] || [];
    const initial = levels.length ? levels[levels.length - 1] : 0;
    if (initial === 0) return null;

    return {
      label: region.replaceAll('_', ' '),
      data: this.simulateODE(initial),
      fill: false,
      borderColor: '#6366f1',
      tension: 0.2
    };
  })
  .filter(Boolean) as ChartConfiguration<'line'>['data']['datasets'];

this.odeSimChartData = {
  labels: Array.from({ length: 11 }, (_, i) => i),
  datasets: odeSimTraces
};

const parseDate = (entry: any): Date => new Date(entry.timestamp);
      const sortedCharts = charts.slice().sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());
      const startDate = new Date(Math.min(...charts
  .map(c => new Date(c.timestamp).getTime())
  .filter(t => !isNaN(t))
));

  function linearRegression(x: number[], y: number[]): { slope: number, intercept: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0 };

  const xBar = x.reduce((a, b) => a + b, 0) / n;
  const yBar = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;

  for (let i = 0; i < n; i++) {
    num += (x[i] - xBar) * (y[i] - yBar);
    den += (x[i] - xBar) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yBar - slope * xBar;

  return {
    slope: +slope.toFixed(4),
    intercept: +intercept.toFixed(2)
  };
}
      // === Average Pain Chart ===
      const avgMode = modes['avgPain'];
      const avgData = Object.entries(chartMaps['avgPain'])
  .map(([region, levels]) => ({
    region,
    level: +(levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(2)
  }))
  .filter(d => d.level > 0);

      this.avgPainChartData = {
        labels: avgData.map(d => d.region.replaceAll('_', ' ')),
        datasets: [{
          label: `Average ${avgMode[0].toUpperCase() + avgMode.slice(1)} Level`,
          data: avgData.map(d => d.level),
          backgroundColor: '#f87171'
        }]
      };

      // === Frequency Chart ===
      const freqMode = modes['frequency'];
      const topFreq = Object.entries(chartCounts['frequency'])
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      this.freqChartData = {
        labels: topFreq.map(d => d.region.replaceAll('_', ' ')),
        datasets: [{
          label: `${freqMode[0].toUpperCase() + freqMode.slice(1)} Frequency`,
          data: topFreq.map(d => d.count),
          backgroundColor: ['#f87171', '#60a5fa', '#a78bfa', '#fbbf24', '#34d399']
        }]
      };

      // === Fluctuation Chart ===
      const fluctuationMode = modes['fluctuation'];
      const fluctuationData = regionList.map(region => {
        const levels = chartMaps['fluctuation'][region] || [];
        const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
        const variance = levels.reduce((a, b) => a + (b - mean) ** 2, 0) / levels.length;
        const stddev = +Math.sqrt(variance).toFixed(2);
        return { region, stddev, mean: +mean.toFixed(2) };
      }).sort((a, b) => b.stddev - a.stddev);

      this.fluctuationMeans = fluctuationData.map(d => d.mean);
      this.fluctuationChartData = {
        labels: fluctuationData.map(d => d.region.replaceAll('_', ' ')),
        datasets: [{
          label: 'Volatility (Std Dev)',
          data: fluctuationData.map(d => d.stddev),
          backgroundColor: fluctuationData.map((_, i) => i < 3 ? '#f59e0b' : '#a78bfa'),
          hoverBackgroundColor: fluctuationData.map((_, i) => i < 3 ? '#f97316' : '#8b5cf6')
        }]
      };

      // === Trend Slope Chart ===
  const trendMode = modes['trendSlope'];
const regionSlopes: { region: string, slope: number, predicted: number }[] = [];

console.groupCollapsed(`[TrendSlope] Starting slope computation for mode: ${trendMode}`);

regionList.forEach(region => {

  
  const xVals: number[] = [];
  const yVals: number[] = [];

  for (let i = 0; i < sortedCharts.length; i++) {
    const entry = sortedCharts[i];

    if (!entry.timestamp) {
      console.warn(`[TrendSlope] Chart ${i} is missing timestamp`);
      continue;
    }

    const date = new Date(entry.timestamp);
    if (isNaN(date.getTime())) {
      console.warn(`[TrendSlope] Chart ${i} has invalid timestamp:`, entry.timestamp);
      continue;
    }

    const regionData = entry.regions?.[region];
    const level = regionData?.[trendMode];

    // 🔍 Detailed trace
    console.groupCollapsed(`[Check] Chart ${i}, Region: ${region}`);
    console.log('→ timestamp:', entry.timestamp);
    console.log('→ Parsed Date:', date.toISOString());
    console.log('→ Region Present:', !!regionData);
    console.log('→ Region Data:', regionData);
    console.log('→ trendMode:', trendMode);
    console.log('→ Extracted level:', level);
    console.groupEnd();

    if (typeof level === 'number' && !isNaN(level)) {
      const days = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      xVals.push(days);
      yVals.push(level);
    }
  }

  console.group(`[TrendSlope] Region: ${region}`);
  console.log('xVals (days):', xVals);
  console.log('yVals (levels):', yVals);

if (xVals.length >= 2 && yVals.length >= 2) {
  const { slope, intercept } = linearRegression(xVals, yVals);
  const nextDay = Math.max(...xVals) + 1;
  const predicted = +(slope * nextDay + intercept).toFixed(2);

  console.log(`✔ slope: ${slope}, intercept: ${intercept}, predicted pain on day ${nextDay}: ${predicted}`);

  regionSlopes.push({ region, slope, predicted });
}else {
    console.warn('⚠️ Skipped: insufficient valid entries');
  }

  console.groupEnd();
});

console.groupEnd();

const sortedSlopes = regionSlopes.sort((a, b) => b.slope - a.slope);
this.sortedSlopesForTooltip = sortedSlopes;


this.trendSlopeChartData = {
  labels: sortedSlopes.map(d => d.region.replaceAll('_', ' ')),
  datasets: [{
    label: 'Trend Slope (Δ pain / day)',
    data: sortedSlopes.map(d => d.predicted),
    backgroundColor: sortedSlopes.map(d =>
  d.slope > 0.005 ? '#ef4444' :     // Worsening
  d.slope < -0.005 ? '#10b981' :    // Improving
  '#e5e7eb'                         // Stable
)
  }]
};

// ✅ Force chart redraw
this.trendSlopeChartData = { ...this.trendSlopeChartData };

// Optional summary
console.table(sortedSlopes);

      const overTimeMode = modes['overTime'];
const labels = sortedCharts.map((c, i) => {
  const d = new Date(c.date);
  return isNaN(d.getTime()) ? `Entry ${i + 1}` : d.toLocaleDateString();
});
const dataset = sortedCharts.map(c =>
  typeof c.regions?.[this.selectedRegion]?.[overTimeMode] === 'number'
    ? c.regions[this.selectedRegion][overTimeMode]
    : 0
);

this.painOverTimeChartData = {
  labels,
  datasets: [{
    label: `${this.selectedRegion.replaceAll('_', ' ')} (${overTimeMode})`,
    data: dataset,
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.3)',
    tension: 0.4,
    fill: false,
    pointRadius: 4,
    spanGaps: true
  }]
};

const symmetryMode = modes['symmetry'];
const pairedRegions = new Map<string, { left: string; right: string }>([
  ['shoulder', { left: 'shoulder_left', right: 'shoulder_right' }],
  ['knee', { left: 'knee_left', right: 'knee_right' }],
  ['jaw', { left: 'jaw_left', right: 'jaw_right' }],
  ['thigh', { left: 'thigh_left', right: 'thigh_right' }],
  ['abdomen lower', { left: 'abdomen_lower_left', right: 'abdomen_lower_right' }],
  ['neck side', { left: 'neck_left', right: 'neck_right' }]
]);

const symmetryLabels: string[] = [];
const leftAverages: number[] = [];
const rightAverages: number[] = [];
const leftColors: string[] = [];
const rightColors: string[] = [];
this.asymmetryFlags = [];

pairedRegions.forEach(({ left, right }, label) => {
  const leftData = chartMaps['symmetry'][left] || [];
  const rightData = chartMaps['symmetry'][right] || [];

  const leftAvg = leftData.length ? leftData.reduce((a, b) => a + b, 0) / leftData.length : 0;
  const rightAvg = rightData.length ? rightData.reduce((a, b) => a + b, 0) / rightData.length : 0;

  // ✅ Skip pairs where both sides are zero
  if (leftAvg === 0 && rightAvg === 0) return;

  symmetryLabels.push(label);
  leftAverages.push(+leftAvg.toFixed(2));
  rightAverages.push(+rightAvg.toFixed(2));

  const asymmetry = Math.abs(leftAvg - rightAvg);
  const highlight = asymmetry >= ASYMMETRY_THRESHOLD;
  if (highlight) this.asymmetryFlags.push(label);

  leftColors.push(highlight ? '#f97316' : '#60a5fa');
  rightColors.push(highlight ? '#f97316' : '#34d399');
});

this.symmetryChartData = {
  labels: symmetryLabels,
  datasets: [
    { label: `Left Side (${symmetryMode})`, data: leftAverages, backgroundColor: leftColors },
    { label: `Right Side (${symmetryMode})`, data: rightAverages, backgroundColor: rightColors }
  ]
};

const coMode = modes['coOccurrence'];


const threshold = 4;
const regionCount = regionList.length;
const coMatrix: number[][] = Array.from({ length: regionCount }, () => Array(regionCount).fill(0));
const occurrenceCounts = new Array(regionCount).fill(0);

// Step 1: Count total occurrences and co-occurrences
// Step 1: Count total occurrences and co-occurrences
for (const chart of charts) {
  if (!chart.regions) continue;

  const activeIndices = regionList
    .map((region, index) => ({ index, level: chart.regions?.[region]?.[coMode] ?? 0 }))
    .filter(r => r.level >= threshold)
    .map(r => r.index);

  activeIndices.forEach(i => occurrenceCounts[i]++);

  for (let i = 0; i < activeIndices.length; i++) {
    for (let j = 0; j < activeIndices.length; j++) {
      if (i === j) continue; // skip self-mapping
      coMatrix[activeIndices[i]][activeIndices[j]]++;
    }
  }
}

// Step 2: Build coPairs (still inside same function scope)
const coPairs: {
  regionA: string;
  regionB: string;
  raw: number;
  normalized: number;
}[] = [];

const seenPairs = new Set<string>();

for (let i = 0; i < regionCount; i++) {
  for (let j = 0; j < regionCount; j++) {
    if (i === j) continue; // Skip reflexive (A = B)

    const key = [regionList[i], regionList[j]].sort().join('|');
    if (seenPairs.has(key)) continue; // Skip mirrored (A-B and B-A)

    seenPairs.add(key);

    const raw = coMatrix[i][j];
    const denominator = Math.max(occurrenceCounts[i], occurrenceCounts[j], 1);
    const normalized = +(raw / denominator).toFixed(2);

    if (normalized > 0.65) {
      coPairs.push({
        regionA: regionList[i],
        regionB: regionList[j],
        raw,
        normalized
      });
    }
  }
}
this.coPairs = coPairs;
coPairs.sort((a, b) => b.normalized - a.normalized);
// ✅ AFTER coPairs is populated
const allRegionLabels = [...new Set(coPairs.flatMap(p => [p.regionA, p.regionB]))];
this.coOccurrenceLabels = allRegionLabels;
const labelToIndex = Object.fromEntries(allRegionLabels.map((label, i) => [label, i]));

const heatmapData = coPairs.map(pair => ({
  x: labelToIndex[pair.regionB],
  y: labelToIndex[pair.regionA],
  r: pair.normalized * 15 + 2,
  _custom: {
    ...pair,
    labelX: pair.regionB,
    labelY: pair.regionA
  }
}));

const persistMode = modes['persistence'];
const rawPersistence = regionList.map(region => {
  const levels = chartMaps['persistence'][region] || [];
  const countAbove4 = levels.filter(v => v >= 4).length;
  const ratio = charts.length > 0 ? +(countAbove4 / charts.length * 100).toFixed(1) : 0;
  return { region, ratio };
});

this.regionPersistenceMap = Object.fromEntries(rawPersistence.map(d => [d.region, d.ratio]));

const filtered = this.showPersistentOnly
  ? rawPersistence.filter(d => d.ratio >= 60)
  : rawPersistence;

const sorted = filtered.sort((a, b) => b.ratio - a.ratio);
this.persistenceChartData = {
  labels: sorted.map(d => d.region.replaceAll('_', ' ')),
  datasets: [{
    label: `${persistMode[0].toUpperCase() + persistMode.slice(1)} Persistence (% ≥ 4)`,
    data: sorted.map(d => d.ratio),
    backgroundColor: sorted.map(d =>
      d.ratio >= 80 ? '#dc2626' :
      d.ratio >= 60 ? '#f97316' :
      d.ratio >= 40 ? '#facc15' :
      d.ratio >= 20 ? '#4ade80' : '#a7f3d0'
    )
  }]
};
const ttrMode = modes['timeToResolution'];
const regionResolutionData: { region: string, charts: number }[] = [];

regionList.forEach(region => {
  let resolvedIndex = -1;

  for (let i = 0; i < sortedCharts.length; i++) {
    const level = sortedCharts[i].regions?.[region]?.[ttrMode] ?? 0;
    if (level >= 3) continue;

    const stayedDown = sortedCharts.slice(i).every(c => {
      const val = c.regions?.[region]?.[ttrMode];
      return typeof val === 'number' && val < 3;
    });

    if (stayedDown) {
      resolvedIndex = i;
      break;
    }
  }

  regionResolutionData.push({
    region,
    charts: resolvedIndex === -1 ? -1 : resolvedIndex + 1  // +1 so it’s human-friendly (1-based)
  });
});

// Sort resolved first, unresolved last
const sortedTTR = regionResolutionData
  .filter(d => d.charts >= 0)
  .sort((a, b) => a.charts - b.charts)
  .concat(regionResolutionData.filter(d => d.charts === -1));

this.timeToResolutionChartData = {
  labels: sortedTTR.map(d =>
    d.charts === -1 ? `❗ ${d.region.replaceAll('_', ' ')}` : d.region.replaceAll('_', ' ')
  ),
  datasets: [{
    label: `Charts to Resolution (${ttrMode})`,
    data: sortedTTR.map(d => d.charts === -1 ? 0 : d.charts),
    backgroundColor: sortedTTR.map(d => d.charts === -1 ? '#ef4444' : '#60a5fa'),
    barThickness: 20,
    categoryPercentage: 0.7
  }]
};

this.playbackData = charts
  .filter(c => c.regions)
  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  .map(c => ({
    timestamp: c.timestamp,
    regions: c.regions
  }));

      // ✅ Add per-chart variants of: persistence, timeToResolution, coOccurrence...
    }
  });
}


  ngAfterViewInit(): void {
  if (!this.isBrowser) return;

  this.initThreeScene();
  this.load3DModel();
}
getCoOccurrenceColor(normalized: number): string {
  const hue = 240 - normalized * 240;  // 1.0 = red, 0 = blue
  return `hsl(${hue}, 100%, 70%)`;
}
initThreeScene(): void {
  const container = this.threeContainer.nativeElement;
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / 600, 0.1, 1000);
  this.camera.position.set(0, 1.5, 3);

  this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  this.renderer.setSize(container.clientWidth, 600);
  this.renderer.setClearColor(0x000000, 0);
  container.appendChild(this.renderer.domElement);

  this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  this.controls.enableDamping = true;
  this.controls.target.set(0, 1.2, 0);
  this.controls.update();

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  this.scene.add(light);

  const animate = () => {
    requestAnimationFrame(animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
  animate();
}

load3DModel(): void {
  const loader = new GLTFLoader();
  loader.load('/assets/body-views/sushruta.glb', (gltf: GLTF) => {
    this.model = gltf.scene;

    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    this.model.position.sub(center);
    this.scene.add(this.model);

    const size = box.getSize(new THREE.Vector3()).length();
    this.camera.position.set(0, center.y, size);
    this.controls.target.copy(center);
    this.controls.update();

    // ✅ Render the first playback frame AFTER model is loaded
    this.renderPlaybackFrame(this.currentPlaybackIndex);
  });
}

renderPlaybackFrame(index: number) {
  const snapshot = this.playbackData[index];
  if (!snapshot || !this.model) {
    console.warn('[Playback] Missing snapshot or model at index:', index);
    return;
  }

  const mode = this.chartToggles['temporal']?.mode ?? this.activeMode;

  console.groupCollapsed(`[Playback] Frame ${index} — ${snapshot.timestamp}`);
  console.log('Snapshot:', snapshot);
  console.log('Mode:', mode);
  console.log('Model present:', !!this.model);
  console.log('Regions:', Object.keys(snapshot.regions));

  for (const [regionId, regionData] of Object.entries(snapshot.regions)) {
    console.log(`→ Region: "${regionId}", Data:`, regionData);

    const level = regionData?.[mode] ?? 0;
    console.log(`   • Extracted level [${mode}]: ${level}`);

    const found = this.updateRegionColor(regionId, level, mode);
    
    if (!found) {
      console.warn(`   ✖ [Unmatched region] ${regionId}`);
    } else {
      console.log(`   ✔ [Color] Applied level ${level} to "${regionId}"`);
    }
  }

  console.groupEnd();
}
updateRegionColor(regionId: string, level: number, mode: string): boolean {
  let found = false;

  this.model?.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.name === regionId) {
      const mesh = child as THREE.Mesh;

      if (Array.isArray(mesh.material)) return;

      const material = mesh.material as THREE.MeshStandardMaterial;

      if (!(material.userData as any).__cloned) {
        const cloned = material.clone();
        (cloned.userData as any).__cloned = true;
        mesh.material = cloned;
      }

      const hex = this.getColor(level, mode);
      const target = new THREE.Color(hex);

      this.transitionRegionColor(mesh, target);
      found = true;
    }
  });

  return found;
}
transitionRegionColor(
  mesh: THREE.Mesh,
  targetColor: THREE.Color,
  duration: number = 300
) {
  const material = mesh.material as THREE.MeshStandardMaterial;
  const startColor = material.color.clone();
  const startTime = performance.now();

  const animate = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);

    material.color.copy(startColor.clone().lerp(targetColor, t));
    material.needsUpdate = true;

    if (t < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
}
getColor(level: number, mode?: string): string {
  mode = mode ?? this.activeMode;

  const colorMap: Record<string, string[]> = {
    pain: [
      '#ffffff', '#B5E07E', '#D4DB56', '#E9D243',
      '#F4B642', '#F48C42', '#F06533', '#EB4D2C',
      '#E63A25', '#E2271D', '#D91A17'
    ],
    scar: [
      '#ffffff', '#f2f2f2', '#e6e6e6', '#d9d9d9', '#cccccc',
      '#bfbfbf', '#b3b3b3', '#a6a6a6', '#999999', '#8c8c8c', '#808080'
    ],
    bruise: [
      '#ffffff', '#e5ccff', '#d1a3ff', '#bd7aff', '#a952ff',
      '#9433ff', '#7a1fdc', '#5e12a6', '#470d7a', '#330a52', '#1f052b'
    ],
    burn: [
      '#ffffff', '#ffe5cc', '#ffc299', '#ff9966', '#ff704d',
      '#ff471a', '#cc3300', '#992600', '#661a00', '#4d1300', '#330d00'
    ],
    discoloration: [
      '#ffffff', '#e6f0ff', '#cce0ff', '#b3d1ff', '#99c2ff',
      '#80b3ff', '#66a3ff', '#4d94ff', '#3385ff', '#1a75ff', '#0066ff'
    ]
  };

  const palette = colorMap[mode] ?? colorMap['pain'];
  return palette[Math.min(Math.max(level, 0), 10)];
}
togglePlayback() {
  if (this.isPlaying) {
    clearInterval(this.playbackInterval);
    this.isPlaying = false;
    return;
  }

  this.isPlaying = true;
  this.playbackInterval = setInterval(() => {
    if (this.currentPlaybackIndex >= this.playbackData.length - 1) {
      this.isPlaying = false;
      clearInterval(this.playbackInterval);
      return;
    }
    this.currentPlaybackIndex++;
    this.renderPlaybackFrame(this.currentPlaybackIndex);
  }, 1000 / this.playbackSpeed);  // ← adjust speed here
}
  onRegionChange(region: string) {
    if (!region) return;
    this.selectedRegion = region;
    this.http.get<any[]>(`/api/chart/${this.userId}/history`).subscribe({
      next: charts => this.updatePainOverTimeChart(charts),
      error: err => console.error('[ERROR] Failed to fetch region data:', err)
    });
  }

 updatePainOverTimeChart(charts: any[]) {
  // 🔧 Sort by ascending timestamp
  const sortedCharts = charts.slice().sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 🏷️ Build labels from timestamp
  const labels = sortedCharts.map((c, i) => {
    const d = new Date(c.timestamp);
    return isNaN(d.getTime()) ? `Entry ${i + 1}` : d.toLocaleDateString();
  });

  // 📈 Extract pain data for current selected region + mode
  const dataset = sortedCharts.map(c =>
    typeof c.regions?.[this.selectedRegion]?.[this.activeMode] === 'number'
      ? c.regions[this.selectedRegion][this.activeMode]
      : 0
  );

  // 📊 Assign chart data
  this.painOverTimeChartData = {
    labels,
    datasets: [{
      label: `${this.selectedRegion.replaceAll('_', ' ')} (${this.activeMode})`,
      data: dataset,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.3)',
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      spanGaps: true
    }]
  };
}

  computeSymmetryChart(painMap: { [region: string]: number[] }) {
    const pairedRegions = new Map<string, { left: string; right: string }>([
      ['shoulder', { left: 'shoulder_left', right: 'shoulder_right' }],
      ['knee', { left: 'knee_left', right: 'knee_right' }],
      ['jaw', { left: 'jaw_left', right: 'jaw_right' }],
      ['thigh', { left: 'thigh_left', right: 'thigh_right' }],
      ['abdomen lower', { left: 'abdomen_lower_left', right: 'abdomen_lower_right' }],
      ['neck side', { left: 'neck_left', right: 'neck_right' }]
    ]);
    const symmetryLabels: string[] = [];
    const leftAverages: number[] = [];
    const rightAverages: number[] = [];
    const leftColors: string[] = [];
    const rightColors: string[] = [];
    this.asymmetryFlags = [];

    pairedRegions.forEach(({ left, right }, label) => {
      const leftAvg = painMap[left]?.length ? painMap[left].reduce((a, b) => a + b, 0) / painMap[left].length : 0;
      const rightAvg = painMap[right]?.length ? painMap[right].reduce((a, b) => a + b, 0) / painMap[right].length : 0;

      symmetryLabels.push(label);
      leftAverages.push(+leftAvg.toFixed(2));
      rightAverages.push(+rightAvg.toFixed(2));

      const asymmetry = Math.abs(leftAvg - rightAvg);
      const highlight = asymmetry >= ASYMMETRY_THRESHOLD;
      if (highlight) this.asymmetryFlags.push(label);

      leftColors.push(highlight ? '#f97316' : '#60a5fa');
      rightColors.push(highlight ? '#f97316' : '#34d399');
    });

    this.symmetryChartData = {
      labels: symmetryLabels,
      datasets: [
        { label: 'Left Side', data: leftAverages, backgroundColor: leftColors },
        { label: 'Right Side', data: rightAverages, backgroundColor: rightColors }
      ]
    };
  }
  togglePersistentOnly() {
  this.showPersistentOnly = !this.showPersistentOnly;
  this.ngOnInit(); // refresh with filter applied
}

chartToggles: { [key: string]: { show: boolean; mode: 'pain' | 'scar' | 'bruise' | 'burn' | 'discoloration' } } = {
  avgPain: { show: true, mode: 'pain' },
  frequency: { show: true, mode: 'pain' },
  overTime: { show: true, mode: 'pain' },
  symmetry: { show: true, mode: 'pain' },
  fluctuation: { show: true, mode: 'pain' },
  coOccurrence: { show: true, mode: 'pain' },
  persistence: { show: true, mode: 'pain' },
  timeToResolution: { show: true, mode: 'pain' },
  trendSlope: { show: true, mode: 'pain' },
  temporal: { show: true, mode: 'pain' },
  odeSim: { show: true, mode: 'pain' }
};
chartList = [
  { key: 'avgPain', label: 'Average Pain' },
  { key: 'frequency', label: 'Pain Frequency' },
  { key: 'overTime', label: 'Pain Over Time' },
  { key: 'symmetry', label: 'Symmetry Analysis' },
  { key: 'fluctuation', label: 'Fluctuation Index' },
  { key: 'coOccurrence', label: 'Pain Co-occurrence' },
  { key: 'persistence', label: 'Persistence Map' },
  { key: 'timeToResolution', label: 'Time to Resolution' },
  { key: 'trendSlope', label: 'Trend Slope' },
  { key: 'temporal', label: '3D Playback' },
  { key: 'odeSim', label: 'ODE Simulation' }
  
];
selectAllCharts() {
  Object.keys(this.chartToggles).forEach(key => this.chartToggles[key].show = true);
}

deselectAllCharts() {
  Object.keys(this.chartToggles).forEach(key => this.chartToggles[key].show = false);
}

}