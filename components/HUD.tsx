import React from 'react';
import { Player } from '../types';
import { Minimap } from './Minimap';

interface HUDProps {
  myPlayer: Player | null;
  leaderboard: Player[];
  fps: number; // Kept in interface but unused visually to satisfy prop requirements if parent passes it
}

export const HUD: React.FC<HUDProps> = ({ myPlayer, leaderboard }) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-2 z-40">
      {/* Minimal Leaderboard - Top Right */}
      <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm p-2 rounded-lg border border-white/10 text-white w-40">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Leaderboard</div>
        <ol className="list-decimal list-inside text-xs font-medium space-y-0.5">
          {leaderboard.slice(0, 5).map((p) => (
            <li key={p.id} className={`flex justify-between items-center ${p.id === myPlayer?.id ? 'text-yellow-400 font-bold' : 'text-gray-200'}`}>
              <span className="truncate max-w-[80px]">{p.name || 'Unknown'}</span>
              <span className="text-gray-400 ml-2">{Math.floor(p.radius)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Minimal Mass Indicator - Bottom Left */}
      {myPlayer && (
        <div className="absolute bottom-6 left-6 text-white text-shadow">
           <span className="text-2xl font-black">{Math.floor(myPlayer.radius)}</span>
           <span className="text-xs text-gray-300 ml-1 font-bold">MASS</span>
        </div>
      )}

      {/* Globe Minimap - Bottom Right */}
      {myPlayer && <Minimap player={myPlayer} />}
    </div>
  );
};
