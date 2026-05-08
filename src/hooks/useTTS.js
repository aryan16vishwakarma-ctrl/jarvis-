import { useState, useEffect, useCallback, useRef } from 'react';

export function useTTS(onStateChange) {
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(null);
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const updateVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoiceURI) {
        // Try to find a good English voice, prefer male/jarvis-like if possible
        const defaultVoice = availableVoices.find(v => v.name.includes("Google UK English Male") || v.name.includes("Daniel") || v.name.includes("UK English")) || availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
        if (defaultVoice) {
          setSelectedVoiceURI(defaultVoice.voiceURI);
        }
      }
    };

    updateVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices;
    }
  }, [selectedVoiceURI]);

  const speak = useCallback((text, onEnd) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      if (onEnd) onEnd();
      return;
    }

    if (synth.speaking || synth.pending) {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoiceURI) {
      const voice = synth.getVoices().find(v => v.voiceURI === selectedVoiceURI);
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    utterance.pitch = pitch;
    utterance.rate = rate;
    utterance.volume = volume;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (onStateChange) onStateChange('speaking');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onStateChange) onStateChange('idle');
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error', e);
      setIsSpeaking(false);
      if (onStateChange) onStateChange('idle');
      if (onEnd) onEnd();
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }, [pitch, rate, volume, selectedVoiceURI, onStateChange]);

  const stop = useCallback(() => {
    const synth = window.speechSynthesis;
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel();
      setIsSpeaking(false);
      if (onStateChange) onStateChange('idle');
    }
  }, [onStateChange]);

  return { speak, stop, isSpeaking, voices, selectedVoiceURI, setSelectedVoiceURI, pitch, setPitch, rate, setRate, volume, setVolume };
}
