import { io, Socket } from 'socket.io-client';
import { Player, Food } from '../types';

export const playersMap: Map<string, Player> = new Map();
export const foodMap: Map<string, Food> = new Map();

// Updated to localhost for development based on example.server.js
// If deploying, change this to your production URL.
const SERVER_URL = 'https://puruh2o-gabutcok.hf.space'; 

let socket: Socket;
let myId: string | null = null;
let currentPlayer: Player | null = null; // Store player intent for reconnections
let onDeathCallback: (() => void) | null = null;

export const setOnDeath = (callback: () => void) => {
  onDeathCallback = callback;
};

const getSocket = () => {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    setupListeners();
  }
  return socket;
};

const setupListeners = () => {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    
    // Critical: If we were playing, re-join immediately to restore session on server
    if (currentPlayer) {
      console.log('Restoring game session for:', currentPlayer.name);
      socket.emit('join', currentPlayer);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    // Note: We do NOT clear maps here. We want to keep rendering the last known state 
    // until we reconnect, preventing a "flash" of empty world.
  });

  socket.on('init_state', (data: { players: Player[], food: Food[] }) => {
    // Robust check: Ensure data is valid before clearing maps.
    // This prevents a "blank world" bug if the server sends malformed data.
    if (data && Array.isArray(data.players) && Array.isArray(data.food)) {
      playersMap.clear();
      foodMap.clear();
      data.players.forEach(p => playersMap.set(p.id, p));
      data.food.forEach(f => foodMap.set(f.id, f));
      console.log(`Initialized world: ${data.players.length} players, ${data.food.length} food`);
    }
  });

  socket.on('game_update', (data: { players: Player[] }) => {
    if (!data || !Array.isArray(data.players)) return;

    const activeIds = new Set(data.players.map(p => p.id));

    // 2. Update or Add players
    data.players.forEach(p => {
        playersMap.set(p.id, p);
    });

    // 3. Remove players not in the update
    for (const id of playersMap.keys()) {
        if (!activeIds.has(id)) {
            // CRITICAL FIX: Do not delete ourselves based on server lag/race condition.
            if (myId && id === myId) continue;
            playersMap.delete(id);
        }
    }
  });

  socket.on('food_update', (data: { added: Food[], removed: string[] }) => {
    if (data.added && Array.isArray(data.added)) {
      data.added.forEach(f => foodMap.set(f.id, f));
    }
    if (data.removed && Array.isArray(data.removed)) {
      data.removed.forEach(id => foodMap.delete(id));
    }
  });

  socket.on('player_eaten', (id: string) => {
    playersMap.delete(id);
    // Check if I am the one who was eaten
    if (myId && id === myId) {
      if (onDeathCallback) {
        onDeathCallback();
      }
    }
  });
};

export const joinGame = async (player: Player): Promise<string> => {
  currentPlayer = player; // Persist for reconnection
  myId = player.id; 
  
  const s = getSocket();
  if (s.connected) {
    s.emit('join', player);
  } else {
    s.connect();
  }
  
  return new Promise((resolve) => {
    resolve(player.id);
  });
};

export const leaveGame = async () => {
  currentPlayer = null; // Clear session intent
  if (socket) {
    socket.disconnect();
  }
  playersMap.clear();
  foodMap.clear();
  myId = null;
  onDeathCallback = null;
};

export const updateSelf = (id: string, x: number, y: number, radius: number) => {
  if (socket && socket.connected) {
    socket.emit('update_player', { id, x, y, radius });
  }
};

export const removeEntity = (type: 'food' | 'player', id: string) => {
  if (!socket || !socket.connected) return;

  if (type === 'food') {
    // Optimistic update
    foodMap.delete(id);
    socket.emit('eat_food', id);
  } else {
    socket.emit('eat_player', id);
  }
};