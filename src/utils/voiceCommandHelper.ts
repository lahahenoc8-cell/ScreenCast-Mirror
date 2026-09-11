// Voice Command Helper using Web Speech Recognition API
// Enables hands-free control of ScreenCast Mirror (Capture, Flash, Slides, Fullscreen, Volume, etc.)

export interface VoiceCommandDefinition {
  id: string;
  label: string;
  triggers: string[];
  description: string;
  category: 'screen' | 'presentation' | 'camera' | 'audio' | 'general';
}

export const SUPPORTED_VOICE_COMMANDS: VoiceCommandDefinition[] = [
  {
    id: 'stop_voice',
    label: 'Arrêter la commande vocale',
    triggers: [
      'arrête la commande vocale',
      'arrêter la commande vocale',
      'arrête le micro',
      'arrêter le micro',
      'coupe le micro',
      'couper le micro',
      'stop micro',
      'fermer le micro',
      'ferme le micro',
      'désactiver le micro',
      'désactive le micro',
      'fin de commande',
      'stop vocal',
      'stop écoute'
    ],
    description: 'Désactive et éteint immédiatement l\'écoute vocale',
    category: 'general'
  },
  {
    id: 'flash_on',
    label: 'Allumer la torche / flash',
    triggers: [
      'allumer la torche',
      'allume la torche',
      'allumer le flash',
      'allume le flash',
      'allumer la lampe',
      'allume la lampe',
      'allumer la lumière',
      'allume la lumière',
      'activer la torche',
      'active la torche',
      'activer le flash',
      'active le flash',
      'activer la lampe',
      'active la lampe',
      'allume torche',
      'allumer torche',
      'allume flash',
      'allumer flash',
      'allumer',
      'allume',
      'torche on',
      'flash on'
    ],
    description: 'Allume la torche LED physique et l\'écran réflecteur blanc haute luminosité',
    category: 'camera'
  },
  {
    id: 'flash_off',
    label: 'Éteindre la torche / flash',
    triggers: [
      'éteindre la torche',
      'éteins la torche',
      'éteindre le flash',
      'éteins le flash',
      'éteindre la lampe',
      'éteins la lampe',
      'éteindre la lumière',
      'éteins la lumière',
      'désactiver la torche',
      'désactive la torche',
      'désactiver le flash',
      'désactive le flash',
      'couper la torche',
      'coupe la torche',
      'éteins torche',
      'éteindre torche',
      'éteins flash',
      'éteindre flash',
      'éteindre',
      'éteins',
      'torche off',
      'flash off'
    ],
    description: 'Éteint immédiatement la torche LED et le flash écran',
    category: 'camera'
  },
  {
    id: 'flash_toggle',
    label: 'Basculer la torche flash (On/Off)',
    triggers: [
      'torche',
      'flash',
      'lampe',
      'lumière',
      'lampe torche',
      'projecteur',
      'flashlight'
    ],
    description: 'Bascule l\'état de la torche LED du smartphone entre allumé et éteint',
    category: 'camera'
  },
  {
    id: 'capture',
    label: 'Prendre une capture / photo',
    triggers: [
      'capture',
      'photo',
      'prendre une photo',
      'prends une photo',
      'prendre photo',
      'prend photo',
      'fais une photo',
      'faire une photo',
      'capture d\'écran',
      'capture ecran',
      'screenshot',
      'cliché',
      'enregistrer l\'écran',
      'snapshot',
      'cheese'
    ],
    description: 'Capture instantanément l\'écran ou la caméra et la transmet au PC',
    category: 'camera'
  },
  {
    id: 'flip_camera',
    label: 'Inverser la caméra (Avant/Arrière)',
    triggers: [
      'changer de caméra',
      'changer caméra',
      'tourner la caméra',
      'tourne la caméra',
      'caméra avant',
      'caméra arrière',
      'inverser la caméra',
      'inverser caméra',
      'selfie'
    ],
    description: 'Bascule entre la caméra avant (selfie) et la caméra arrière HD',
    category: 'camera'
  },
  {
    id: 'next_slide',
    label: 'Diapositive / Image suivante',
    triggers: [
      'suivant',
      'suivante',
      'diapo suivante',
      'diapositive suivante',
      'page suivante',
      'image suivante',
      'photo suivante',
      'après',
      'next',
      'avance',
      'avancer'
    ],
    description: 'Passe à la diapositive ou à l\'image suivante du diaporama',
    category: 'presentation'
  },
  {
    id: 'prev_slide',
    label: 'Diapositive / Image précédente',
    triggers: [
      'précédent',
      'précédente',
      'diapo précédente',
      'diapositive précédente',
      'page précédente',
      'image précédente',
      'photo précédente',
      'avant',
      'retour',
      'back',
      'reculer',
      'recule'
    ],
    description: 'Revient à la diapositive ou image précédente',
    category: 'presentation'
  },
  {
    id: 'fullscreen',
    label: 'Basculer en Plein écran',
    triggers: [
      'plein écran',
      'grand écran',
      'agrandir',
      'maximiser',
      'fullscreen',
      'mettre en plein écran',
      'quitter plein écran'
    ],
    description: 'Passe l\'affichage du miroir en mode plein écran',
    category: 'screen'
  },
  {
    id: 'pause_resume',
    label: 'Mettre en pause / Reprendre',
    triggers: [
      'pause',
      'mettre en pause',
      'lecture',
      'reprendre',
      'reprendre le flux',
      'relancer',
      'relance',
      'freeze',
      'dégeler',
      'play'
    ],
    description: 'Met en pause ou relance la diffusion en direct',
    category: 'screen'
  },
  {
    id: 'volume_up',
    label: 'Augmenter le volume',
    triggers: [
      'plus fort',
      'augmenter le son',
      'augmenter le volume',
      'monter le son',
      'monte le son',
      'volume plus',
      'augmente le son',
      'augmente le volume'
    ],
    description: 'Augmente le volume sonore de 20%',
    category: 'audio'
  },
  {
    id: 'volume_down',
    label: 'Baisser le volume',
    triggers: [
      'moins fort',
      'baisser le son',
      'baisser le volume',
      'diminuer le son',
      'diminuer le volume',
      'volume moins',
      'baisse le son',
      'baisse le volume'
    ],
    description: 'Baisse le volume sonore de 20%',
    category: 'audio'
  },
  {
    id: 'mute_toggle',
    label: 'Couper / Rétablir le son',
    triggers: [
      'muet',
      'couper le son',
      'coupe le son',
      'silence',
      'mute',
      'activer le son',
      'active le son',
      'remettre le son',
      'remets le son'
    ],
    description: 'Coupe ou réactive le son',
    category: 'audio'
  },
  {
    id: 'click_action',
    label: 'Simuler un clic de souris',
    triggers: [
      'clic',
      'clique',
      'cliquer',
      'valider',
      'toucher',
      'sélectionner'
    ],
    description: 'Envoie un clic de souris sur l\'écran de l\'ordinateur',
    category: 'general'
  },
  {
    id: 'keep_awake',
    label: 'Activer le mode Anti-Verrouillage',
    triggers: [
      'ne pas éteindre',
      'garde allumé',
      'garder allumé',
      'reste allumé',
      'rester allumé',
      'veille',
      'anti-veille',
      'garder l\'écran allumé'
    ],
    description: 'Maintient l\'écran actif et empêche la mise en veille automatique',
    category: 'general'
  }
];

