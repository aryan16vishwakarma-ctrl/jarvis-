import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function NewsWidget({ onClose }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      // Using a public RSS to JSON converter with Google News RSS
      const rssUrl = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
      const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        setNews(data.items.slice(0, 5)); // Get top 5 news items
      } else {
        throw new Error('Failed to fetch news feed.');
      }
    } catch (err) {
      console.error('News Fetch Error:', err);
      setError('Neural link to News Grid failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNews();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 20 }}
      className="w-80 border border-slate-700 bg-glass rounded-lg overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.1)] flex flex-col"
    >
      <div className="flex items-center justify-between p-3 bg-slate-900/50 border-b border-slate-700">
        <div className="flex items-center gap-2 text-accent-400">
          <Newspaper className="w-4 h-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold">Global News Grid</span>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={fetchNews} className="text-slate-500 hover:text-accent-400 transition-colors p-1" title="Refresh Feed">
             <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
           </button>
           <button onClick={onClose} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Close Widget">
             <X className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar p-3 space-y-3">
        {loading && !news.length ? (
           <div className="py-10 text-center space-y-2">
              <div className="text-accent-500/50 font-mono text-[10px] animate-pulse uppercase tracking-widest">Scanning Grid...</div>
           </div>
        ) : error ? (
           <div className="py-10 text-center text-red-500/50 font-mono text-[10px] uppercase tracking-widest">
              {error}
           </div>
        ) : (
           <AnimatePresence mode="popLayout">
             {news.map((item, index) => (
               <motion.div 
                 key={item.guid || index}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
                 className="p-3 bg-slate-900/40 border border-slate-800 rounded group hover:border-accent-500/30 transition-all font-sans"
               >
                 <div className="text-[10px] text-slate-500 font-mono mb-1 flex justify-between uppercase">
                    <span>{new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-accent-500/50">{item.author || 'SOURCE_UNKN'}</span>
                 </div>
                 <h3 className="text-xs text-slate-200 line-clamp-2 leading-relaxed mb-2 group-hover:text-accent-400 transition-colors font-medium">
                    {item.title}
                 </h3>
                 <a 
                   href={item.link} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex items-center gap-1.5 text-[10px] text-accent-500/70 hover:text-accent-400 font-bold uppercase tracking-widest transition-colors font-mono"
                 >
                   Open Protocol <ExternalLink className="w-2.5 h-2.5" />
                 </a>
               </motion.div>
             ))}
           </AnimatePresence>
        )}
      </div>
      
      <div className="p-2 bg-slate-900/60 border-t border-slate-700/50 text-[9px] text-slate-600 font-mono text-center uppercase tracking-widest">
        Real-time feed synchronized
      </div>
    </motion.div>
  );
}
