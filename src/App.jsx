import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioVolume } from './lib/audio';
import { Orb } from './components/Orb';
import { Terminal } from './components/Terminal';
import { Scene3D } from './components/Scene3D';
import { VoiceWave } from './components/VoiceWave';
import { HistoryPanel } from './components/HistoryPanel';
import { CameraWidget } from './components/CameraWidget';
import { ThemeSelector } from './components/ThemeSelector';
import { VoiceSettings } from './components/VoiceSettings';
import { useTTS } from './hooks/useTTS';
import { UserProfilePanel } from './components/UserProfilePanel';
import { NewsWidget } from './components/NewsWidget';
import { MusicWidget } from './components/MusicWidget';
import { Mic, MicOff, History, LogIn, LogOut, User } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { createNewChat } from './services/aiService';

export default function App() {
  const [jarvisState, setJarvisState] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [transcriptLive, setTranscriptLive] = useState("");
  const [widget, setWidget] = useState(null);
  const [serverStatus, setServerStatus] = useState('connecting');
  const [user, setUser] = useState(null);
  const [dbSessionId, setDbSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const userRef = useRef(null);
  const dbSessionIdRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { dbSessionIdRef.current = dbSessionId; }, [dbSessionId]);

  const [systemStats, setSystemStats] = useState({
      cpuLoad: "14.2",
      memoryUsed: "4.1",
      memoryTotal: "8.0",
      networkDown: "842.1",
      networkUp: "12.4",
      cores: 4
  });

  useEffect(() => {
    const memTotal = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 4;
    
    const interval = setInterval(() => {
        let netDown = 842.1;
        if (navigator.connection && navigator.connection.downlink) {
            netDown = navigator.connection.downlink;
        }
        
        const fakeCpu = Math.random() * 15 + 5;
        const percentUsed = 0.4 + Math.random() * 0.1;
        
        setSystemStats({
           cpuLoad: fakeCpu.toFixed(1),
           memoryUsed: (memTotal * percentUsed).toFixed(1),
           memoryTotal: memTotal.toFixed(1),
           networkDown: netDown.toFixed(1),
           networkUp: (netDown * 0.1 * Math.random()).toFixed(1),
           cores
        });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const addLog = useCallback((sender, text, type = 'default') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newLog = {
      id: Math.random().toString(36).substring(7),
      sender,
      text,
      type,
      timestamp
    };
    setLogs(prev => [...prev, newLog]);

    if (userRef.current && dbSessionIdRef.current) {
        const logPath = `users/${userRef.current.uid}/sessions/${dbSessionIdRef.current}/logs`;
        addDoc(collection(db, 'users', userRef.current.uid, 'sessions', dbSessionIdRef.current, 'logs'), {
            sender,
            text,
            type,
            timestamp,
            createdAt: serverTimestamp()
        }).catch(e => {
            const errInfo = {
                error: e instanceof Error ? e.message : String(e),
                authInfo: {
                  userId: auth.currentUser?.uid,
                  email: auth.currentUser?.email,
                },
                operationType: 'create',
                path: logPath
            };
            console.error('[FIRESTORE ERROR]', JSON.stringify(errInfo));
            // We avoid calling addLog here to prevent recursion/circular dependency
            setLogs(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                sender: 'SYS',
                text: `Data Sync Error: ${errInfo.error}`,
                type: 'error',
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
            }]);
        });
    }
  }, []);

  const loadSession = useCallback(async (sessionId, sessionLogs) => {
    setDbSessionId(sessionId);
    setLogs(sessionLogs.map(l => ({
      id: l.id || Math.random().toString(36).substring(7),
      sender: l.sender,
      text: l.text,
      type: l.type || 'default',
      timestamp: l.timestamp
    })));
    setShowHistory(false);
    addLog('SYS', `Loaded session ${sessionId}. Synchronization complete.`, 'system');
  }, [addLog]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        addLog('SYS', `User Authenticated: ${u.email}`);
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
             await setDoc(userDocRef, {
                email: u.email,
                createdAt: serverTimestamp()
             });
          }
          const sessionRef = doc(collection(db, 'users', u.uid, 'sessions'));
          await setDoc(sessionRef, {
             userId: u.uid,
             title: `Session ${new Date().toLocaleDateString()}`,
             createdAt: serverTimestamp()
          });
          setDbSessionId(sessionRef.id);
        } catch(e) {
          console.error(e);
        }
      } else {
        setDbSessionId(null);
        setLogs([]);
      }
    });
    return unsubscribe;
  }, [addLog]);
  
  const { 
    speak, 
    voices, selectedVoiceURI, setSelectedVoiceURI,
    pitch, setPitch, rate, setRate, volume: ttsVolume, setVolume: setTtsVolume
  } = useTTS((s) => setJarvisState(s));

  const recognitionRef = useRef(null);

  const volume = useAudioVolume(jarvisState, micEnabled);

  // Mouse tracking for parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const parallaxX = useTransform(smoothMouseX, [-1, 1], [-15, 15]);
  const parallaxY = useTransform(smoothMouseY, [-1, 1], [15, -15]);
  const parallaxRevX = useTransform(smoothMouseX, [-1, 1], [15, -15]);
  const parallaxRevY = useTransform(smoothMouseY, [-1, 1], [-15, 15]);
  
  const rotateX = useTransform(smoothMouseY, [-1, 1], [5, -5]);
  const rotateY = useTransform(smoothMouseX, [-1, 1], [-5, 5]);
  const rotateRevX = useTransform(smoothMouseY, [-1, 1], [-5, 5]);
  const rotateRevY = useTransform(smoothMouseX, [-1, 1], [5, -5]);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth) * 2 - 1;
    const y = -(clientY / innerHeight) * 2 + 1;
    mouseX.set(x);
    mouseY.set(y);
  };

  const chatRef = useRef(null);

  const toggleMic = useCallback(() => {
     if (micEnabled) {
        recognitionRef.current?.stop();
        setMicEnabled(false);
        addLog('SYS', 'Microphone disabled.', 'system');
        setJarvisState('idle');
     } else {
        try {
          recognitionRef.current?.start();
          setMicEnabled(true);
        } catch (err) {
          addLog('SYS', `Mic start error: ${err.message}`, 'error');
        }
     }
  }, [micEnabled, addLog]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'm') {
        toggleMic();
      }
      if (e.ctrlKey && e.key === 'h') {
        setShowHistory(prev => !prev);
      }
      if (e.ctrlKey && e.key === 'p') {
        setShowProfile(prev => !prev);
      }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.querySelector('input[name="command"]')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMic]);

  useEffect(() => {
    const initSession = async () => {
      try {
        setServerStatus('connecting');
        if (userRef.current) {
          const sessionRef = await addDoc(collection(db, 'users', userRef.current.uid, 'sessions'), {
            userId: userRef.current.uid,
            title: 'Interacting with JARVIS',
            createdAt: serverTimestamp()
          });
          dbSessionIdRef.current = sessionRef.id;
          setDbSessionId(sessionRef.id);
        }
        chatRef.current = createNewChat();
        setServerStatus('connected');
        addLog('SYS', 'Neural Network Core initialized.', 'system');
        addLog('SYS', 'Awaiting voice interface activation.', 'system');
      } catch(e) {
        setServerStatus('error');
        addLog('SYS', `Error initializing AI: ${e.message}`, 'error');
      }
    };
    initSession();
  }, [addLog]);

  const stateRef = useRef(jarvisState);
  const micRef = useRef(micEnabled);
  const interactionRef = useRef(null);

  const handleLogin = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      addLog('SYS', `Auth Error: ${e.message}`);
    }
  }, [addLog]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      setWidget(null);
      addLog('SYS', 'User logged out.');
    } catch (e) {
      addLog('SYS', `Auth Error: ${e.message}`);
    }
  }, [addLog]);
  
  useEffect(() => { stateRef.current = jarvisState; }, [jarvisState]);
  useEffect(() => { micRef.current = micEnabled; }, [micEnabled]);

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setTimeout(() => {
        addLog('SYS', 'Speech Recognition API not supported in this browser.');
      }, 0);
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    
    rec.onstart = () => {
       addLog('SYS', 'Audio input activated. Listening for wake word "Jarvis".');
    };

    rec.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      const currentText = (finalTranscript || interimTranscript).trim().toLowerCase();
      setTranscriptLive(currentText);

      let currentState = stateRef.current;
      
      if (currentState === 'idle') {
        if (currentText.includes('jarvis')) {
          setJarvisState('listening');
          currentState = 'listening';
          addLog('SYS', 'Wake word detected. Awaiting command...');
        }
      }
      
      if (finalTranscript && currentState !== 'speaking' && currentState !== 'processing') {
         const cleanText = finalTranscript.toLowerCase().replace(/hey jarvis|jarvis/g, '').trim();
         if (cleanText.length > 0 && currentState === 'listening') {
            interactionRef.current?.(cleanText);
         }
      }
    };

    rec.onerror = (e) => {
       if(e.error !== 'no-speech' && e.error !== 'aborted') {
           addLog('SYS', `Audio Input Error: ${e.error}`);
       }
    };

    rec.onend = () => {
       if (micRef.current) {
          try {
             rec.start();
          } catch {
             // already started
          }
       }
    };

    recognitionRef.current = rec;

    return () => {
      rec.stop();
    };
  }, [addLog]);


  const executeTool = useCallback(async (name, args) => {
     try {
       addLog('CMD', `${name}(${JSON.stringify(args)})`, 'command');
       let result = { status: 'executed successfully' };

       if (name === 'openApplication') {
          const appMap = {
             'chrome': 'https://google.com',
             'vs code': 'https://vscode.dev',
             'calculator': 'https://www.desmos.com/scientific',
             'youtube': 'https://youtube.com',
             'spotify': 'https://open.spotify.com'
          };
          const searchName = (args.appName || args.name || "").toLowerCase();
          let url = `https://www.google.com/search?q=${encodeURIComponent(searchName)}`;
          for (const [key, link] of Object.entries(appMap)) {
             if (searchName.includes(key)) url = link;
          }
          setWidget({ type: 'app', data: { name: args.appName || args.name, url } });
          addLog('SYS', `Opening ${args.appName || args.name} in secondary interface...`, 'system');
          setTimeout(() => { window.open(url, '_blank'); }, 500);
       }
       else if (name === 'showNews') {
          addLog('SYS', 'Establishing connection to Global News Grid...', 'system');
          setWidget({ type: 'news', data: {} });
       }
       else if (name === 'playMusic') {
          const query = encodeURIComponent(args.query);
          const platform = args.platform?.toLowerCase() || 'youtube';
          if (platform === 'spotify') {
            const url = `https://open.spotify.com/search/${query}`;
            setWidget({ type: 'music', data: { url, title: args.query, platform: 'spotify' } });
            addLog('SYS', `Opening Spotify search for "${args.query}"...`, 'system');
            setTimeout(() => { window.open(url, '_blank'); }, 1000);
          } else {
            const embedUrl = `https://www.youtube.com/embed?listType=search&list=${query}&autoplay=1&enablejsapi=1`;
            setWidget({ type: 'music', data: { url: embedUrl, title: args.query, platform: 'youtube' } });
            addLog('SYS', `Streaming "${args.query}" via YouTube Grid...`, 'system');
          }
       }
       else if (name === 'controlMedia') {
          const action = args.action.toLowerCase();
          const iframe = document.querySelector('iframe[title="Music Player"]');
          if (iframe) {
             addLog('SYS', `Media control: ${action} ${args.volume !== undefined ? `to ${args.volume}%` : ''}`, 'system');
             let func = '';
             let funcArgs = [];
             if (action === 'play') func = 'playVideo';
             else if (action === 'pause') func = 'pauseVideo';
             else if (action === 'next') func = 'nextVideo';
             else if (action === 'previous') func = 'previousVideo';
             else if (action === 'set_volume' && args.volume !== undefined) {
                func = 'setVolume';
                funcArgs = [args.volume];
             }
             
             if (func) {
                iframe.contentWindow?.postMessage(JSON.stringify({
                   event: 'command',
                   func: func,
                   args: funcArgs
                }), '*');
             }
          } else {
             result = { status: 'failed', error: 'No active music widget found' };
             addLog('SYS', 'Media control failed: No active music widget found.', 'error');
          }
       }
       else if (name === 'executeSystemCommand') {
          const cmd = args.command.toLowerCase();
          if (cmd.includes('shutdown') || cmd.includes('restart')) {
             setWidget({ type: 'shutdown', data: {} });
             addLog('SYS', 'INITIATING SYSTEM SHUTDOWN PROTOCOL...', 'system');
             setTimeout(() => { setWidget(null); addLog('SYS', 'System rebooted from simulated shutdown.', 'system'); }, 6000);
          } else if (cmd.includes('volume')) {
             addLog('SYS', `Adjusting master volume configuration: ${cmd}`, 'system');
             const match = cmd.match(/(\d+)/);
             if (match) {
                  let vol = parseInt(match[1], 10);
                  if (vol > 100) vol = 100;
                  if (vol < 0) vol = 0;
                  setTtsVolume(vol / 100);
                  addLog('SYS', `Master volume set to ${vol}%`, 'system');
             }
          } else {
             throw new Error(`Unrecognized system command: ${args.command}`);
          }
       }
       else if (name === 'analyzeCamera') {
          setWidget({ 
            type: 'camera', 
            data: { 
              prompt: args.prompt,
              onCapture: async (base64) => {
                 addLog('SYS', 'Visual data captured. Transmitting to core...', 'system');
                 setWidget(null);
                 setJarvisState('processing');
                 try {
                    const reply = await chatRef.current.sendMessage({ 
                        message: [
                           { functionResponse: { name: 'analyzeCamera', response: { status: 'success' } } },
                           { text: "Here is the visual feed you requested from my local sensors." },
                           { inlineData: { data: base64.split(',')[1], mimeType: "image/jpeg" } }
                        ]
                    });
                    if (reply.text) {
                       addLog('J.A.R.V.I.S', reply.text);
                       speak(reply.text);
                    } else {
                       setJarvisState('idle');
                    }
                 } catch(e) {
                    addLog('SYS', `Visual inference failed: ${e.message}`, 'error');
                    setJarvisState('idle');
                 }
              },
              onClose: () => {
                 addLog('SYS', 'Visual sensor disconnected by user.', 'system');
                 setWidget(null);
              }
            } 
          });
       }
       else {
          throw new Error(`Unrecognized protocol: ${name}`);
       }

       if (name !== 'analyzeCamera') {
         addLog('OUT', JSON.stringify(result), 'output');
       }
       return result;
     } catch (e) {
       addLog('SYS', `Protocol Error: ${e.message}`, 'error');
       e.isProtocolError = true;
       throw e;
     }
  }, [addLog, speak, setTtsVolume]);

  const handleInteraction = useCallback(async (text) => {
    addLog('USR', text);
    setJarvisState('processing');
    setTranscriptLive("");

    try {
      if (!chatRef.current) throw new Error("AI Core not connected to server.");
      const systemContext = `Current System Specs: OS=${navigator.userAgent}, Cores=${systemStats.cores}, RAM=${systemStats.memoryTotal}GB, CPU Load=${systemStats.cpuLoad}%.`;
      
      let retries = 2;
      let lastError;
      
      while (retries >= 0) {
        try {
          const payload = systemContext ? `[SYSTEM CONTEXT: ${systemContext}]\nUSER INSTRUCTION: ${text}` : text;
          const response = await chatRef.current.sendMessage({ message: payload });
          
          const responsePayload = {
            text: response.text || "",
            functionCalls: response.functionCalls ? response.functionCalls.map((call) => ({
              name: call.name,
              args: call.args
            })) : []
          };
          
          const functionResponses = [];
          if (responsePayload.functionCalls && responsePayload.functionCalls.length > 0) {
             for (const call of responsePayload.functionCalls) {
                const res = await executeTool(call.name, call.args);
                if (call.name !== 'analyzeCamera') {
                   functionResponses.push({
                      functionResponse: { name: call.name, response: res }
                   });
                }
             }
          }
          
          const reply = responsePayload.text;
          if (reply) {
             addLog('J.A.R.V.I.S', reply);
             speak(reply);
          } else {
             setJarvisState('idle');
          }

          if (functionResponses.length > 0) {
             chatRef.current.sendMessage({ message: functionResponses }).then((res) => {
                if (res.text && !reply) {
                   addLog('J.A.R.V.I.S', res.text);
                   speak(res.text);
                }
             }).catch(console.error);
          }
          
          return;
          
        } catch (err) {
          lastError = err;
          const errorMsg = err.message || "";
          
          if (errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("GEMINI_API_KEY")) {
             err.isAuthError = true;
             err.message = "Invalid Gemini API Key. Please configure a valid API Key in the Settings menu -> Secrets.";
          }
          
          if (err.isAuthError || err.isProtocolError) {
             break;
          }
          retries--;
          if (retries >= 0) {
             console.warn(`Request failed, retrying... (${retries} retries left)`, err);
             addLog('SYS', `Connection unstable. Retrying...`);
             await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
      
      throw lastError;

    } catch(e) {
      console.error("AI Interaction Error:", e);
      if (e.isProtocolError) {
        addLog('SYS', `Protocol Execution Failed: ${e.message}`);
        setJarvisState('error');
        speak(`I'm sorry, I could not execute that system command. ${e.message}`);
      } else if (e.isAuthError) {
        addLog('SYS', `Authentication Error: ${e.message}`);
        setJarvisState('error');
        speak("I am detecting an invalid API Key. Please update your API Key in the settings menu.");
      } else {
        addLog('SYS', `AI Connection Error: ${e.message}`);
        addLog('SYS', 'Please resolve connection issues or check API keys.');
        setJarvisState('error');
        speak("I seem to be experiencing connection issues with my main AI core. Please check my configuration.");
      }
      setTimeout(() => setJarvisState('idle'), 5000);
    }
  }, [systemStats, speak, addLog, executeTool]);

  useEffect(() => {
    interactionRef.current = handleInteraction;
  }, [handleInteraction]);

  return (
    <div className="relative w-screen h-screen p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none bg-[#05070a] text-slate-200" onMouseMove={handleMouseMove}>
      <Scene3D state={jarvisState} mousePosition={mouseX.get() ? {x: mouseX.get(), y: mouseY.get()} : {x:0, y:0}} volume={volume} />
      <div className="hud-scanline"></div>

      {/* Reboot Animation Overlay */}
      {widget?.type === 'shutdown' && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]">
          <div className="text-red-500 font-mono text-xl md:text-4xl tracking-widest text-center px-4">
            SYSTEM OFFLINE
            <div className="text-sm md:text-xl mt-4 opacity-50 text-red-500/50 uppercase">Rebooting...</div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-start z-10 w-full">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-accent-400 font-bold mb-1">System Status</span>
          <h1 className="text-xl md:text-2xl font-light tracking-tight">J.A.R.V.I.S. <span className="text-accent-500 font-semibold">MAIN_CORE</span></h1>
          <div className="flex gap-4 mt-2 text-[8px] md:text-[10px] text-slate-500 font-mono uppercase">
            <div className="flex items-center gap-1">
               <div className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'connected' ? 'bg-accent-500' : serverStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div> 
               {serverStatus === 'connected' ? 'Connected' : serverStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </div>
            <div className="flex items-center gap-1">
               <div className={`w-1.5 h-1.5 rounded-full ${micEnabled ? 'bg-accent-500 animate-pulse' : 'bg-red-500'}`}></div> {micEnabled ? 'Voice Active' : 'Voice Offline'}
            </div>
          </div>
        </div>
        <div className="text-right flex items-center gap-2 md:gap-4">
          <div className="hidden md:block">
            <VoiceSettings 
              voices={voices}
              selectedVoiceURI={selectedVoiceURI} setSelectedVoiceURI={setSelectedVoiceURI}
              pitch={pitch} setPitch={setPitch}
              rate={rate} setRate={setRate}
              volume={ttsVolume} setVolume={setTtsVolume}
            />
          </div>
          <button 
             onClick={() => setShowHistory(true)}
             className="flex items-center justify-center p-2 rounded bg-slate-900/50 hover:bg-accent-500/10 border border-slate-800 hover:border-accent-500/50 transition-all text-slate-400 hover:text-accent-400"
             title="Access Archive"
          >
             <History className="w-5 h-5" />
          </button>
          
          {user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowProfile(true)}
                className="flex items-center justify-center p-2 rounded bg-slate-900/50 hover:bg-accent-500/10 border border-slate-800 hover:border-accent-500/50 transition-all text-slate-400 hover:text-accent-400"
                title="User Profile"
              >
                <User className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded border border-slate-800">
                 <div className="text-right cursor-pointer group hidden md:block" onClick={handleLogout} title="Click to Logout">
                    <div className="text-[10px] text-accent-400 font-mono tracking-widest truncate max-w-[100px]">{user.email}</div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-widest group-hover:text-red-400 transition-colors">Disconnect</div>
                 </div>
                 <div onClick={handleLogout} className="w-8 h-8 rounded-xl bg-accent-500/20 border border-accent-500/50 flex items-center justify-center cursor-pointer hover:bg-red-500/20 transition-colors">
                   <LogOut className="w-4 h-4 text-accent-400" />
                 </div>
              </div>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-slate-900/50 hover:bg-accent-500/10 p-2 px-3 md:px-4 rounded border border-slate-800 hover:border-accent-500/50 transition-all font-mono text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 hover:text-accent-400">
               <LogIn className="w-4 h-4" /> Connect
            </button>
          )}
          <div className="flex flex-col items-end hidden lg:flex">
            <div className="text-2xl font-extralight tracking-tighter">{new Date().toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 opacity-50">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center relative w-full mt-4 mb-4">
        
        {/* Left Side Stats */}
        <motion.div 
          style={{ x: parallaxX, y: parallaxY, rotateX, rotateY }}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-40 space-y-6 hidden xl:block z-10"
        >
          <div className="p-3 border-l-2 border-accent-500 bg-accent-500/5 group hover:bg-accent-500/10 transition-colors">
            <div className="text-[8px] uppercase text-accent-500 font-bold mb-2 tracking-widest">CPU Load</div>
            <div className="w-full h-1 bg-slate-800 mb-1">
               <div className="bg-accent-500 h-full transition-all duration-1000 animate-pulse" style={{ width: `${systemStats.cpuLoad}%` }}></div>
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-400"><span>CORE_01</span><span>{systemStats.cpuLoad}%</span></div>
          </div>
          <div className="p-3 border-l-2 border-slate-700 hover:border-slate-500 bg-glass transition-colors">
            <div className="text-[8px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Memory ({systemStats.memoryTotal}GB)</div>
            <div className="w-full h-1 bg-slate-800 mb-1">
               <div className="bg-slate-400 h-full transition-all duration-1000" style={{ width: `${(parseFloat(systemStats.memoryUsed) / parseFloat(systemStats.memoryTotal)) * 100}%` }}></div>
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-400"><span>RAM_USED</span><span>{systemStats.memoryUsed} GB</span></div>
          </div>
          <div className="p-3 border-l-2 border-slate-700 hover:border-slate-500 bg-glass transition-colors">
            <div className="text-[8px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Network</div>
            <div className="text-[8px] font-mono text-slate-400">DL: {systemStats.networkDown} MB/S</div>
            <div className="text-[8px] font-mono text-slate-400">UL: {systemStats.networkUp} MB/S</div>
          </div>
        </motion.div>

        {/* Center Canvas */}
        <motion.div 
           style={{ x: parallaxRevX, y: parallaxRevY, rotateX: rotateRevX, rotateY: rotateRevY }}
           className="flex flex-col items-center justify-center relative z-20"
        >
          <Orb state={jarvisState} volume={volume} />

          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 text-center w-64 md:w-[400px] min-h-[6rem]">
            <div className="text-accent-400 text-[10px] tracking-widest uppercase mb-1 font-bold z-10 relative">{jarvisState === 'idle' && !micEnabled ? 'System Idle' : jarvisState}</div>
            
            <div className="relative h-16 md:h-20 -mt-2">
               <VoiceWave volume={volume} active={jarvisState === 'listening' || jarvisState === 'speaking'} state={jarvisState} />
            </div>

            {(jarvisState === 'listening' || jarvisState === 'processing') && (
               <div className={`absolute left-0 right-0 -bottom-4 font-mono uppercase tracking-[0.2em] max-w-sm mx-auto text-[10px] md:text-sm truncate px-4 ${jarvisState === 'processing' ? 'text-purple-400 animate-pulse transition-colors' : 'text-slate-400 transition-colors'}`}>
                   {transcriptLive || (jarvisState === 'processing' ? 'Processing Data...' : '')}
               </div>
            )}
          </div>
        </motion.div>

        {/* Right Terminal overlay */}
        <motion.div 
           style={{ x: parallaxRevX, y: parallaxY, rotateX, rotateY: rotateRevY }}
           className="absolute right-0 top-1/2 -translate-y-1/2 w-64 md:w-80 lg:w-96 xl:w-[400px] h-[85%] lg:flex flex-col hidden z-10 space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold opacity-60">Neural Logs / Interaction Buffer</div>
            <div className="text-[8px] font-mono text-accent-500/50">SECURE_LINK: STABLE</div>
          </div>
          <Terminal logs={logs} />
        </motion.div>

        {/* Widgets section */}
        <motion.div 
          className="absolute top-0 right-0 lg:right-96 flex flex-col gap-4 z-50 pointer-events-auto"
        >
             {widget?.type === 'app' && (
                <div className="w-64 border border-slate-700 bg-glass rounded-lg p-4 animate-in fade-in zoom-in duration-300">
                  <div className="text-accent-400 font-mono text-[10px] mb-2 uppercase tracking-widest">Application Bridge</div>
                  <div className="text-center text-slate-200 py-2 font-light text-xl truncate">{widget.data.name}</div>
                  <a href={widget.data.url} target="_blank" rel="noreferrer" className="block w-full text-center py-2 bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/30 transition-all text-accent-400 rounded text-[10px] tracking-widest uppercase">
                    Launch Externally
                  </a>
                </div>
             )}
             
             {widget?.type === 'music' && (
                <MusicWidget 
                   url={widget.data.url} 
                   title={widget.data.title}
                   platform={widget.data.platform}
                   onClose={() => {
                      addLog('SYS', 'Audio Interface disconnected.');
                      setWidget(null);
                   }}
                   onControl={(action) => executeTool('controlMedia', { action })}
                />
             )}
             
             {widget?.type === 'camera' && (
                <CameraWidget 
                   prompt={widget.data.prompt}
                   onCapture={widget.data.onCapture}
                   onClose={widget.data.onClose}
                />
             )}

             {widget?.type === 'news' && (
                <NewsWidget onClose={() => {
                   addLog('SYS', 'News Grid interface disconnected.');
                   setWidget(null);
                 }} />
             )}
        </motion.div>
      </main>

      <footer className="flex justify-between items-end z-10 w-full mb-2 gap-4">
        <div className="flex gap-4 items-end flex-grow md:flex-grow-0">
          <div className="flex flex-col gap-2">
            <ThemeSelector />
            <button 
              onClick={toggleMic}
              title={micEnabled ? "Disable Microphone" : "Enable Microphone"}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-xl border flex items-center justify-center transition-all ${
                micEnabled
                  ? 'bg-accent-500/10 border-accent-500/40 text-accent-400 glow-accent'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-accent-400 hover:border-accent-500/50'
              }`}
            >
              {micEnabled ? <Mic className="w-5 h-5 md:w-6 md:h-6" /> : <MicOff className="w-5 h-5 md:w-6 md:h-6" />}
            </button>
          </div>
          
          <form 
            className="flex items-center gap-2 group w-full md:max-w-xs xl:max-w-md hidden md:flex" 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const text = formData.get('command');
              if (text && text.trim()) {
                 handleInteraction(text);
                 e.target.reset();
              }
            }}
          >
             <div className="text-accent-400 font-mono font-bold animate-pulse">&gt;</div>
             <input 
               type="text" 
               name="command" 
               autoComplete="off"
               placeholder="Enter system protocol..." 
               className="bg-transparent border-b border-accent-500/30 text-accent-300 font-mono text-[10px] w-full py-2 outline-none focus:border-accent-400 focus:bg-accent-500/5 transition-all placeholder:text-accent-900/30" 
             />
          </form>
        </div>
        <div className="flex flex-col items-end hidden sm:flex">
          <div className="flex gap-2 mb-2">
            <div className={`px-2 py-1 rounded text-[8px] border tracking-widest ${jarvisState !== 'idle' ? 'bg-accent-500/10 border-accent-500/20 text-accent-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>WAKE_WORD: {jarvisState !== 'idle' ? 'DETECTED' : 'ARMED'}</div>
            <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[8px] text-slate-500 tracking-widest hidden md:block">LOC: 34.0522° N</div>
          </div>
          <div className="text-[8px] text-slate-700 font-mono uppercase tracking-tighter opacity-50">Neural Link established. Awaiting user interaction...</div>
        </div>
      </footer>

      <AnimatePresence>
         {showHistory && <HistoryPanel user={user} onClose={() => setShowHistory(false)} onLoadSession={loadSession} />}
         {showProfile && <UserProfilePanel user={user} onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
    </div>
  );
}
