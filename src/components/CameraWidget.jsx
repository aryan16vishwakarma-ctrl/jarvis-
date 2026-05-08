import { useRef, useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

export function CameraWidget({ prompt, onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activeStream = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then(s => {
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(err => {
        setError(err.message);
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const cw = videoRef.current.videoWidth;
    const ch = videoRef.current.videoHeight;
    canvasRef.current.width = cw;
    canvasRef.current.height = ch;
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, cw, ch);
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    onCapture(base64);
  };

  return (
    <div className="w-80 border border-accent-500 bg-glass rounded-lg overflow-hidden relative shadow-[0_0_20px_rgba(34,197,94,0.2)]">
      <div className="flex justify-between items-center p-2 bg-slate-900/50 border-b border-accent-500/50">
         <div className="text-accent-400 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Camera className="w-3 h-3"/> VISUAL SENSOR ACTIVE
         </div>
         <button onClick={onClose} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="relative bg-black min-h-[160px] flex items-center justify-center">
         {error ? (
           <div className="text-xs text-red-500 font-mono p-4 text-center">Sensor offline: {error}</div>
         ) : (
           <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />
         )}
         <canvas ref={canvasRef} className="hidden" />
         
         <div className="absolute inset-0 pointer-events-none border-[2px] border-accent-500/30 m-4 rounded">
           <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-accent-400"></div>
           <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent-400"></div>
           <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-accent-400"></div>
           <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-accent-400"></div>
         </div>
      </div>
      <div className="p-3 bg-slate-900/60 flex flex-col items-center gap-2">
         {prompt && <div className="text-[10px] text-accent-300 font-mono text-center uppercase">SYS MSG: {prompt}</div>}
         <button 
           disabled={!!error || !stream}
           onClick={takePhoto}
           className="px-4 py-1.5 bg-accent-500 hover:bg-accent-400 text-black font-bold text-xs uppercase tracking-widest rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
         >
           CAPTURE FRAME
         </button>
      </div>
    </div>
  );
}
