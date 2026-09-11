import React, { useState, useRef } from 'react';
import { 
  Copy, Check, Send, Paperclip, FileText, ExternalLink, 
  Trash2, ArrowDownCircle, Sparkles, MessageSquare, Download
} from 'lucide-react';
import { ClipboardItem } from '../types';

interface SharedClipboardProps {
  items: ClipboardItem[];
  onSendMessage: (text: string, title?: string) => void;
  onSendFile: (file: File) => void;
  isOpen: boolean;
  onClose: () => void;
  role: 'receiver' | 'sender';
}

export const SharedClipboard: React.FC<SharedClipboardProps> = ({
  items,
  onSendMessage,
  onSendFile,
  isOpen,
  onClose,
  role,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onSendFile(files[0]);
    }
  };

  return (
    <div 
      id="shared-clipboard-drawer"
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-xl z-50 flex flex-col transition-transform"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Presse-papier & Fichiers</h3>
            <p className="text-[11px] text-slate-400">Synchronisation Téléphone ⇄ PC</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
        >
          ✕
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <Paperclip className="w-10 h-10 stroke-1 text-slate-600" />
            <p className="text-xs font-semibold text-slate-400">Aucun élément partagé</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tapez un message, collez un lien ou glissez une photo pour l'envoyer instantanément à votre {role === 'receiver' ? 'téléphone' : 'ordinateur'}.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-sm space-y-2 text-xs"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold text-indigo-400">{item.senderName}</span>
                <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {item.type === 'file' ? (
                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <p className="font-medium text-slate-200 truncate">{item.fileName}</p>
                      <p className="text-[10px] text-slate-500">{item.fileSize}</p>
                    </div>
                  </div>
                  {item.fileData && (
                    <a
                      href={item.fileData}
                      download={item.fileName || 'fichier_partage'}
                      className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 shrink-0"
                      title="Télécharger le fichier"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 text-slate-200 break-words whitespace-pre-wrap">
                  {item.content}
                </div>
              )}

              {item.type !== 'file' && (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleCopy(item.id, item.content)}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copier
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Envoyer un fichier ou une photo"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Coller un lien, une note, du texte..."
            className="flex-1 bg-slate-900 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors shadow"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
