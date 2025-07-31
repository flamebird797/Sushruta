
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  EventEmitter,
  Output,
  Input,
  Inject,
  PLATFORM_ID,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import * as THREE from 'three';
import { FormsModule } from '@angular/forms';
//@ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
//@ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ChartExportComponent } from '../chart-export/chart-export';
import { VoiceAssistantService } from './voice-assistant.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { RegionSliderComponent } from '../region-slider/region-slider';
//@ts-ignore
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';


@Component({
  selector: 'app-body-map',
  standalone: true,
  templateUrl: './body-map.html',
  styleUrls: ['./body-map.css'],
  imports: [ChartExportComponent,CommonModule,RegionSliderComponent,FormsModule]
})
export class BodyMapComponent implements OnInit, OnChanges {
  @ViewChild('threeContainer', { static: true }) threeContainer!: ElementRef;
@ViewChild(ChartExportComponent) exportComponent!: ChartExportComponent;
  @Input() view: 'front' | 'back' = 'front';
  
@Input() readonly = false;
  @Output() regionClicked = new EventEmitter<string>();
  @Input() activeMode: 'pain' | 'scar' | 'bruise' | 'burn' | 'discoloration' = 'pain';

@Input() regionData: Record<string, {
  pain?: number;
  scar?: number;
  bruise?: number;
  burn?: number;
  discoloration?: number;
  note?: string;
}> = {};
  showSlider = false;
  selectedRegion = '';
  tempLevel = 0;
  tempNote = '';
  chartName = '';
  hoveredRegion: string | null = null;
  tooltipX: number = 0;
tooltipY: number = 0;
  userId = '';
  disease = '';
  showVoiceHelp = false;
  summaryText = signal('');
  isListening = signal(false);
  chartHistory: Array<{ chartName: string; timestamp: string; regions: any }> = [];
  showHistoryPanel = false;
  chartNames: string[] = [];
  frontImageDataUrl: string = '';
backImageDataUrl: string = '';
frontImage!: { url: string; width: number; height: number };
backImage!: { url: string; width: number; height: number };

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private model!: THREE.Object3D;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  constructor(
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object,
    private voice: VoiceAssistantService,
    private router: Router
  ) {}

  ngOnInit(): void {
    
  }

  
  ngOnChanges(changes: SimpleChanges): void {
  if (changes['regionData'] && !changes['regionData'].firstChange) {
    this.loadModel(); // reflect new data
  }

  if (changes['activeMode'] && !changes['activeMode'].firstChange) {
    this.updateAllRegionColors(); // repaint model on mode switch
  }
}
  ngAfterViewInit(): void {
  if (isPlatformBrowser(this.platformId)) {
    this.initThreeScene();
    this.loadModel();
    this.voice.listen(
      (cmd: string) => this.handleVoiceCommand(cmd),
      () => {
        this.isListening.set(true);
        setTimeout(() => this.isListening.set(false), 3000);
      }
    );
  }
}

  initThreeScene(): void {
  this.scene = new THREE.Scene();

  const container = this.threeContainer.nativeElement;

  // Camera
  this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / 600, 0.1, 1000);
  this.camera.position.set(0, 1.5, 3); // initial placeholder

