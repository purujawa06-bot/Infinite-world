import { io, Socket } from 'socket.io-client';
import { Player, Food } from '../types';

export const playersMap: Map<string, Player> = new Map();
export const foodMap: Map<string, Food> = new Map();

// Change this to your server URL
const SERVER_URL = 'http://localhost:3000'; 

let socket: Socket;

const getSocket = () => {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: false
    });
    setupListeners();
  }
  return socket;
};

const setupListeners = () => {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('init_state', (data: { players: Player[], food: Food[] }) => {
    playersMap.clear();
    foodMap.clear();
    data.players.forEach(p => playersMap.set(p.id, p));
    data.food.forEach(f => foodMap.set(f.id, f));
  });

  socket.on('game_update', (data: { players: Player[] }) => {
    // 1. Mark all current players as potentially removable
    const activeIds = new Set(data.players.map(p => p.id));

    // 2. Update or Add players
    data.players.forEach(p => {
        playersMap.set(p.id, p);
    });

    // 3. Remove players not in the update (unless it's self, but server is authoritative usually)
    for (const id of playersMap.keys()) {
        if (!activeIds.has(id)) {
            playersMap.delete(id);
        }
    }
  });

  socket.on('food_update', (data: { added: Food[], removed: string[] }) => {
    data.added.forEach(f => foodMap.set(f.id, f));
    data.removed.forEach(id => foodMap.delete(id));
  });

  socket.on('player_eaten', (id: string) => {
    playersMap.delete(id);
  });
};

export const joinGame = async (player: Player): Promise<string> => {
  const s = getSocket();
  s.connect();
  
  return new Promise((resolve) => {
    // We emit 'join' and resolve immediately for client responsiveness, 
    // real implementations might wait for a 'joined' ack.
    s.emit('join', player);
    resolve(player.id);
  });
};

export const leaveGame = async () => {
  if (socket) {
    socket.disconnect();
  }
  playersMap.clear();
  foodMap.clear();
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
    // For players, we wait for server to confirm usually, but we can emit event
    socket.emit('eat_player', id);
  }
};
