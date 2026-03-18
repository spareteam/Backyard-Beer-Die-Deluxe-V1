import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { TeamSetup } from './components/TeamSetup';
import { GamePhase, GameState, Vector3, Difficulty, Wind, Player, ReplayFrame } from './types';
import { 
  TABLE_WIDTH, TABLE_DEPTH, TABLE_HEIGHT, GRAVITY, 
  MIN_HEIGHT_REQ, COLORS, DIE_SIZE, CUP_RADIUS,
  TEAM_NAMES, TEAM_COLORS
} from './constants';
import { Trophy, RotateCcw, Play, Info, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WindIndicator = ({ wind, isMobile, cameraLerp, sideLerp }: { wind: Wind, isMobile: boolean, cameraLerp: number, sideLerp: number }) => {
  const vaneSize = isMobile ? 50 : 80;
  
  // Calculate camera yaw in local space
  const camPosIso = { x: 10, y: 10, z: -5 };
  const camTargetIso = { x: 0, y: 0, z: 4 };
  const camPosHead = { x: 0, y: 7, z: -9 }; 
  const camTargetHead = { x: 0, y: 1, z: 4 };
  
  const camPos = {
    x: camPosIso.x + (camPosHead.x - camPosIso.x) * cameraLerp,
    y: camPosIso.y + (camPosHead.y - camPosIso.y) * cameraLerp,
    z: camPosIso.z + (camPosHead.z - camPosIso.z) * cameraLerp,
  };
  
  const camTarget = {
    x: camTargetIso.x + (camTargetHead.x - camTargetIso.x) * cameraLerp,
    y: camTargetIso.y + (camTargetHead.y - camTargetIso.y) * cameraLerp,
    z: camTargetIso.z + (camTargetHead.z - camTargetIso.z) * cameraLerp,
  };

  const dx = camTarget.x - camPos.x;
  const dz = camTarget.z - camPos.z;
  const localYaw = Math.atan2(dz, dx);
  
  // Total camera yaw in world space
  const cameraWorldYaw = localYaw + (sideLerp * Math.PI);
  
  // Wind direction is world space (0 = +X, PI/2 = +Z)
  // Arrow points right (0 deg) in UI. 
  // We want it to point "up" (-90 deg) when wind is blowing in camera direction.
  const visualRotationRad = cameraWorldYaw - wind.direction - Math.PI / 2;
  const visualRotationDeg = (visualRotationRad * 180) / Math.PI;

  return (
    <div className={`fixed ${isMobile ? 'bottom-4 right-4' : 'bottom-6 right-6'} flex flex-col items-center gap-1 pointer-events-none z-50`}>
      <div className={`relative ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} flex items-center justify-center`}>
        <motion.div
          animate={{ rotate: visualRotationDeg }}
          className="drop-shadow-[0_0_8px_rgba(255,0,0,0.4)]"
        >
          <svg width={vaneSize} height={vaneSize} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Playful Red Arrow */}
            <path 
              d="M10 40H60V20L90 50L60 80V60H10V40Z" 
              fill="#FF0000" 
              stroke="#8B0000" 
              strokeWidth="4" 
              strokeLinejoin="round"
            />
            {/* Subtle shadow/dimension */}
            <path 
              d="M10 60L15 65H65V85L95 50L90 50L60 80V60H10Z" 
              fill="#8B0000" 
              opacity="0.3"
            />
          </svg>
        </motion.div>
      </div>
      <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border-2 border-[#FF0000]/40 shadow-lg flex flex-col items-center">
        <p className="text-red-500 font-black text-xs uppercase italic tracking-widest flex items-center gap-2">
          <span className="animate-pulse">●</span>
          {wind.speed > 8 ? 'GUSTY' : wind.speed > 5 ? 'BREEZY' : wind.speed > 2 ? 'LIGHT' : 'CALM'}
        </p>
        <p className="text-white/40 text-xs font-bold tracking-tighter">
          {wind.speed.toFixed(1)} FT/S
        </p>
      </div>
    </div>
  );
};

const Joystick = ({ onMove }: { onMove: (v: { x: number; y: number }) => void }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    // We don't preventDefault here to allow touch events to bubble if needed, 
    // but we use touch-none on the element.
    const move = (moveEvent: TouchEvent | MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = rect.width / 2;
      
      const limitedDist = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);
      
      const x = Math.cos(angle) * limitedDist;
      const y = Math.sin(angle) * limitedDist;
      
      setPosition({ x, y });
      onMove({ x: x / maxDist, y: y / maxDist });
    };

    const stop = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', stop);
      setPosition({ x: 0, y: 0 });
      onMove({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', stop);
  };

  return (
    <div 
      ref={containerRef}
      className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full border-2 border-white/20 relative flex items-center justify-center pointer-events-auto touch-none shadow-2xl"
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    >
      <motion.div 
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-10 h-10 bg-white rounded-full shadow-lg border-2 border-slate-900"
      />
    </div>
  );
};

const ReplayButton = ({ onClick, isMobile }: { onClick: () => void, isMobile: boolean }) => {
  const size = isMobile ? 64 : 96;
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      className="group pointer-events-auto"
    >
      <div className="relative">
        {/* Cartoony Film Camera SVG */}
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Reels */}
          <circle cx="35" cy="25" r="18" fill="#334155" stroke="#1e293b" strokeWidth="4" />
          <circle cx="65" cy="25" r="18" fill="#334155" stroke="#1e293b" strokeWidth="4" />
          <circle cx="35" cy="25" r="12" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
          <circle cx="65" cy="25" r="12" fill="#94a3b8" stroke="#1e293b" strokeWidth="2" />
          
          {/* Camera Body */}
          <rect x="20" y="40" width="60" height="40" rx="8" fill="#334155" stroke="#1e293b" strokeWidth="4" />
          
          {/* Lens */}
          <path d="M80 50L95 40V80L80 70V50Z" fill="#475569" stroke="#1e293b" strokeWidth="4" />
          
          {/* Details */}
          <circle cx="35" cy="60" r="4" fill="#ef4444" />
          <rect x="45" y="55" width="25" height="10" rx="2" fill="#94a3b8" />
        </svg>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          INSTANT REPLAY
        </div>
      </div>
    </motion.button>
  );
};

const ShareButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1, color: '#fff' }}
      whileTap={{ scale: 0.9 }}
      className="group bg-transparent text-white/40 text-[10px] font-black tracking-[0.2em] uppercase px-4 py-2 flex flex-col items-center gap-1 pointer-events-auto"
    >
      SHARE CLIP
    </motion.button>
  );
};

