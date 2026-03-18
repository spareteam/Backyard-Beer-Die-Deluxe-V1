import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TEAM_COLORS, TEAM_NAMES } from '../constants';
import { Difficulty } from '../types';

interface TeamSetupProps {
  onComplete: (config: { 
    teams: { name: string; color: string }[];
    difficulty: Difficulty; 
    mode: 'solo_vs_cpu' | 'solo_vs_human' | 'human_cpu_vs_human_cpu' | 'human_human_vs_cpu_cpu' 
  }) => void;
}

const CPU_NAMES = ['Chad', 'Brad', 'Thad', 'Tanner', 'Hunter', 'Tucker', 'Chase', 'Brody', 'Trent', 'Cody'];

export const TeamSetup: React.FC<TeamSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'mode' | 'team1' | 'team2'>('mode');
  const [mode, setMode] = useState<'solo_vs_cpu' | 'solo_vs_human' | 'human_cpu_vs_human_cpu' | 'human_human_vs_cpu_cpu' | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  
  const [team1Name, setTeam1Name] = useState('');
  const [team1Color, setTeam1Color] = useState(TEAM_COLORS[0]);
  
  const [team2Name, setTeam2Name] = useState('');
  const [team2Color, setTeam2Color] = useState(TEAM_COLORS[1]);

  useEffect(() => {
    // Pick random names from the list
    const availableNames = [...TEAM_NAMES];
    const n1 = availableNames.splice(Math.floor(Math.random() * availableNames.length), 1)[0];
    const n2 = availableNames.splice(Math.floor(Math.random() * availableNames.length), 1)[0];
    setTeam1Name(n1);
    setTeam2Name(n2);
  }, []);

  const handleModeSelect = (selectedMode: 'solo_vs_cpu' | 'solo_vs_human' | 'human_cpu_vs_human_cpu' | 'human_human_vs_cpu_cpu') => {
    setMode(selectedMode);
    setStep('team1');
  };

  const handleTeam1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team1Name.trim()) return;

    if (mode === 'solo_vs_human') {
      setStep('team2');
    } else {
      // Auto-generate CPU team for other modes
      const cpuName = TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)];
      const availableColors = TEAM_COLORS.filter(c => c !== team1Color);
      const cpuColor = availableColors[Math.floor(Math.random() * availableColors.length)];
      
      onComplete({
        mode: mode!,
        difficulty,
        teams: [
          { name: team1Name.trim(), color: team1Color },
          { name: cpuName, color: cpuColor }
        ]
      });
    }
  };

  const handleTeam2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team2Name.trim()) return;

    onComplete({
      mode: mode!,
      difficulty,
      teams: [
        { name: team1Name.trim(), color: team1Color },
        { name: team2Name.trim(), color: team2Color }
      ]
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-6 border-blue-600 shadow-[0_15px_0_rgba(0,0,0,0.3)] text-center w-full max-w-2xl max-h-[95vh] flex flex-col"
      >
        <h2 className="text-3xl md:text-4xl font-black text-blue-600 uppercase italic tracking-tighter mb-4 shrink-0">
          {step === 'mode' ? 'Select Mode' : step === 'team1' ? 'Team 1 Setup' : 'Team 2 Setup'}
        </h2>
        
        {step === 'mode' && (
          <div className="space-y-4 md:space-y-6 overflow-y-auto pr-2 pb-4">
            <div className="text-left">
              <label className="block text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-2">
                Difficulty
              </label>
              <div className="flex gap-3 p-1">
                {[Difficulty.EASY, Difficulty.HARD].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-3 rounded-xl font-black text-xl uppercase italic tracking-tighter border-4 transition-all ${
                      difficulty === d 
                        ? 'bg-blue-600 text-white border-blue-800 shadow-lg' 
                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-left">
              <label className="block text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-2">
                Select Game Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <button
                  onClick={() => handleModeSelect('solo_vs_cpu')}
                  className="p-4 md:p-6 rounded-2xl bg-slate-100 border-4 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-blue-600">1v1 vs CPU</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400">Classic Solo Game</span>
                </button>
                <button
                  onClick={() => handleModeSelect('solo_vs_human')}
                  className="p-4 md:p-6 rounded-2xl bg-slate-100 border-4 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-blue-600">1v1 vs Human</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400">Local Head-to-Head</span>
                </button>
                <button
                  onClick={() => handleModeSelect('human_cpu_vs_human_cpu')}
                  className="p-4 md:p-6 rounded-2xl bg-slate-100 border-4 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-blue-600">2v2 Mixed</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 text-center">CPU Partner, Friend is your foe</span>
                </button>
                <button
                  onClick={() => handleModeSelect('human_human_vs_cpu_cpu')}
                  className="p-4 md:p-6 rounded-2xl bg-slate-100 border-4 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-blue-600">2v2 Co-op</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400">Friends vs AI</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'team1' && (
          <form onSubmit={handleTeam1Submit} className="space-y-6">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter text-center mb-6">
              {mode === 'solo_vs_human' ? 'Player 1 Setup' : 'Your Team'}
            </h2>
            <div className="text-left">
              <label className="block text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-1">
                Team Name
              </label>
              <input
                type="text"
                autoFocus
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                placeholder="Enter team name..."
                className="w-full bg-slate-100 border-4 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-xl focus:outline-none focus:border-blue-600 transition-all"
                maxLength={20}
                required
              />
            </div>

            <div className="text-left">
              <label className="block text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-2">
                Team Color
              </label>
              <div className="flex flex-wrap gap-3">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTeam1Color(c)}
                    className={`w-12 h-12 rounded-full border-4 transition-all ${
                      team1Color === c ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black text-2xl px-8 py-4 rounded-full border-b-6 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-tighter"
            >
              {mode === 'solo_vs_human' ? 'Next: Player 2' : 'Start Game'}
            </button>
          </form>
        )}

        {step === 'team2' && (
          <form onSubmit={handleTeam2Submit} className="space-y-6">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter text-center mb-6">
              Player 2 Setup
            </h2>
            <div className="text-left">
              <label className="block text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-1">
                Player 2 Team Name
              </label>
              <input
                type="text"
                autoFocus
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                placeholder="Enter team name..."
                className="w-full bg-slate-100 border-4 border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-xl focus:outline-none focus:border-blue-600 transition-all"
                maxLength={20}
                required
              />
            </div>

            <div className="text-left">
              <label className="block text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-2">
                Team Color
              </label>
              <div className="flex flex-wrap gap-3">
                {TEAM_COLORS.filter(c => c !== team1Color).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTeam2Color(c)}
                    className={`w-12 h-12 rounded-full border-4 transition-all ${
                      team2Color === c ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black text-2xl px-8 py-4 rounded-full border-b-6 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-tighter"
            >
              Start Game
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t-2 border-slate-100 shrink-0">
          <button 
            onClick={() => {
              if (step === 'team2') setStep('team1');
              else if (step === 'team1') setStep('mode');
            }}
            className={`text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors ${step === 'mode' ? 'invisible' : ''}`}
          >
            ← Back
          </button>
        </div>
      </motion.div>
    </div>
  );
};
