import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const LANE_POSITIONS = [-2, 0, 2];

const DIFFICULTIES = {
  easy: { speed: 0.1, spawnInterval: 2000 },
  medium: { speed: 0.15, spawnInterval: 1500 },
  hard: { speed: 0.2, spawnInterval: 1000 }
};

function createBox(color) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

export default function WinnerRunnerGame() {
  const mountRef = useRef(null);
  const playerRef = useRef();
  const obstaclesRef = useRef([]);
  const helmetsRef = useRef([]);
  const animationRef = useRef();

  const [difficulty, setDifficulty] = useState(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('wr_high')) || 0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 100);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const bgGeo = new THREE.PlaneGeometry(20, 10);
    const bgMat = new THREE.MeshBasicMaterial({ color: '#2e3b4e' });
    const background = new THREE.Mesh(bgGeo, bgMat);
    background.position.z = -5;
    scene.add(background);

    const player = createBox(0xffffff);
    player.position.y = -1.5;
    scene.add(player);
    playerRef.current = player;

    let lastSpawn = performance.now();

    function spawnObstacle() {
      const colors = [0xff3333, 0x33ff33, 0x3333ff];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const mesh = createBox(color);
      mesh.position.set(LANE_POSITIONS[Math.floor(Math.random() * 3)], 0, -10);
      scene.add(mesh);
      obstaclesRef.current.push(mesh);
    }

    function spawnHelmet() {
      const mesh = createBox(0xffff00);
      mesh.position.set(LANE_POSITIONS[Math.floor(Math.random() * 3)], 0.5, -10);
      scene.add(mesh);
      helmetsRef.current.push(mesh);
    }

    function animate() {
      animationRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      if (difficulty && now - lastSpawn > difficulty.spawnInterval) {
        if (Math.random() < 0.6) spawnObstacle(); else spawnHelmet();
        lastSpawn = now;
      }

      obstaclesRef.current.forEach((o, i) => {
        o.position.z += difficulty.speed * 5;
        if (o.position.z > camera.position.z) {
          scene.remove(o);
          obstaclesRef.current.splice(i, 1);
        }
        if (player.position.distanceTo(o.position) < 0.8) {
          setGameOver(true);
        }
      });

      helmetsRef.current.forEach((h, i) => {
        h.position.z += difficulty.speed * 5;
        if (h.position.z > camera.position.z) {
          scene.remove(h);
          helmetsRef.current.splice(i, 1);
        }
        if (player.position.distanceTo(h.position) < 0.8) {
          scene.remove(h);
          helmetsRef.current.splice(i, 1);
          setScore(s => s + 1);
        }
      });

      renderer.render(scene, camera);
    }

    animate();
    return () => {
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
    };
  }, [difficulty]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!playerRef.current || gameOver) return;
      const idx = LANE_POSITIONS.indexOf(playerRef.current.position.x);
      if (e.key === 'ArrowLeft' && idx > 0) {
        playerRef.current.position.x = LANE_POSITIONS[idx - 1];
      }
      if (e.key === 'ArrowRight' && idx < 2) {
        playerRef.current.position.x = LANE_POSITIONS[idx + 1];
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) {
      setHighScore(h => {
        const newHigh = Math.max(h, score);
        localStorage.setItem('wr_high', newHigh);
        return newHigh;
      });
    }
  }, [gameOver, score]);


  const startGame = (level) => {
    obstaclesRef.current.forEach(o => o.parent.remove(o));
    helmetsRef.current.forEach(h => h.parent.remove(h));
    obstaclesRef.current = [];
    helmetsRef.current = [];
    setScore(0);
    setGameOver(false);
    setDifficulty(DIFFICULTIES[level]);
  };

  return (
    <div className="w-full flex flex-col items-center" ref={mountRef} style={{ height: '400px', position: 'relative' }}>
      {!difficulty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10">
          <h2 className="mb-4 text-xl font-bold">Select Difficulty</h2>
          {Object.keys(DIFFICULTIES).map(k => (
            <button key={k} onClick={() => startGame(k)} className="m-2 px-4 py-2 bg-primary text-white rounded">
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      )}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10">
          <h2 className="mb-2 text-xl font-bold">Game Over</h2>
          <p className="mb-2">Score: {score}</p>
          <button onClick={() => startGame(Object.keys(DIFFICULTIES)[0])} className="px-4 py-2 bg-primary text-white rounded">
            Restart
          </button>
        </div>
      )}
      <div className="absolute top-2 left-2 z-10 text-sm">Score: {score} (Best {highScore})</div>
      
    </div>
  );
}
