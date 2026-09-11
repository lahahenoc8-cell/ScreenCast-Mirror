import React, { useState, useEffect } from 'react';
import { 
  Mic, MicOff, Volume2, Sparkles, X, Check, ArrowRight, 
  HelpCircle, Shield, Radio, Activity, AlertCircle, Camera, 
  Maximize2, Play, Flashlight, VolumeX, MousePointer, Lock
} from 'lucide-react';
import { voiceCommandManager, SUPPORTED_VOICE_COMMANDS, VoiceCommandDefinition } from '../utils/voiceCommandHelper';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerCommand?: (commandId: string) => void;
}

export const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({
  isOpen,
  onClose,
  onTriggerCommand
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [language, setLanguage] = useState<'fr-FR' | 'en-US'>('fr-FR');
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    setIsSupported(voiceCommandManager.isSupported());

    const unsubscribe = voiceCommandManager.subscribe((state) => {
      setIsListening(state.isListening);
      setTranscript(state.transcript);
      setLastCommand(state.lastCommand);
      setError(state.error);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const handleToggleListening = async () => {
    if (isListening) {
      voiceCommandManager.stop();
    } else {
      const started = await voiceCommandManager.start();
      if (!started && !voiceCommandManager.isSupported()) {
        setError("Votre navigateur ne supporte pas l'API vocale SpeechRecognition. Veuillez utiliser Chrome, Edge ou Safari.");
      }
    }
  };

  const handleLanguageChange = (lang: 'fr-FR' | 'en-US') => {
    setLanguage(lang);
    voiceCommandManager.setLanguage(lang);
  };

  const filteredCommands = selectedCategory === 'all'
    ? SUPPORTED_VOICE_COMMANDS
    : SUPPORTED_VOICE_COMMANDS.filter((cmd) => cmd.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'camera': return <Camera className="w-3.5 h-3.5 text-emerald-400" />;
      case 'presentation': return <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />;
      case 'screen': return <Maximize2 className="w-3.5 h-3.5 text-purple-400" />;
      case 'audio': return <Volume2 className="w-3.5 h-3.5 text-amber-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        id="voice-command-modal-content"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              isListening 
                ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30' 
                : 'bg-indigo-600 text-white shadow-indigo-600/30'
            }`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Contrôle par Commandes Vocales</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isListening ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isListening ? 'Micro Ouvert' : 'Désactivé'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Pilotez votre écran, vos photos et présentations simplement avec votre voix</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => handleLanguageChange('fr-FR')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  language === 'fr-FR' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇫🇷 FR
              </button>
              <button
                onClick={() => handleLanguageChange('en-US')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  language === 'en-US' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇬🇧 EN
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main Microphone Action Card */}
          <div className={`p-5 rounded-2xl border transition-all ${
            isListening 
              ? 'bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40 shadow-xl ring-2 ring-rose-500/20' 
              : 'bg-slate-950/80 border-slate-800'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  id="btn-toggle-voice-recording"
                  onClick={handleToggleListening}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-2xl ${
                    isListening
                      ? 'bg-rose-500 text-white shadow-rose-500/50 ring-4 ring-rose-400/30 animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'
                  }`}
                  title={isListening ? "Arrêter l'écoute vocale" : "Démarrer l'écoute vocale"}
                >
                  {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                </button>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {isListening ? "À l'écoute... Dites une commande !" : "Écoute vocale en veille"}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isListening 
                      ? "Parlez distinctement (ex: « Capture », « Suivant », « Plein écran »)"
                      : "Cliquez sur le micro pour activer la reconnaissance vocale mains libres"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isListening ? (
                  <button
                    id="btn-modal-stop-listening"
                    onClick={() => voiceCommandManager.stop()}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/40 border border-rose-400 transition-all"
                    title="Arrêter immédiatement la commande vocale"
                  >
                    <MicOff className="w-4 h-4 animate-bounce" />
                    <span>Arrêter l'Écoute</span>
                  </button>
                ) : (
                  <button
                    id="btn-modal-start-listening"
                    onClick={() => voiceCommandManager.start()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 border border-indigo-400 transition-all"
                    title="Activer la commande vocale mains libres"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Démarrer Micro</span>
                  </button>
                )}

                <button
                  onClick={() => voiceCommandManager.speakFeedback("Reconnaissance vocale ScreenCast active")}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Tester la synthèse vocale"
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Test</span>
                </button>
              </div>
            </div>

            {/* Listening Wave & Transcription Box */}
            {isListening && (
              <div className="mt-4 pt-4 border-t border-rose-500/20 space-y-3 animate-in fade-in">
                {/* Audio Waves Visualizer Simulation */}
                <div className="flex items-center justify-center gap-1.5 h-8">
                  {[40, 70, 90, 60, 100, 75, 45, 85, 95, 65, 50, 80].map((height, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-rose-400 animate-pulse"
                      style={{
                        height: `${height}%`,
                        animationDelay: `${i * 0.08}s`,
                        animationDuration: '0.8s'
                      }}
                    />
                  ))}
                </div>

                {/* Real-time speech transcription */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block mb-1">
                    Transcription en direct :
                  </span>
                  <p className="text-xs text-indigo-200 font-medium italic min-h-[1.5rem]">
                    {transcript ? `« ${transcript} »` : "En attente de parole..."}
                  </p>
                </div>
              </div>
            )}

            {/* Last Recognized Command Banner */}
            {lastCommand && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dernière commande reconnue : <strong className="text-white font-bold">{lastCommand}</strong></span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono text-emerald-200">Exécutée</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Categories Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Liste des Commandes Disponibles
              </h4>
              <span className="text-[11px] text-slate-500">{filteredCommands.length} commandes</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'camera', label: '📷 Caméra & Photo' },
                { id: 'presentation', label: '📑 Diaporama' },
                { id: 'screen', label: '🖥️ Écran' },
                { id: 'audio', label: '🔊 Audio & Volume' },
                { id: 'general', label: '⚡ Système' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    selectedCategory === tab.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Commands Table / Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {filteredCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  onClick={() => {
                    if (onTriggerCommand) {
                      onTriggerCommand(cmd.id);
                    } else {
                      voiceCommandManager.triggerManualCommand(cmd.id, cmd.label);
                    }
                    voiceCommandManager.speakFeedback(cmd.label);
                  }}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-800/50 transition-all cursor-pointer group space-y-1.5"
                  title="Cliquer pour simuler cette commande"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(cmd.category)}
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {cmd.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      Tester ➔
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">
                    {cmd.description}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {cmd.triggers.slice(0, 3).map((trigger, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-indigo-300 font-mono"
                      >
                        « {trigger} »
                      </span>
                    ))}
                    {cmd.triggers.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-[10px] text-slate-500">
                        +{cmd.triggers.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Background & Screen Lock Note */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-3">
            <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-indigo-200">Diffusion Continue & Écran Verrouillé</p>
              <p className="text-slate-300 leading-relaxed">
                Lorsque l'option <strong>Anti-Veille</strong> est active, votre téléphone ne s'éteint pas automatiquement. 
                Même si l'écran se verrouille ou passe en arrière-plan, le flux d'images et les commandes vocales restent opérationnels grâce au moteur de maintien actif continu.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Support multilingue Français & Anglais actif</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
