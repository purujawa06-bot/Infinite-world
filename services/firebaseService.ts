import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  onChildAdded, 
  onChildChanged, 
  onChildRemoved, 
  onDisconnect, 
  update, 
  remove, 
  get,
  DatabaseReference
} from 'firebase/database';
import { Player, Food, WORLD_SIZE, ROOM_ID, DB_URL } from '../types';
import { getRandomColor, getRandomPosition, getWrappedDelta } from '../utils/gameUtils';

// Initialize Firebase
const app = initializeApp({
  databaseURL: DB_URL
});

const db = getDatabase(app);
const playersRef = ref(db, `rooms/${ROOM_ID}/players`);
const foodRef = ref(db, `rooms/${ROOM_ID}/food`);

// Local state mirror
export const playersMap: Map<string, Player> = new Map();
export const foodMap: Map<string, Food> = new Map();

let myId: string | null = null;
let listenersInitialized = false;

// Configuration
const FOOD_COUNT = 150;

// --- 1. Connection & Setup ---

export const joinGame = async (player: Player): Promise<string> => {
  myId = player.id;
  const myRef = ref(db, `rooms/${ROOM_ID}/players/${player.id}`);
  
  // Set initial state
  await set(myRef, player);
  
  // Set disconnect handler (Room Logic: If player leaves/disconnects, remove from board immediately)
  // This ensures players don't stick around if they close the tab or lose internet
  onDisconnect(myRef).remove();

  if (!listenersInitialized) {
    setupListeners();
    // Start the host loop to manage environment (food spawning only)
    startHostLoop();
    listenersInitialized = true;
  }

  return player.id;
};

export const leaveGame = async () => {
  if (myId) {
    const myRef = ref(db, `rooms/${ROOM_ID}/players/${myId}`);
    // Explicit removal when component unmounts
    await remove(myRef);
    myId = null;
  }
};

// --- 2. Real-time Synchronization (Listeners) ---

const setupListeners = () => {
  // --- Players ---
  onChildAdded(playersRef, (snapshot) => {
    const p = snapshot.val();
    if (p) playersMap.set(snapshot.key!, { ...p, id: snapshot.key! });
  });

  onChildChanged(playersRef, (snapshot) => {
    const p = snapshot.val();
    if (p) {
      // Merge updates
      const current = playersMap.get(snapshot.key!);
      if (current) {
        playersMap.set(snapshot.key!, { ...current, ...p });
      } else {
        playersMap.set(snapshot.key!, { ...p, id: snapshot.key! });
      }
    }
  });

  onChildRemoved(playersRef, (snapshot) => {
    playersMap.delete(snapshot.key!);
  });

  // --- Food ---
  onChildAdded(foodRef, (snapshot) => {
    const f = snapshot.val();
    if (f) foodMap.set(snapshot.key!, { ...f, id: snapshot.key! });
  });

  onChildRemoved(foodRef, (snapshot) => {
    foodMap.delete(snapshot.key!);
  });
};

// --- 3. Optimized Updates (Delta Updates) ---

export const updateSelf = (id: string, x: number, y: number, radius: number) => {
  // Only update fields that change frequently
  const pRef = ref(db, `rooms/${ROOM_ID}/players/${id}`);
  update(pRef, { 
    x: Number(x.toFixed(2)), 
    y: Number(y.toFixed(2)), 
    radius: Number(radius.toFixed(2)) 
  });
};

export const removeEntity = (type: 'food' | 'player', id: string) => {
  // If I eat something, I delete it from the DB
  const r = ref(db, `rooms/${ROOM_ID}/${type === 'food' ? 'food' : 'players'}/${id}`);
  remove(r).catch(err => console.error("Error removing entity", err));
};

// --- 4. Host Logic (Food Spawning Only) ---

const createFood = (): Food => ({
  id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  x: getRandomPosition(),
  y: getRandomPosition(),
  color: getRandomColor(),
  radius: 6 + Math.random() * 4
});

const startHostLoop = () => {
  // Run loop less frequently since we only check food (1 second interval is fine)
  setInterval(() => {
    checkIfHostAndAct();
  }, 1000); 
};

const checkIfHostAndAct = () => {
  // Simple Host Heuristic: 
  // Get all player IDs. 
  // If my ID is the "lowest" string value among players, I am the host.
  if (!myId) return;

  const allPlayerIds = Array.from(playersMap.keys()).sort();

  if (allPlayerIds.length > 0 && allPlayerIds[0] === myId) {
    manageEnvironment();
  }
};

const manageEnvironment = () => {
  const updates: Record<string, any> = {};
  let updatesPending = false;

  // 1. Manage Food (Respawn if low)
  if (foodMap.size < FOOD_COUNT) {
    // Add a few foods at a time to prevent lag spikes
    for (let i = 0; i < 5; i++) {
        if (foodMap.size + i >= FOOD_COUNT) break;
        const newFood = createFood();
        updates[`rooms/${ROOM_ID}/food/${newFood.id}`] = newFood;
        updatesPending = true;
    }
  }

  // NOTE: Bot Logic has been completely removed.
  // The host no longer creates or moves bots.

  if (updatesPending) {
    update(ref(db), updates).catch(e => console.error("Update failed", e));
  }
};