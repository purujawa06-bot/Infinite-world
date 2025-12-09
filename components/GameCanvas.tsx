import React, { useRef, useEffect } from 'react';
import { Player, WORLD_SIZE, INITIAL_RADIUS } from '../types';
import { 
  joinGame, 
  leaveGame, 
  updateSelf, 
  playersMap, 
  foodMap, 
  removeEntity 
} from '../services/firebaseService';
import { getRandomColor, getRandomPosition, checkCollision, checkConsumption, getWrappedDelta } from '../utils/gameUtils';

interface GameCanvasProps {
  playerName: string;
  onGameOver: (score: number) => void;
  setLeaderboard: (players: Player[]) => void;
  setMyPlayerStats: (player: Player) => void;
  setFps: (fps: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  playerName, 
  onGameOver, 
  setLeaderboard,
  setMyPlayerStats,
  setFps
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Cache for smoothing movements (Linear Interpolation)
  const renderCacheRef = useRef<Map<string, Player>>(new Map());
  
  // Game State
  const myPlayerRef = useRef<Player>({
    id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: playerName,
    x: getRandomPosition(),
    y: getRandomPosition(),
    radius: INITIAL_RADIUS,
    color: getRandomColor()
  });

  const viewportRef = useRef({ x: 0, y: 0, scale: 1 });
  const inputRef = useRef({ x: 0, y: 0, active: false }); // Relative to screen center

  // Initialization
  useEffect(() => {
    joinGame(myPlayerRef.current);

    return () => {
      leaveGame();
    };
  }, []);

  // Input Handling (Mouse & Touch)
  useEffect(() => {
    const handleInput = (clientX: number, clientY: number) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      inputRef.current = { 
        x: clientX - centerX, 
        y: clientY - centerY,
        active: true
      };
    };

    const handleMouseMove = (e: MouseEvent) => handleInput(e.clientX, e.clientY);
    
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouch, { passive: false });
    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Main Game Loop
  useEffect(() => {
    let frameCount = 0;
    let lastFpsTime = 0;
    
    const animate = (timestamp: number) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Calculate Delta Time
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 16.67;
      lastTimeRef.current = timestamp;

      // FPS Calculation
      if (timestamp - lastFpsTime > 1000) {
        setFps(Math.round(1000 / ((timestamp - lastFpsTime) / (frameCount || 1))));
        lastFpsTime = timestamp;
        frameCount = 0;
      }
      frameCount++;

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      const myPlayer = myPlayerRef.current;

      // --- 1. Physics (Move Self) ---
      if (inputRef.current.active) {
        const { x: dx, y: dy } = inputRef.current;
        const dist = Math.hypot(dx, dy);
        
        const maxSpeed = Math.max(2, 25 * Math.pow(myPlayer.radius, -0.4));
        
        if (dist > 5) {
           const moveFactor = (maxSpeed * deltaTime); 
           myPlayer.x += (dx / dist) * moveFactor;
           myPlayer.y += (dy / dist) * moveFactor;
        }

        // WRAPPING LOGIC: Endless world
        myPlayer.x = ((myPlayer.x % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE;
        myPlayer.y = ((myPlayer.y % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE;
      }

      // --- 2. Interpolation (Smoothing Other Players) ---
      const renderPlayers: Player[] = [];
      const activeIds = new Set<string>();

      playersMap.forEach(p => {
        activeIds.add(p.id);

        if (p.id === myPlayer.id) {
          renderPlayers.push(myPlayer);
          return;
        }

        let cached = renderCacheRef.current.get(p.id);
        
        if (!cached) {
          cached = { ...p };
          renderCacheRef.current.set(p.id, cached);
        } else {
          const lerpFactor = 0.1 * deltaTime; 
          
          // Distance check for Interpolation (Handle Teleports/Wraps)
          // If distance is huge (crossed world edge), snap instantly to prevent Lerp streaking
          const dx = p.x - cached.x;
          const dy = p.y - cached.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist > WORLD_SIZE / 2) {
            // Player wrapped around world in data, snap render cache
            cached.x = p.x;
            cached.y = p.y;
          } else {
            // Smooth lerp
            cached.x += dx * lerpFactor;
            cached.y += dy * lerpFactor;
          }
          cached.radius += (p.radius - cached.radius) * lerpFactor;
          cached.color = p.color;
          cached.name = p.name;
        }
        renderPlayers.push(cached);
      });

      // Cleanup cache
      for (const id of renderCacheRef.current.keys()) {
        if (!activeIds.has(id)) {
          renderCacheRef.current.delete(id);
        }
      }

      // --- 3. Collision Logic ---
      
      // Check Food
      foodMap.forEach((f) => {
        // Use wrapping collision check
        if (checkCollision(myPlayer.x, myPlayer.y, myPlayer.radius, f.x, f.y, f.radius)) {
          const newArea = Math.PI * myPlayer.radius ** 2 + Math.PI * f.radius ** 2 * 0.5;
          myPlayer.radius = Math.sqrt(newArea / Math.PI);
          removeEntity('food', f.id);
        }
      });

      // Check Players
      playersMap.forEach((other) => {
        if (other.id === myPlayer.id) return;

        // Wrapped Distance Calculation
        const dx = getWrappedDelta(myPlayer.x, other.x);
        const dy = getWrappedDelta(myPlayer.y, other.y);
        const dist = Math.hypot(dx, dy);
        
        if (checkConsumption(myPlayer.radius, other.radius, dist)) {
           const newArea = Math.PI * myPlayer.radius ** 2 + Math.PI * other.radius ** 2;
           myPlayer.radius = Math.sqrt(newArea / Math.PI);
           removeEntity('player', other.id);
        } 
        else if (checkConsumption(other.radius, myPlayer.radius, dist)) {
          onGameOver(myPlayer.radius);
          leaveGame(); 
          cancelAnimationFrame(requestRef.current!);
          return;
        }
      });

      // --- 4. Render (Relative to Player for Infinite Scroll) ---
      
      // Camera Smoothing
      const targetScale = 50 / myPlayer.radius; 
      const clampedScale = Math.max(0.15, Math.min(1.2, targetScale)); 
      const camLerp = 0.1 * deltaTime;
      viewportRef.current.scale = viewportRef.current.scale + (clampedScale - viewportRef.current.scale) * camLerp;
      
      // Note: We no longer lerp Viewport X/Y because the camera is "Fixed" on the player for infinite scrolling.
      // We render everything *relative* to the player.

      // Draw Background
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      
      // Center the context on screen
      ctx.translate(width / 2, height / 2);
      ctx.scale(viewportRef.current.scale, viewportRef.current.scale);

      // --- Infinite Grid ---
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      const gridSize = 100;
      // Calculate grid offset based on player position to create movement illusion
      const offsetX = myPlayer.x % gridSize;
      const offsetY = myPlayer.y % gridSize;
      
      // Determine how many grid lines fit on screen at current scale
      const viewW = width / viewportRef.current.scale;
      const viewH = height / viewportRef.current.scale;
      
      // Draw grid lines relative to center
      const startX = -viewW / 2;
      const endX = viewW / 2;
      const startY = -viewH / 2;
      const endY = viewH / 2;

      // Vertical lines
      for (let x = startX - (startX % gridSize) - gridSize; x <= endX + gridSize; x += gridSize) {
        // Adjust x by the player's offset
        const drawX = x - offsetX; 
        ctx.moveTo(drawX, startY);
        ctx.lineTo(drawX, endY);
      }
      
      // Horizontal lines
      for (let y = startY - (startY % gridSize) - gridSize; y <= endY + gridSize; y += gridSize) {
        const drawY = y - offsetY;
        ctx.moveTo(startX, drawY);
        ctx.lineTo(endX, drawY);
      }
      ctx.stroke();

      // No Border Drawing (It's infinite)

      // --- Helper to draw relative to player with wrapping ---
      const drawRelative = (objX: number, objY: number, drawFn: (x: number, y: number) => void) => {
        let dx = objX - myPlayer.x;
        let dy = objY - myPlayer.y;

        // Wrap Logic: If object is logically closer via the edge, draw it closer
        if (dx > WORLD_SIZE / 2) dx -= WORLD_SIZE;
        else if (dx < -WORLD_SIZE / 2) dx += WORLD_SIZE;

        if (dy > WORLD_SIZE / 2) dy -= WORLD_SIZE;
        else if (dy < -WORLD_SIZE / 2) dy += WORLD_SIZE;

        // Optimization: Only draw if within viewport
        if (Math.abs(dx) < viewW/2 + 100 && Math.abs(dy) < viewH/2 + 100) {
          drawFn(dx, dy);
        }
      };

      // Render Food
      foodMap.forEach(f => {
        drawRelative(f.x, f.y, (rx, ry) => {
          ctx.beginPath();
          ctx.arc(rx, ry, f.radius, 0, Math.PI * 2);
          ctx.fillStyle = f.color;
          ctx.fill();
        });
      });

      // Render Players
      const sortedRenderPlayers = renderPlayers.sort((a, b) => a.radius - b.radius);
      
      sortedRenderPlayers.forEach(p => {
        drawRelative(p.x, p.y, (rx, ry) => {
          ctx.beginPath();
          ctx.arc(rx, ry, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.lineWidth = Math.max(2, p.radius * 0.1);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.stroke();

          // Name
          if (p.radius > 10) {
            ctx.fillStyle = '#FFF';
            ctx.font = `bold ${Math.max(12, p.radius / 2.2)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.name, rx, ry);
          }
        });
      });

      ctx.restore();

      // --- 5. Network Sync ---
      const framesSinceLastSync = frameCount % 3;
      if (framesSinceLastSync === 0) {
        updateSelf(myPlayer.id, myPlayer.x, myPlayer.y, myPlayer.radius);
      }
      
      if (frameCount % 10 === 0) {
        setMyPlayerStats({ ...myPlayer });
        setLeaderboard(Array.from(playersMap.values()).sort((a, b) => b.radius - a.radius));
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [onGameOver, setLeaderboard, setMyPlayerStats, setFps]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full touch-none" />;
};