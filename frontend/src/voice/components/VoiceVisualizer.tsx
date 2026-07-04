import React, { useEffect, useRef } from 'react';
import { useVoice } from '../hooks/useVoice';

export const VoiceVisualizer: React.FC = () => {
  const { status } = useVoice();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
      } else {
        canvas.width = 400;
      }
      canvas.height = 80;
    };
    
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      phase += 0.035;

      // Subtle center grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Configure waves depending on state
      const lines = 3;
      let amplitude = 2; // Flat ripple
      let speedFactor = 1.0;
      let colors = [
        'rgba(148, 163, 184, 0.25)', 
        'rgba(148, 163, 184, 0.15)', 
        'rgba(148, 163, 184, 0.05)'
      ];

      if (status === 'listening') {
        amplitude = 24;
        speedFactor = 2.5;
        colors = [
          'rgba(6, 182, 212, 0.75)', // Cyan
          'rgba(34, 197, 94, 0.45)', // Green
          'rgba(6, 182, 212, 0.15)'
        ];
      } else if (status === 'speaking') {
        amplitude = 18;
        speedFactor = 2.0;
        colors = [
          'rgba(236, 72, 153, 0.75)', // Magenta
          'rgba(168, 85, 247, 0.45)', // Purple
          'rgba(236, 72, 153, 0.15)'
        ];
      } else if (status === 'thinking') {
        amplitude = 10;
        speedFactor = 4.0; // High speed scan ripples
        colors = [
          'rgba(168, 85, 247, 0.75)', // Purple
          'rgba(6, 182, 212, 0.45)',  // Cyan
          'rgba(168, 85, 247, 0.15)'
        ];
      } else if (status === 'executing') {
        amplitude = 8;
        speedFactor = 1.5;
        colors = [
          'rgba(234, 179, 8, 0.75)',  // Yellow
          'rgba(236, 72, 153, 0.45)', // Magenta
          'rgba(234, 179, 8, 0.15)'
        ];
      }

      // Draw multi-layered sine waves
      for (let l = 0; l < lines; l++) {
        ctx.beginPath();
        ctx.lineWidth = l === 0 ? 2 : 1;
        ctx.strokeStyle = colors[l];

        for (let x = 0; x < width; x++) {
          // Taper wave scale to zero at left/right boundaries
          const edgeScale = Math.sin((x / width) * Math.PI);
          
          // Phase frequency equations
          const frequency = (x / width) * Math.PI * 3 + (phase * (l * 0.4 + 1)) * speedFactor;
          const y = midY + Math.sin(frequency) * amplitude * edgeScale * (1 - l * 0.3);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [status]);

  return (
    <div className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-2 left-3 flex items-center space-x-1.5 select-none">
        <span className={`w-2 h-2 rounded-full ${
          status === 'listening' ? 'bg-cyber-cyan animate-pulse' :
          status === 'thinking' ? 'bg-cyber-purple animate-pulse' :
          status === 'speaking' ? 'bg-cyber-magenta animate-pulse' :
          status === 'executing' ? 'bg-cyber-yellow animate-pulse' : 'bg-slate-600'
        }`} />
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
          Audio Waveform Engine
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full block mt-3" />
    </div>
  );
};
