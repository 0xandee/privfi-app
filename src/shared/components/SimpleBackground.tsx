import React, { useEffect, useRef } from 'react';

const SimpleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
    }> = [];

    const createParticle = (x?: number, y?: number) => {
      return {
        x: x ?? Math.random() * canvas.width,
        y: y ?? Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 0,
        maxLife: 100 + Math.random() * 100,
        size: 2 + Math.random() * 3
      };
    };

    // Initialize particles
    for (let i = 0; i < 50; i++) {
      particles.push(createParticle());
    }

    let ripples: Array<{
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      life: number;
      maxLife: number;
    }> = [];

    const addRipple = (x: number, y: number) => {
      ripples.push({
        x,
        y,
        radius: 0,
        maxRadius: 150 + Math.random() * 100,
        life: 0,
        maxLife: 60
      });
    };

    // Mouse interaction
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addRipple(x, y);
      
      // Add particles at click location
      for (let i = 0; i < 5; i++) {
        particles.push(createParticle(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50));
      }
    };

    canvas.addEventListener('click', handleClick);

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = 1 - (p.life / p.maxLife);
        const hue = 270 + (Math.sin(p.life * 0.05) * 30);
        
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = `hsl(${hue}, 70%, 70%)`;
        ctx.shadowColor = `hsl(${hue}, 70%, 70%)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Update and draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.life++;
        r.radius = (r.life / r.maxLife) * r.maxRadius;

        if (r.life > r.maxLife) {
          ripples.splice(i, 1);
          continue;
        }

        const alpha = 1 - (r.life / r.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = '#B19EEF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#B19EEF';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Continuously add new particles
      if (Math.random() < 0.1) {
        particles.push(createParticle());
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-purple-900/10" />
      
      {/* Canvas for particles and ripples */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'transparent' }}
      />
    </div>
  );
};

export default SimpleBackground;