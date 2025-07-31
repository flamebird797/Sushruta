import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges,
  inject,
  PLATFORM_ID,
  OnInit
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceAssistantService } from '../body-map/voice-assistant.service';
import { ViewChild, ElementRef } from '@angular/core'; // ✅ Adjust path as needed

@Component({
  selector: 'app-region-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './region-slider.html',
  styleUrls: ['./region-slider.css']
})
export class RegionSliderComponent implements OnChanges, OnInit {
  @Input() regionId: string = '';
  @Input() initialLevel: number = 0;
  @Input() initialNote: string = '';
  @Input() visible: boolean = false;

  @Output() save = new EventEmitter<{ regionId: string; level: number; note: string }>();
  @Output() cancel = new EventEmitter<void>();
  @Output() levelChange: EventEmitter<number> = new EventEmitter<number>();

  @ViewChild('modal') modalRef!: ElementRef<HTMLElement>;

  level = signal(0);
  note = signal('');
  isDictating = signal(false);
  

  voices: SpeechSynthesisVoice[] = [];

  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  supportsSpeech = false;

  constructor(private voice: VoiceAssistantService) {}

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.supportsSpeech = 'speechSynthesis' in window;
    this.loadVoices();
  }

 ngOnChanges(changes: SimpleChanges): void {
  if (changes['initialLevel'] || changes['initialNote']) {
    this.level.set(this.initialLevel);
    this.note.set(this.initialNote);
    console.debug(`[Slider INIT] Reset to level=${this.initialLevel}, note="${this.initialNote}"`);
  }

  if (changes['visible']?.currentValue && this.modalRef) {
    const modal = this.modalRef.nativeElement;
    // Set initial centered position
    modal.style.left = '50%';
    modal.style.top = '20%';
    modal.style.transform = 'translate(-50%, 0)';
    modal.style.position = 'fixed';
  }
}

  onSliderInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const newLevel = parseInt(input.value);
    this.level.set(newLevel);
    this.levelChange.emit(newLevel);
  }

  onNoteInput(event: Event) {
    const input = event.target as HTMLTextAreaElement;
    this.note.set(input.value);
  }

  onSave() {
    this.save.emit({
      regionId: this.regionId,
      level: this.level(),
      note: this.note()
    });
  }

  onCancel() {
    try {
      console.debug(`[Cancel] Cancel clicked for region "${this.regionId}"`);
      console.debug(`[Cancel] Current unsaved state: level=${this.level()}, note="${this.note()}"`);
      this.cancel.emit();
    } catch (error) {
      console.error(`[Cancel] Exception while cancelling region "${this.regionId}":`, error);
    }
  }

  loadVoices() {
    if (!this.isBrowser || !('speechSynthesis' in window)) return;

    const load = () => {
      this.voices = window.speechSynthesis.getVoices();
    };

    load();

    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  speakNote() {
    if (!this.isBrowser || !this.supportsSpeech) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }

    const text = this.note();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    const preferred = this.voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  startSpeechToText() {
    if (!this.isBrowser) return;

    this.isDictating.set(true);
    this.voice.dictateOnce((text: string) => {
      const existing = this.note();
      this.note.set(existing ? `${existing} ${text}` : text);
      this.isDictating.set(false);
    });
  }

  startDrag(event: MouseEvent, modal: HTMLElement) {
  event.preventDefault();
  const offsetX = event.clientX - modal.getBoundingClientRect().left;
  const offsetY = event.clientY - modal.getBoundingClientRect().top;

  const onMouseMove = (moveEvent: MouseEvent) => {
    modal.style.left = `${moveEvent.clientX - offsetX}px`;
    modal.style.top = `${moveEvent.clientY - offsetY}px`;
    modal.style.position = 'fixed';
    modal.style.transform = 'none'; // disable centering while dragging
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
}