'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Settings, Users, LogOut, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function PlanBGame() {
  // --- States ---
  const [isHost, setIsHost] = useState(false);
  const [showHostLogin, setShowHostLogin] = useState(true);
  const [hostPassword, setHostPassword] = useState('');
  
  const [roomOpen, setRoomOpen] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [accessCode, setAccessCode] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  
  // Player side states
  const [playerInputCode, setPlayerInputCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [entryStep, setEntryStep] = useState<'code' | 'name' | 'waiting' | 'full'>('code');

  // --- Logic ---
  
  // 4자리 16진수 생성
  const generateCode = () => {
    const code = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    setAccessCode(code);
  };

  useEffect(() => {
    generateCode();
  }, []);

  // 호스트 로그인
  const handleHostLogin = () => {
    if (hostPassword === '1234') {
      setIsHost(true);
      setShowHostLogin(false);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  // 플레이어 코드 확인
  const verifyAccessCode = () => {
    if (playerInputCode.toUpperCase() === accessCode) {
      if (players.length >= maxPlayers) {
        setEntryStep('full');
      } else {
        setEntryStep('name');
      }
    } else {
      alert('잘못된 코드입니다.');
    }
  };

  // 플레이어 이름 등록
  const joinGame = () => {
    if (!playerName.trim()) return;
    if (players.length >= maxPlayers) {
      setEntryStep('full');
      return;
    }
    setPlayers(prev => [...prev, playerName]);
    setEntryStep('waiting');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(accessCode);
    alert('코드가 클립보드에 복사되었습니다.');
  };

  // --- UI Components ---

  // 1. 초기 호스트 비밀번호 입력창 (화면 중앙)
  if (showHostLogin && !roomOpen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">ADMIN ACCESS</h2>
          <input 
            type="password" 
            placeholder="호스트 비밀번호" 
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-4 focus:border-blue-500 outline-none transition-all text-center"
            value={hostPassword}
            onChange={(e) => setHostPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleHostLogin()}
          />
          <button 
            onClick={handleHostLogin}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            관리자 모드 진입
          </button>
        </div>
      </div>
    );
  }

  // 2. 플레이어 입장 화면 (호스트가 ON을 켰을 때)
  if (!isHost && roomOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-blue-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-blue-100">
          {entryStep === 'code' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">게임 입장</h2>
              <p className="text-slate-500 mb-8 text-sm">호스트가 제공한 4자리 코드를 입력하세요.</p>
              <input 
                type="text" 
                maxLength={4}
                placeholder="0000"
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-6 text-center text-4xl font-mono font-black tracking-[0.5em] text-blue-600 focus:border-blue-400 outline-none uppercase"
                value={playerInputCode}
                onChange={(e) => setPlayerInputCode(e.target.value)}
              />
              <button onClick={verifyAccessCode} className="w-full bg-slate-800 text-white p-4 rounded-2xl font-bold hover:bg-slate-900 transition-all">
                코드 확인
              </button>
            </div>
          )}

          {entryStep === 'name' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">이름 설정</h2>
              <p className="text-slate-500 mb-8 text-sm">슬롯에 등록될 이름을 입력해주세요.</p>
              <input 
                type="text" 
                placeholder="닉네임 입력"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-6 text-center text-xl font-bold outline-none focus:border-blue-400"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <button onClick={joinGame} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">
                참여 확정
              </button>
            </div>
          )}

          {entryStep === 'waiting' && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">등록 완료!</h2>
              <p className="text-slate-500">호스트가 게임을 시작할 때까지<br/>잠시만 기다려주세요.</p>
            </div>
          )}

          {entryStep === 'full' && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">참여 마감</h2>
              <p className="text-slate-500">죄송합니다. 모든 슬롯이 꽉 찼습니다.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. 호스트 대시보드
  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">PLANB <span className="text-blue-600">TIER</span></h1>
          <p className="text-slate-500 font-medium">Host Management System</p>
        </div>
        <button 
          onClick={() => {setIsHost(false); setShowHostLogin(true);}} 
          className="p-3 text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 플레이어 현황 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-500" />
                접속 플레이어 <span className="text-slate-300 ml-2">{players.length}/{maxPlayers}</span>
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: maxPlayers }).map((_, i) => (
                <div key={i} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${players[i] ? 'border-blue-100 bg-blue-50/50' : 'border-dashed border-slate-100'}`}>
                  <span className="text-xs font-bold text-slate-400">SLOT {String(i+1).padStart(2, '0')}</span>
                  <span className={`font-bold ${players[i] ? 'text-blue-700' : 'text-slate-300'}`}>
                    {players[i] || 'Waiting...'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 설정 패널 */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-400" />
              Room Settings
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Player Limit</label>
                <select 
                  className="w-full bg-slate-800 border-none rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                >
                  {[2, 4, 8, 16, 32].map(num => <option key={num} value={num}>{num} Players</option>)}
                </select>
              </div>

              <div className="p-5 bg-slate-800 rounded-2xl relative overflow-hidden group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Access Code</label>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-mono font-black text-blue-400 tracking-widest">{accessCode}</span>
                  <div className="flex gap-2">
                    <button onClick={generateCode} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                      <RefreshCw className="w-5 h-5 text-slate-400" />
                    </button>
                    <button onClick={copyCode} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                      <Copy className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 우측 하단 ON/OFF 토글 컨트롤 */}
      <div className="fixed bottom-10 right-10 flex flex-col items-end gap-4">
        {roomOpen && (
          <div className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-full shadow-lg animate-bounce uppercase tracking-tighter">
            Players can join now
          </div>
        )}
        <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-4">
          <span className={`text-sm font-black transition-colors ${roomOpen ? 'text-blue-600' : 'text-slate-300'}`}>
            {roomOpen ? 'ROOM OPEN' : 'ROOM OFF'}
          </span>
          <button 
            onClick={() => setRoomOpen(!roomOpen)}
            className={`w-16 h-9 rounded-full relative transition-all duration-300 ${roomOpen ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-sm transition-all duration-300 ${roomOpen ? 'left-8' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}