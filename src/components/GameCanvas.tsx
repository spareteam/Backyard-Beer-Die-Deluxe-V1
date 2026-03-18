import React, { useEffect, useRef } from 'react';
import { GamePhase, GameState, Vector3 } from '../types';
import { TABLE_WIDTH, TABLE_DEPTH, TABLE_HEIGHT, COLORS } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  onCatchAttempt: (pos: Vector3) => void;
  isMobile: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onCatchAttempt, isMobile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef(gameState);

  // Sync ref with prop
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Projection function: Robust 3D camera system
  const project = (v: Vector3, width: number, height: number, lerp: number, sideLerp: number) => {
    // 1. Transform to local coordinates using sideLerp for smooth swing
    const theta = sideLerp * Math.PI;
    const cz = TABLE_DEPTH / 2;
    
    // Rotate around center of table (0, 0, cz)
    const rx = v.x;
    const rz = v.z - cz;
    
    let lx = rx * Math.cos(theta) + rz * Math.sin(theta);
    let lz = (-rx * Math.sin(theta) + rz * Math.cos(theta)) + cz;
    let ly = v.y;

    const centerX = width / 2;
    const centerY = height / 2;

    // Camera positions in local space
    // Isometric (lerp=0)
    const camPosIso = { x: 10, y: 10, z: -5 };
    const camTargetIso = { x: 0, y: 0, z: 4 };
    
    // Head-on Behind-the-player (lerp=1)
    const camPosHead = { x: 0, y: 7, z: -9 }; 
    const camTargetHead = { x: 0, y: 1, z: 4 };
    
    const camPos = {
      x: camPosIso.x + (camPosHead.x - camPosIso.x) * lerp,
      y: camPosIso.y + (camPosHead.y - camPosIso.y) * lerp,
      z: camPosIso.z + (camPosHead.z - camPosIso.z) * lerp,
    };
    
    const camTarget = {
      x: camTargetIso.x + (camTargetHead.x - camTargetIso.x) * lerp,
      y: camTargetIso.y + (camTargetHead.y - camTargetIso.y) * lerp,
      z: camTargetIso.z + (camTargetHead.z - camTargetIso.z) * lerp,
    };

    // Relative to camera
    let relX = lx - camPos.x;
    let relY = ly - camPos.y;
    let relZ = lz - camPos.z;
    
    // Camera direction angles
    const dx = camTarget.x - camPos.x;
    const dy = camTarget.y - camPos.y;
    const dz = camTarget.z - camPos.z;
    
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, Math.sqrt(dx*dx + dz*dz));
    
    // Yaw rotation (around Y)
    let x1 = relX * Math.cos(-yaw) + relZ * Math.sin(-yaw);
    let z1 = -relX * Math.sin(-yaw) + relZ * Math.cos(-yaw);
    
    // Pitch rotation (around X)
    let y2 = relY * Math.cos(-pitch) - z1 * Math.sin(-pitch);
    let z2 = relY * Math.sin(-pitch) + z1 * Math.cos(-pitch);
    
    // Perspective
    const fov = 500;
    const perspective = fov / (fov + z2 * 40);
    
    // Scale factor
    const baseScale = isMobile ? 60 : 66;
    
    return {
      x: centerX + x1 * baseScale * perspective,
      y: centerY - y2 * baseScale * perspective,
      s: perspective * (baseScale / 50),
      z: z2
    };
  };

  const drawCharacter = (ctx: CanvasRenderingContext2D, pos: Vector3, color: string, width: number, height: number, lerp: number, sideLerp: number, isDefender: boolean = false, lastCatchAttempt: number = 0, isDancing: boolean = false, jerseyNumber: number = 0, isGhost: boolean = false) => {
    // Calculate hop animation
    let hopY = 0;
    if (isDefender && lastCatchAttempt > 0) {
      const elapsed = (Date.now() - lastCatchAttempt) / 1000;
      if (elapsed < 0.3) {
        // Simple parabolic hop
        hopY = Math.sin((elapsed / 0.3) * Math.PI) * 1.5;
      }
    }

    // Dance animation
    let danceX = 0;
    let danceScale = 1;
    let danceRotation = 0;
    if (isDancing) {
      const t = Date.now() / 150;
      danceX = Math.sin(t) * 10;
      danceScale = 1 + Math.abs(Math.sin(t)) * 0.2;
      danceRotation = Math.sin(t) * 0.2;
    }

    const proj = project({ ...pos, y: pos.y + hopY }, width, height, lerp, sideLerp);
    const s = proj.s;

    ctx.save();
    ctx.translate(proj.x + danceX * s, proj.y);
    ctx.scale(danceScale, danceScale);
    ctx.rotate(danceRotation);
    
    if (isGhost) {
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([4, 4]);
    }

    // Shadow - only if not ghost
    if (!isGhost) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 15 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; // Darker, clearer shadow
      ctx.fill();
    }

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-12 * s, -40 * s, 24 * s, 35 * s, 8 * s);
    if (!isGhost) {
      ctx.fill();
    }
    ctx.strokeStyle = isGhost ? color : 'white';
    ctx.lineWidth = (isGhost ? 1.5 : 2) * s;
    ctx.stroke();

    // Jersey Number
    if (jerseyNumber > 0 && !isGhost) {
      ctx.fillStyle = 'white';
      ctx.font = `bold ${14 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(jerseyNumber.toString(), 0, -22 * s);
    }

    // Head
    ctx.fillStyle = isGhost ? 'transparent' : '#ffdbac';
    ctx.beginPath();
    ctx.arc(0, -45 * s, 10 * s, 0, Math.PI * 2);
    if (!isGhost) ctx.fill();
    ctx.stroke();

    // Cap
    ctx.fillStyle = isGhost ? 'transparent' : (isDefender ? '#1e3a8a' : '#991b1b');
    ctx.beginPath();
    ctx.arc(0, -50 * s, 11 * s, Math.PI, Math.PI * 2);
    if (!isGhost) ctx.fill();
    ctx.stroke();
    
    // Brim
    if (!isGhost) {
      ctx.fillRect(-15 * s, -52 * s, 15 * s, 3 * s);
    }

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const { width, height } = canvas;
      const state = gameStateRef.current;
      const lerp = state.cameraLerp;
      const sideLerp = state.sideLerp;
      const playersPerTeam = state.teams[0]?.players.length || 1;
      ctx.clearRect(0, 0, width, height);

      // Draw Grass with subtle grid for depth
      ctx.fillStyle = COLORS.GRASS;
      ctx.fillRect(0, 0, width, height);
      
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for (let i = -20; i <= 20; i++) {
        const p1 = project({ x: i, y: 0, z: -10 }, width, height, lerp, sideLerp);
        const p2 = project({ x: i, y: 0, z: 20 }, width, height, lerp, sideLerp);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const p3 = project({ x: -20, y: 0, z: i }, width, height, lerp, sideLerp);
        const p4 = project({ x: 20, y: 0, z: i }, width, height, lerp, sideLerp);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }
      
      // Prepare characters
      const characters: any[] = [];
      if (state.phase !== GamePhase.START_SCREEN && state.phase !== GamePhase.TEAM_SETUP) {
        // Offense
        const currentTeamIndex = Math.floor(state.currentPlayerIndex / playersPerTeam) % 2;
        const currentTeam = state.teams[currentTeamIndex];
        const isTeam2 = currentTeamIndex === 1;
        const currentPlayer = currentTeam.players[state.currentPlayerIndex % playersPerTeam];

        characters.push({
          pos: { ...state.tossStartPos, y: 0 },
          color: currentTeam.color,
          isDefender: false,
          lastCatchAttempt: 0,
          isDancing: state.isDancing,
          jerseyNumber: currentPlayer.jerseyNumber
        });
        
        // Non-throwing teammate
        if (playersPerTeam > 1) {
          const isPlayer1 = state.currentPlayerIndex % playersPerTeam === 0;
          const teammate = currentTeam.players[isPlayer1 ? 1 : 0];
          const sideX = isPlayer1 ? 6 : -6;
          const sideZ = isTeam2 ? 10 : -2;
          characters.push({
            pos: { x: sideX, y: 0, z: sideZ },
            color: currentTeam.color,
            isDefender: false,
            lastCatchAttempt: 0,
            isDancing: state.isDancing,
            jerseyNumber: teammate.jerseyNumber
          });
        }
        
        // Defense
        const isAiming = state.phase === GamePhase.AIMING_UP || 
                        state.phase === GamePhase.AIMING_SIDE || 
                        state.phase === GamePhase.POWER;
        
        if (!isAiming) {
          const defendingTeam = state.teams[(currentTeamIndex + 1) % 2];
          defendingTeam.players.forEach((player, i) => {
            if (state.defenderPos[i]) {
              characters.push({
                pos: { ...state.defenderPos[i], y: 0 },
                color: defendingTeam.color,
                isDefender: true,
                lastCatchAttempt: state.lastCatchAttempt[i] || 0,
                isDancing: false,
                jerseyNumber: player.jerseyNumber
              });
            }
          });
        }
      }

      // Depth sorting
      const tableCenterDepth = project({ x: 0, y: TABLE_HEIGHT, z: TABLE_DEPTH / 2 }, width, height, lerp, sideLerp).z;
      const sortedChars = characters.map(c => ({
        ...c,
        depth: project(c.pos, width, height, lerp, sideLerp).z
      }));

      // 1. Draw Far Characters
      sortedChars.filter(c => c.depth > tableCenterDepth).forEach(c => {
        drawCharacter(ctx, c.pos, c.color, width, height, lerp, sideLerp, c.isDefender, c.lastCatchAttempt, c.isDancing, c.jerseyNumber);
      });

      // 2. Draw Table
      const cups = [
        { x: -TABLE_WIDTH / 2 + 0.3, y: TABLE_HEIGHT, z: 0.3 },
        { x: TABLE_WIDTH / 2 - 0.3, y: TABLE_HEIGHT, z: 0.3 },
        { x: -TABLE_WIDTH / 2 + 0.3, y: TABLE_HEIGHT, z: TABLE_DEPTH - 0.3 },
        { x: TABLE_WIDTH / 2 - 0.3, y: TABLE_HEIGHT, z: TABLE_DEPTH - 0.3 },
      ];

      // Draw Table Legs
      const legPositions = [
        { x: -TABLE_WIDTH / 2 + 0.2, z: 0.2 },
        { x: TABLE_WIDTH / 2 - 0.2, z: 0.2 },
        { x: TABLE_WIDTH / 2 - 0.2, z: TABLE_DEPTH - 0.2 },
        { x: -TABLE_WIDTH / 2 + 0.2, z: TABLE_DEPTH - 0.2 },
      ];
      ctx.strokeStyle = '#3d1f06';
      ctx.lineWidth = 4;
      legPositions.forEach(pos => {
        const bottom = project({ ...pos, y: 0 }, width, height, lerp, sideLerp);
        const top = project({ ...pos, y: TABLE_HEIGHT }, width, height, lerp, sideLerp);
        ctx.beginPath();
        ctx.moveTo(bottom.x, bottom.y);
        ctx.lineTo(top.x, top.y);
        ctx.stroke();
      });

      // Draw Table Top
      const tablePoints = [
        { x: -TABLE_WIDTH / 2, y: TABLE_HEIGHT, z: 0 },
        { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT, z: 0 },
        { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT, z: TABLE_DEPTH },
        { x: -TABLE_WIDTH / 2, y: TABLE_HEIGHT, z: TABLE_DEPTH },
      ];
      ctx.beginPath();
      tablePoints.forEach((p, i) => {
        const proj = project(p, width, height, lerp, sideLerp);
        if (i === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      });
      ctx.closePath();
      ctx.fillStyle = COLORS.TABLE;
      ctx.fill();
      ctx.strokeStyle = '#5d2e0a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Midline
      const midLeft = project({ x: -TABLE_WIDTH / 2, y: TABLE_HEIGHT, z: TABLE_DEPTH / 2 }, width, height, lerp, sideLerp);
      const midRight = project({ x: TABLE_WIDTH / 2, y: TABLE_HEIGHT, z: TABLE_DEPTH / 2 }, width, height, lerp, sideLerp);
      ctx.beginPath();
      ctx.moveTo(midLeft.x, midLeft.y);
      ctx.lineTo(midRight.x, midRight.y);
      ctx.strokeStyle = COLORS.TABLE_LINE;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Cups
      cups.forEach(c => {
        const bottomProj = project(c, width, height, lerp, sideLerp);
        const topProj = project({ ...c, y: TABLE_HEIGHT + 0.4 }, width, height, lerp, sideLerp);
        
        // Draw cup body
        ctx.beginPath();
        ctx.moveTo(topProj.x - 10 * topProj.s, topProj.y);
        ctx.lineTo(bottomProj.x - 7 * bottomProj.s, bottomProj.y);
        ctx.lineTo(bottomProj.x + 7 * bottomProj.s, bottomProj.y);
        ctx.lineTo(topProj.x + 10 * topProj.s, topProj.y);
        ctx.closePath();
        ctx.fillStyle = COLORS.CUP;
        ctx.fill();
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw top rim
        ctx.beginPath();
        ctx.ellipse(topProj.x, topProj.y, 10 * topProj.s, 4 * topProj.s, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FF4444'; // Lighter red for inside/rim
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // 3. Draw Near Characters
      sortedChars.filter(c => c.depth <= tableCenterDepth).forEach(c => {
        drawCharacter(ctx, c.pos, c.color, width, height, lerp, sideLerp, c.isDefender, c.lastCatchAttempt, c.isDancing, c.jerseyNumber);
      });

      // 4. Draw Ghost Outlines for Obscured Characters
      sortedChars.filter(c => c.depth > tableCenterDepth).forEach(c => {
        // Check if "under" table bounds
        const isUnderTable = Math.abs(c.pos.x) < TABLE_WIDTH / 2 + 0.5 && 
                             c.pos.z > -0.5 && c.pos.z < TABLE_DEPTH + 0.5;
        if (isUnderTable) {
          drawCharacter(ctx, c.pos, c.color, width, height, lerp, sideLerp, c.isDefender, c.lastCatchAttempt, c.isDancing, c.jerseyNumber, true);
        }
      });

      // Draw Catch Zone Indicator
      if (state.phase === GamePhase.FLIGHT && !state.isCaught) {
          state.defenderPos.forEach((pos, i) => {
            if (i < playersPerTeam) {
              const defenderProj = project({ ...pos, y: 1.2 }, width, height, lerp, state.sideLerp);
              ctx.beginPath();
              ctx.arc(defenderProj.x, defenderProj.y, 40 * defenderProj.s, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.setLineDash([5, 5]);
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.setLineDash([]);
              
              // Pulse effect
              const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
              ctx.beginPath();
              ctx.arc(defenderProj.x, defenderProj.y, (40 + 10 * pulse) * defenderProj.s, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - pulse)})`;
              ctx.stroke();
            }
          });
        }

        // Draw Die
        if (state.phase === GamePhase.FLIGHT || state.phase === GamePhase.RESULT) {
          let diePos = state.diePosition;
          if (state.isCaught && state.catcherIndex !== null) {
            const catcherPos = state.defenderPos[state.catcherIndex];
            if (catcherPos) {
              let hopY = 0;
              const lastCatchAttempt = state.lastCatchAttempt[state.catcherIndex];
              if (lastCatchAttempt > 0) {
                const elapsed = (Date.now() - lastCatchAttempt) / 1000;
                if (elapsed < 0.3) {
                  hopY = Math.sin((elapsed / 0.3) * Math.PI) * 1.5;
                }
              }
              diePos = {
                x: catcherPos.x,
                y: catcherPos.y + 1.2 + hopY,
                z: catcherPos.z
              };
            }
          }

          // Determine shadow height (on table or on ground)
          const isOverTable = Math.abs(diePos.x) <= TABLE_WIDTH / 2 && 
                              diePos.z >= 0 && 
                              diePos.z <= TABLE_DEPTH;
          
          const shadowY = (isOverTable && diePos.y >= TABLE_HEIGHT) ? TABLE_HEIGHT : 0;
          const shadowProj = project({ ...diePos, y: shadowY }, width, height, lerp, state.sideLerp);
          
          ctx.beginPath();
          // Shadow larger (12 instead of 8.8) and more defined (0.7 opacity)
          const shadowSize = Math.max(3, 12 - (diePos.y - shadowY) * 0.6);
          ctx.ellipse(shadowProj.x, shadowProj.y, shadowSize * shadowProj.s, (shadowSize/2) * shadowProj.s, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; 
          ctx.fill();

          const dieProj = project(diePos, width, height, lerp, state.sideLerp);
          
          // Determine if die is behind or beneath the table
          const theta = state.sideLerp * Math.PI;
          const cz = TABLE_DEPTH / 2;
          const rx = diePos.x;
          const rz = diePos.z - cz;
          const lx = rx * Math.cos(theta) + rz * Math.sin(theta);
          const lz = (-rx * Math.sin(theta) + rz * Math.cos(theta)) + cz;
          
          // Improved obscured logic: check if line of sight passes through table top
          const camPos = { x: 10 - 10 * lerp, y: 10 - 3 * lerp, z: -5 - 4 * lerp };
          const ly = diePos.y;
          
          let obscured = false;
          if (ly < TABLE_HEIGHT) {
            const t = (camPos.y - TABLE_HEIGHT) / (camPos.y - ly);
            if (t > 0 && t < 1) {
              const ix = camPos.x + t * (lx - camPos.x);
              const iz = camPos.z + t * (lz - camPos.z);
              if (Math.abs(ix) < TABLE_WIDTH / 2 && iz > 0 && iz < TABLE_DEPTH) {
                obscured = true;
              }
            }
          }

          if (state.isCaught) {
            // Draw a pulsing glow for caught die
            const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
            ctx.shadowBlur = 20 + pulse * 10;
            ctx.shadowColor = 'rgba(255, 255, 0, 0.9)'; // Yellow glow
          } else {
            ctx.shadowBlur = obscured ? 0 : 15;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          }
          ctx.beginPath();
          ctx.rect(dieProj.x - 5 * dieProj.s, dieProj.y - 5 * dieProj.s, 10 * dieProj.s, 10 * dieProj.s);
          
          if (obscured) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Very transparent
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // Bright outline
            ctx.lineWidth = 2 * dieProj.s;
            ctx.stroke();
            // Inner dashed outline for "ghost" effect
            ctx.setLineDash([2, 2]);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1 * dieProj.s;
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            ctx.fillStyle = COLORS.DIE;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }

      // Draw Positioning Square (Invisible square helper)
      if (state.phase === GamePhase.POSITIONING) {
        const playersPerTeam = state.teams[0].players.length;
        const isTeam2 = Math.floor(state.currentPlayerIndex / playersPerTeam) % 2 === 1;
        // Enforce 20% larger boundaries: x: [-3.6, 3.6], z: [-4.8, 0] or [8, 12.8]
        const minZ = isTeam2 ? 8 : -4.8;
        const maxZ = isTeam2 ? 12.8 : 0;
        const minX = -3.6;
        const maxX = 3.6;

        const corners = [
          { x: minX, y: 0, z: minZ },
          { x: maxX, y: 0, z: minZ },
          { x: maxX, y: 0, z: maxZ },
          { x: minX, y: 0, z: maxZ },
        ];

        ctx.beginPath();
        corners.forEach((c, i) => {
          const p = project(c, width, height, lerp, state.sideLerp);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Aiming UI
      if (state.phase === GamePhase.AIMING_UP || state.phase === GamePhase.AIMING_SIDE || state.phase === GamePhase.POWER) {
        const startPos = { ...state.tossStartPos, y: 2 }; // Start from shoulder height
        const upRad = (state.tossAngleUp * Math.PI) / 180;
        const sideRad = (state.tossAngleSide * Math.PI) / 180;
        const playersPerTeam = state.teams[0].players.length;
        const isTeam2 = Math.floor(state.currentPlayerIndex / playersPerTeam) % 2 === 1;
        const direction = isTeam2 ? -1 : 1;
        
        const startProj = project(startPos, width, height, lerp, state.sideLerp);

        // Trajectory Preview
        if (state.phase === GamePhase.POWER || state.phase === GamePhase.AIMING_SIDE || state.phase === GamePhase.AIMING_UP) {
          const power = state.phase === GamePhase.POWER ? state.tossPower : 50; // Preview with 50% power if not in power phase
          const v0 = 8 + (power / 100) * 12;
          const vx = v0 * Math.cos(upRad) * Math.sin(sideRad);
          const vy = v0 * Math.sin(upRad);
          const vz = v0 * Math.cos(upRad) * Math.cos(sideRad) * direction;

          ctx.beginPath();
          ctx.setLineDash([5, 10]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          
          ctx.moveTo(startProj.x, startProj.y);

          for (let t = 0.1; t < 2; t += 0.1) {
            const px = startPos.x + vx * t;
            const py = startPos.y + vy * t - 0.5 * 9.8 * t * t;
            const pz = startPos.z + vz * t;
            
            if (py < -1) break; // Stop if it goes too far below ground

            const p = project({ x: px, y: py, z: pz }, width, height, lerp, state.sideLerp);
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Helper to draw a 3D arrow
        const draw3DArrow = (target: Vector3, color: string, dashed: boolean = false) => {
          const targetProj = project(target, width, height, lerp, state.sideLerp);
          ctx.beginPath();
          ctx.moveTo(startProj.x, startProj.y);
          ctx.lineTo(targetProj.x, targetProj.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = 6 * startProj.s;
          if (dashed) ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          const angle = Math.atan2(targetProj.y - startProj.y, targetProj.x - startProj.x);
          ctx.beginPath();
          ctx.moveTo(targetProj.x, targetProj.y);
          ctx.lineTo(targetProj.x - 20 * Math.cos(angle - 0.5), targetProj.y - 20 * Math.sin(angle - 0.5));
          ctx.lineTo(targetProj.x - 20 * Math.cos(angle + 0.5), targetProj.y - 20 * Math.sin(angle + 0.5));
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        };

        if (state.phase === GamePhase.AIMING_UP) {
          // Vertical Arrow - now relative to side angle
          const target = {
            x: startPos.x + Math.sin(sideRad) * Math.cos(upRad) * 4,
            y: startPos.y + Math.sin(upRad) * 4,
            z: startPos.z + direction * Math.cos(sideRad) * Math.cos(upRad) * 4
          };
          draw3DArrow(target, '#fbbf24'); // Yellow
        } else if (state.phase === GamePhase.AIMING_SIDE) {
          // Horizontal Arrow (on table height for better visual)
          const target = {
            x: startPos.x + Math.sin(sideRad) * 6,
            y: TABLE_HEIGHT,
            z: startPos.z + direction * Math.cos(sideRad) * 6
          };
          draw3DArrow(target, '#f97316'); // Orange
        } else if (state.phase === GamePhase.POWER) {
          // Full 3D Power Arrow
          const powerLen = 2 + (state.tossPower / 100) * 8;
          const target = {
            x: startPos.x + Math.sin(sideRad) * powerLen * Math.cos(upRad),
            y: startPos.y + Math.sin(upRad) * powerLen,
            z: startPos.z + direction * Math.cos(sideRad) * powerLen * Math.cos(upRad)
          };
          draw3DArrow(target, '#ef4444'); // Red
        }

        // Replay Overlay
        if (state.isReplaying) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
          ctx.fillRect(0, 0, width, height);
          
          ctx.font = 'bold 40px Inter';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'black';
          ctx.fillText('INSTANT REPLAY', width / 2, 80);
          
          // Recording dot
          const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(width / 2 - 180, 68, 10, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + pulse * 0.5})`;
          ctx.fill();

          // Score Overlay in Replay
          ctx.textAlign = 'left';
          ctx.font = 'bold 24px Inter';
          ctx.fillText(`${state.teams[0].name}: ${state.score[0]}`, 40, height - 80);
          ctx.fillText(`${state.teams[1].name}: ${state.score[1]}`, 40, height - 40);

          // Wind Overlay in Replay
          const windX = width - 80;
          const windY = height - 80;
          ctx.save();
          ctx.translate(windX, windY);
          ctx.rotate(state.wind.direction);
          
          // Wind Arrow
          ctx.beginPath();
          ctx.moveTo(0, -20);
          ctx.lineTo(10, 0);
          ctx.lineTo(5, 0);
          ctx.lineTo(5, 20);
          ctx.lineTo(-5, 20);
          ctx.lineTo(-5, 0);
          ctx.lineTo(-10, 0);
          ctx.closePath();
          ctx.fillStyle = 'white';
          ctx.fill();
          ctx.restore();

          const windCallout = state.wind.speed > 8 ? 'GUSTY' : state.wind.speed > 5 ? 'BREEZY' : state.wind.speed > 2 ? 'LIGHT' : 'CALM';
          ctx.textAlign = 'center';
          ctx.font = 'bold 16px Inter';
          ctx.fillStyle = '#ef4444'; // red-500
          ctx.fillText(windCallout, windX, windY + 40);
          ctx.font = 'bold 12px Inter';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText(`${state.wind.speed.toFixed(1)} FT/S`, windX, windY + 60);
          
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block touch-none"
      id="game-canvas"
    />
  );
};

export default GameCanvas;
