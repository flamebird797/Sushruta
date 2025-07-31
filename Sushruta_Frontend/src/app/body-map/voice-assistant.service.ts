import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class VoiceAssistantService {
  private recognition: any;
  private isBrowser: boolean;
  private callback: (command: string) => void = () => {};
  private restarting = false;
  private paused = false;

  public isListening = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

      if (typeof SpeechRecognition === 'function') {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.continuous = true;
        this.recognition.interimResults = false;

        this.recognition.onstart = () => {
          this.isListening = true;
          console.log('[Voice] 🔊 Listening started');
        };

        this.recognition.onend = () => {
          this.isListening = false;
          console.log('[Voice] 🛑 Listening stopped');
          if (!this.restarting && !this.paused) {
            this.restarting = true;
            setTimeout(() => {
              this.recognition.start();
              this.restarting = false;
            }, 500);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('[Voice] ⚠️ Recognition error:', event.error);
          if (event.error !== 'not-allowed' && !this.restarting && !this.paused) {
            this.restarting = true;
            setTimeout(() => {
              this.recognition.start();
              this.restarting = false;
            }, 500);
          }
        };

        // Default command handler (overridden in listen())
        this.recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join(' ')
            .toLowerCase()
            .trim();

          console.log('[Voice] Heard:', transcript);

          const match = transcript.match(/\b(?:hey |ok |yo )?(athena)\b(.*)/i);
          if (match) {
            const command = match[2].trim();
            this.speak(`You said: ${command}`);
            const waitUntilSpoken = new SpeechSynthesisUtterance(`You said: ${command}`);
            waitUntilSpoken.onend = () => {
              this.callback(command);
            };
            speechSynthesis.speak(waitUntilSpoken);
          }
        };
      }
    }
  }

  listen(callback: (command: string) => void, onWake?: () => void) {
    if (!this.isBrowser || !this.recognition) return;

    this.callback = callback;

    this.recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(' ')
        .toLowerCase()
        .trim();

      console.log('[Voice] Heard:', transcript);

      const match = transcript.match(/\b(?:hey |ok |yo )?(athena)\b(.*)/i);
      if (match) {
        const command = match[2].trim();

        if (onWake) onWake();

        const speakBack = new SpeechSynthesisUtterance(`You said: ${command}`);
        speakBack.onend = () => {
          this.callback(command);
        };
        speechSynthesis.speak(speakBack);
      }
    };

    this.recognition.start();
    console.log('[Voice] 🎙️ Continuous assistant mode started');
  }

  pause() {
    this.paused = true;
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
      console.log('[Voice] 💤 Paused recognition');
    }
  }

  resume() {
    if (this.recognition && !this.isListening) {
      this.paused = false;
      setTimeout(() => {
        this.recognition.start();
        console.log('[Voice] 🔁 Resumed assistant mode');
      }, 500);
    }
  }

  dictateOnce(callback: (text: string) => void) {
    if (!this.isBrowser) return;

    this.pause(); // 🛑 Stop assistant

    const temp = new (window as any).webkitSpeechRecognition();
    temp.lang = 'en-US';
    temp.interimResults = false;
    temp.maxAlternatives = 1;

    temp.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log('[Voice] 🎤 Dictation received:', transcript);
      callback(transcript);
    };

    temp.onerror = (e: any) => {
      console.error('[Voice] ❌ Dictation error:', e.error);
    };

    temp.onend = () => {
      console.log('[Voice] ✅ Dictation finished. Resuming assistant...');
      this.resume();
    };

    temp.start();
    console.log('[Voice] 📝 Dictation mode started');
  }

  speak(text: string) {
    if (!this.isBrowser || !text) return;

    this.pause();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      this.resume();
    };

    speechSynthesis.speak(utterance);
  }
}