const INITIAL_STATE: GameState = {
  phase: GamePhase.START_SCREEN,
  score: [0, 0],
  currentPlayerIndex: 0,
  diePosition: { x: 0, y: 0, z: 0 },
  dieVelocity: { x: 0, y: 0, z: 0 },
  tossAngleUp: 75,
  tossAngleSide: 0,
  tossPower: 0,
  tossStartPos: { x: 0, y: 5, z: -2 },
  defenderPos: [{ x: -2, y: 0, z: 10 }, { x: 2, y: 0, z: 10 }],
  cameraLerp: 0,
  sideLerp: 0,
  isCaught: false,
  catcherIndex: null,
  lastCatchAttempt: [0, 0],
  isSink: false,
  isDancing: false,
  maxHeightReached: 0,
  dieStatus: 'none',
  windTurnsLeft: 3,
  message: 'Welcome to Backyard Beer Die!',
  teams: [
    { 
      name: 'Team 1', 
      color: COLORS.PLAYER_1, 
      players: [{ name: 'Player 1', isCPU: false, jerseyNumber: 1 }] 
    },
    { 
      name: 'Team 2', 
      color: COLORS.PLAYER_2, 
      players: [{ name: 'CPU 1', isCPU: true, jerseyNumber: 2 }] 
    },
  ],
  difficulty: Difficulty.EASY,
  wind: { speed: 0, direction: 0 },
  replayFrames: [],
  isReplaying: false,
  replayIndex: 0,
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const gameStateRef = useRef<GameState>(INITIAL_STATE);
  const [isLocking, setIsLocking] = useState(false);
  const isLockingRef = useRef(false);
  const [lastLockedValue, setLastLockedValue] = useState<string | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const cpuActionTimeoutRef = useRef<number | null>(null);
  const cpuPendingActionRef = useRef<string | null>(null);
  const cpuTargetsRef = useRef<{ up: number | null; side: number | null; power: number | null }>({ up: null, side: null, power: null });
  const cpuAdjustmentsRef = useRef({ upBias: 0, sideBias: 0, powerBias: 0 });
  const cpuMoveTargetRef = useRef<Vector3 | null>(null);
  const replayFramesRef = useRef<ReplayFrame[]>([]);

  const [isMobile, setIsMobile] = useState(false);
  const touchMoveTargetRef = useRef<{ x: number, z: number } | null>(null);
  const joystickVectorRef = useRef({ x: 0, y: 0 });
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isCollidingWithTable = (pos: Vector3) => {
    const buffer = 0.6; // Player radius + small buffer
    const withinX = pos.x > -TABLE_WIDTH / 2 - buffer && pos.x < TABLE_WIDTH / 2 + buffer;
    const withinZ = pos.z > -buffer && pos.z < TABLE_DEPTH + buffer;
    return withinX && withinZ;
  };

  // Sync ref with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    isLockingRef.current = isLocking;
  }, [isLocking]);

  const startNewTurn = useCallback(() => {
    replayFramesRef.current = [];
    setGameState(prev => {
      const nextPlayerIndex = prev.phase === GamePhase.RESULT ? prev.currentPlayerIndex + 1 : prev.currentPlayerIndex;
      const playersPerTeam = prev.teams[0].players.length;
      const currentTeamIndex = Math.floor(nextPlayerIndex / playersPerTeam) % 2;
      const isTeam2 = currentTeamIndex === 1;
      const currentTeam = prev.teams[currentTeamIndex];
      const currentPlayer = currentTeam.players[nextPlayerIndex % playersPerTeam];
      
      const opponentTeamIndex = (currentTeamIndex + 1) % 2;
      const opponentPlayerCount = prev.teams[opponentTeamIndex].players.length;

      // Wind shift logic
      let newWind = { ...prev.wind };
      let newWindTurnsLeft = prev.windTurnsLeft - 1;
      if (newWindTurnsLeft <= 0) {
        newWindTurnsLeft = 4 + Math.floor(Math.random() * 3); // 4 to 6 throws
        
        // Magnitude categories: Calm (0-2), Light (2-5), Breeze (5-8), Gusty (8-12)
        const categories = [[0, 2], [2, 5], [5, 8], [8, 12]];
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const speed = cat[0] + Math.random() * (cat[1] - cat[0]);
        const direction = Math.random() * Math.PI * 2;
        newWind = { speed, direction };
      }

      return {
        ...prev,
        currentPlayerIndex: nextPlayerIndex,
        phase: GamePhase.POSITIONING,
        tossStartPos: { x: 0, y: 5, z: isTeam2 ? 10 : -2 },
        defenderPos: Array.from({ length: opponentPlayerCount }, (_, i) => ({
          x: opponentPlayerCount === 1 ? 0 : (i === 0 ? -2 : 2),
          y: 0,
          z: isTeam2 ? -2 : 10
        })),
        lastCatchAttempt: Array(opponentPlayerCount).fill(0),
        diePosition: { x: 0, y: 5, z: isTeam2 ? 10 : -2 },
        isCaught: false,
        catcherIndex: null,
        isSink: false,
        isDancing: false,
        maxHeightReached: 0,
        dieStatus: 'none',
        wind: newWind,
        windTurnsLeft: newWindTurnsLeft,
        tossPower: 0,
        tossAngleUp: 75,
        tossAngleSide: 0,
        isReplaying: false,
        replayIndex: 0,
        replayFrames: [],
        message: `${currentTeam.name.toUpperCase()}'S TURN TO TOSS!`,
      };
    });
  }, []);

  const handleToss = useCallback(() => {
    touchMoveTargetRef.current = null;
    setGameState(prev => {
      const playersPerTeam = prev.teams[0].players.length;
      const isTeam2 = Math.floor(prev.currentPlayerIndex / playersPerTeam) % 2 === 1;
      const upRad = (prev.tossAngleUp * Math.PI) / 180;
      const sideRad = (prev.tossAngleSide * Math.PI) / 180;
      const powerScale = 15 + (prev.tossPower / 100) * 25;

      // Adjust velocity direction based on which side we are tossing from
      const direction = isTeam2 ? -1 : 1;
      
      const vx = Math.sin(sideRad) * powerScale * Math.cos(upRad);
      const vy = Math.sin(upRad) * powerScale;
      const vz = direction * Math.cos(sideRad) * powerScale * Math.cos(upRad);

      let initialMessage = "";
      let initialStatus: 'none' | 'low' = 'none';
      if (prev.tossAngleUp * prev.tossPower < 1800) {
        initialMessage = "LOW! DEAD DIE.";
        initialStatus = 'low';
      }

      return {
        ...prev,
        phase: GamePhase.FLIGHT,
        dieVelocity: { x: vx, y: vy, z: vz },
        diePosition: { ...prev.tossStartPos },
        dieStatus: initialStatus,
        message: initialMessage,
        replayFrames: [],
        isReplaying: false,
        replayIndex: 0,
        catcherIndex: null,
      };
    });
    replayFramesRef.current = [];
  }, []);

  const handleCatch = useCallback((playerIndex: number = 0) => {
    setGameState(prev => {
      if (prev.phase !== GamePhase.FLIGHT || prev.isCaught) return prev;
      
      const newAttempts = [...prev.lastCatchAttempt];
      newAttempts[playerIndex] = Date.now();

      const playersPerTeam = prev.teams[0].players.length;
      if (playerIndex >= playersPerTeam) return { ...prev, lastCatchAttempt: newAttempts };
      
      // 3D distance check for more accuracy
      const dist3D = Math.sqrt(
        Math.pow(prev.diePosition.x - prev.defenderPos[playerIndex].x, 2) +
        Math.pow(prev.diePosition.y - 1.2, 2) +
        Math.pow(prev.diePosition.z - prev.defenderPos[playerIndex].z, 2)
      );
      
      // Catch radius (1.5 feet)
      if (dist3D < 1.5 && prev.diePosition.y > 0.2) {
        // If it was already a dead die (LOW or SHORT), catching it doesn't change the result
        if (prev.message.includes("DEAD DIE")) return { ...prev, lastCatchAttempt: newAttempts };

        const defendingTeamIndex = (Math.floor(prev.currentPlayerIndex / playersPerTeam) + 1) % 2;
        const defendingTeam = prev.teams[defendingTeamIndex];

        // Record the catch frame before returning
        const catchFrame = {
          diePosition: { ...prev.diePosition },
          defenderPos: [...prev.defenderPos],
          isCaught: true,
          catcherIndex: playerIndex,
          isSink: prev.isSink,
          message: `${defendingTeam.name.toUpperCase()} CATCH! NO POINT!`
        };
        replayFramesRef.current.push(catchFrame);

        const finalReplayFrames = [...replayFramesRef.current];

        return {
          ...prev,
          phase: GamePhase.RESULT,
          isCaught: true,
          catcherIndex: playerIndex,
          lastCatchAttempt: newAttempts,
          message: `${defendingTeam.name.toUpperCase()} CATCH! NO POINT!`,
          replayFrames: finalReplayFrames,
        };
      }
      return { ...prev, lastCatchAttempt: newAttempts };
    });
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const handleShare = useCallback(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    setRecordedVideoUrl(null);
    setIsRecording(true);

    // Start Replay
    setGameState(prev => {
      if (prev.replayFrames.length === 0) return prev;
      return {
        ...prev,
        isReplaying: true,
        replayIndex: 0,
        message: "RECORDING CLIP..."
      };
    });

    // Start Recording
    const stream = canvas.captureStream(30);
    const mimeType = getSupportedMimeType();
    
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `beerdie-replay.${extension}`, { type: mimeType });
        
        setRecordedFile(file);
        setRecordedVideoUrl(url);
        setIsRecording(false);
        setGameState(prev => ({ ...prev, message: "CLIP RECORDED! CLICK 'SAVE CLIP'" }));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err) {
      console.error('MediaRecorder failed:', err);
      setIsRecording(false);
      setGameState(prev => ({ ...prev, message: "RECORDING FAILED" }));
    }
  }, []);

  const saveRecordedVideo = useCallback(async () => {
    if (!recordedFile || !recordedVideoUrl) return;

    const mimeType = getSupportedMimeType();
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [recordedFile] })) {
      try {
        await navigator.share({
          files: [recordedFile],
          title: 'Beer Die Replay!',
          text: 'Check out this epic Beer Die toss!',
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to download
          const a = document.createElement('a');
          a.href = recordedVideoUrl;
          a.download = `beerdie-replay.${extension}`;
          a.click();
        }
      }
    } else {
      // Fallback: Download
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = `beerdie-replay.${extension}`;
      a.click();
    }
    
    setRecordedFile(null);
    setRecordedVideoUrl(null);
  }, [recordedFile, recordedVideoUrl]);

  const handleReplay = useCallback(() => {
    setGameState(prev => {
      if (prev.replayFrames.length === 0) return prev;
      return {
        ...prev,
        isReplaying: true,
        replayIndex: 0,
      };
    });
  }, []);
  const internalTimerRef = useRef(0);
  useEffect(() => {
    const loop = (time: number) => {
      if (lastTimeRef.current !== 0) {
        const dt = (time - lastTimeRef.current) / 1000;
        internalTimerRef.current += dt;

        setGameState(prev => {
          if (prev.isReplaying) {
            const frame = prev.replayFrames[prev.replayIndex];
            if (frame) {
              return {
                ...prev,
                diePosition: frame.diePosition,
                defenderPos: frame.defenderPos || prev.defenderPos,
                isCaught: frame.isCaught,
                catcherIndex: frame.catcherIndex,
                isSink: frame.isSink,
                message: frame.message,
                replayIndex: prev.replayIndex + 1,
              };
            } else {
              // Replay ended
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
              return {
                ...prev,
                isReplaying: false,
                replayIndex: 0,
              };
            }
          }

          let nextState = { ...prev };
          let changed = false;

          // 1. Camera Lerp
          const targetLerp = (
            prev.phase === GamePhase.AIMING_UP || 
            prev.phase === GamePhase.AIMING_SIDE || 
            prev.phase === GamePhase.POWER
          ) ? 1 : 0;
          
          if (prev.cameraLerp !== targetLerp) {
            const step = 0.05; 
            const nextLerp = prev.cameraLerp < targetLerp 
              ? Math.min(prev.cameraLerp + step, targetLerp)
              : Math.max(prev.cameraLerp - step, targetLerp);
            nextState.cameraLerp = nextLerp;
            changed = true;
          }

          // 1b. Side Lerp (Turn switching animation)
          const playersPerTeam = prev.teams[0].players.length;
          const currentTeamIndex = Math.floor(prev.currentPlayerIndex / playersPerTeam) % 2;
          const targetSideLerp = currentTeamIndex;
          if (prev.sideLerp !== targetSideLerp) {
            const sideStep = 0.03;
            const nextSideLerp = prev.sideLerp < targetSideLerp
              ? Math.min(prev.sideLerp + sideStep, targetSideLerp)
              : Math.max(prev.sideLerp - sideStep, targetSideLerp);
            nextState.sideLerp = nextSideLerp;
            changed = true;
          }

          // 1c. Wind Update (Removed continuous change, handled in startNewTurn)
          
          // 2. Oscillation
          if (!isLockingRef.current) {
            const t = performance.now() / 1000;
            if (prev.phase === GamePhase.AIMING_SIDE) {
              // Speed up by 20% (4 -> 4.8)
              nextState.tossAngleSide = Math.sin(t * 4.8) * 30;
              changed = true;
            } else if (prev.phase === GamePhase.AIMING_UP) {
              // Using a more stable oscillation - Speed up by 20% (4 -> 4.8)
              // Range: 45 to 90 (90 is straight up)
              nextState.tossAngleUp = 45 + (Math.sin(t * 4.8) + 1) * 22.5;
              changed = true;
            } else if (prev.phase === GamePhase.POWER) {
              // Speed up by 20% (6 -> 7.2)
              nextState.tossPower = (Math.sin(t * 7.2) + 1) * 50;
              changed = true;
            }
          }

          // 3. Physics (Integrated into the same state update)
          if (prev.phase === GamePhase.FLIGHT) {
            const effectiveDt = Math.min(dt, 0.1) * 0.5;
            
            let nextPos = {
              x: prev.diePosition.x + prev.dieVelocity.x * effectiveDt,
              y: prev.diePosition.y + prev.dieVelocity.y * effectiveDt,
              z: prev.diePosition.z + prev.dieVelocity.z * effectiveDt,
            };

            // Wind impact: bigger impact when speed > 5
            const windImpactFactor = prev.wind.speed < 2 ? 0.02 : (prev.wind.speed > 5 ? 0.8 : 0.2);
            
            let nextVel = {
              x: prev.dieVelocity.x + Math.cos(prev.wind.direction) * prev.wind.speed * windImpactFactor * effectiveDt,
              y: prev.dieVelocity.y - GRAVITY * effectiveDt,
              z: prev.dieVelocity.z + Math.sin(prev.wind.direction) * prev.wind.speed * windImpactFactor * effectiveDt,
            };

            let nextPhase = prev.phase;
            let nextMessage = prev.message;
            let nextStatus = prev.dieStatus;
            let nextScore = [...prev.score] as [number, number];
            let nextSink = prev.isSink;
            let nextMaxHeight = Math.max(prev.maxHeightReached, nextPos.y);

            const playersPerTeam = prev.teams[0].players.length;
            const isTeam2 = currentTeamIndex === 1;
            
            if (nextVel.y < 0 && nextMaxHeight < MIN_HEIGHT_REQ && nextStatus === 'none') {
              nextStatus = 'low';
              nextMessage = "LOW! DEAD DIE.";
            }
            
            const collisionBuffer = 0.4; // Generous buffer for visual edge hits
            const tableHalfWidth = TABLE_WIDTH / 2 + collisionBuffer;
            const tableMinZ = -collisionBuffer;
            const tableMaxZ = TABLE_DEPTH + collisionBuffer;
            const tableMidZ = TABLE_DEPTH / 2;

            const onOpponentSide = isTeam2 
              ? (nextPos.z >= tableMinZ && nextPos.z < tableMidZ)
              : (nextPos.z > tableMidZ && nextPos.z <= tableMaxZ);
            
            const onOwnSide = isTeam2
              ? (nextPos.z >= tableMidZ && nextPos.z <= tableMaxZ)
              : (nextPos.z >= tableMinZ && nextPos.z <= tableMidZ);

            const withinWidth = Math.abs(nextPos.x) <= tableHalfWidth;
            
            if (prev.diePosition.y > TABLE_HEIGHT && nextPos.y <= TABLE_HEIGHT) {
              if (withinWidth && (onOpponentSide || onOwnSide)) {
                const opponentCups = isTeam2 
                  ? [{ x: -TABLE_WIDTH / 2 + 0.3, z: 0.3 }, { x: TABLE_WIDTH / 2 - 0.3, z: 0.3 }]
                  : [{ x: -TABLE_WIDTH / 2 + 0.3, z: TABLE_DEPTH - 0.3 }, { x: TABLE_WIDTH / 2 - 0.3, z: TABLE_DEPTH - 0.3 }];
                
                let hitSink = false;
                for (const cup of opponentCups) {
                  const distToCup = Math.sqrt(Math.pow(nextPos.x - cup.x, 2) + Math.pow(nextPos.z - cup.z, 2));
                  if (distToCup < CUP_RADIUS) {
                    hitSink = true;
                    break;
                  }
                }

                if (hitSink && nextStatus !== 'low' && nextStatus !== 'short') {
                  nextPhase = GamePhase.RESULT;
                  nextSink = true;
                  nextState.isDancing = true;
                  nextScore[currentTeamIndex] += 2;
                  nextMessage = "SINK! 2 POINTS!";
                } else {
                  // Bounce or Stop
                  const horizontalSpeed = Math.sqrt(nextVel.x * nextVel.x + nextVel.z * nextVel.z);
                  const verticalSpeed = Math.abs(nextVel.y);
                  
                  // If it's bouncing a lot or moving very slowly, it should stop
                  // But it should ALWAYS bounce at least once (even if it was a LOW throw)
                  if ((verticalSpeed < 5 || horizontalSpeed < 2) && prev.dieStatus !== 'none' && prev.dieStatus !== 'low') {
                    nextVel.x = 0;
                    nextVel.y = 0;
                    nextVel.z = 0;
                    nextPos.y = TABLE_HEIGHT;
                    nextPhase = GamePhase.RESULT;
                    nextStatus = 'dead';
                    nextMessage = "DEAD DIE! STOPPED ON TABLE.";
                  } else {
                    nextVel.y = verticalSpeed * (0.25 + Math.random() * 0.35); // Slightly more energy retained
                    
                    // Controlled random scatter
                    const scatterSpeed = 3 + Math.random() * 6; // Increased randomness
                    const scatterAngle = Math.random() * Math.PI * 2;
                    nextVel.x = Math.cos(scatterAngle) * scatterSpeed;
                    nextVel.z = Math.sin(scatterAngle) * scatterSpeed;
                    
                    nextPos.y = TABLE_HEIGHT + 0.05;

                    // Categorize the throw if it's not already dead
                    if (nextStatus === 'none') {
                      if (onOwnSide) {
                        nextStatus = 'short';
                        nextMessage = "SHORT! DEAD DIE.";
                      } else {
                        nextStatus = 'live';
                        nextMessage = "LIVE!";
                      }
                    }
                  }
                }
              }
            }

              if (nextPos.y <= 0) {
                nextPos.y = 0;
                nextPhase = GamePhase.RESULT;
                
                if (nextStatus === 'live') {
                    nextScore[currentTeamIndex] += 1;
                    nextMessage = "LIVE! POINT SCORED!";
                } else if (nextStatus === 'low') {
                    nextMessage = "LOW! DEAD DIE.";
                } else if (nextStatus === 'short') {
                    nextMessage = "SHORT! DEAD DIE.";
                } else if (nextStatus === 'dead') {
                    nextMessage = "DEAD DIE! STOPPED ON TABLE.";
                } else {
                    nextMessage = "MISSED! DEAD DIE.";
                }

                // CPU Learning: Adjust biases based on where it landed
                const currentTeam = prev.teams[currentTeamIndex];
                const currentPlayer = currentTeam.players[prev.currentPlayerIndex % playersPerTeam];
                if (currentPlayer.isCPU) {
                  const targetZ = isTeam2 ? 0 : TABLE_DEPTH;
                  const zError = isTeam2 ? (nextPos.z - targetZ) : (targetZ - nextPos.z);
                  
                  // If it landed too far (positive zError means it went past the target)
                  if (zError < -1) { // Overshot (more sensitive)
                    cpuAdjustmentsRef.current.powerBias -= 4; // More aggressive reduction
                    cpuAdjustmentsRef.current.upBias += 1;
                  } else if (zError > 1) { // Undershot
                    cpuAdjustmentsRef.current.powerBias += 4;
                    cpuAdjustmentsRef.current.upBias -= 1;
                  }
                  
                  // Side error
                  if (nextPos.x > 1) cpuAdjustmentsRef.current.sideBias -= 1;
                  if (nextPos.x < -1) cpuAdjustmentsRef.current.sideBias += 1;
                }

              const teamScore = nextScore[currentTeamIndex];
              const otherScore = nextScore[(currentTeamIndex + 1) % 2];
              if (teamScore >= 9 && teamScore >= otherScore + 2) {
                nextPhase = GamePhase.GAME_OVER;
                nextMessage = `${prev.teams[currentTeamIndex].name} WIN THE GAME!`;
              }
            }

            const opponentCups = isTeam2 
              ? [{ x: -TABLE_WIDTH / 2 + 0.3, z: 0.3 }, { x: TABLE_WIDTH / 2 - 0.3, z: 0.3 }]
              : [{ x: -TABLE_WIDTH / 2 + 0.3, z: TABLE_DEPTH - 0.3 }, { x: TABLE_WIDTH / 2 - 0.3, z: TABLE_DEPTH - 0.3 }];

            opponentCups.forEach(cup => {
              const dist = Math.sqrt(Math.pow(nextPos.x - cup.x, 2) + Math.pow(nextPos.z - cup.z, 2));
              if (dist < 0.2 && Math.abs(nextPos.y - TABLE_HEIGHT) < 0.1) {
                if (!nextMessage.includes("DEAD DIE")) {
                  nextSink = true;
                  nextState.isDancing = true;
                  nextPhase = GamePhase.RESULT;
                  nextScore[currentTeamIndex] += 1;
                  nextMessage = "SINK! TAKE A BOW!";
                }
              }
            });

            nextState.diePosition = nextPos;
            nextState.dieVelocity = nextVel;
            nextState.dieStatus = nextStatus;
            nextState.phase = nextPhase;
            nextState.message = nextMessage;
            nextState.score = nextScore;
            nextState.isSink = nextSink;
            nextState.maxHeightReached = nextMaxHeight;

            changed = true;
          }

          // 4. CPU Auto-Lock Logic (Visual Sync)
          const currentTeam = prev.teams[currentTeamIndex];
          const currentPlayer = currentTeam.players[prev.currentPlayerIndex % playersPerTeam];

          // 5. Fluid Movement (Keyboard & Mobile)
          const isTeam2 = currentTeamIndex === 1;
          const xDir = isTeam2 ? -1 : 1;
          const zDir = isTeam2 ? -1 : 1;
          const moveSpeed = 0.2; // Speed per frame
          const defenseSpeed = 0.2; // Reduced from 0.4 for more controlled movement

          if (prev.phase === GamePhase.POSITIONING && !currentPlayer.isCPU) {
            let nextX = prev.tossStartPos.x;
            let nextZ = prev.tossStartPos.z;
            let moved = false;

            if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) {
              nextX -= moveSpeed * xDir;
              moved = true;
            }
            if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) {
              nextX += moveSpeed * xDir;
              moved = true;
            }
            if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) {
              nextZ += moveSpeed * (isTeam2 ? -1 : 1);
              moved = true;
            }
            if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) {
              nextZ += moveSpeed * (isTeam2 ? 1 : -1);
              moved = true;
            }

            if (moved) {
              // Enforce strict 20% larger throwing box boundaries
              const minX = -3.6;
              const maxX = 3.6;
              const minZ = isTeam2 ? 8 : -4.8;
              const maxZ = isTeam2 ? 12.8 : 0;

              nextX = Math.max(minX, Math.min(maxX, nextX));
              nextZ = Math.max(minZ, Math.min(maxZ, nextZ));

              const nextPos = { ...prev.tossStartPos, x: nextX, z: nextZ };
              if (!isCollidingWithTable(nextPos)) {
                nextState.tossStartPos = nextPos;
                nextState.diePosition = nextPos;
                changed = true;
              }
            }
          } else if (prev.phase === GamePhase.FLIGHT) {
            const opponentTeamIndex = (currentTeamIndex + 1) % 2;
            const opponentTeam = prev.teams[opponentTeamIndex];
            const newDefenders = [...prev.defenderPos];
            let defendersChanged = false;

            opponentTeam.players.forEach((p, i) => {
              if (p.isCPU) return;
              
              let nextX = prev.defenderPos[i].x;
              let nextZ = prev.defenderPos[i].z;
              let moved = false;

              // Identify which human is this (H1 or H2)
              const humans: { teamIndex: number, playerIndex: number }[] = [];
              prev.teams.forEach((t, ti) => {
                t.players.forEach((p, pi) => {
                  if (!p.isCPU) humans.push({ teamIndex: ti, playerIndex: pi });
                });
              });
              const h1 = humans[0];
              const h2 = humans[1];

              const isH1 = h1 && h1.teamIndex === opponentTeamIndex && h1.playerIndex === i;
              const isH2 = h2 && h2.teamIndex === opponentTeamIndex && h2.playerIndex === i;

              if (isH1) {
                if (keysPressed.current.has('ArrowLeft')) { nextX -= defenseSpeed * xDir; moved = true; }
                if (keysPressed.current.has('ArrowRight')) { nextX += defenseSpeed * xDir; moved = true; }
                if (keysPressed.current.has('ArrowUp')) { nextZ += defenseSpeed * zDir; moved = true; }
                if (keysPressed.current.has('ArrowDown')) { nextZ -= defenseSpeed * zDir; moved = true; }
              } else if (isH2) {
                if (keysPressed.current.has('KeyA')) { nextX -= defenseSpeed * xDir; moved = true; }
                if (keysPressed.current.has('KeyD')) { nextX += defenseSpeed * xDir; moved = true; }
                if (keysPressed.current.has('KeyW')) { nextZ += defenseSpeed * zDir; moved = true; }
                if (keysPressed.current.has('KeyS')) { nextZ -= defenseSpeed * zDir; moved = true; }
              }

              if (moved) {
                const nextPos = { ...prev.defenderPos[i], x: Math.max(-15, Math.min(15, nextX)), z: Math.max(-15, Math.min(25, nextZ)) };
                if (!isCollidingWithTable(nextPos)) {
                  newDefenders[i] = nextPos;
                  defendersChanged = true;
                }
              }
            });

            if (defendersChanged) {
              nextState.defenderPos = newDefenders;
              changed = true;
            }
          }

          // 6. Mobile Touch Movement
          if (touchMoveTargetRef.current || (isMobile && (joystickVectorRef.current.x !== 0 || joystickVectorRef.current.y !== 0))) {
            const isTeam2 = currentTeamIndex === 1;
            const playersPerTeam = prev.teams[0].players.length;
            
            if (prev.phase === GamePhase.POSITIONING && !currentPlayer.isCPU && touchMoveTargetRef.current) {
              const dx = touchMoveTargetRef.current.x - prev.tossStartPos.x;
              const dz = touchMoveTargetRef.current.z - prev.tossStartPos.z;
              const dist = Math.sqrt(dx*dx + dz*dz);
              if (dist > 0.1) {
                const speed = 0.2;
                const nextX = prev.tossStartPos.x + (dx / dist) * speed;
                const nextZ = prev.tossStartPos.z + (dz / dist) * speed;
                const nextPos = { ...prev.tossStartPos, x: nextX, z: nextZ };
                if (!isCollidingWithTable(nextPos)) {
                  nextState.tossStartPos = nextPos;
                  changed = true;
                }
              }
            } else if (prev.phase === GamePhase.FLIGHT) {
              const opponentTeamIndex = (currentTeamIndex + 1) % 2;
              const opponentTeam = prev.teams[opponentTeamIndex];
              
              opponentTeam.players.forEach((p, i) => {
                if (p.isCPU) return;
                // For mobile, we move the first human defender
                if (i === 0) {
                  let nextX = prev.defenderPos[i].x;
                  let nextZ = prev.defenderPos[i].z;

                  if (isMobile && (joystickVectorRef.current.x !== 0 || joystickVectorRef.current.y !== 0)) {
                    // Joystick movement
                    const speed = 0.5;
                    const direction = isTeam2 ? -1 : 1;
                    // Joystick X moves player X
                    // Joystick Y moves player Z (forward/backward)
                    // Pushing UP (negative Y) should move player TOWARDS the table
                    nextX += joystickVectorRef.current.x * speed;
                    nextZ -= joystickVectorRef.current.y * speed * direction;
                  } else if (touchMoveTargetRef.current) {
                    // Tap to move (fallback or if joystick not used)
                    const dx = touchMoveTargetRef.current.x - prev.defenderPos[i].x;
                    const dz = touchMoveTargetRef.current.z - prev.defenderPos[i].z;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    if (dist > 0.1) {
                      const speed = 0.5;
                      nextX = prev.defenderPos[i].x + (dx / dist) * speed;
                      nextZ = prev.defenderPos[i].z + (dz / dist) * speed;
                    }
                  }

                  const nextPos = { ...prev.defenderPos[i], x: nextX, z: nextZ };
                  if (!isCollidingWithTable(nextPos)) {
                    const newDefenders = [...prev.defenderPos];
                    newDefenders[i] = nextPos;
                    nextState.defenderPos = newDefenders;
                    changed = true;
                  }
                }
              });
            }
          }

          // 6. Mobile Auto-Catch
          if (isMobile && prev.phase === GamePhase.FLIGHT && !prev.isCaught) {
            const opponentTeamIndex = (currentTeamIndex + 1) % 2;
            prev.teams[opponentTeamIndex].players.forEach((p, i) => {
              if (p.isCPU) return;
              const dist = Math.sqrt(
                Math.pow(prev.defenderPos[i].x - prev.diePosition.x, 2) + 
                Math.pow(prev.defenderPos[i].z - prev.diePosition.z, 2)
              );
              // Auto-catch if close enough (within 2.0 units for better mobile feel)
              if (dist < 2.0 && prev.diePosition.y < 4 && prev.diePosition.y > 0.2) {
                handleCatch(i);
              }
            });
          }

          if (currentPlayer.isCPU && !isLockingRef.current) {
            if (prev.phase === GamePhase.AIMING_SIDE && cpuTargetsRef.current.side !== null) {
              if (Math.abs(prev.tossAngleSide - cpuTargetsRef.current.side) < 4) {
                setIsLocking(true);
                setLastLockedValue(`Side: ${prev.tossAngleSide.toFixed(0)}°`);
                setTimeout(() => {
                  setGameState(s => ({ ...s, phase: GamePhase.AIMING_UP }));
                  setIsLocking(false);
                  setLastLockedValue(null);
                  cpuTargetsRef.current.side = null;
                }, 800);
              }
            } else if (prev.phase === GamePhase.AIMING_UP && cpuTargetsRef.current.up !== null) {
              if (Math.abs(prev.tossAngleUp - cpuTargetsRef.current.up) < 2) {
                setIsLocking(true);
                setLastLockedValue(`Angle: ${prev.tossAngleUp.toFixed(0)}°`);
                setTimeout(() => {
                  setGameState(s => ({ ...s, phase: GamePhase.POWER }));
                  setIsLocking(false);
                  setLastLockedValue(null);
                  cpuTargetsRef.current.up = null;
                }, 800);
              }
            } else if (prev.phase === GamePhase.POWER && cpuTargetsRef.current.power !== null) {
              if (Math.abs(prev.tossPower - cpuTargetsRef.current.power) < 3) {
                setIsLocking(true);
                setLastLockedValue(`Power: ${prev.tossPower.toFixed(0)}%`);
                setTimeout(() => {
                  handleToss();
                  setIsLocking(false);
                  setLastLockedValue(null);
                  cpuTargetsRef.current.power = null;
                }, 1000);
              }
            } else if (prev.phase === GamePhase.POSITIONING && cpuMoveTargetRef.current) {
              const dx = cpuMoveTargetRef.current.x - prev.tossStartPos.x;
              const dz = cpuMoveTargetRef.current.z - prev.tossStartPos.z;
              const dist = Math.sqrt(dx*dx + dz*dz);
              if (dist > 0.1) {
                const speed = 0.1;
                const nextX = prev.tossStartPos.x + (dx / dist) * speed;
                const nextZ = prev.tossStartPos.z + (dz / dist) * speed;
                nextState.tossStartPos = { ...prev.tossStartPos, x: nextX, z: nextZ };
                changed = true;
              } else {
                cpuMoveTargetRef.current = null;
                setTimeout(() => {
                  setGameState(s => ({ ...s, phase: GamePhase.AIMING_UP }));
                }, 500);
              }
            }
          }

          if (changed) {
            const finalState = { ...prev, ...nextState };
            
            // Record frame if in flight
            if (prev.phase === GamePhase.FLIGHT) {
              const currentFrame = {
                diePosition: { ...finalState.diePosition },
                defenderPos: [...finalState.defenderPos],
                isCaught: finalState.isCaught,
                catcherIndex: finalState.catcherIndex,
                isSink: finalState.isSink,
                message: finalState.message
              };
              replayFramesRef.current.push(currentFrame);
              
              if (finalState.phase === GamePhase.RESULT) {
                const finalReplayFrames = [...replayFramesRef.current];
                return { ...finalState, replayFrames: finalReplayFrames };
              }
            }
            
            return finalState;
          }
          return prev;
        });
      }
      lastTimeRef.current = time;
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);
      const currentGameState = gameStateRef.current;
      const locking = isLockingRef.current;

      if (locking) return;

      const playersPerTeam = currentGameState.teams[0].players.length;
      const currentTeamIndex = Math.floor(currentGameState.currentPlayerIndex / playersPerTeam) % 2;
      const currentTeam = currentGameState.teams[currentTeamIndex];
      const currentPlayer = currentTeam.players[currentGameState.currentPlayerIndex % playersPerTeam];
      const isCPUOffense = currentPlayer.isCPU && 
        [GamePhase.POSITIONING, GamePhase.AIMING_UP, GamePhase.AIMING_SIDE, GamePhase.POWER].includes(currentGameState.phase);

      if (isCPUOffense) return;

      // Identify humans in order
      const humans: { teamIndex: number, playerIndex: number }[] = [];
      currentGameState.teams.forEach((t, ti) => {
        t.players.forEach((p, pi) => {
          if (!p.isCPU) humans.push({ teamIndex: ti, playerIndex: pi });
        });
      });

      const h1 = humans[0];
      const h2 = humans[1];

      const isH1Active = h1 && h1.teamIndex === currentTeamIndex && h1.playerIndex === (currentGameState.currentPlayerIndex % playersPerTeam);
      const isH2Active = h2 && h2.teamIndex === currentTeamIndex && h2.playerIndex === (currentGameState.currentPlayerIndex % playersPerTeam);

      const isPlayer1Action = e.code === 'Space' || e.code === 'Enter';
      const isPlayer2Action = e.code === 'ShiftLeft' || e.code === 'KeyE' || e.code === 'KeyQ';
      const isCatchAction1 = e.code === 'KeyC' || e.code === 'AltLeft' || e.code === 'AltRight';
      const isCatchAction2 = e.code === 'ShiftLeft' || e.code === 'KeyE';
      
      const isCurrentPlayerAction = (isH1Active && isPlayer1Action) || 
                                    (isH2Active && isPlayer2Action) ||
                                    e.code === 'Space';

      if (isCurrentPlayerAction || isPlayer1Action || isPlayer2Action || isCatchAction1 || isCatchAction2) {
        if (currentGameState.phase === GamePhase.RESULT && (isPlayer1Action || isPlayer2Action)) {
          startNewTurn();
          return;
        }
        
        if (currentGameState.phase === GamePhase.FLIGHT && !currentGameState.isCaught) {
          const opponentTeamIndex = (currentTeamIndex + 1) % 2;
          currentGameState.teams[opponentTeamIndex].players.forEach((p, i) => {
            if (p.isCPU) return;
            const isH1Defending = h1 && h1.teamIndex === opponentTeamIndex && h1.playerIndex === i;
            const isH2Defending = h2 && h2.teamIndex === opponentTeamIndex && h2.playerIndex === i;
            
            if (isH1Defending && isCatchAction1) handleCatch(i);
            if (isH2Defending && isCatchAction2) handleCatch(i);
          });
        }
        
        setGameState(prev => {
          switch (prev.phase) {
            case GamePhase.POSITIONING:
              if (!isCurrentPlayerAction) return prev;
              return { ...prev, phase: GamePhase.AIMING_SIDE, message: "" };
            case GamePhase.AIMING_SIDE:
              if (!isCurrentPlayerAction) return prev;
              setIsLocking(true);
              setLastLockedValue(`Side: ${prev.tossAngleSide.toFixed(0)}°`);
              setTimeout(() => {
                setGameState(s => ({ ...s, phase: GamePhase.AIMING_UP }));
                setIsLocking(false);
                setLastLockedValue(null);
              }, 1000);
              return prev;
            case GamePhase.AIMING_UP:
              if (!isCurrentPlayerAction) return prev;
              setIsLocking(true);
              setLastLockedValue(`Angle: ${prev.tossAngleUp.toFixed(0)}°`);
              setTimeout(() => {
                setGameState(s => ({ ...s, phase: GamePhase.POWER }));
                setIsLocking(false);
                setLastLockedValue(null);
              }, 1000);
              return prev;
            case GamePhase.POWER:
              if (!isCurrentPlayerAction) return prev;
              setIsLocking(true);
              setLastLockedValue(`Power: ${prev.tossPower.toFixed(0)}%`);
              setTimeout(() => {
                handleToss();
                setIsLocking(false);
                setLastLockedValue(null);
              }, 1000);
              return prev;
            case GamePhase.FLIGHT:
              const newLastCatchAttempt = [...prev.lastCatchAttempt];
              const opponentTeamIndex = (currentTeamIndex + 1) % 2;
              prev.teams[opponentTeamIndex].players.forEach((p, i) => {
                if (p.isCPU) return;
                const isH1Defending = h1 && h1.teamIndex === opponentTeamIndex && h1.playerIndex === i;
                const isH2Defending = h2 && h2.teamIndex === opponentTeamIndex && h2.playerIndex === i;
                
                if (isH1Defending && isCatchAction1) {
                  handleCatch(i);
                  newLastCatchAttempt[i] = Date.now();
                }
                if (isH2Defending && isCatchAction2) {
                  handleCatch(i);
                  newLastCatchAttempt[i] = Date.now();
                }
              });
              return { ...prev, lastCatchAttempt: newLastCatchAttempt };
            case GamePhase.GAME_OVER:
              return INITIAL_STATE;
            default:
              return prev;
          }
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleToss, startNewTurn, handleCatch]);

  // CPU AI Logic
  useEffect(() => {
    const playersPerTeam = gameState.teams[0].players.length;
    const currentTeamIndex = Math.floor(gameState.currentPlayerIndex / playersPerTeam) % 2;
    const currentTeam = gameState.teams[currentTeamIndex];
    const currentPlayer = currentTeam.players[gameState.currentPlayerIndex % playersPerTeam];
    const opponentTeamIndex = (currentTeamIndex + 1) % 2;
    const opponentTeam = gameState.teams[opponentTeamIndex];
    const phase = gameState.phase;
    const actionKey = `${phase}-${gameState.currentPlayerIndex}`;

    if (cpuPendingActionRef.current === actionKey) return;

    if (phase === GamePhase.POSITIONING && currentPlayer.isCPU) {
      cpuPendingActionRef.current = actionKey;
      cpuActionTimeoutRef.current = window.setTimeout(() => {
        const isTeam2 = currentTeamIndex === 1;
        cpuMoveTargetRef.current = {
          x: (Math.random() - 0.5) * 2,
          y: 5,
          z: isTeam2 ? 10 + (Math.random() - 0.5) * 2 : -2 + (Math.random() - 0.5) * 2
        };
        cpuPendingActionRef.current = null;
      }, 1000);
    }

    if (phase === GamePhase.AIMING_SIDE && currentPlayer.isCPU && !isLocking && cpuTargetsRef.current.side === null) {
      cpuPendingActionRef.current = actionKey;
      cpuActionTimeoutRef.current = window.setTimeout(() => {
        let targetSide = (Math.random() - 0.5) * (gameState.difficulty === Difficulty.HARD ? 1 : 4);
        // Wind compensation: if wind is blowing right (+X), aim left (-X)
        const windComp = Math.cos(gameState.wind.direction) * gameState.wind.speed * 1.5;
        targetSide -= windComp;
        
        cpuTargetsRef.current.side = Math.max(-30, Math.min(30, targetSide));
        cpuPendingActionRef.current = null;
      }, 500);
    }

    if (phase === GamePhase.AIMING_UP && currentPlayer.isCPU && !isLocking && cpuTargetsRef.current.up === null) {
      cpuPendingActionRef.current = actionKey;
      cpuActionTimeoutRef.current = window.setTimeout(() => {
        let targetAngle;
        if (gameState.difficulty === Difficulty.HARD) {
          // Hard mode: aim for a high but reliable arc
          targetAngle = 78 + Math.random() * 4;
        } else {
          const rand = Math.random();
          if (rand < 0.33) {
            targetAngle = 70 + Math.random() * 5;
          } else if (rand < 0.66) {
            targetAngle = 75 + Math.random() * 5;
          } else {
            targetAngle = 81 + Math.random() * 4;
          }
        }
        cpuTargetsRef.current.up = Math.max(45, Math.min(90, targetAngle));
        cpuPendingActionRef.current = null;
      }, 500);
    }

    if (phase === GamePhase.POWER && currentPlayer.isCPU && !isLocking && cpuTargetsRef.current.power === null) {
      cpuPendingActionRef.current = actionKey;
      cpuActionTimeoutRef.current = window.setTimeout(() => {
        let targetPower;
        const upAngle = gameState.tossAngleUp;
        
        if (upAngle <= 75) {
          targetPower = 20 + Math.random() * 10;
        } else if (upAngle <= 80) {
          targetPower = 40 + Math.random() * 10;
        } else {
          targetPower = 80 + Math.random() * 20;
        }

        // Wind compensation for power:
        // If throwing towards +Z (Team 1), and wind is +Z, reduce power
        const playersPerTeam = gameState.teams[0].players.length;
        const currentTeamIndex = Math.floor(gameState.currentPlayerIndex / playersPerTeam) % 2;
        const isTeam2 = currentTeamIndex === 1;
        const direction = isTeam2 ? -1 : 1;
        const windComp = direction * Math.sin(gameState.wind.direction) * gameState.wind.speed * 2.5;
        targetPower -= windComp;
        
        cpuTargetsRef.current.power = Math.max(0, Math.min(100, targetPower));
        cpuPendingActionRef.current = null;
      }, 500);
    }

    // CPU Defense
    if (phase === GamePhase.FLIGHT && opponentTeam.players.some(p => p.isCPU)) {
      const defenseInterval = setInterval(() => {
        setGameState(prev => {
          if (prev.phase !== GamePhase.FLIGHT) return prev;

          // Move towards die landing spot (projected)
          // Loosely track the position of the die
          const targetX = prev.diePosition.x + (Math.random() - 0.5) * 0.5;
          const targetZ = prev.diePosition.z + (Math.random() - 0.5) * 0.5;
          
          const newDefenders = [...prev.defenderPos];
          let changed = false;
          let caught = false;
          let catchMessage = "";
          let catchAttemptTime = [...prev.lastCatchAttempt];
          let catcherIdx: number | null = null;

          for (let i = 0; i < opponentTeam.players.length; i++) {
            if (!opponentTeam.players[i].isCPU) continue;

            const dx = targetX - prev.defenderPos[i].x;
            const dz = targetZ - prev.defenderPos[i].z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist >= 0.1) {
              const isHard = prev.difficulty === Difficulty.HARD || opponentTeamIndex === 0;
              const speed = isHard ? 0.35 : 0.25; // Faster tracking on Hard mode
              const nextX = prev.defenderPos[i].x + (dx / dist) * speed;
              const nextZ = prev.defenderPos[i].z + (dz / dist) * speed;
              
              const nextPos = { ...prev.defenderPos[i], x: nextX, z: nextZ };
              // On Hard mode, be less restrictive about table collision if die is at the side
              const collisionBuffer = isHard ? 0.3 : 0.6;
              const isBesideTable = Math.abs(prev.diePosition.x) > TABLE_WIDTH / 2;
              
              if (isBesideTable || !isCollidingWithTable(nextPos)) {
                newDefenders[i] = nextPos;
                changed = true;
              }
            }
            
            // Auto-catch if close enough
            const dist3D = Math.sqrt(
              Math.pow(prev.diePosition.x - newDefenders[i].x, 2) +
              Math.pow(prev.diePosition.y - 1.2, 2) +
              Math.pow(prev.diePosition.z - newDefenders[i].z, 2)
            );
            
            if (dist3D < 1.2 && prev.diePosition.y > 0.5 && !prev.message.includes("DEAD DIE")) {
              // Catch probability based on difficulty
              const isHard = prev.difficulty === Difficulty.HARD || opponentTeamIndex === 0;
              const catchProb = isHard ? 0.95 : 0.3;
              if (Math.random() < catchProb) {
                caught = true;
                catcherIdx = i;
                const player = opponentTeam.players[i];
                catchMessage = `#${player.jerseyNumber} CAUGHT IT!`;
                catchAttemptTime[i] = Date.now();
                break;
              }
            }
          }

          if (caught) {
            return {
              ...prev,
              defenderPos: newDefenders,
              phase: GamePhase.RESULT,
              isCaught: true,
              catcherIndex: catcherIdx,
              lastCatchAttempt: catchAttemptTime,
              message: catchMessage,
            };
          }

          if (changed) {
            return { ...prev, defenderPos: newDefenders };
          }
          return prev;
        });
      }, 50);
      return () => clearInterval(defenseInterval);
    }

    return () => {
      if (cpuActionTimeoutRef.current) clearTimeout(cpuActionTimeoutRef.current);
    };
  }, [gameState.phase, gameState.currentPlayerIndex, isLocking, handleToss, gameState.teams]);

  if (gameState.phase === GamePhase.TEAM_SETUP) {
    return (
      <TeamSetup 
        onComplete={(config) => {
          const genJersey = () => Math.floor(Math.random() * 99) + 1;
          
          let team1Players: Player[];
          let team2Players: Player[];

          switch (config.mode) {
            case 'solo_vs_cpu':
              team1Players = [{ name: 'Player 1', isCPU: false, jerseyNumber: genJersey() }];
              team2Players = [{ name: 'CPU 1', isCPU: true, jerseyNumber: genJersey() }];
              break;
            case 'solo_vs_human':
              team1Players = [{ name: 'Player 1', isCPU: false, jerseyNumber: genJersey() }];
              team2Players = [{ name: 'Player 2', isCPU: false, jerseyNumber: genJersey() }];
              break;
            case 'human_cpu_vs_human_cpu':
              team1Players = [{ name: 'Player 1', isCPU: false, jerseyNumber: genJersey() }, { name: 'CPU Partner 1', isCPU: true, jerseyNumber: genJersey() }];
              team2Players = [{ name: 'Player 2', isCPU: false, jerseyNumber: genJersey() }, { name: 'CPU Partner 2', isCPU: true, jerseyNumber: genJersey() }];
              break;
            case 'human_human_vs_cpu_cpu':
              team1Players = [{ name: 'Player 1', isCPU: false, jerseyNumber: genJersey() }, { name: 'Player 2', isCPU: false, jerseyNumber: genJersey() }];
              team2Players = [{ name: 'CPU 1', isCPU: true, jerseyNumber: genJersey() }, { name: 'CPU 2', isCPU: true, jerseyNumber: genJersey() }];
              break;
            default:
              team1Players = [{ name: 'Player 1', isCPU: false, jerseyNumber: genJersey() }];
              team2Players = [{ name: 'CPU 1', isCPU: true, jerseyNumber: genJersey() }];
          }
          
          setGameState(prev => {
            const playersPerTeam = team1Players.length;
            const isTeam2 = false;
            const defenderCount = team2Players.length;
            const initialDefenders = Array.from({ length: defenderCount }, (_, i) => ({
              x: defenderCount === 1 ? 0 : (i === 0 ? -2 : 2),
              y: 0,
              z: 10
            }));

            return {
              ...prev,
              phase: GamePhase.POSITIONING,
              difficulty: config.difficulty,
              teams: [
                { name: config.teams[0].name, color: config.teams[0].color, players: team1Players },
                { name: config.teams[1].name, color: config.teams[1].color, players: team2Players }
              ],
              defenderPos: initialDefenders,
              lastCatchAttempt: Array(defenderCount).fill(0),
              message: `${config.teams[0].name.toUpperCase()}'S TURN TO TOSS!`,
            };
          });
        }}
      />
    );
  }

  const handleCanvasTouch = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMobile) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Simple unprojection for mobile movement
    // Based on the camera logic in GameCanvas
    const lerp = gameState.cameraLerp;
    const camY = height * 0.4 + lerp * 100;
    
    // Approximate zScale and pos.z from y
    const zScale = (y - camY) / 60;
    const posZ = (1 - zScale) / 0.03;
    
    // Approximate pos.x from x
    const camX = gameState.sideLerp * 150;
    const posX = (x - width / 2 + camX) / (40 * zScale);

    touchMoveTargetRef.current = { x: posX, z: posZ };

    // Handle locking/tossing on tap
    if (['mousedown', 'touchstart'].includes(e.type)) {
      const currentGameState = gameStateRef.current;
      if (isLockingRef.current) return;

      if ([GamePhase.AIMING_SIDE, GamePhase.AIMING_UP, GamePhase.POWER, GamePhase.POSITIONING].includes(currentGameState.phase)) {
        // Trigger the same logic as SPACE
        const playersPerTeam = currentGameState.teams[0].players.length;
        const currentTeamIndex = Math.floor(currentGameState.currentPlayerIndex / playersPerTeam) % 2;
        const currentPlayer = currentGameState.teams[currentTeamIndex].players[currentGameState.currentPlayerIndex % playersPerTeam];
        
        if (!currentPlayer.isCPU) {
          setGameState(prev => {
            switch (prev.phase) {
              case GamePhase.POSITIONING:
                return { ...prev, phase: GamePhase.AIMING_SIDE, message: "" };
              case GamePhase.AIMING_SIDE:
                setIsLocking(true);
                setLastLockedValue(`Side: ${prev.tossAngleSide.toFixed(0)}°`);
                setTimeout(() => {
                  setGameState(s => ({ ...s, phase: GamePhase.AIMING_UP }));
                  setIsLocking(false);
                  setLastLockedValue(null);
                }, 1000);
                return prev;
              case GamePhase.AIMING_UP:
                setIsLocking(true);
                setLastLockedValue(`Angle: ${prev.tossAngleUp.toFixed(0)}°`);
                setTimeout(() => {
                  setGameState(s => ({ ...s, phase: GamePhase.POWER }));
                  setIsLocking(false);
                  setLastLockedValue(null);
                }, 1000);
                return prev;
              case GamePhase.POWER:
                setIsLocking(true);
                setLastLockedValue(`Power: ${prev.tossPower.toFixed(0)}%`);
                setTimeout(() => {
                  handleToss();
                  setIsLocking(false);
                  setLastLockedValue(null);
                }, 1000);
                return prev;
              default:
                return prev;
            }
          });
        }
      } else if (currentGameState.phase === GamePhase.RESULT) {
        startNewTurn();
      }
    }
  };

  const handleTouchEnd = () => {
    touchMoveTargetRef.current = null;
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans text-white">
      <div 
        className="absolute inset-0"
        onMouseDown={handleCanvasTouch}
        onMouseMove={(e) => e.buttons === 1 && handleCanvasTouch(e)}
        onMouseUp={handleTouchEnd}
        onTouchStart={handleCanvasTouch}
        onTouchMove={handleCanvasTouch}
        onTouchEnd={handleTouchEnd}
      >
        <GameCanvas gameState={gameState} onCatchAttempt={() => {}} isMobile={isMobile} />
      </div>

      <WindIndicator wind={gameState.wind} isMobile={isMobile} cameraLerp={gameState.cameraLerp} sideLerp={gameState.sideLerp} />

      {gameState.phase === GamePhase.RESULT && !gameState.isReplaying && gameState.replayFrames.length > 0 && (
        <div className={`fixed ${isMobile ? 'bottom-4 left-4' : 'bottom-6 left-6'} flex flex-col items-center gap-2 z-50 pointer-events-none`}>
          <ReplayButton onClick={handleReplay} isMobile={isMobile} />
          {recordedVideoUrl ? (
            <motion.button
              onClick={saveRecordedVideo}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1, backgroundColor: '#fff', color: '#000' }}
              className="bg-white/20 text-white text-[9px] font-black tracking-[0.2em] uppercase px-4 py-2.5 rounded-full border border-white/40 shadow-2xl pointer-events-auto"
            >
              SAVE CLIP
            </motion.button>
          ) : (
            <ShareButton onClick={handleShare} />
          )}
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none flex flex-col p-4 md:p-6">
        <div className="flex justify-between items-start">
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={`${isMobile ? 'border-2 p-1.5' : 'border-[3px] p-3'} border-white rounded-2xl shadow-xl`}
            style={{ backgroundColor: gameState.teams[0].color }}
          >
            <h2 className={`${isMobile ? 'text-[8px]' : 'text-base'} font-black uppercase italic tracking-tighter`}>{gameState.teams[0].name}</h2>
            <p className={`${isMobile ? 'text-lg' : 'text-3xl'} font-black text-center`}>{gameState.score[0]}</p>
          </motion.div>

          <div className="flex flex-col items-center gap-2">
            <div className="bg-white/10 backdrop-blur-md rounded-full px-6 py-1.5 border border-white/20 flex flex-col items-center pointer-events-auto">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/80">Beer Die Classic</p>
              <p className="text-[8px] italic text-white/80">First to 11 Points!</p>
            </div>
            <div className={`text-[8px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full ${gameState.difficulty === Difficulty.HARD ? 'bg-red-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
              {gameState.difficulty === Difficulty.HARD ? 'HARD MODE' : 'EASY MODE'}
            </div>
            <button 
              onClick={() => setGameState(INITIAL_STATE)}
              className="pointer-events-auto text-[10px] md:text-xs uppercase font-bold tracking-tighter text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
            >
              <RotateCcw size={10} />
              Restart Game
            </button>
          </div>

          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={`${isMobile ? 'border-2 p-1.5' : 'border-[3px] p-3'} border-white rounded-2xl shadow-xl`}
            style={{ backgroundColor: gameState.teams[1].color }}
          >
            <h2 className={`${isMobile ? 'text-[8px]' : 'text-base'} font-black uppercase italic tracking-tighter`}>{gameState.teams[1].name}</h2>
            <p className={`${isMobile ? 'text-lg' : 'text-3xl'} font-black text-center`}>{gameState.score[1]}</p>
          </motion.div>
        </div>

        <div className={`flex-1 flex flex-col items-center justify-start ${isMobile ? 'pt-4' : 'pt-10'}`}>
          <AnimatePresence mode="wait">
            {gameState.message && (
              <motion.div
                key={gameState.message}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-center px-4"
              >
                <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black uppercase italic text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,1)]`}>
                  {gameState.message}
                </h1>
                {gameState.phase === GamePhase.RESULT && (
                  <p className={`mt-3 ${isMobile ? 'text-xs' : 'text-sm'} font-bold bg-black/50 px-3 py-1.5 rounded-full inline-block`}>
                    {isMobile ? 'Tap to continue' : 'Press SPACE to continue'}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {lastLockedValue && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-3 bg-white text-black px-5 py-1.5 rounded-full font-black text-xl shadow-2xl border-[3px] border-yellow-400"
            >
              LOCKED: {lastLockedValue}
            </motion.div>
          )}
        </div>

        <div className={`flex justify-center items-end gap-4 md:gap-8 ${isMobile ? 'mb-4' : 'mb-8'}`}>
          {gameState.phase === GamePhase.POSITIONING && (
            <div className={`${isMobile ? 'p-3' : 'p-6'} bg-black/60 rounded-3xl border-2 border-white/30 backdrop-blur-xl`}>
              <p className="text-yellow-400 font-black uppercase mb-1 text-xs md:text-base">Step 1: Position</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="bg-white/20 p-1.5 rounded-lg text-[10px] md:text-sm">{isMobile ? 'Tap screen to walk' : '← / → / ↑ / ↓ to walk'}</div>
                  <div className="bg-yellow-400 text-black px-3 py-0.5 rounded-full font-bold text-[10px] md:text-sm">{isMobile ? 'Tap to lock' : 'SPACE to lock'}</div>
                </div>
              </div>
            </div>
          )}

          {gameState.phase === GamePhase.AIMING_SIDE && (
            <div className={`${isMobile ? 'p-3 w-48' : 'p-6 w-64'} bg-black/60 rounded-3xl border-2 border-white/30 backdrop-blur-xl`}>
              <p className="text-yellow-400 font-black uppercase mb-1 text-xs md:text-base">Step 2: Side Angle</p>
              <div className="h-3 md:h-4 bg-white/20 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute top-0 bottom-0 w-2 bg-orange-500"
                  style={{ left: `${((gameState.tossAngleSide + 30) / 60) * 100}%` }}
                />
              </div>
              <p className="text-center mt-1 text-[8px] md:text-xs font-bold">{isMobile ? 'Tap to lock' : 'SPACE to lock'} ({gameState.tossAngleSide.toFixed(0)}°)</p>
            </div>
          )}

          {gameState.phase === GamePhase.AIMING_UP && (
            <div className={`${isMobile ? 'p-3 w-48' : 'p-6 w-64'} bg-black/60 rounded-3xl border-2 border-white/30 backdrop-blur-xl`}>
              <p className="text-yellow-400 font-black uppercase mb-1 text-xs md:text-base">Step 3: Up Angle</p>
              <div className="h-3 md:h-4 bg-white/20 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute top-0 bottom-0 w-2 bg-yellow-400"
                  style={{ left: `${((gameState.tossAngleUp - 45) / 40) * 100}%` }}
                />
              </div>
              <p className="text-center mt-1 text-[8px] md:text-xs font-bold">{isMobile ? 'Tap to lock' : 'SPACE to lock'} ({gameState.tossAngleUp.toFixed(0)}°)</p>
            </div>
          )}

          {gameState.phase === GamePhase.POWER && (
            <div className={`${isMobile ? 'p-3 w-48' : 'p-6 w-64'} bg-black/60 rounded-3xl border-2 border-white/30 backdrop-blur-xl`}>
              <p className="text-yellow-400 font-black uppercase mb-1 text-xs md:text-base">Step 4: Power</p>
              <div className="h-3 md:h-4 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                  style={{ width: `${gameState.tossPower}%` }}
                />
              </div>
              <p className="text-center mt-1 text-[8px] md:text-xs font-bold">{isMobile ? 'Tap to TOSS!' : 'SPACE to TOSS!'}</p>
            </div>
          )}

          {gameState.phase === GamePhase.FLIGHT && gameState.teams[(Math.floor(gameState.currentPlayerIndex / gameState.teams[0].players.length) + 1) % 2].players.some(p => !p.isCPU) && (
            <div className={`${isMobile ? 'p-3' : 'p-6'} bg-black/60 rounded-3xl border-2 border-white/30 backdrop-blur-xl flex flex-col items-center gap-3`}>
              <p className="text-yellow-400 font-black uppercase mb-1 text-xs md:text-base">Defense Mode!</p>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="bg-white/20 p-1.5 rounded-lg text-[10px] md:text-sm">{isMobile ? 'Use Joystick to move' : 'ARROWS / WASD to move'}</div>
                <div className="bg-yellow-400 text-black px-3 py-0.5 rounded-full font-bold text-[10px] md:text-sm">{isMobile ? 'Auto-Catch Active' : 'OPTION to CATCH'}</div>
              </div>
              {isMobile && (
                <div className="mt-2">
                  <Joystick onMove={(v) => { joystickVectorRef.current = v; }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {gameState.phase === GamePhase.GAME_OVER && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`bg-white ${isMobile ? 'p-6 rounded-[2rem]' : 'p-12 rounded-[3rem]'} border-8 border-yellow-400 shadow-[0_20px_0_rgba(0,0,0,0.3)] text-center max-w-2xl`}
          >
            <Trophy className="mx-auto text-yellow-500 mb-6" size={isMobile ? 80 : 120} />
            <h1 className={`${isMobile ? 'text-3xl' : 'text-6xl'} font-black text-slate-900 uppercase italic tracking-tighter mb-4`}>
              CHAMPIONS!
            </h1>
            <p className="text-slate-600 font-bold text-xl mb-8">
              {gameState.message}
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => setGameState(INITIAL_STATE)}
                className={`${isMobile ? 'text-xl px-8 py-4' : 'text-2xl px-10 py-5'} bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full border-b-8 border-blue-800 active:border-b-0 active:translate-y-2 transition-all flex items-center gap-4 pointer-events-auto`}
              >
                <RotateCcw size={isMobile ? 20 : 24} /> REPLAY
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {gameState.phase === GamePhase.START_SCREEN && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`bg-white ${isMobile ? 'p-6 rounded-[2rem]' : 'p-12 rounded-[3rem]'} border-8 border-blue-600 shadow-[0_20px_0_rgba(0,0,0,0.3)] text-center max-w-2xl`}
          >
            <h1 className={`${isMobile ? 'text-4xl' : 'text-7xl'} font-black text-blue-600 uppercase italic tracking-tighter mb-4`}>
              Backyard<br/><span className="text-red-600">Beer Die</span>
            </h1>
            <p className={`text-slate-600 font-bold ${isMobile ? 'text-sm' : 'text-lg'} mb-8`}>
              The classic table game, reimagined with backyard vibes!<br/>
              Toss high, hit the table, and don't let 'em catch it.
            </p>
            <button 
              onClick={() => setGameState(prev => ({ ...prev, phase: GamePhase.TEAM_SETUP }))}
              className={`${isMobile ? 'text-2xl px-10 py-5' : 'text-3xl px-12 py-6'} bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-full border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all flex items-center gap-4 mx-auto pointer-events-auto`}
            >
              <Play fill="black" size={isMobile ? 24 : 32} /> PLAY BALL!
            </button>
            <div className={`mt-8 grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2 md:gap-4 text-left text-[10px] md:text-sm font-bold text-slate-500`}>
              <div className="flex items-center gap-2"><Info size={16}/> {isMobile ? 'Tap screen to move' : 'Use Arrows to move'}</div>
              <div className="flex items-center gap-2"><Info size={16}/> {isMobile ? 'Tap to lock actions' : 'Space for all actions'}</div>
              <div className="flex items-center gap-2"><Info size={16}/> Win by 2 points</div>
              <div className="flex items-center gap-2"><Info size={16}/> Sinks = Instant Kill & Fill</div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
