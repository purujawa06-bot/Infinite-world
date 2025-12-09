const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Configuration
const PORT = process.env.PORT || 3000;
// Allow all origins for easier local development and avoiding disconnects
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "*"
}));

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  pingInterval: 2000, 
  pingTimeout: 5000 
});

// Game State
const players = {};
const food = {};
const WORLD_SIZE = 3000;
const FOOD_COUNT = 200; // Increased food count slightly

// Helper Functions
const getRandomColor = () => {
  const hues = [0, 60, 120, 180, 240, 300, 330];
  const hue = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${hue}, 70%, 60%)`;
};

const getRandomPosition = () => {
  return Math.floor(Math.random() * WORLD_SIZE);
};

// Initialize Food
for (let i = 0; i < FOOD_COUNT; i++) {
    const id = `food-${Date.now()}-${i}`;
    food[id] = {
        id,
        x: getRandomPosition(),
        y: getRandomPosition(),
        color: getRandomColor(),
        radius: 6 + Math.random() * 4
    };
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Note: We send init_state on connection, but also on 'join' to ensure
  // the client definitely has the latest state when they start playing.
  socket.emit('init_state', {
    players: Object.values(players),
    food: Object.values(food)
  });

  socket.on('join', (player) => {
    // Basic validation
    if (!player || !player.id) return;
    
    // Create/Update player
    players[player.id] = { 
      ...player, 
      socketId: socket.id,
      lastSeen: Date.now() 
    };
    
    console.log(`Player joined: ${player.name} (${player.id})`);

    // CRITICAL FIX: Send current world state to the joining player immediately.
    // This fixes "invisible food" bugs if the initial connection packet was missed
    // or if the client state was cleared.
    socket.emit('init_state', {
        players: Object.values(players),
        food: Object.values(food)
    });

    // Broadcast new player to others
    socket.broadcast.emit('game_update', {
        players: Object.values(players)
    });
  });

  socket.on('update_player', (data) => {
    if (players[data.id] && players[data.id].socketId === socket.id) {
      // Update player state
      players[data.id].x = data.x;
      players[data.id].y = data.y;
      players[data.id].radius = data.radius;
      players[data.id].lastSeen = Date.now();
    }
  });

  socket.on('eat_food', (foodId) => {
    if (food[foodId]) {
      delete food[foodId];
      
      // Notify everyone that food was eaten
      io.emit('food_update', { added: [], removed: [foodId] });

      // Respawn food immediately to maintain density
      const newFoodId = `food-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newFood = {
        id: newFoodId,
        x: getRandomPosition(),
        y: getRandomPosition(),
        color: getRandomColor(),
        radius: 6 + Math.random() * 4
      };
      
      food[newFoodId] = newFood;
      io.emit('food_update', { added: [newFood], removed: [] });
    }
  });

  socket.on('eat_player', (targetId) => {
    if (players[targetId]) {
      console.log(`Player eaten: ${targetId} by ${socket.id}`);
      delete players[targetId];
      io.emit('player_eaten', targetId);
    }
  });

  socket.on('disconnect', () => {
    const playerId = Object.keys(players).find(key => players[key].socketId === socket.id);
    if (playerId) {
      console.log('Player disconnected:', playerId);
      delete players[playerId];
      io.emit('player_eaten', playerId);
    }
  });
});

// Broadcast Loop (30 Hz)
setInterval(() => {
  // Only send updates if there are players
  if (Object.keys(players).length > 0) {
    io.emit('game_update', {
      players: Object.values(players)
    });
  }
}, 1000 / 30);

server.listen(PORT, () => {
  console.log(`Blob.io Server running on port ${PORT}`);
});