  // Renderer
  this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  this.renderer.setSize(container.clientWidth, 600);
  this.renderer.setClearColor(0x000000, 0); 
  this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));// transparent
  container.appendChild(this.renderer.domElement);
  this.renderer.setSize(container.clientWidth, container.clientHeight);

  // Controls
  this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  this.controls.enableDamping = true;

  // Light
  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  this.scene.add(light);

  // Model click handling
  this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));

  // Load model
  const loader = new GLTFLoader();
  loader.load('assets/body-views/sushruta.glb', (gltf: GLTF) => {
    const model = gltf.scene;

    // Remove duplicates if any
    const old = this.scene.getObjectByName('bodyModel');
    if (old) this.scene.remove(old);

    model.name = 'bodyModel';

    // Center model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Add to scene
    this.scene.add(model);

    // Recompute bounding box after repositioning
    const newBox = new THREE.Box3().setFromObject(model);
    const size = newBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Auto-position camera to fit
    this.camera.position.set(0, size.y / 2, maxDim * 1.5);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  });

  // Animate
  const animate = () => {
    requestAnimationFrame(animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
  animate();
}

private lastHoveredMesh: THREE.Mesh | null = null;

onMouseMove(event: MouseEvent): void {
  const bounds = this.renderer.domElement.getBoundingClientRect();
  this.mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  this.mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  this.raycaster.setFromCamera(this.mouse, this.camera);

  const intersects = this.raycaster.intersectObjects(this.scene.children, true);
  const intersect = intersects.find(obj => (obj.object as THREE.Mesh).userData['regionId']);

  // 🧼 Restore previous highlight
  if (this.lastHoveredMesh && this.lastHoveredMesh !== intersect?.object) {
    const lastMat = this.lastHoveredMesh.material;
    if (Array.isArray(lastMat)) {
      lastMat.forEach(m => {
        if (m instanceof THREE.MeshStandardMaterial) m.emissive.setHex(0x000000);
      });
    } else if (lastMat instanceof THREE.MeshStandardMaterial) {
      lastMat.emissive.setHex(0x000000);
    }
  }

  if (intersect) {
    const mesh = intersect.object as THREE.Mesh;
    const mat = mesh.material;
    this.hoveredRegion = mesh.userData['regionId'];
    this.tooltipX = event.clientX + 12;
this.tooltipY = event.clientY + 12;

    // 💡 Apply blue emissive highlight
    if (Array.isArray(mat)) {
      mat.forEach(m => {
        if (m instanceof THREE.MeshStandardMaterial) m.emissive.setHex(0x4444ff);
      });
    } else if (mat instanceof THREE.MeshStandardMaterial) {
      mat.emissive.setHex(0x4444ff);
    }

    this.lastHoveredMesh = mesh;
    this.renderer.domElement.style.cursor = 'pointer';
  } else {
    this.hoveredRegion = null;
    this.tooltipX = 0;
    this.tooltipY = 0;
    this.lastHoveredMesh = null;
    this.renderer.domElement.style.cursor = 'default';
  }
}
loadModel(): void {
  const loader = new GLTFLoader();

  loader.load('assets/body-views/sushruta.glb', (gltf: GLTF) => {
    // 🧹 Remove old model if it exists
    const old = this.scene.getObjectByName('bodyModel');
    if (old) this.scene.remove(old);

    // 🎯 Assign and configure the new model
    this.model = gltf.scene;
    this.model.name = 'bodyModel';
    this.model.scale.set(1, 1, 1);             // adjust as needed
    this.model.position.set(0, -1.0, 0);       // center vertically
    this.model.rotation.y = Math.PI;          // face the camera if needed

    this.scene.add(this.model);

    if (this.showSlider && this.selectedRegion) {
  const region = this.regionData[this.selectedRegion];
  if (region) {
    this.tempLevel = region[this.activeMode] ?? 0;
  }
}

    // 🎨 Apply materials and region data
    this.model.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh && child.name) {
        const mesh = child as THREE.Mesh;
        const regionId = mesh.name;
        mesh.userData['regionId'] = regionId;

        // Ensure region is initialized
        this.regionData[regionId] ??= {
          pain: 0,
          scar: 0,
          bruise: 0,
          burn: 0,
          discoloration: 0,
          note: ''
        };

        const level = this.regionData[regionId]?.[this.activeMode] ?? 0;

        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(this.getColor(regionId)),
          transparent: false
        });
      }
    });

    // 🧭 Adjust camera/controls after model is loaded
    this.controls.target.set(0, 1, 0); // look at the center of the model
    this.controls.update();
  });
}
onCanvasClick(event: MouseEvent): void {
  const mouse = new THREE.Vector2(
    (event.offsetX / this.renderer.domElement.clientWidth) * 2 - 1,
    -(event.offsetY / this.renderer.domElement.clientHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, this.camera);

  const intersects = raycaster.intersectObjects(this.scene.children, true);

  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh;
    const regionId = mesh.userData['regionId'];

    if (regionId) {
      // ✅ Ensure it's initialized with all fields
      this.regionData[regionId] ??= {
        pain: 0,
        scar: 0,
        bruise: 0,
        burn: 0,
        discoloration: 0,
        note: ''
      };

      const current = this.regionData[regionId];
      const mode = this.activeMode;

      this.tempLevel = current[mode] ?? 0;
      this.tempNote = current.note ?? '';
      this.selectedRegion = regionId;
      this.showSlider = true;
    }
  }
}
  onLiveLevelChange(newLevel: number): void {
    if (!this.selectedRegion) return;
    this.tempLevel = newLevel;
    this.updateRegionColor(this.selectedRegion, newLevel);
  }

 updateRegionColor(regionId: string, level: number): void {
  if (!this.model) return;

  this.model.traverse((obj: THREE.Object3D) => {
    if ((obj as THREE.Mesh).isMesh && obj.name === regionId) {
      const mesh = obj as THREE.Mesh;
      const color = new THREE.Color(this.getColor(regionId));

      if (Array.isArray(mesh.material)) {
        for (const mat of mesh.material) {
          if ((mat as any).color) {
            (mat as any).color.set(color);
            (mat as any).needsUpdate = true;
          }
        }
      } else {
        const mat = mesh.material as any;
        if (mat.color) {
          mat.color.set(color);
          mat.needsUpdate = true;
        }
      }
    }
  });
}
  saveRegion(event: { regionId: string; level: number; note: string }) {
  const mode = this.activeMode;
  const data = this.regionData[event.regionId] ??= {
    pain: 0, scar: 0, bruise: 0, burn: 0, discoloration: 0, note: ''
  };

  data[mode] = event.level;
  data.note = event.note;

  this.updateRegionColor(event.regionId, data[mode]);
  this.showSlider = false;
}
cancelRegionEdit(): void {
  const data = this.regionData[this.selectedRegion] ?? {
    pain: 0, scar: 0, bruise: 0, burn: 0, discoloration: 0, note: ''
  };

  this.tempLevel = data[this.activeMode] ?? 0;
  this.tempNote = data.note ?? '';
  this.showSlider = false;
}

