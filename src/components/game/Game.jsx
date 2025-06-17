import React, { useState, useEffect, useCallback, useRef } from 'react';

// Define constants that are not difficulty-dependent
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 40;
const GRAVITY = 0.55; // Slight decrease to make jump feel a bit floatier and longer
const BASE_PLAYER_JUMP_VELOCITY = 15; // Base jump velocity, might be adjusted by difficulty
const SOCIAL_MEDIA_ICONS = ['YouTube', 'TikTok', 'Insta', 'Facebook'];

const STACKED_GAP = 10;
const SIDE_BY_SIDE_GAP = 15;

const DIFFICULTY_SETTINGS = {
  easy: { name: 'Easy', speed: 2.5, minInterval: 120, maxInterval: 200, jumpVelocity: BASE_PLAYER_JUMP_VELOCITY },
  medium: { name: 'Medium', speed: 3.5, minInterval: 80, maxInterval: 150, jumpVelocity: BASE_PLAYER_JUMP_VELOCITY },
  hard: { name: 'Hard', speed: 5.0, minInterval: 50, maxInterval: 100, jumpVelocity: BASE_PLAYER_JUMP_VELOCITY },
};

export default function Game() {
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 250 });
  const [playerVelY, setPlayerVelY] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [framesSinceLastObstacle, setFramesSinceLastObstacle] = useState(0);

  const [difficulty, setDifficulty] = useState('medium');
  const [showDifficultyScreen, setShowDifficultyScreen] = useState(true);
  const [gameParams, setGameParams] = useState(DIFFICULTY_SETTINGS.medium);

  const gameAreaRef = useRef(null);
  const gameLoopRef = useRef(null);
  const nextObstacleIntervalRef = useRef(0);

  const gameWidth = 600;
  const gameHeight = 300;

  const resetGameState = useCallback(() => {
    setPlayerPos({ x: 50, y: gameHeight - PLAYER_HEIGHT });
    setPlayerVelY(0);
    setObstacles([]);
    setScore(0);
    setFramesSinceLastObstacle(0);
    if (gameParams) {
        nextObstacleIntervalRef.current = Math.floor(Math.random() * (gameParams.maxInterval - gameParams.minInterval + 1)) + gameParams.minInterval;
    }
  }, [gameHeight, gameParams]);

  const startGameLogic = useCallback((currentParams) => {
    setGameParams(currentParams);
    resetGameState();
    setGameOver(false);
    setIsRunning(true);
    if (gameAreaRef.current) {
      gameAreaRef.current.focus();
    }
  }, [resetGameState]);

  const selectDifficultyAndStart = useCallback((selectedDifficultyKey) => {
    const selectedParams = DIFFICULTY_SETTINGS[selectedDifficultyKey];
    setDifficulty(selectedDifficultyKey);
    setShowDifficultyScreen(false);
    startGameLogic(selectedParams);
  }, [startGameLogic]);

  const startGame = useCallback(() => {
      startGameLogic(gameParams);
  }, [startGameLogic, gameParams]);

  const jump = useCallback(() => {
    if (!gameOver && playerPos.y >= gameHeight - PLAYER_HEIGHT - 5 && isRunning) {
      setPlayerVelY(-gameParams.jumpVelocity);
    }
  }, [gameOver, playerPos.y, gameHeight, isRunning, gameParams]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        if (showDifficultyScreen) return;

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
  }, [jump, gameOver, isRunning, startGame, showDifficultyScreen]);

  useEffect(() => {
    if (isRunning && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(() => {
        let newPlayerVelY = playerVelY + GRAVITY;
        let newPlayerY = playerPos.y + newPlayerVelY;

        if (newPlayerY >= gameHeight - PLAYER_HEIGHT) {
          newPlayerY = gameHeight - PLAYER_HEIGHT;
          newPlayerVelY = 0;
        }
        setPlayerVelY(newPlayerVelY);
        setPlayerPos(prev => ({ ...prev, y: newPlayerY }));

        let currentFrames = framesSinceLastObstacle + 1;
        let newObstaclesList = [...obstacles];

        if (currentFrames >= nextObstacleIntervalRef.current) {
          currentFrames = 0;
          nextObstacleIntervalRef.current = Math.floor(Math.random() * (gameParams.maxInterval - gameParams.minInterval + 1)) + gameParams.minInterval;

          const formationTypeRoll = Math.random();
          let obstaclesThisSpawn = []; // Changed from newObstacle to an array
          const baseObstacleY = gameHeight - OBSTACLE_HEIGHT;
          const iconType1 = SOCIAL_MEDIA_ICONS[Math.floor(Math.random() * SOCIAL_MEDIA_ICONS.length)];
          const iconType2 = SOCIAL_MEDIA_ICONS[Math.floor(Math.random() * SOCIAL_MEDIA_ICONS.length)];

          // Formation logic (constants STACKED_GAP, SIDE_BY_SIDE_GAP are already defined)
          if (formationTypeRoll < 0.5 || gameParams.speed < 3) { // ~50% chance for single, or always single if speed is very low (e.g., easy mode)
            obstaclesThisSpawn.push({
              id: Date.now(),
              x: gameWidth,
              y: baseObstacleY,
              type: iconType1,
              scored: false,
            });
          } else if (formationTypeRoll < 0.75) { // ~25% chance for side-by-side
            obstaclesThisSpawn.push({
              id: Date.now(),
              x: gameWidth,
              y: baseObstacleY,
              type: iconType1,
              scored: false,
            });
            obstaclesThisSpawn.push({
              id: Date.now() + 1, // Ensure unique ID for the second obstacle
              x: gameWidth + OBSTACLE_WIDTH + SIDE_BY_SIDE_GAP,
              y: baseObstacleY,
              type: iconType2,
              scored: false,
            });
          } else { // ~25% chance for stacked
            const topObstacleY = baseObstacleY - OBSTACLE_HEIGHT - STACKED_GAP;
            // Ensure the top obstacle is within game bounds and reachable by the player
            if (topObstacleY >= 0) {
                 obstaclesThisSpawn.push({
                    id: Date.now(),
                    x: gameWidth,
                    y: baseObstacleY, // Bottom obstacle
                    type: iconType1,
                    scored: false,
                  });
                  obstaclesThisSpawn.push({
                    id: Date.now() + 1, // Ensure unique ID
                    x: gameWidth, // Same X for stacked
                    y: topObstacleY, // Top obstacle
                    type: iconType2,
                    scored: false,
                  });
            } else { // Fallback to a single obstacle if stacked formation is too high (e.g., gameHeight is too small)
                 obstaclesThisSpawn.push({
                    id: Date.now(),
                    x: gameWidth,
                    y: baseObstacleY,
                    type: iconType1,
                    scored: false,
                  });
            }
          }

          newObstaclesList.push(...obstaclesThisSpawn);
        }
        setFramesSinceLastObstacle(currentFrames);

        let currentScore = score;
        newObstaclesList = newObstaclesList.map(obs => ({ ...obs, x: obs.x - gameParams.speed })).filter(obs => {
          if (!obs.scored && obs.x + OBSTACLE_WIDTH < playerPos.x) {
            currentScore++;
            obs.scored = true;
          }
          return obs.x > -(OBSTACLE_WIDTH * 2 + SIDE_BY_SIDE_GAP);
        });
        setScore(currentScore);
        setObstacles(newObstaclesList);

        for (let obs of newObstaclesList) {
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
  }, [isRunning, gameOver, playerPos, playerVelY, obstacles, score, highScore, gameHeight, gameWidth, gameParams, framesSinceLastObstacle]);

  useEffect(() => {
    if (!isRunning && gameParams) {
        nextObstacleIntervalRef.current = Math.floor(Math.random() * (gameParams.maxInterval - gameParams.minInterval + 1)) + gameParams.minInterval;
    }
  }, [gameParams, isRunning]);

  const handleGameAreaClick = () => {
    if (showDifficultyScreen) return;
    if (gameOver) {
      startGame();
    } else if (!isRunning) {
      startGame();
    } else {
      jump();
    }
  };

  const goToDifficultyScreen = () => {
    setGameOver(false);
    setIsRunning(false);
    setShowDifficultyScreen(true);
  };

  if (showDifficultyScreen) {
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
            userSelect: 'none',
        }}
        tabIndex={0}
      >
        <h2 style={{ marginBottom: '30px', fontSize: '24px' }}>Select Difficulty</h2>
        {Object.keys(DIFFICULTY_SETTINGS).map(key => (
          <button
            key={key}
            onClick={() => selectDifficultyAndStart(key)}
            style={{
              padding: '15px 30px',
              margin: '10px',
              fontSize: '18px',
              cursor: 'pointer',
              minWidth: '150px',
              borderRadius: '5px',
              border: '1px solid #ddd',
              backgroundColor: '#f0f0f0'
            }}
          >
            {DIFFICULTY_SETTINGS[key].name}
          </button>
        ))}
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
        onClick={(e) => { e.stopPropagation(); startGame(); }}
        tabIndex={0}
        >
        <h2 style={{fontSize: '22px', marginBottom: '15px', padding: '0 20px'}}>Finish your work and come back. I’ll make the game easier for you — no promises.</h2>
        <p style={{fontSize: '20px'}}>Your Score: {score}</p>
        <p style={{fontSize: '18px', marginTop: '5px'}}>High Score: {highScore} ({gameParams.name})</p>
        <button
            onClick={(e) => { e.stopPropagation(); startGame(); }}
            style={{padding: '12px 25px', marginTop: '20px', cursor: 'pointer', fontSize: '16px', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white'}}
        >
            Play Again ({gameParams.name})
        </button>
        <button
            onClick={(e) => { e.stopPropagation(); goToDifficultyScreen(); }}
            style={{padding: '10px 20px', marginTop: '15px', cursor: 'pointer', fontSize: '14px', borderRadius: '5px', border: '1px solid #007bff', backgroundColor: 'transparent', color: '#007bff'}}
        >
            Change Difficulty
        </button>
      </div>
    );
  }

  if (!isRunning && !gameOver && !showDifficultyScreen) {
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
        <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>PUBGMini ({gameParams.name})</h2>
        <p>Press Space or Click to Start/Jump</p>
        <p style={{marginTop: '10px', fontSize: '14px'}}>Jump over social media icons to score.</p>
         <button
            onClick={(e) => { e.stopPropagation(); goToDifficultyScreen(); }}
            style={{padding: '8px 15px', marginTop: '25px', cursor: 'pointer', fontSize: '12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: 'transparent', color: '#555'}}
        >
            Change Difficulty
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
      <div style={{
        position: 'absolute',
        left: `${playerPos.x}px`,
        top: `${playerPos.y}px`,
        width: `${PLAYER_WIDTH}px`,
        height: `${PLAYER_HEIGHT}px`,
        backgroundColor: 'deepskyblue',
      }}></div>

      {obstacles.map(obstacle => (
        <div key={obstacle.id} style={{
          position: 'absolute',
          left: `${obstacle.x}px`,
          top: `${obstacle.y}px`,
          width: `${OBSTACLE_WIDTH}px`,
          height: `${OBSTACLE_HEIGHT}px`,
          backgroundColor: obstacle.type === 'YouTube' ? 'red' : obstacle.type === 'TikTok' ? '#00f2ea' : obstacle.type === 'Insta' ? '#C13584' : 'blue',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '10px',
          color: 'white',
          borderRadius: '4px',
        }}>
          {obstacle.type}
        </div>
      ))}

      <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '22px', fontWeight: 'bold', color: '#333' }}>
        Score: {score}
      </div>
      <div style={{ position: 'absolute', top: '35px', left: '10px', fontSize: '16px', color: '#666' }}>
        Mode: {gameParams.name}
      </div>
      <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '18px', color: '#555' }}>
        High Score: {highScore}
      </div>
    </div>
  );
}
