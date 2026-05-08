import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, ChevronRight, Clock, ArrowLeft, Search, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export function HistoryPanel({ user, onClose, onLoadSession }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'sessions'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions();
  }, [fetchSessions]);

  const loadLogs = async (sessionId) => {
    setSelectedSession(sessionId);
    setLoading(true);
    setSessionLogs([]);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'sessions', sessionId, 'logs'),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      setSessionLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
       console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this memory sequence?")) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'sessions', sessionId));
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession === sessionId) {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sessions, searchTerm]);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" 
        onClick={onClose}
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#05070a] border-l border-accent-500/20 z-[101] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-accent-500/20 bg-accent-500/5">
           <div className="flex items-center gap-2 text-accent-400">
             {selectedSession ? (
                <button onClick={() => setSelectedSession(null)} className="hover:text-accent-300 transition-colors p-1" title="Back to Sessions">
                  <ArrowLeft className="w-5 h-5" />
                </button>
             ) : (
                <Clock className="w-5 h-5" />
             )}
             <span className="font-mono text-sm uppercase tracking-widest font-bold">
               {selectedSession ? 'Transmission Logs' : 'Archive'}
             </span>
           </div>
           <button onClick={onClose} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Close Panel">
             <X className="w-5 h-5" />
           </button>
        </div>

        {!selectedSession && (
          <div className="p-4 border-b border-slate-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="SEARCH_MEMORIES..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-xs font-mono text-accent-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50 transition-all"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
           {!user ? (
             <div className="text-center text-slate-500 font-mono text-xs mt-10">
                UNAUTHORIZED ACCESS. CONNECT USER ENTITY.
             </div>
           ) : loading && sessions.length === 0 ? (
             <div className="text-accent-500/50 font-mono text-xs text-center mt-10 animate-pulse uppercase tracking-widest">
                Accessing Mainframe...
             </div>
           ) : !selectedSession ? (
              <div className="space-y-2">
                {filteredSessions.length === 0 ? (
                  <div className="text-slate-500 text-xs font-mono text-center mt-10 uppercase tracking-widest">
                    {searchTerm ? 'No results for search query.' : 'No communications archived.'}
                  </div>
                ) : (
                  filteredSessions.map(session => (
                    <button 
                      key={session.id}
                      onClick={() => loadLogs(session.id)}
                      className="w-full text-left p-3 rounded bg-slate-900/40 border border-slate-800 hover:border-accent-500/50 hover:bg-accent-500/5 transition-all group flex items-center justify-between"
                    >
                       <div className="flex-1 min-w-0">
                         <div className="text-slate-300 font-mono text-sm truncate">{session.title}</div>
                         <div className="text-slate-600 font-mono text-[10px] mt-1 uppercase tracking-widest">
                           {session.createdAt?.toDate().toLocaleString() || 'Unknown Temporal Code'}
                         </div>
                       </div>
                       <div className="flex items-center gap-2 ml-4">
                         <div onClick={(e) => deleteSession(session.id, e)} className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-slate-600 transition-colors rounded" title="Delete Session">
                            <Trash2 className="w-4 h-4" />
                         </div>
                         <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-accent-400" />
                       </div>
                    </button>
                  ))
                )}
              </div>
           ) : (
             <div className="space-y-4">
               <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">ID: {selectedSession}</div>
                  <button 
                    onClick={() => onLoadSession(selectedSession, sessionLogs)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/30 text-accent-400 rounded text-[10px] font-mono uppercase tracking-widest transition-all"
                  >
                    Load into Active Buffer <ExternalLink className="w-3 h-3" />
                  </button>
               </div>

               {sessionLogs.length === 0 ? (
                  <div className="text-slate-500 text-xs font-mono text-center mt-10 uppercase tracking-widest">Void. No data recovered.</div>
               ) : (
                  sessionLogs.map(log => (
                    <div key={log.id} className="text-xs bg-slate-900/40 p-3 rounded border border-slate-800">
                       <div className={`font-mono mb-1 ${log.sender === 'J.A.R.V.I.S' ? 'text-accent-400' : log.sender === 'SYS' ? 'text-accent-600' : 'text-accent-200'}`}>
                         [{log.timestamp}] &lt;{log.sender}&gt;
                       </div>
                       <p className="text-slate-300 break-words whitespace-pre-wrap">{log.text}</p>
                    </div>
                  ))
               )}
             </div>
           )}
        </div>
        
        {selectedSession && (
           <div className="p-4 border-t border-accent-500/10 bg-accent-500/5">
              <button 
                onClick={() => setSelectedSession(null)}
                className="w-full py-2 border border-slate-700 hover:border-accent-500/50 text-slate-400 hover:text-accent-400 transition-all font-mono text-[10px] uppercase tracking-widest"
              >
                Return to Archive
              </button>
           </div>
        )}
      </motion.div>
    </>
  );
}
