import { motion, useTransform } from 'motion/react';

export function Orb({ state, volume }) {
  let outermostRing = 'border-accent-500/10 bg-accent-500/5 glow-accent';

  switch (state) {
    case 'idle':
      break;
    case 'listening':
      outermostRing = 'border-accent-400/40 bg-accent-500/10 glow-accent';
      break;
    case 'processing':
      outermostRing = 'border-purple-400/40 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.3)]';
      break;
    case 'speaking':
      outermostRing = 'border-accent-400/40 bg-accent-500/10 shadow-[0_0_30px_rgba(34,197,94,0.3)]';
      break;
  }
  
  // Dynamic audio-reactive values
  const audioScale = useTransform(volume, [0, 1], [1, 1.3]);
  const audioGlow = useTransform(volume, [0, 1], [0.2, 0.8]);

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none z-0">
         <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
           className="core-ring w-[500px] h-[500px] border-dashed border-slate-800"
         />
         <div className="core-ring w-[400px] h-[400px]" />
         <motion.div 
           animate={{ rotate: -360 }}
           transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
           className="core-ring w-[320px] h-[320px] border-accent"
         />
      </div>

      <motion.div
        style={{ scale: audioScale }}
        className={`relative w-64 h-64 rounded-full flex items-center justify-center border transition-all duration-700 z-10 ${outermostRing}`}
      >
        <motion.div 
          style={{ opacity: audioGlow }}
          className="absolute inset-0 rounded-full bg-accent-500 blur-xl z-0" 
        />
        <div className="w-48 h-48 rounded-full border border-accent-500/20 flex items-center justify-center z-10">
          <motion.div
             animate={{ rotate: state === 'processing' ? 360 : 0 }}
             transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
             className={`w-32 h-32 rounded-full border border-dashed border-accent-500/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]`}
          >
             <div className="w-24 h-24 rounded-full border border-white/5 bg-transparent" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