export type VoiceCommandHandler = (commandId: string, matchedTrigger: string) => void;

/**
 * Normalizes speech text by stripping accents, symbols, and extra spaces.
 * Ensures consistent matching across all browsers and speech accents.
 */
export function normalizeSpeech(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents (é -> e, etc.)
    .replace(/[^a-z0-9\s]/g, ' ')   // strip punctuation & symbols
    .replace(/\s+/g, ' ')
    .trim();
}

interface PreprocessedTrigger {
  normalizedTrigger: string;
  commandId: string;
  commandLabel: string;
  rawTrigger: string;
}

class VoiceCommandManager {
  private recognition: any = null;
  private isListening: boolean = false;
  private language: string = 'fr-FR';
  private handlers: Set<VoiceCommandHandler> = new Set();
  private stateListeners: Set<(state: { isListening: boolean; transcript: string; lastCommand: string | null; error: string | null }) => void> = new Set();
  private lastTranscript: string = '';
  private lastCommand: string | null = null;
  private currentError: string | null = null;
  private restartTimeout: any = null;
  private shouldKeepListening: boolean = false;
  private lastCommandTime: number = 0;
  private lastCommandId: string = '';

  // Precomputed list of triggers sorted from longest to shortest to guarantee greedy matching
  private sortedTriggers: PreprocessedTrigger[] = [];

  constructor() {
    this.rebuildTriggerIndex();
    this.initRecognition();
  }

