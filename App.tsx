import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { HUD } from './components/HUD';
import { GameStatus, Player } from './types';

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [playerName, setPlayerName] = useState('');
  const [lastScore, setLastScore] = useState<number | null>(null);
  
  // HUD Data
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [fps, setFps] = useState(0);

  const startGame = (name: string) => {
    setPlayerName(name);
    setStatus(GameStatus.PLAYING);
  };

  const handleGameOver = (finalMass: number) => {
    setLastScore(finalMass);
    setStatus(GameStatus.MENU);
    setMyPlayer(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
      {/* Background decoration for menu */}
      {status === GameStatus.MENU && (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-gray-900 to-black"></div>
        </div>
      )}

      {status === GameStatus.PLAYING && (
        <>
          <GameCanvas 
            playerName={playerName} 
            onGameOver={handleGameOver} 
            setLeaderboard={setLeaderboard}
            setMyPlayerStats={setMyPlayer}
            setFps={setFps}
          />
          <HUD myPlayer={myPlayer} leaderboard={leaderboard} fps={fps} />
        </>
      )}

      {status === GameStatus.MENU && (
        <MainMenu onStart={startGame} lastScore={lastScore} />
      )}
    </div>
  );
}
