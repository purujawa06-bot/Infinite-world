import React from 'react';
import { Player, WORLD_SIZE } from '../types';

interface MinimapProps {
  player: Player;
}

export const Minimap: React.FC<MinimapProps> = ({ player }) => {
  // Calculate percentage position (0-100)
  // Wrapping coordinate system: The map represents the flat torus world.
  const left = (player.x / WORLD_SIZE) * 100;
  const top = (player.y / WORLD_SIZE) * 100;

  return (
    <div className="absolute bottom-6 right-6 w-36 h-36 pointer-events-none select-none">
      {/* Globe Container */}
      <div className="w-full h-full rounded-full bg-gray-900/60 border-2 border-blue-500/30 backdrop-blur-sm relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        
        {/* Grid / Globe Effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" 
               style={{
                 backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%), repeating-linear-gradient(0deg, transparent 0px, transparent 19px, rgba(59, 130, 246, 0.5) 20px), repeating-linear-gradient(90deg, transparent 0px, transparent 19px, rgba(59, 130, 246, 0.5) 20px)'
               }}>
          </div>
        </div>

        {/* Player Dot */}
        <div 
          className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,1)] transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${left}%`, top: `${top}%` }}
        >
          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
        </div>
      </div>
      <div className="text-center mt-1 text-[10px] text-blue-300 font-bold tracking-widest uppercase text-shadow">
        Sector {Math.floor(player.x / 1000)}-{Math.floor(player.y / 1000)}
      </div>
    </div>
  );
};