  private rebuildTriggerIndex() {
    const list: PreprocessedTrigger[] = [];
    for (const cmd of SUPPORTED_VOICE_COMMANDS) {
      for (const trigger of cmd.triggers) {
        list.push({
          normalizedTrigger: normalizeSpeech(trigger),
          commandId: cmd.id,
          commandLabel: cmd.label,
          rawTrigger: trigger
        });
      }
    }
    // Longest triggers first
    list.sort((a, b) => b.normalizedTrigger.length - a.normalizedTrigger.length);
    this.sortedTriggers = list;
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  private initRecognition() {
    if (!this.isSupported()) return;

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.currentError = null;
        this.notifyState();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const displayText = (interimTranscript || finalTranscript).trim();
        if (displayText) {
          this.lastTranscript = displayText;
          this.notifyState();
        }

        // Prioritize final finalized transcript, otherwise analyze interim transcript
        const textToMatch = (finalTranscript || interimTranscript).trim();
        if (textToMatch) {
          this.matchCommand(textToMatch);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.currentError = 'Permission micro refusée. Autorisez l\'accès au microphone dans votre navigateur.';
          this.shouldKeepListening = false;
        } else if (event.error === 'aborted') {
          // Explicitly stopped by user, do not show error
        } else if (event.error !== 'no-speech') {
          this.currentError = `Erreur vocale : ${event.error}`;
        }
        this.notifyState();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.notifyState();

        // Auto restart if active and not manually stopped
        if (this.shouldKeepListening) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldKeepListening) {
              try {
                this.recognition.start();
              } catch (e) {}
            }
          }, 400);
        }
      };
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err);
    }
  }

  public subscribe(callback: (state: { isListening: boolean; transcript: string; lastCommand: string | null; error: string | null }) => void): () => void {
    this.stateListeners.add(callback);
    callback({
      isListening: this.isListening,
      transcript: this.lastTranscript,
      lastCommand: this.lastCommand,
      error: this.currentError
    });
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  private notifyState() {
    const payload = {
      isListening: this.isListening,
      transcript: this.lastTranscript,
      lastCommand: this.lastCommand,
      error: this.currentError
    };
    this.stateListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {}
    });
  }

  /**
   * Register a voice command handler. Returns an unregister function.
   */
  public registerHandler(handler: VoiceCommandHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Legacy setHandler support for compatibility
   */
  public setHandler(handler: VoiceCommandHandler) {
    this.handlers.clear();
    this.handlers.add(handler);
  }

  public setLanguage(lang: 'fr-FR' | 'en-US') {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.isListening) {
        this.stop();
        setTimeout(() => this.start(), 300);
      }
    }
  }

  public getLanguage(): string {
    return this.language;
  }

  public async start(): Promise<boolean> {
    if (!this.isSupported()) {
      this.currentError = 'Reconnaissance vocale non supportée par ce navigateur (Web Speech API absente).';
      this.notifyState();
      return false;
    }

    this.shouldKeepListening = true;
    this.currentError = null;

    try {
      if (this.recognition) {
        this.recognition.start();
        return true;
      }
    } catch (e: any) {
      if (e.name !== 'InvalidStateError') {
        this.currentError = e.message || 'Impossible de démarrer le micro.';
        this.notifyState();
      }
    }
    return false;
  }

  public stop() {
    this.shouldKeepListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
    this.currentError = null;
    this.lastTranscript = '';
    this.notifyState();
  }

  public toggle(): Promise<boolean> {
    if (this.isListening) {
      this.stop();
      return Promise.resolve(false);
    } else {
      return this.start();
    }
  }

  /**
   * Manually trigger a command (e.g. from modal testing button or external event)
   */
  public triggerManualCommand(commandId: string, label?: string) {
    const cmd = SUPPORTED_VOICE_COMMANDS.find((c) => c.id === commandId);
    this.lastCommand = label || cmd?.label || commandId;
    this.notifyState();

    this.handlers.forEach((h) => {
      try {
        h(commandId, 'manual');
      } catch (e) {
        console.error('Error in manual voice command handler:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('screencast-voice-command', {
          detail: { commandId, trigger: 'manual' }
        })
      );
    }
  }

  // Check speech input against registered triggers with normalized matching
  private matchCommand(rawText: string) {
    const now = Date.now();
    // Cooldown check: minimum 1.5 seconds between any voice command executions to avoid repeating loops
    if (now - this.lastCommandTime < 1500) {
      return;
    }

    const cleanNormalized = normalizeSpeech(rawText);
    if (!cleanNormalized) return;

    for (const item of this.sortedTriggers) {
      // Check if the normalized user speech contains or matches the trigger
      if (cleanNormalized.includes(item.normalizedTrigger)) {
        // If this is the exact same command, require at least 2.5 seconds cooldown
        if (this.lastCommandId === item.commandId && now - this.lastCommandTime < 2500) {
          return;
        }

        this.lastCommandTime = now;
        this.lastCommandId = item.commandId;

        // SPECIAL COMMAND: Explicitly stop the microphone
        if (item.commandId === 'stop_voice') {
          this.lastCommand = 'Micro arrêté';
          this.notifyState();
          this.stop();
          return;
        }

        // Found command match
        this.lastCommand = item.commandLabel;
        this.notifyState();

        // Dispatch to all registered listeners
        this.handlers.forEach((handler) => {
          try {
            handler(item.commandId, item.rawTrigger);
          } catch (err) {
            console.error('Error executing voice command handler:', err);
          }
        });

        // Also broadcast custom window event for decoupled listeners
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('screencast-voice-command', {
              detail: { commandId: item.commandId, trigger: item.rawTrigger }
            })
          );
        }

        return;
      }
    }
  }

  // Voice confirmation feedback (only for explicit manual preview/test)
  public speakFeedback(message: string) {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = this.language;
        utterance.volume = 0.8;
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {}
  }
}

export const voiceCommandManager = new VoiceCommandManager();