resetAll(): void {
  for (const regionId in this.regionData) {
    const data = this.regionData[regionId];

    // Reset all modes to 0
    data.pain = 0;
    data.scar = 0;
    data.bruise = 0;
    data.burn = 0;
    data.discoloration = 0;

    // Clear note
    data.note = '';

    // Update color for the currently active mode
    this.updateRegionColor(regionId, 0);
  }

  // Refresh mesh materials in case any missed update
  this.model?.traverse((obj: any) => {
    if (obj.isMesh && obj.name) {
      const regionId = obj.name;
      const level = this.regionData[regionId]?.[this.activeMode] ?? 0;

      const material = obj.material;
      const color = new THREE.Color(this.getColor(regionId));

      if (Array.isArray(material)) {
        material.forEach(m => {
          (m as THREE.MeshStandardMaterial).color.set(color);
          m.needsUpdate = true;
        });
      } else {
        (material as THREE.MeshStandardMaterial).color.set(color);
        material.needsUpdate = true;
      }
    }
  });
}

  getColor(regionId: string): string {
  const data = this.regionData[regionId];
  if (!data) return '#ffffff';

  const modeValue = data[this.activeMode] ?? 0;

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

  const colors = colorMap[this.activeMode] ?? colorMap['pain'];

  return colors[Math.min(Math.max(modeValue, 0), 10)];
}

  saveToBackend(): void {
  if (!this.userId.trim()) {
    alert('Please enter a user ID before saving.');
    console.warn('[SaveToBackend] Attempted to save with empty userId');
    return;
  }

  const payload = {
    userId: this.userId.trim(),
    chartName: this.chartName.trim(),
    regions: this.regionData,
    disease: this.disease.trim(),
    notes: this.summaryText(), // optional AI-generated summary
    is3D: true                 // flag for future backend 3D support
  };

  console.log('[SaveToBackend] Prepared payload:', payload);

  fetch('http://localhost:8080/api/chart/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => {
      console.log('[SaveToBackend] Received response status:', res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status} - Failed to save chart`);
      return res.text();
    })
    .then(message => {
      console.log('[SaveToBackend] Server message:', message);
      alert('✅ Chart saved successfully!\n' + message);
    })
    .catch(err => {
      console.error('[SaveToBackend] Save failed:', err);
      alert('❌ Failed to save chart');
    });
}
 loadPrevious(): void {
  if (!this.userId.trim()) {
    alert('Please enter a user ID before loading.');
    console.warn('[LoadPrevious] Empty userId');
    return;
  }

  console.log('[LoadPrevious] Fetching chart history for user:', this.userId);

  fetch(`http://localhost:8080/api/chart/${this.userId.trim()}/history`)
    .then(res => {
      console.log('[LoadPrevious] HTTP status:', res.status);
      if (!res.ok) throw new Error('Failed to load history');
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        alert('⚠️ No chart history found for this user.');
        console.warn('[LoadPrevious] No charts found');
        return;
      }

      this.chartHistory = data;
      this.showHistoryPanel = true;
      console.log('[LoadPrevious] History panel displayed:', data);
    })
    .catch(err => {
      console.error('[LoadPrevious] Error loading chart history:', err);
      alert('❌ Failed to load previous chart history.');
    });
}


