import { useEffect, useRef } from 'react';
import { useMotionValue, useAnimationFrame } from 'motion/react';

export function useAudioVolume(state, micEnabled) {
  const volume = useMotionValue(0);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const speakingStateRef = useRef({ timeUntilNext: 0, isActive: false });

  useEffect(() => {
    let stream = null;
    const initMic = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      } catch (err) {
        console.error("Mic access denied or error:", err);
      }
    };

    if (micEnabled) {
      initMic();
    }

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [micEnabled]);

  useAnimationFrame((time, delta) => {
    if (state === 'listening' && analyserRef.current && dataArrayRef.current) {
      // Real-time audio data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const avg = sum / dataArrayRef.current.length;
      const current = volume.get();
      const target = avg / 255;
      volume.set(current + (target - current) * 0.4);
      
    } else if (state === 'speaking') {
      // Highly realistic syllable simulation
      const st = speakingStateRef.current;
      st.timeUntilNext -= delta;
      
      if (st.timeUntilNext <= 0) {
         st.isActive = Math.random() > 0.2; // 80% chance of a syllable burst
         st.timeUntilNext = st.isActive ? 50 + Math.random() * 200 : 50 + Math.random() * 100;
      }
      
      let target = 0;
      if (st.isActive) {
         target = 0.4 + Math.random() * 0.6; 
      } else {
         target = 0.1 + Math.random() * 0.1;
      }

      const current = volume.get();
      // Fast attack, smooth decay
      const smoothing = target > current ? 0.6 : 0.2;
      volume.set(current + (target - current) * smoothing);

    } else if (state === 'processing') {
      // Gentle pulse
      const target = (Math.sin(time * 0.005) * 0.5 + 0.5) * 0.3;
      volume.set(volume.get() + (target - volume.get()) * 0.1);
    } else {
      // Idle
      const current = volume.get();
      volume.set(current + (0 - current) * 0.1); 
    }
  });

  return volume;
}
