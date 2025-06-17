import React, { useState, useEffect, useCallback, useRef } from 'react';

const SOCIAL_MEDIA_ICONS = ['YouTube', 'TikTok', 'Insta', 'Facebook']; // Shorter names for display

const PLAYER_JUMP_VELOCITY = 11; // Adjusted
const GRAVITY = 0.6; // Adjusted
const OBSTACLE_SPEED = 3.5; // Adjusted
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 40;
const OBSTACLE_SPAWN_INTERVAL_MIN = 80; // Min frames between spawns
const OBSTACLE_SPAWN_INTERVAL_MAX = 150; // Max frames between spawns

export default function Game() {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 250 });
  const [playerVelY, setPlayerVelY] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [framesSinceLastObstacle, setFramesSinceLastObstacle] = useState(0);
  const [nextObstacleInterval, setNextObstacleInterval] = useState(OBSTACLE_SPAWN_INTERVAL_MIN);

  const gameAreaRef = useRef(null);
  const gameLoopRef = useRef(null); // For requestAnimationFrame

  const gameWidth = 600; // Fixed width
  const gameHeight = 300; // Fixed height

  const resetGameState = useCallback(() => {
    setPlayerPos({ x: 50, y: gameHeight - PLAYER_HEIGHT });
    setPlayerVelY(0);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setFramesSinceLastObstacle(0);
    setNextObstacleInterval(
      Math.floor(Math.random() * (OBSTACLE_SPAWN_INTERVAL_MAX - OBSTACLE_SPAWN_INTERVAL_MIN + 1)) + OBSTACLE_SPAWN_INTERVAL_MIN
    );
  }, [gameHeight]);

  const startGame = useCallback(() => {
    resetGameState();
    setIsRunning(true);
    if (gameAreaRef.current) {
      gameAreaRef.current.focus();
    }
  }, [resetGameState]);

  const jump = useCallback(() => {
    if (!gameOver && playerPos.y >= gameHeight - PLAYER_HEIGHT - 5 && isRunning) {
      setPlayerVelY(-PLAYER_JUMP_VELOCITY);
    }
  }, [gameOver, playerPos.y, gameHeight, isRunning]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        if (gameOver) {
          startGame();
        } else if (!isRunning) {
          startGame();
        } else {
          jump();
        }
      }
    };

    const currentRef = gameAreaRef.current;
    const targetElement = currentRef || window;
    targetElement.addEventListener('keydown', handleKeyPress);
    return () => {
      targetElement.removeEventListener('keydown', handleKeyPress);
    };
  }, [jump, gameOver, isRunning, startGame]);

  // Game Loop
  useEffect(() => {
    if (isRunning && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(() => {
        // 1. Player Physics
        let newPlayerVelY = playerVelY + GRAVITY;
        let newPlayerY = playerPos.y + newPlayerVelY;

        if (newPlayerY >= gameHeight - PLAYER_HEIGHT) {
          newPlayerY = gameHeight - PLAYER_HEIGHT;
          newPlayerVelY = 0;
        }
        setPlayerVelY(newPlayerVelY);
        setPlayerPos(prev => ({ ...prev, y: newPlayerY }));

        // 2. Obstacle Management
        setFramesSinceLastObstacle(prev => prev + 1);
        let newObstacles = obstacles.map(obs => ({ ...obs, x: obs.x - OBSTACLE_SPEED }));

        // Score and remove off-screen obstacles
        let currentScore = score;
        newObstacles = newObstacles.filter(obs => {
          if (!obs.scored && obs.x + OBSTACLE_WIDTH < playerPos.x) {
            currentScore++;
            obs.scored = true;
          }
          return obs.x > -OBSTACLE_WIDTH; // Keep if on screen
        });
        setScore(currentScore);

        // Generate new obstacles
        if (framesSinceLastObstacle >= nextObstacleInterval) {
          setFramesSinceLastObstacle(0);
          setNextObstacleInterval(
            Math.floor(Math.random() * (OBSTACLE_SPAWN_INTERVAL_MAX - OBSTACLE_SPAWN_INTERVAL_MIN + 1)) + OBSTACLE_SPAWN_INTERVAL_MIN
          );
          const newObstacle = {
            id: Date.now(),
            x: gameWidth,
            y: gameHeight - PLAYER_HEIGHT - Math.random() * 20, // Slight y variation for ground obstacles
            type: SOCIAL_MEDIA_ICONS[Math.floor(Math.random() * SOCIAL_MEDIA_ICONS.length)],
            scored: false,
          };
          // Ensure obstacle y is such that player can jump over it
          // For this simple ground obstacle, y will be gameHeight - OBSTACLE_HEIGHT
          newObstacle.y = gameHeight - OBSTACLE_HEIGHT;
          newObstacles.push(newObstacle);
        }
        setObstacles(newObstacles);

        // 3. Collision Detection
        for (let obs of newObstacles) {
          if (
            playerPos.x < obs.x + OBSTACLE_WIDTH &&
            playerPos.x + PLAYER_WIDTH > obs.x &&
            playerPos.y < obs.y + OBSTACLE_HEIGHT &&
            playerPos.y + PLAYER_HEIGHT > obs.y
          ) {
            setGameOver(true);
            setIsRunning(false);
            if (score > highScore) {
              setHighScore(score);
            }
            break;
          }
        }
      });
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isRunning, gameOver, playerPos, playerVelY, obstacles, score, highScore, gameHeight, gameWidth, nextObstacleInterval, framesSinceLastObstacle]);


  const handleGameAreaClick = () => {
    if (gameOver) {
      startGame();
    } else if (!isRunning) {
      startGame();
    } else {
      jump();
    }
  };

  if (!isRunning && !gameOver) {
    return (
      <div
        ref={gameAreaRef}
        style={{
            width: '100%',
            maxWidth: `${gameWidth}px`,
            height: `${gameHeight}px`,
            border: '1px solid #ccc',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            userSelect: 'none',
        }}
        onClick={handleGameAreaClick}
        tabIndex={0}
      >
        <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>Mini Game!</h2>
        <p>Press Space or Click to Start/Jump</p>
        <p style={{marginTop: '10px', fontSize: '14px'}}>Jump over social media icons to score.</p>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div
        ref={gameAreaRef}
        style={{
            width: '100%',
            maxWidth: `${gameWidth}px`,
            height: `${gameHeight}px`,
            border: '1px solid #ccc',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            userSelect: 'none',
        }}
        onClick={handleGameAreaClick}
        tabIndex={0}
        >
        <h2 style={{fontSize: '28px', marginBottom: '10px'}}>Game Over!</h2>
        <p style={{fontSize: '20px'}}>Your Score: {score}</p>
        <p style={{fontSize: '18px', marginTop: '5px'}}>High Score: {highScore}</p>
        <button
            onClick={startGame}
            style={{padding: '12px 25px', marginTop: '25px', cursor: 'pointer', fontSize: '16px', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white'}}
        >
            Play Again
        </button>
      </div>
    );
  }

  return (
    <div
        ref={gameAreaRef}
        style={{
            width: '100%',
            maxWidth: `${gameWidth}px`,
            height: `${gameHeight}px`,
            border: '1px solid #ccc',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            userSelect: 'none',
        }}
        onClick={jump}
        tabIndex={0}
    >
      {/* Player */}
      <div style={{
        position: 'absolute',
        left: `${playerPos.x}px`,
        top: `${playerPos.y}px`,
        width: `${PLAYER_WIDTH}px`,
        height: `${PLAYER_HEIGHT}px`,
        backgroundColor: 'deepskyblue', // Changed color
      }}></div>

      {/* Obstacles */}
      {obstacles.map(obstacle => (
        <div key={obstacle.id} style={{
          position: 'absolute',
          left: `${obstacle.x}px`,
          top: `${obstacle.y}px`,
          width: `${OBSTACLE_WIDTH}px`,
          height: `${OBSTACLE_HEIGHT}px`,
          backgroundColor: obstacle.type === 'YouTube' ? 'red' : obstacle.type === 'TikTok' ? '#00f2ea' : obstacle.type === 'Insta' ? '#C13584' : 'blue', // Color by type
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '10px',
          color: 'white',
          borderRadius: '4px', // Rounded corners for obstacles
        }}>
          {obstacle.type}
        </div>
      ))}

      {/* Score */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '22px', fontWeight: 'bold', color: '#333' }}>
        Score: {score}
      </div>
      <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '18px', color: '#555' }}>
        High Score: {highScore}
      </div>
    </div>
  );
}
