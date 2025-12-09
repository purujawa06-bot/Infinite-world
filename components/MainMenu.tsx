import React, { useState } from 'react';
import { Play, Activity } from 'lucide-react';

interface MainMenuProps {
  onStart: (name: string) => void;
  lastScore: number | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, lastScore }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onStart(name.trim());
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-50 backdrop-blur-sm">
      <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full border-4 border-blue-500 transform transition-all hover:scale-105">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center animate-bounce">
            <Activity className="text-white w-10 h-10" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-center mb-2 tracking-tight text-blue-600">BLOB.IO</h1>
        <p className="text-center text-gray-500 mb-8 font-medium">Multiplayer Battle Arena</p>

        {lastScore !== null && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 p-4 rounded text-center">
            <p className="text-red-700 font-bold">Game Over!</p>
            <p className="text-red-600">Mass: {Math.floor(lastScore)}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nickname</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg font-bold text-center"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xl shadow-lg active:transform active:scale-95"
          >
            <Play size={24} fill="currentColor" />
            PLAY NOW
          </button>
        </form>
        
        <div className="mt-6 text-xs text-center text-gray-400">
          Tip: Move your mouse to control the blob. Eat smaller blobs to grow.
        </div>
      </div>
    </div>
  );
};
