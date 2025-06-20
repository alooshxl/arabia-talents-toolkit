import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useAppContext } from '@/contexts/AppContext';
import { DACIA_IMG, UAZ_IMG } from '@/assets/vehicleImages';

export default function HomepageVehicleDrift({ targetId = 'home-tools-grid' }) {
  const { currentTheme } = useAppContext();
  const daciaRef = useRef(null);
  const uazRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const grid = document.getElementById(targetId);
    if (!grid) return;

    const createSmoke = (x, y) => {
      const smoke = document.createElement('div');
      smoke.className = 'drift-smoke';
      smoke.style.left = `${x}px`;
      smoke.style.top = `${y}px`;
      wrapperRef.current.appendChild(smoke);
      gsap.fromTo(
        smoke,
        { opacity: 0.8, scale: 0.5 },
        {
          opacity: 0,
          scale: 2,
          duration: 0.6,
          ease: 'power1.out',
          onComplete: () => smoke.remove()
        }
      );
    };

    const animate = () => {
      const rect = grid.getBoundingClientRect();
      const points = [
        { x: 0, y: 0 },
        { x: rect.width - 40, y: 0 },
        { x: rect.width - 40, y: rect.height - 40 },
        { x: 0, y: rect.height - 40 }
      ];

      const tlDacia = gsap.timeline({ repeat: -1 });
      const tlUaz = gsap.timeline({ repeat: -1 });

      points.forEach((p, i) => {
        const next = points[(i + 1) % points.length];
        tlDacia.to(daciaRef.current, {
          x: p.x,
          y: p.y,
          duration: 0,
          overwrite: true
        });
        tlDacia.to(daciaRef.current, {
          x: next.x,
          y: next.y,
          rotation: 35,
          duration: 2,
          ease: 'linear',
          onStart: () => createSmoke(p.x, p.y)
        });

        const revIndex = points.length - i - 1;
        const revP = points[revIndex];
        const revNext = points[(revIndex - 1 + points.length) % points.length];
        tlUaz.to(uazRef.current, { x: revP.x, y: revP.y, duration: 0, overwrite: true });
        tlUaz.to(uazRef.current, {
          x: revNext.x,
          y: revNext.y,
          rotation: -35,
          duration: 2,
          ease: 'linear',
          onStart: () => createSmoke(revP.x, revP.y)
        });
      });
    };

    animate();
    window.addEventListener('resize', animate);
    return () => window.removeEventListener('resize', animate);
  }, [targetId]);

  const filter = currentTheme === 'dark' ? 'brightness(1.2)' : 'drop-shadow(0 0 3px rgba(0,0,0,0.5))';

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0">
      <img ref={daciaRef} src={DACIA_IMG} alt="Dacia" className="absolute w-16" style={{ filter }} />
      <img ref={uazRef} src={UAZ_IMG} alt="UAZ" className="absolute w-16" style={{ filter }} />
    </div>
  );
}

