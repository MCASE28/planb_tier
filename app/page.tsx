'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Settings, Users, LogOut, CheckCircle, AlertCircle, RefreshCw, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// DB Types (Simplified)
type Room = {
  id: string;
  access_code: string;
  is_active: boolean;
  max_players: number;
  host_joined: boolean;
};

type Player = {
  id: string;
  name: string;
  room_id: string;
};

export default function PlanBGame() {
  // --- Global / Data States ---
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  
  // --- UI States ---
  // 'loading' | 'host_login' (when no host) | 'player_entry' (when host exists) | 'lobby' (joined) | 'host_dashboard'
  const [uiState, setUiState] = useState<'loading' | 'host_login' | 'player_entry' | 'lobby' | 'host_dashboard' | 'full'>('loading');
  
  // Inputs
  const [hostPassword, setHostPassword] = useState('');
  const [playerInputCode, setPlayerInputCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerEntryStep, setPlayerEntryStep] = useState<'code' | 'name'>('code');
  
  // Host Dashboard UI
  const [showCode, setShowCode] = useState(false); // To toggle **** vs 1234

  // --- 1. Initial Load & Realtime Subscription ---
  useEffect(() => {
    fetchRoomStatus();

    // Subscribe to Room changes
    const roomChannel = supabase
      .channel('room-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        const newRoom = payload.new as Room;
        setRoom(newRoom);
        handleRoomStateChange(newRoom, players.length);
      })
      .subscribe();

    // Subscribe to Player changes
    const playerChannel = supabase
      .channel('player-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchPlayers(); // Simply refetch list on change for simplicity
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playerChannel);
    };
  }, []);

  // --- Logic Helpers ---

  const fetchRoomStatus = async () => {
    try {
      setLoading(true);
      // Get the single room (assuming 1 room for this MVP)
      const { data: rooms, error } = await supabase.from('rooms').select('*').limit(1);
      
      if (error) throw error;

      if (rooms && rooms.length > 0) {
        const currentRoom = rooms[0];
        setRoom(currentRoom);
        
        // Also fetch players
        const { data: currentPlayers } = await supabase.from('players').select('*').eq('room_id', currentRoom.id);
        const pList = currentPlayers || [];
        setPlayers(pList);

        handleRoomStateChange(currentRoom, pList.length);
      } else {
        // No room found? Create one strictly if not exists (Edge case)
        console.error("No room found in DB. Please run SQL setup.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    if (!room) return;
    const { data } = await supabase.from('players').select('*').eq('room_id', room.id);
    if (data) {
      setPlayers(data);
      // Re-evaluate full state if needed
      if (uiState === 'player_entry' && data.length >= room.max_players) {
        setUiState('full');
      } else if (uiState === 'full' && data.length < room.max_players) {
        setUiState('player_entry');
      }
    }
  };

  // Determine which screen to show based on Room State
  const handleRoomStateChange = (currentRoom: Room, playerCount: number) => {
    // If I am already logged in as Host or Player, don't kick me out logic strictly here
    // But for initial load:
    
    // We need a local flag to know if "I" am the host. 
    // Since this is a simple browser-based session, we rely on local UI state for "am I host".
    // But for "Initial View", we check server state.

    setUiState(prev => {
      if (prev === 'host_dashboard' || prev === 'lobby') return prev; // Stay if already in

      if (currentRoom.host_joined) {
        if (playerCount >= currentRoom.max_players) return 'full';
        return 'player_entry';
      } else {
        return 'host_login';
      }
    });
  };

  // --- Actions ---

  const handleHostLogin = async () => {
    if (hostPassword === '1234') {
      if (!room) return;

      // Update DB: Host has joined
      const { error } = await supabase
        .from('rooms')
        .update({ host_joined: true, is_active: true }) // Auto activate
        .eq('id', room.id);

      if (error) {
        toast.error("Error logging in as host");
      } else {
        setUiState('host_dashboard');
        toast.success("Welcome, Host!");
      }
    } else {
      toast.error("Wrong password");
    }
  };

  const handleHostLogout = async () => {
    if (!room) return;
    const confirm = window.confirm("Are you sure? This will reset the room.");
    if (confirm) {
      // Reset room state
      await supabase.from('rooms').update({ host_joined: false, is_active: false, access_code: '0000' }).eq('id', room.id);
      await supabase.from('players').delete().eq('room_id', room.id); // Kick all players
      setUiState('host_login');
      setHostPassword('');
    }
  };

  const handlePlayerVerifyCode = () => {
    if (!room) return;
    if (playerInputCode.toUpperCase() === room.access_code) {
      setPlayerEntryStep('name');
    } else {
      toast.error("Invalid Code");
    }
  };

  const handlePlayerJoin = async () => {
    if (!playerName.trim() || !room) return;

    const { error } = await supabase
      .from('players')
      .insert([{ room_id: room.id, name: playerName }]);

    if (error) {
      toast.error("Failed to join. Try again.");
    } else {
      setUiState('lobby');
      toast.success("Joined successfully!");
    }
  };

  const generateNewCode = async () => {
    if (!room) return;
    const code = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    await supabase.from('rooms').update({ access_code: code }).eq('id', room.id);
    toast.success("New Access Code Generated");
  };

  const toggleRoomOpen = async () => {
    if (!room) return;
    await supabase.from('rooms').update({ is_active: !room.is_active }).eq('id', room.id);
  };

  const updateMaxPlayers = async (num: number) => {
    if (!room) return;
    await supabase.from('rooms').update({ max_players: num }).eq('id', room.id);
  };

  const copyCodeToClipboard = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.access_code);
    toast.success("Code copied to clipboard!");
  };

  // --- UI Renders ---

  if (loading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Loading...</div>;
  }

  // 1. Host Login (When no host exists on server)
  if (uiState === 'host_login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-700">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2">HOST ACCESS</h2>
            <p className="text-slate-400 text-sm">Be the first to start the session.</p>
          </div>
          <input 
            type="password" 
            placeholder="Host Password" 
            className="w-full p-4 bg-[#0f172a] border-2 border-slate-700 rounded-2xl mb-4 text-white focus:border-cyan-500 outline-none transition-all text-center placeholder:text-slate-600"
            value={hostPassword}
            onChange={(e) => setHostPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleHostLogin()}
          />
          <button 
            onClick={handleHostLogin}
            className="w-full bg-cyan-600 text-white p-4 rounded-2xl font-bold hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/50"
          >
            Start Session
          </button>
        </div>
      </div>
    );
  }

  // 2. Room Full Screen
  if (uiState === 'full') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="text-center p-10 bg-[#1e293b] rounded-3xl border border-red-900/50">
          <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-800">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Room Full</h2>
          <p className="text-slate-400">Please wait for the next session.</p>
        </div>
      </div>
    );
  }

  // 3. Player Entry (When host exists)
  if (uiState === 'player_entry') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0f172a]">
        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">PLANB <span className="text-cyan-500">TIER</span></h1>
            <p className="text-slate-400 text-sm">Join the game session</p>
          </div>

          {playerEntryStep === 'code' && (
            <div className="text-center">
              <input 
                type="text" 
                maxLength={4}
                placeholder="CODE"
                className="w-full p-5 bg-[#0f172a] border-2 border-slate-700 rounded-2xl mb-6 text-center text-4xl font-mono font-black tracking-[0.5em] text-cyan-400 focus:border-cyan-500 outline-none uppercase placeholder:text-slate-800 transition-colors"
                value={playerInputCode}
                onChange={(e) => setPlayerInputCode(e.target.value)}
              />
              <button onClick={handlePlayerVerifyCode} className="w-full bg-slate-700 text-white p-4 rounded-2xl font-bold hover:bg-slate-600 transition-all border border-slate-600">
                Verify Code
              </button>
            </div>
          )}

          {playerEntryStep === 'name' && (
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">Identify Yourself</h2>
              <input 
                type="text" 
                placeholder="Nickname"
                className="w-full p-4 bg-[#0f172a] border-2 border-slate-700 rounded-2xl mb-6 text-center text-xl font-bold text-white outline-none focus:border-cyan-500"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <button onClick={handlePlayerJoin} className="w-full bg-cyan-600 text-white p-4 rounded-2xl font-bold hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/50">
                Join Lobby
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Lobby (Player Waiting)
  if (uiState === 'lobby') {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0f172a]">
             <div className="bg-[#1e293b] p-10 rounded-3xl shadow-xl w-full max-w-md border border-slate-700 text-center">
              <div className="w-24 h-24 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-900 animate-pulse">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You're In!</h2>
              <p className="text-slate-400 mb-8">Waiting for host to start...</p>
              <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-500 block mb-1">YOUR ID</span>
                <span className="text-xl font-bold text-cyan-400">{playerName}</span>
              </div>
            </div>
        </div>
    )
  }

  // 5. Host Dashboard
  if (uiState === 'host_dashboard' && room) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 lg:p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">PLANB <span className="text-cyan-500">TIER</span></h1>
            <p className="text-slate-500 font-medium">Host Dashboard</p>
          </div>
          <button 
            onClick={handleHostLogout}
            className="p-3 text-slate-500 hover:text-red-400 transition-colors bg-[#1e293b] rounded-xl border border-slate-800"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Players Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1e293b] p-8 rounded-[2.5rem] shadow-sm border border-slate-700">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Users className="w-6 h-6 text-cyan-500" />
                  Players <span className="text-slate-500 ml-2">{players.length}/{room.max_players}</span>
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: room.max_players }).map((_, i) => (
                  <div key={i} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${players[i] ? 'border-cyan-900/50 bg-cyan-950/30' : 'border-dashed border-slate-700 bg-[#0f172a]'}`}>
                    <span className="text-xs font-bold text-slate-500">SLOT {String(i+1).padStart(2, '0')}</span>
                    <span className={`font-bold ${players[i] ? 'text-cyan-400' : 'text-slate-600'}`}>
                      {players[i]?.name || 'Empty'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            <div className="bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-xl border border-slate-800">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <Settings className="w-6 h-6 text-cyan-400" />
                Control
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">Player Limit</label>
                  <select 
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                    value={room.max_players}
                    onChange={(e) => updateMaxPlayers(Number(e.target.value))}
                  >
                    {[2, 4, 8, 16, 32].map(num => <option key={num} value={num}>{num} Players</option>)}
                  </select>
                </div>

                <div className="p-5 bg-[#0f172a] rounded-2xl relative overflow-hidden group border border-slate-800">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Access Code</label>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-mono font-black text-cyan-400 tracking-widest">
                      {showCode ? room.access_code : '****'}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setShowCode(!showCode)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        {showCode ? <EyeOff className="w-5 h-5 text-slate-400"/> : <Eye className="w-5 h-5 text-slate-400"/>}
                      </button>
                      <button onClick={generateNewCode} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <RefreshCw className="w-5 h-5 text-slate-400" />
                      </button>
                      <button onClick={copyCodeToClipboard} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Copy className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Room Open/Closed */}
        <div className="fixed bottom-10 right-10 flex flex-col items-end gap-4">
          <div className="bg-[#1e293b] p-4 rounded-3xl shadow-2xl border border-slate-700 flex items-center gap-4">
            <span className={`text-sm font-black transition-colors ${room.is_active ? 'text-cyan-500' : 'text-slate-500'}`}>
              {room.is_active ? 'ROOM OPEN' : 'ROOM CLOSED'}
            </span>
            <button 
              onClick={toggleRoomOpen}
              className={`w-16 h-9 rounded-full relative transition-all duration-300 ${room.is_active ? 'bg-cyan-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-sm transition-all duration-300 ${room.is_active ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}