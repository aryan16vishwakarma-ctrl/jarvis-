import { useRef } from 'react';
import { useAnimationFrame } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

export function VoiceWave({ volume, active, state }) {
  const canvasRef = useRef(null);
  const { colors } = useTheme();

  useAnimationFrame((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    let colorA = colors.colorA;
    let colorB = colors.colorB;
    let colorC = colors.colorC;
    let shadow = colors.shadow;

    if (state === 'processing') {
       colorA = '#c084fc';
       colorB = '#a855f7';
       colorC = '#d8b4fe';
       shadow = '#9333ea';
    } else if (state === 'speaking') {
       colorA = colors.colorA;
       colorB = colors.shadow;
       colorC = colors.colorC;
       shadow = colors.shadow;
    }

    const vol = volume ? volume.get() : 0;
    // active state boosts the base amplitude slightly
    const baseAmp = active ? 10 : 2; 
    const amplitude = Math.max(2, vol * 70 + baseAmp * (vol + 0.5));

    const drawWave = (offset, ampScale, color, speed, thickness) => {
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      for (let i = 0; i <= width; i++) {
        const taper = Math.sin((i / width) * Math.PI); // 0 at edges, 1 at center
        
        // complex interference pattern for realistic voice wave
        const noise = Math.sin(i * 0.05 + time * speed + offset) * 
                      Math.cos(i * 0.02 - time * speed * 0.8) +
                      Math.sin(i * 0.01 + time * speed * 1.2);
                      
        const y = height / 2 + (noise * amplitude * ampScale * taper);
        ctx.lineTo(i, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.stroke();
    };

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = shadow;
    drawWave(0, 1, colorA, 0.008, 2 + vol * 3); 
    
    ctx.shadowBlur = 8;
    drawWave(2, 0.6, colorB, 0.01, 1.5 + vol * 2); 

    ctx.shadowBlur = 4;
    drawWave(4, 0.3, colorC, 0.012, 1 + vol); 
  });

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="mx-auto block transition-opacity duration-500"
      style={{ opacity: state === 'idle' && (!volume || volume.get() < 0.05) ? 0.4 : 1 }}
    />
  );
}
