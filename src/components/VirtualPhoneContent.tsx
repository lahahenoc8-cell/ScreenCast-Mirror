import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Camera, Image as ImageIcon, Music, CheckSquare, 
  Settings, Play, Pause, SkipForward, ArrowLeft, Heart, 
  Share2, Battery, Wifi, Flame, Sparkles, Clock, Compass, 
  MapPin, Bell, MessageSquare, ShieldCheck, ChevronRight
} from 'lucide-react';

interface VirtualPhoneContentProps {
  onPointerMove?: (x: number, y: number) => void;
  interactive?: boolean;
}

export const VirtualPhoneContent: React.FC<VirtualPhoneContentProps> = ({ 
  onPointerMove, 
  interactive = true 
}) => {
  const [activeApp, setActiveApp] = useState<'home' | 'photos' | 'player' | 'notes' | 'presentation'>('home');
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [presentationSlide, setPresentationSlide] = useState(1);
  const [notes, setNotes] = useState([
    { id: '1', title: 'Réunion Projet Cast', content: 'Présentation de la nouvelle application de miroir d\'écran HD.', time: '10:30' },
    { id: '2', title: 'Idées de voyage', content: 'Kyoto, Mont Fuji, balade à vélo au bord de la rivière Kamo.', time: 'Hier' },
    { id: '3', title: 'Liste de courses', content: 'Café de spécialité, fruits frais, pain complet bio.', time: '24 Août' },
  ]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const samplePhotos = [
    {
      title: 'Coucher de soleil sur l\'océan',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
      tag: 'Nature'
    },
    {
      title: 'Architecture Moderne',
      url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
      tag: 'Design'
    },
    {
      title: 'Sommets enneigés des Alpes',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
      tag: 'Voyage'
    }
  ];

  const handleTouch = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onPointerMove) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPointerMove(x, y);
  };

  return (
    <div 
      id="virtual-phone-screen"
      onClick={handleTouch}
      className="w-full h-full bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden font-sans relative"
    >
      {/* Phone Status Bar */}
      <div className="h-10 px-5 pt-2 flex items-center justify-between text-xs font-semibold tracking-wider text-slate-300 z-20">
        <span>{time}</span>
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">5G</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px]">94%</span>
            <Battery className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          </div>
        </div>
      </div>

      {/* Dynamic Island / Notch */}
      <div className="w-28 h-4.5 bg-black rounded-full mx-auto -mt-6 mb-2 border border-slate-800/80 shadow-md flex items-center justify-center gap-1.5 z-30">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/60"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse"></div>
      </div>

      {/* Screen Body Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-12">
        {activeApp === 'home' && (
          <div className="space-y-5 pt-2">
            {/* Live Interactive Mirroring Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-purple-900/50 border border-indigo-500/30 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2.5 text-indigo-300 text-xs font-semibold mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>PARTAGE D'ÉCRAN ACTIF</span>
              </div>
              <p className="text-sm font-bold text-white">Écran du Smartphone en direct</p>
              <p className="text-xs text-slate-300 mt-1">
                Tous vos clics et applications simulées se reflètent en direct sur votre ordinateur avec une latence ultra-faible.
              </p>
            </div>

            {/* Quick App Icons Grid */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">Applications</p>
              <div className="grid grid-cols-4 gap-3">
                <button
                  id="app-btn-photos"
                  onClick={() => setActiveApp('photos')}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-200">Photos HD</span>
                </button>

                <button
                  id="app-btn-player"
                  onClick={() => setActiveApp('player')}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-200">Musique</span>
                </button>

                <button
                  id="app-btn-presentation"
                  onClick={() => setActiveApp('presentation')}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-200">Diapos</span>
                </button>

                <button
                  id="app-btn-notes"
                  onClick={() => setActiveApp('notes')}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <CheckSquare className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-200">Notes</span>
                </button>
              </div>
            </div>

            {/* Live Media Player Widget */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Midnight Resonance</p>
                    <p className="text-[10px] text-slate-400">Stream Audio HD 320kbps</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow transition-colors"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full ${isPlaying ? 'w-2/3 animate-pulse' : 'w-2/3'}`}></div>
              </div>
            </div>

            {/* Quick Live Notes Feed */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">Dernières Notes</span>
                <button 
                  onClick={() => setActiveApp('notes')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Voir tout →
                </button>
              </div>
              <div className="space-y-2">
                {notes.slice(0, 2).map((note) => (
                  <div key={note.id} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
                    <p className="font-semibold text-slate-200">{note.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PHOTOS APP */}
        {activeApp === 'photos' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <button 
                onClick={() => setActiveApp('home')}
                className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <span className="text-xs font-bold text-white">Galerie Photos</span>
              <span className="text-[10px] text-slate-400">{currentPhotoIndex + 1} / {samplePhotos.length}</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-black aspect-[4/5] flex items-center justify-center">
              <img 
                src={samplePhotos[currentPhotoIndex].url} 
                alt={samplePhotos[currentPhotoIndex].title}
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 text-left">
                <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-600/80 text-white mb-1">
                  {samplePhotos[currentPhotoIndex].tag}
                </span>
                <p className="text-sm font-bold text-white">{samplePhotos[currentPhotoIndex].title}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {samplePhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPhotoIndex(idx)}
                  className={`flex-1 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === currentPhotoIndex ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PRESENTATION / SLIDES APP */}
        {activeApp === 'presentation' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <button 
                onClick={() => setActiveApp('home')}
                className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <span className="text-xs font-bold text-white">Présentation Diapo</span>
              <span className="text-[10px] text-slate-400">Slide {presentationSlide}/3</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/80 border border-indigo-500/30 shadow-xl min-h-[220px] flex flex-col justify-between">
              {presentationSlide === 1 && (
                <div>
                  <div className="inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase mb-2">
                    Diapo 1 • Aperçu
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">Partage d'écran Ultra Haute Définition</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Stream fluide via WebRTC P2P direct, idéal pour présenter des applications mobiles, des documents, et du contenu vidéo sans délai.
                  </p>
                </div>
              )}
              {presentationSlide === 2 && (
                <div>
                  <div className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase mb-2">
                    Diapo 2 • Fonctionnalités
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">Contrôles & Annotations</h3>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    <li className="flex items-center gap-1.5">✓ Pointeur laser interactif</li>
                    <li className="flex items-center gap-1.5">✓ Enregistrement vidéo en 1 clic</li>
                    <li className="flex items-center gap-1.5">✓ Presse-papier & fichiers partagés</li>
                  </ul>
                </div>
              )}
              {presentationSlide === 3 && (
                <div>
                  <div className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase mb-2">
                    Diapo 3 • Conclusion
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">Prêt à l'emploi</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Scannez simplement le code QR avec votre vrai téléphone pour partager son écran réel immédiatement !
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <button
                  disabled={presentationSlide <= 1}
                  onClick={() => setPresentationSlide((s) => Math.max(1, s - 1))}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium"
                >
                  Précédent
                </button>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((num) => (
                    <span 
                      key={num} 
                      className={`w-2 h-2 rounded-full ${presentationSlide === num ? 'bg-indigo-400' : 'bg-slate-700'}`}
                    />
                  ))}
                </div>
                <button
                  disabled={presentationSlide >= 3}
                  onClick={() => setPresentationSlide((s) => Math.min(3, s + 1))}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium shadow"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTES APP */}
        {activeApp === 'notes' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <button 
                onClick={() => setActiveApp('home')}
                className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <span className="text-xs font-bold text-white">Mes Notes</span>
              <span className="text-[10px] text-slate-400">{notes.length} notes</span>
            </div>

            <div className="flex gap-1.5">
              <input 
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ajouter une note..."
                className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newNote.trim()) {
                    setNotes([{ id: Date.now().toString(), title: newNote.trim(), content: 'Créé à l\'instant depuis le mobile', time: 'Maintenant' }, ...notes]);
                    setNewNote('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newNote.trim()) {
                    setNotes([{ id: Date.now().toString(), title: newNote.trim(), content: 'Créé à l\'instant depuis le mobile', time: 'Maintenant' }, ...notes]);
                    setNewNote('');
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 text-xs text-white rounded-xl font-semibold shadow hover:bg-indigo-500"
              >
                +
              </button>
            </div>

            <div className="space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-white">{note.title}</p>
                    <span className="text-[10px] text-slate-500">{note.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLAYER APP */}
        {activeApp === 'player' && (
          <div className="space-y-4 pt-1 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <button 
                onClick={() => setActiveApp('home')}
                className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <span className="text-xs font-bold text-white">Lecteur Audio</span>
              <div className="w-6"></div>
            </div>

            <div className="w-36 h-36 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-pink-500 shadow-2xl flex items-center justify-center border border-white/10 p-2">
              <Music className={`w-16 h-16 text-white ${isPlaying ? 'animate-bounce' : ''}`} />
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">Aura Waves</h4>
              <p className="text-xs text-slate-400">Cast Stream Session • 48kHz Stereo</p>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Phone Navigation Bar */}
      <div className="h-9 px-6 pb-2 flex items-center justify-center z-20">
        <button 
          onClick={() => setActiveApp('home')}
          className="w-28 h-1 rounded-full bg-slate-600 hover:bg-slate-400 transition-colors"
        ></button>
      </div>
    </div>
  );
};
