import { Play, Pause, SkipBack, SkipForward, Volume2, X, Music } from 'lucide-react';
import { motion } from 'motion/react';

export function MusicWidget({ url, title, platform, onClose, onControl }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="w-80 border border-slate-700 bg-glass rounded-lg overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.1)] flex flex-col font-sans"
    >
      <div className="flex items-center justify-between p-3 bg-slate-900/50 border-b border-slate-700">
        <div className="flex items-center gap-2 text-accent-400 font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
          <Music className="w-4 h-4" />
          <span>Audio Interface</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-red-400 transition-colors p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-black/40 aspect-video relative">
        {platform === 'youtube' ? (
           <iframe 
             width="100%" 
             height="100%" 
             src={url} 
             title="Music Player" 
             frameBorder="0" 
             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
             allowFullScreen
             className="absolute inset-0"
           ></iframe>
        ) : platform === 'spotify' ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#1DB954]/20 flex items-center justify-center border border-[#1DB954]/30">
                 <Music className="w-6 h-6 text-[#1DB954]" />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-[#1DB954] font-bold uppercase tracking-widest font-mono">Spotify Stream</div>
                <div className="text-sm text-slate-200 line-clamp-1 font-medium">{title}</div>
              </div>
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors font-mono"
              >
                Open Spotify
              </a>
              <div className="text-[10px] text-slate-500 font-mono italic">Playback control limited for external streams</div>
           </div>
        ) : (
           <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-[10px] uppercase">
              No Media Loaded
           </div>
        )}
      </div>

      <div className="p-3 bg-slate-900/40 border-b border-slate-700 flex flex-col items-center">
        <div className="text-[10px] text-accent-500 font-mono mb-1 truncate w-full text-center uppercase tracking-tight">
           {title ? `NOW_PLAYING: ${title}` : 'IDLE'}
        </div>
      </div>

      <div className="flex items-center justify-around py-3 bg-slate-900/60">
        <button 
          onClick={() => onControl('previous')}
          className="p-2 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-accent-400 transition-all active:scale-90"
          title="Previous Track"
        >
           <SkipBack className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => onControl('pause')}
            className="p-3 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-200 hover:text-accent-400 transition-all active:scale-95"
            title="Pause"
          >
             <Pause className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onControl('play')}
            className="p-3 bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/30 rounded-full text-accent-400 transition-all active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
            title="Play"
          >
             <Play className="w-5 h-5 fill-accent-400" />
          </button>
        </div>
        <button 
          onClick={() => onControl('next')}
          className="p-2 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-accent-400 transition-all active:scale-90"
          title="Next Track"
        >
           <SkipForward className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-2 bg-slate-900/80 flex items-center gap-3">
         <Volume2 className="w-3 h-3 text-slate-500" />
         <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-accent-500/40 w-2/3 animate-pulse"></div>
         </div>
         <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest leading-none">Balanced</span>
      </div>
    </motion.div>
  );
}
