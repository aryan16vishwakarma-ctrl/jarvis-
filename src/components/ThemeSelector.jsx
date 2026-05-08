import { useState } from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'neon-green', name: 'J.A.R.V.I.S (Neon)', colorClass: 'bg-accent-500' },
    { id: 'cyan', name: 'F.R.I.D.A.Y (Tech)', colorClass: 'bg-cyan-500' },
    { id: 'amber', name: 'Warning (Retro)', colorClass: 'bg-amber-500' },
    { id: 'purple', name: 'Nebula (Synth)', colorClass: 'bg-purple-500' },
    { id: 'red', name: 'Alert (Sith)', colorClass: 'bg-red-500' },
    { id: 'blue', name: 'Ocean (Deep)', colorClass: 'bg-blue-500' },
  ];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 flex items-center justify-center rounded-xl bg-slate-900/50 hover:bg-accent-500/10 border border-slate-800 hover:border-accent-500/50 transition-all text-slate-400 hover:text-accent-400"
        title="Change System Theme"
      >
        <Palette className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900 border border-slate-800 rounded shadow-2xl overflow-hidden z-50"
          >
            <div className="bg-slate-800/50 px-3 py-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-slate-800">
              Select Protocol
            </div>
            <div className="p-2 space-y-1">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-all text-xs font-mono tracking-wider ${theme === t.id ? 'bg-accent-500/10 text-accent-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'}`}
                >
                   <span>{t.name}</span>
                   <div className={`w-3 h-3 rounded-full ${t.colorClass} shadow-[0_0_8px_currentColor] opacity-80`} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