loadChartNames(): void {
  fetch(`http://localhost:8080/api/chart/${this.userId.trim()}/history`)
    .then(res => res.json())
    .then(data => {
      this.chartNames = data.map((entry: any) => entry.chartName || '(unnamed)');
      console.log('[ChartNames]', this.chartNames);
    });
}

loadHistory(): void {
  if (!this.userId.trim()) {
    alert('Enter a user ID to load history');
    return;
  }

  fetch(`http://localhost:8080/api/chart/${this.userId.trim()}/history`)
    .then(res => res.json())
    .then(history => {
      this.chartHistory = history;
      this.showHistoryPanel = true;
      console.log('[ChartHistory] Loaded:', history);
    })
    .catch(err => {
      console.error('Error loading chart history:', err);
      alert('❌ Failed to load history');
    });
}

loadChart(chart: any): void {
  if (!chart || !chart.regions) {
    console.warn('[ChartLoad] Invalid chart object:', chart);
    return;
  }

  const fixed: Record<string, { level: number, note: string }> = {};
  for (const key in chart.regions) {
    const raw = chart.regions[key];
    fixed[key] = {
      level: raw.level ?? raw.painLevel ?? 0,
      note: raw.note ?? ''
    };
  }

  this.regionData = fixed;
  this.updateAllRegionColors();
  this.showHistoryPanel = false;
  this.chartName = chart.chartName ?? 'Unnamed';
  console.log('[LoadChart] Chart loaded into UI');
}

updateAllRegionColors(): void {
  if (!this.model) return;

  this.model.traverse((child: any) => {
    if (child.isMesh && child.name && this.regionData[child.name]) {
      const region = this.regionData[child.name];
      const level = region[this.activeMode] ?? 0;
      const color = this.getColor(child.name);
      child.material.color.set(color);
    }
  });
}
startNewChart(): void {
  const confirmReset = confirm('Are you sure you want to start a new chart? Unsaved changes will be lost.');
  if (!confirmReset) return;

  this.chartName = '';
  this.regionData = {};
  this.selectedRegion = '';
  this.tempLevel = 0;
  this.tempNote = '';
  this.showSlider = false;
  this.showHistoryPanel = false;

    this.resetAll();

  this.updateAllRegionColors();
}
captureView(view: 'front' | 'back'): { url: string; width: number; height: number } {
  if (!this.renderer || !this.model || !this.camera) return { url: '', width: 0, height: 0 };

  const originalPosition = this.camera.position.clone();
  const originalRotation = this.camera.rotation.clone();

  // 🔒 Set camera view
if (view === 'front') {
  this.model.rotation.y = 0;
  this.camera.position.set(0, 1.5, 8); // pulled back further
} else {
  this.model.rotation.y = Math.PI;
  this.camera.position.set(0, 1.5, 8);
}
this.camera.lookAt(0, 0, 0);
this.camera.updateProjectionMatrix();

  // Render and capture
  this.renderer.render(this.scene, this.camera);
  const canvas = this.renderer.domElement;
  const url = canvas.toDataURL('image/png');

  // 🔄 Restore original camera state
  this.camera.position.copy(originalPosition);
  this.camera.rotation.copy(originalRotation);
  this.camera.updateProjectionMatrix();

  return {
    url,
    width: canvas.width,
    height: canvas.height
  };
}

exportToCSV(): void {
  fetch('http://localhost:8080/api/chart/export')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'charts.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error('CSV export failed:', err);
      alert('❌ CSV export failed.');
    });
}
generateSummary(): void {
  console.log('[AI Summary] 🟡 Preparing request...');
  console.log('[AI Summary] regionData =', this.regionData);

  fetch('http://localhost:8080/api/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(this.regionData)
  })
    .then(res => {
      console.log('[AI Summary] 🟡 Server responded with status:', res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.text();
    })
    .then(text => {
      console.log('[AI Summary] ✅ Received summary:', text);
      this.summaryText.set(text);
    })
    .catch(err => {
      console.error('[AI Summary] ❌ Network or fetch error:', err);
      this.summaryText.set('❌ Failed to generate summary.');
    });
}

