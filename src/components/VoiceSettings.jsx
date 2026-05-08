import { useState } from 'react';
import { Volume2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function VoiceSettings({
  voices,
  selectedVoiceURI,
  setSelectedVoiceURI,
  pitch, setPitch,
  rate, setRate,
  volume, setVolume
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center p-2 rounded border transition-all ${isOpen ? 'bg-accent-500/10 border-accent-500/50 text-accent-400' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-accent-500/10 hover:border-accent-500/50 hover:text-accent-400'}`}
        title="Voice Synthesis Settings"
      >
        <Volume2 className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 w-72 bg-[#05070a] border border-slate-800 rounded shadow-2xl z-50 p-4 font-mono select-none"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
               <span className="text-xs text-accent-400 font-bold uppercase tracking-widest flex items-center gap-2">
                 <Settings2 className="w-4 h-4" /> Vocal Output
               </span>
            </div>

            <div className="space-y-4">
               <div>
                 <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Voice Module</label>
                 <select 
                   className="w-full bg-slate-900 border border-slate-800 text-accent-400 text-xs py-1.5 px-2 rounded outline-none focus:border-accent-500/50"
                   value={selectedVoiceURI || ''}
                   onChange={(e) => setSelectedVoiceURI(e.target.value)}
                 >
                   {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                   ))}
                 </select>
               </div>

               <div>
                 <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                   <span>Pitch</span>
                   <span className="text-accent-400">{pitch.toFixed(1)}</span>
                 </div>
                 <input 
                   type="range" min="0" max="2" step="0.1" 
                   value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))}
                   className="w-full accent-accent-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                 />
               </div>

               <div>
                 <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                   <span>Rate / Speed</span>
                   <span className="text-accent-400">{rate.toFixed(1)}x</span>
                 </div>
                 <input 
                   type="range" min="0.5" max="2" step="0.1" 
                   value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}
                   className="w-full accent-accent-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                 />
               </div>

               <div>
                 <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                   <span>Amplification</span>
                   <span className="text-accent-400">{Math.round(volume * 100)}%</span>
                 </div>
                 <input 
                   type="range" min="0" max="1" step="0.1" 
                   value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                   className="w-full accent-accent-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                 />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
