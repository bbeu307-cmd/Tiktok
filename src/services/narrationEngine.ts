/**
 * TikTok Live Racing Arena - Brazilian Portuguese Narration Engine
 * High-performance Web Speech API synthesis for real-time race commentator.
 */

class NarrationEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.9;
  private rate: number = 1.05;
  private pitch: number = 1.0;
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();

    // Priorizar vozes pt-BR naturais
    const ptVoices = this.voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.startsWith('pt'));
    if (ptVoices.length > 0) {
      // Priorizar vozes Google, Microsoft ou Apple
      const preferred = ptVoices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Daniel') || v.name.includes('Luciana'));
      this.selectedVoice = preferred || ptVoices[0];
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices.filter(v => v.lang.startsWith('pt'));
  }

  public setVoiceByName(voiceName: string) {
    const found = this.voices.find(v => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setRate(rate: number) {
    this.rate = Math.max(0.7, Math.min(1.5, rate));
  }

  // Higieniza nomes do TikTok para pronúncia natural em português
  private sanitizeForSpeech(text: string): string {
    return text
      .replace(/@([a-zA-Z0-9_.-]+)/g, '$1') // Remove arroba
      .replace(/_/g, ' ') // Substitui underlines por espaço
      .replace(/[^\w\s\u00C0-\u017F,.!?]/gi, '') // Remove caracteres especiais e emojis desconhecidos
      .trim();
  }

  public speak(text: string, priority: boolean = false) {
    if (!this.isEnabled || !this.synth) return;

    const cleaned = this.sanitizeForSpeech(text);
    if (!cleaned) return;

    // Previne repetição idêntica dentro de 4 segundos
    const now = Date.now();
    if (cleaned === this.lastSpokenText && now - this.lastSpokenTime < 4000) {
      return;
    }

    if (priority) {
      this.synth.cancel(); // Interrompe fala anterior para evento urgente (ex: GO! ou Vencedor)
    }

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'pt-BR';
    utterance.volume = this.volume;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    this.lastSpokenText = cleaned;
    this.lastSpokenTime = now;

    this.synth.speak(utterance);
  }

  public cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const narrationEngine = new NarrationEngine();