startVoiceAssistant() {
    console.log('[Voice] 🎙️ Voice assistant started');
    this.voice.listen((command: string) => {
      console.log('[Voice] 🗣️ Heard:', command);
      this.voice.speak(`You said: ${command}`);
      this.handleVoiceCommand(command.toLowerCase());
    });
  }

handleVoiceCommand(cmd: string) {
  cmd = cmd.toLowerCase().trim();

  // Replace number words with digits
  const numberWords: Record<string, number> = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
  };

  for (const word in numberWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cmd = cmd.replace(regex, numberWords[word].toString());
  }

  console.log('[Voice] Normalized command:', cmd);

  // Split by chaining keywords: and, then, also, and then
  const commands = cmd.split(/\b(?:and then|then|also|and)\b/i).map(s => s.trim()).filter(Boolean);

  for (const single of commands) {
    this.processSingleCommand(single);
  }
}

processSingleCommand(cmd: string) {
  const modes = ['pain', 'scar', 'bruise', 'burn', 'discoloration'];

  // === Chart Actions ===
  if (cmd.includes('reset all')) return this.resetAll();
  if (cmd.includes('save chart')) return this.saveToBackend();
  if (cmd.includes('load chart')) return this.loadPrevious();
  if (cmd.includes('new chart')) return this.startNewChart();
  if (cmd.includes('export pdf')) return this.voice.speak('Scroll down and click Export PDF.');
  if (cmd.includes('summarize') || cmd.includes('summary')) return this.generateSummary();

  // === Query Mode Level ===
  const queryMatch = cmd.match(/what('?s| is) the (pain|scar|bruise|burn|discoloration) (level )?(in|on) (.+)/i);
  if (queryMatch) {
    const mode = queryMatch[2].toLowerCase();
    const rawRegion = queryMatch[5];
    const region = this.findMatchingRegion(rawRegion);
    if (region) {
      const level = this.regionData[region]?.[this.activeMode] ?? 0;
      return this.voice.speak(`${mode} level in ${region.replaceAll('_', ' ')} is ${level}`);
    } else {
      return this.voice.speak("I couldn't find that region.");
    }
  }

  // === Clear Note ===
  const clearMatch = cmd.match(/clear note (on|for) (.+)/i);
  if (clearMatch) {
    const rawRegion = clearMatch[2];
    const region = this.findMatchingRegion(rawRegion);
    if (region) {
      this.regionData[region] ??= { pain: 0, scar: 0, bruise: 0, burn: 0, discoloration: 0, note: '' };
      this.regionData[region].note = '';
      return this.voice.speak(`Note cleared for ${region.replaceAll('_', ' ')}`);
    } else {
      return this.voice.speak('Region not found.');
    }
  }

  // === Set Mode Level ===
  const setMatch = cmd.match(/\b(?:set\s*)?(pain|scar|bruise|burn|discoloration)\s*(level\s*)?(to\s*)?(\d+)\s*(on|in)?\s*(.+)/i);
  if (setMatch) {
    const mode = setMatch[1].toLowerCase();
    const level = parseInt(setMatch[4], 10);
    const rawRegion = setMatch[6];
    const region = this.findMatchingRegion(rawRegion);

    if (region) {
      this.regionData[region] ??= { pain: 0, scar: 0, bruise: 0, burn: 0, discoloration: 0, note: '' };
      this.regionData[region][this.activeMode] = level;
      this.updateRegionColor(region, level);
      return this.voice.speak(`Set ${mode} to ${level} on ${region.replaceAll('_', ' ')}`);
    } else {
      return this.voice.speak(`I could not find the region.`);
    }
  }

  // === Add Note (reverse style) ===
  const reverseNoteMatch = cmd.match(/^(.+?)\s*[:\-]\s*add note to\s+([\w\s]{1,30})$/i);
  if (reverseNoteMatch) {
    const note = reverseNoteMatch[1].trim();
    let rawRegion = reverseNoteMatch[2].trim();
    const wordList = rawRegion.split(/\s+/);
    rawRegion = rawRegion.includes('abdomen') || rawRegion.includes('back')
      ? wordList.slice(0, 3).join(' ')
      : wordList.slice(0, 2).join(' ');

    const region = this.findMatchingRegion(rawRegion);
    if (region) {
      this.regionData[region] ??= { pain: 0, scar: 0, bruise: 0, burn: 0, discoloration: 0, note: '' };
      this.regionData[region].note = note;
      return this.voice.speak(`Note added to ${region.replaceAll('_', ' ')}`);
    } else {
      return this.voice.speak('Region not found.');
    }
  }

  // === Natural Note Syntax (fallback) ===
  const naturalNoteMatch = cmd.match(/(?:add\s+)?note\s+(?:to|for)\s+(.+)/i);
  if (naturalNoteMatch) {
    const full = naturalNoteMatch[1].trim();
    const words = full.split(/\s+/);

    for (let i = Math.min(3, words.length); i >= 1; i--) {
      const tryRegion = words.slice(0, i).join(' ');
      const note = words.slice(i).join(' ');
      const region = this.findMatchingRegion(tryRegion);

      if (region) {
        this.regionData[region] ??= { pain: 0, scar: 0, bruise: 0, burn: 0, discoloration: 0, note: '' };
        this.regionData[region].note = note;
        return this.voice.speak(`Note added to ${region.replaceAll('_', ' ')}`);
      }
    }
  }

  // === Colon/Dash or "is" Notes ===
  let rawRegion: string | null = null;
  let note: string | null = null;
  const colonNoteMatch = cmd.match(/(?:add\s*)?note\s+(?:to|for)\s+([\w\s]{1,30}?)\s*[:\-]\s*(.+)/i);
  const isNoteMatch = cmd.match(/(?:add\s*)?note\s+(?:to|for)\s+([\w\s]{1,30}?)\s+is\s+(.+)/i);

  if (colonNoteMatch) {
    rawRegion = colonNoteMatch[1].trim();
    note = colonNoteMatch[2].trim();
  } else if (isNoteMatch) {
    rawRegion = isNoteMatch[1].trim();
    note = isNoteMatch[2].trim();
  }

  if (rawRegion && note) {
    const wordList = rawRegion.split(/\s+/);
    rawRegion = rawRegion.includes('abdomen') || rawRegion.includes('back')
      ? wordList.slice(0, 3).join(' ')
      : wordList.slice(0, 2).join(' ');

    const region = this.findMatchingRegion(rawRegion);
    if (region) {
      this.regionData[region] ??= { pain: 0, scar: 0, bruise: 0, burn: 0, discoloration: 0, note: '' };
      this.regionData[region].note = note;
      return this.voice.speak(`Note added to ${region.replaceAll('_', ' ')}`);
    } else {
      return this.voice.speak(`Region not found.`);
    }
  }

  // === Fallback ===
  console.warn('[Voice] Unrecognized command:', cmd);
  this.voice.speak("Sorry, I didn't understand that.");
}
findMatchingRegion(spokenInput: string): string | null {
  const input = this.normalize(spokenInput);
  console.log(`[VoiceMatch] Raw input: "${spokenInput}"`);
  console.log(`[VoiceMatch] Normalized input: "${input}"`);

  // ✅ Exact match
  if (this.regionAliasMap[input]) {
    console.log(`[VoiceMatch] Exact match found: "${input}" → ${this.regionAliasMap[input]}`);
    return this.regionAliasMap[input];
  }

  // 🔁 Fuzzy match fallback
  let bestMatch: string | null = null;
  let bestScore = Infinity;

  for (const alias in this.regionAliasMap) {
    const normalizedAlias = this.normalize(alias);
    const score = this.levenshtein(input, normalizedAlias);
    console.log(`[FuzzyMatch] Comparing "${input}" with "${normalizedAlias}" → score = ${score}`);

    if (score < bestScore && score <= 3) {
      bestMatch = alias;
      bestScore = score;
    }
  }

  if (bestMatch) {
    const result = this.regionAliasMap[bestMatch];
    console.log(`[VoiceMatch] Fuzzy match found: "${input}" → "${bestMatch}" → ${result}`);
    return result;
  }

  console.warn(`[VoiceMatch] ❌ No match found for: "${spokenInput}"`);
  return null;
}

regionAliasMap: Record<string, string> = {
  // 🧠 Head & Face
  "forehead": "forehead",
  "scalp front": "scalp_front",
  "front of scalp": "scalp_front",
  "scalp back": "scalp_back",
  "back of scalp": "scalp_back",
  "left temple": "temple_left",
  "right temple": "temple_right",
  "left eye": "eye_left",
  "right eye": "eye_right",
  "left ear": "ear_left",
  "right ear": "ear_right",
  "left cheek": "cheek_left",
  "right cheek": "cheek_right",
  "left jaw": "jaw_left",
  "right jaw": "jaw_right",
  "nose": "nose",
  "mouth": "mouth",

  // 🧍 Neck
  "neck front": "neck_front",
  "front neck": "neck_front",
  "neck back": "neck_back",
  "back of neck": "neck_back",

  // 💪 Shoulders
  "left shoulder": "shoulder_left",
  "right shoulder": "shoulder_right",
  "left armpit": "armpit_left",
  "right armpit": "armpit_right",

  // 💪 Arms
  "left bicep": "bicep_left",
  "right bicep": "bicep_right",
  "left tricep": "tricep_left",
  "right tricep": "tricep_right",
  "left elbow": "elbow_left",
  "right elbow": "elbow_right",
  "left forearm": "forearm_left",
  "right forearm": "forearm_right",
  "left wrist": "wrist_left",
  "right wrist": "wrist_right",
  "left hand": "hand_left",
  "right hand": "hand_right",

  // 🫀 Torso (Front)
  "left chest": "chest_left",
  "right chest": "chest_right",
  "sternum": "sternum",
  "epigastric": "epigastric",
  "umbilical": "umbilical",
  "hypogastric": "hypogastric",
  "left hypochondriac": "left_hypochondriac",
  "right hypochondriac": "right_hypochondriac",
  "left lumbar": "left_lumbar",
  "right lumbar": "right_lumbar",
  "left iliac": "left_iliac",
  "right iliac": "right_iliac",
  "groin": "groin",
  "pelvis": "pelvic_area",
  "pelvic area": "pelvic_area",

  // 🍑 Torso (Back)
  "upper back left": "back_upper_left",
  "upper left back": "back_upper_left",
  "upper back right": "back_upper_right",
  "upper right back": "back_upper_right",
  "lower back left": "back_lower_left",
  "lower left back": "back_lower_left",
  "lower back right": "back_lower_right",
  "lower right back": "back_lower_right",
  "spine upper": "spine_upper",
  "spine middle": "spine_middle",
  "spine lower": "spine_lower",

  // 🦵 Legs
  "left thigh": "thigh_left",
  "right thigh": "thigh_right",
  "left knee": "knee_left",
  "right knee": "knee_right",
  "left shin": "shin_left",
  "right shin": "shin_right",
  "left calf": "calf_left",
  "right calf": "calf_right",
  "left ankle": "ankle_left",
  "right ankle": "ankle_right",
  "left foot": "foot_left",
  "right foot": "foot_right",
  "left glute": "glute_left",
  "right glute": "glute_right",
  "left buttock": "glute_left",
  "right buttock": "glute_right"
};

normalize(text: string): string {
  
    return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .split(' ')
    .sort()
    .join(' ')
    .replace(/\s+/g, ' ');
}

 levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j] + 1
        );
      }
    }
  }
  return dp[m][n];
}

  goToAnalytics() {
    if (this.userId.trim()) {
      this.router.navigate(['/analytics'], { queryParams: { userId: this.userId } });
    }
  }
triggerPDFExport() {
  // 1. Capture PNGs
 this.frontImage = this.captureView('front');
this.backImage = this.captureView('back');
  // 2. Let Angular bind, then call exportToPDF()
  setTimeout(() => {
    if (this.exportComponent?.exportToPDF) {
      this.exportComponent.exportToPDF();
    } else {
      console.error('ChartExportComponent not available');
    }
  }, 100); // Delay ensures @Input bindings are applied
}
isPanelCollapsed: boolean = false;

togglePanel() {
  this.isPanelCollapsed = !this.isPanelCollapsed;
}

getLegendGradient(): string {
  const gradients: Record<string, string> = {
    pain: 'linear-gradient(to right, #ffffff, #D91A17)',
    scar: 'linear-gradient(to right, #ffffff, #808080)',
    bruise: 'linear-gradient(to right, #ffffff, #1f052b)',
    burn: 'linear-gradient(to right, #ffffff, #330d00)',
    discoloration: 'linear-gradient(to right, #ffffff, #0066ff)'
  };
  return gradients[this.activeMode] || gradients['pain'];
}
}
