import React, { useState, useEffect } from 'react';
import { 
  MapPin, Clock, ShieldAlert, CheckCircle2, AlertTriangle, 
  ChevronRight, QrCode, User, Zap, Coffee, Check, X,
  Layers, LogOut, ArrowRight, Flag, ShieldCheck,
  Building2, Monitor, VolumeX, Sparkles, AlertCircle
} from 'lucide-react';

// --- 座位初始資料 (6x6 配置，對應北科大 B1 自習室架構) ---
interface SeatData {
  id: string;
  zone: '靜音區' | '筆電區';
  hasSocket: boolean;
  isSingle: boolean;
  status: 'available' | 'reserved' | 'in_use' | 'away';
}

const INITIAL_SEATS: SeatData[] = [
  { id: 'A1', zone: '靜音區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'A2', zone: '靜音區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'A3', zone: '靜音區', hasSocket: false, isSingle: false, status: 'away' }, // 暫離
  { id: 'A4', zone: '筆電區', hasSocket: true, isSingle: true, status: 'in_use' },
  { id: 'A5', zone: '筆電區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'A6', zone: '筆電區', hasSocket: false, isSingle: false, status: 'available' },

  { id: 'B1', zone: '靜音區', hasSocket: true, isSingle: false, status: 'reserved' }, // 學生通報佔位
  { id: 'B2', zone: '靜音區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'B3', zone: '靜音區', hasSocket: false, isSingle: false, status: 'available' },
  { id: 'B4', zone: '筆電區', hasSocket: true, isSingle: true, status: 'reserved' },
  { id: 'B5', zone: '筆電區', hasSocket: false, isSingle: true, status: 'available' },
  { id: 'B6', zone: '筆電區', hasSocket: true, isSingle: false, status: 'in_use' },

  { id: 'C1', zone: '靜音區', hasSocket: true, isSingle: true, status: 'in_use' },
  { id: 'C2', zone: '靜音區', hasSocket: true, isSingle: true, status: 'available' }, // 核心展示席
  { id: 'C3', zone: '靜音區', hasSocket: false, isSingle: false, status: 'available' },
  { id: 'C4', zone: '筆電區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'C5', zone: '筆電區', hasSocket: false, isSingle: true, status: 'away' },
  { id: 'C6', zone: '筆電區', hasSocket: true, isSingle: false, status: 'available' },

  { id: 'D1', zone: '靜音區', hasSocket: true, isSingle: false, status: 'reserved' },
  { id: 'D2', zone: '靜音區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'D3', zone: '靜音區', hasSocket: false, isSingle: false, status: 'available' },
  { id: 'D4', zone: '筆電區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'D5', zone: '筆電區', hasSocket: false, isSingle: true, status: 'reserved' }, // 未報到逾時
  { id: 'D6', zone: '筆電區', hasSocket: true, isSingle: false, status: 'available' },

  { id: 'E1', zone: '靜音區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'E2', zone: '靜音區', hasSocket: false, isSingle: false, status: 'reserved' },
  { id: 'E3', zone: '靜音區', hasSocket: false, isSingle: true, status: 'available' },
  { id: 'E4', zone: '筆電區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'E5', zone: '筆電區', hasSocket: true, isSingle: true, status: 'away' }, // 暫離逾時
  { id: 'E6', zone: '筆電區', hasSocket: false, isSingle: false, status: 'available' },

  { id: 'F1', zone: '靜音區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'F2', zone: '靜音區', hasSocket: false, isSingle: false, status: 'in_use' },
  { id: 'F3', zone: '靜音區', hasSocket: false, isSingle: true, status: 'available' },
  { id: 'F4', zone: '筆電區', hasSocket: true, isSingle: true, status: 'available' },
  { id: 'F5', zone: '筆電區', hasSocket: false, isSingle: false, status: 'reserved' },
  { id: 'F6', zone: '筆電區', hasSocket: true, isSingle: true, status: 'available' },
];

interface PatrolTask {
  id: string;
  seatId: string;
  type: '未報到逾時' | '暫離逾時' | '學生通報佔位';
  zone: '靜音區' | '筆電區';
  overdueMinutes: number;
  handled: boolean;
  category: 'noshow' | 'away' | 'report';
}

export default function App() {
  // 導覽狀態
  const [activeTab, setActiveTab] = useState<'overview' | 'floor' | 'session' | 'records' | 'patrol'>('floor');
  const [userRole, setUserRole] = useState<'student' | 'staff'>('student');

  // 座位資料
  const [seats, setSeats] = useState<SeatData[]>(INITIAL_SEATS);
  const [selectedSeatId, setSelectedSeatId] = useState<string>('C2');
  const [zoneFilter, setZoneFilter] = useState<'all' | '靜音區' | '筆電區'>('all');
  const [socketFilterOnly, setSocketFilterOnly] = useState(false);

  // 預約設定
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('17:00');
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const [conflictSimulated, setConflictSimulated] = useState(false);

  // 個人當前使用狀態機 ('idle' | 'reserved' | 'in_use' | 'away')
  const [bookingState, setBookingState] = useState<'idle' | 'reserved' | 'in_use' | 'away'>('reserved');
  const [activeSeatId, setActiveSeatId] = useState<string>('C2');
  const [checkinSeconds, setCheckinSeconds] = useState<number>(1780); // 30 分鐘報到倒數
  const [awaySeconds, setAwaySeconds] = useState<number>(3540); // 60 分鐘暫離倒數
  const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState<number>(9840); // 剩餘使用時長 (~2小時44分)

  // 掃碼模擬彈窗
  const [showQRModal, setShowQRModal] = useState(false);
  // 通報佔位彈窗
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingSeatId, setReportingSeatId] = useState('B1');
  const [reportReason, setReportReason] = useState('放置書包與私人物品超過1小時未見人影');

  // Toast 通知
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 館員巡查清單
  const [patrolTasks, setPatrolTasks] = useState<PatrolTask[]>([
    { id: 't1', seatId: 'A3', type: '暫離逾時', zone: '靜音區', overdueMinutes: 14, handled: false, category: 'away' },
    { id: 't2', seatId: 'D5', type: '未報到逾時', zone: '筆電區', overdueMinutes: 9, handled: false, category: 'noshow' },
    { id: 't3', seatId: 'E5', type: '暫離逾時', zone: '筆電區', overdueMinutes: 28, handled: false, category: 'away' },
    { id: 't4', seatId: 'B1', type: '學生通報佔位', zone: '靜音區', overdueMinutes: 5, handled: false, category: 'report' },
  ]);
  const [patrolCategoryFilter, setPatrolCategoryFilter] = useState<'all' | 'noshow' | 'away' | 'report'>('all');

  // 即時倒數計時輪詢
  useEffect(() => {
    const timer = setInterval(() => {
      if (bookingState === 'reserved') {
        setCheckinSeconds(prev => (prev > 0 ? prev - 1 : 0));
      } else if (bookingState === 'in_use') {
        setSessionRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
      } else if (bookingState === 'away') {
        setAwaySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [bookingState]);

  // 時間格式轉換 HH:MM:SS 或 MM:SS
  const formatTimer = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 選擇中的座位實體
  const selectedSeat = seats.find(s => s.id === selectedSeatId) || seats[0];

  // 計算空位與總覽統計
  const totalCapacity = 287; // 自習室全席位
  const availableCount = seats.filter(s => s.status === 'available').length;
  const quietAvailable = seats.filter(s => s.zone === '靜音區' && s.status === 'available').length;
  const laptopAvailable = seats.filter(s => s.zone === '筆電區' && s.status === 'available').length;

  // 處理確認預約
  const handleConfirmBooking = () => {
    if (!rulesAgreed || conflictSimulated) return;
    
    // 更新座位狀態為已預約
    setSeats(prev => prev.map(s => s.id === selectedSeatId ? { ...s, status: 'reserved' } : s));
    setActiveSeatId(selectedSeatId);
    setBookingState('reserved');
    setCheckinSeconds(1800); // 30 分鐘
    setActiveTab('session');
    showToast(`🎉 已成功登記座位 ${selectedSeatId}！請於 30 分鐘內到場掃碼報到。`);
  };

  // 處理掃碼報到成功
  const handleCheckinSuccess = () => {
    setShowQRModal(false);
    setBookingState('in_use');
    setSeats(prev => prev.map(s => s.id === activeSeatId ? { ...s, status: 'in_use' } : s));
    showToast(`✅ 座位 ${activeSeatId} 報到成功！歡迎開始專心自習。`);
  };

  // 處理暫離
  const handleStartAway = () => {
    setBookingState('away');
    setAwaySeconds(3600); // 60 分鐘
    setSeats(prev => prev.map(s => s.id === activeSeatId ? { ...s, status: 'away' } : s));
    showToast(`☕ 已啟動暫離保護！保留倒數 60 分鐘，逾時將自動釋出。`);
  };

  // 處理回座
  const handleReturnFromAway = () => {
    setBookingState('in_use');
    setSeats(prev => prev.map(s => s.id === activeSeatId ? { ...s, status: 'in_use' } : s));
    showToast(`✨ 歡迎回座！座位已恢復使用中狀態。`);
  };

  // 處理退席
  const handleReleaseSeat = () => {
    setSeats(prev => prev.map(s => s.id === activeSeatId ? { ...s, status: 'available' } : s));
    setBookingState('idle');
    showToast(`👋 已成功退席！座位 ${activeSeatId} 已重新釋出給下一位同學。`);
  };

  // 處理學生通報佔位
  const handleSubmitReport = () => {
    const newTask: PatrolTask = {
      id: `t_${Date.now()}`,
      seatId: reportingSeatId,
      type: '學生通報佔位',
      zone: seats.find(s => s.id === reportingSeatId)?.zone || '靜音區',
      overdueMinutes: 2,
      handled: false,
      category: 'report'
    };
    setPatrolTasks(prev => [newTask, ...prev]);
    setShowReportModal(false);
    showToast(`🚨 已收到對座位 ${reportingSeatId} 的佔位通報！館員巡查清單已同步排入。`);
  };

  // 館員標記處理/解除巡查
  const handleTogglePatrolTask = (taskId: string) => {
    setPatrolTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextState = !t.handled;
        if (nextState) {
          // 若標記處理，將該座位釋出為可用
          setSeats(sPrev => sPrev.map(s => s.id === t.seatId ? { ...s, status: 'available' } : s));
        }
        return { ...t, handled: nextState };
      }
      return t;
    }));
    showToast(`📋 已更新巡查項狀態與座位空間同步！`);
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col items-center">
      
      {/* Toast 訊息浮動卡 */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full soft-card frosted-glass border border-white/90 shadow-2xl flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
          <span className="text-xs md:text-sm font-bold text-slate-900 tracking-tight">{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          頂部浮動膠囊導航列 (Floating Pill Frosted Bar)
         ========================================================================= */}
      <header className="w-full max-w-7xl px-4 sm:px-6 pt-5 sticky top-3 z-40">
        <div className="frosted-glass rounded-full px-4 sm:px-6 py-2.5 shadow-[0_14px_36px_rgba(100,116,139,0.08)] flex items-center justify-between gap-4">
          
          {/* 左側校徽與系統標題 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-400 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/25 shrink-0">
              北科
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">自習室預約系統</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  B1 自習室
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 hidden sm:block">Taipei Tech Library · Soft Aurora</span>
            </div>
          </div>

          {/* 中央觸感導航切換鈕 (Soft Inset Pill Nav) */}
          <nav className="hidden lg:flex items-center gap-1.5 soft-inset p-1.5 rounded-full">
            {[
              { id: 'floor', label: '平面選座預約', icon: MapPin },
              { id: 'overview', label: '即時空位概況', icon: Layers },
              { id: 'session', label: '我的座位狀態', icon: Clock, badge: bookingState !== 'idle' },
              { id: 'records', label: '違規與紀錄', icon: ShieldCheck },
              { id: 'patrol', label: '館員巡查管理', icon: ShieldAlert },
            ].map(item => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    if (item.id === 'patrol') setUserRole('staff');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]' 
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 右側使用者資訊與切換模式膠囊 */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-white/95 px-3.5 py-1.5 rounded-full shadow-xs border border-slate-200/60">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-300 via-rose-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black shadow-xs">
                {userRole === 'student' ? '陳' : '李'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[11px] font-black text-slate-900 leading-tight">
                  {userRole === 'student' ? '陳同學 (110318099)' : '李館員 (巡查值班)'}
                </div>
                <div className="text-[9px] font-bold text-emerald-600 leading-tight">
                  {userRole === 'student' ? '0 違規點數 · 正常使用' : '系統後台管理權限'}
                </div>
              </div>
            </div>

            {/* 身分切換快速按鈕 */}
            <button
              onClick={() => {
                if (userRole === 'student') {
                  setUserRole('staff');
                  setActiveTab('patrol');
                  showToast('已切換為【館員巡查模式】！');
                } else {
                  setUserRole('student');
                  setActiveTab('floor');
                  showToast('已切換為【讀者學生模式】！');
                }
              }}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-[11px] shadow-xs border border-slate-200 transition active:scale-95 flex items-center gap-1"
              title="切換身分"
            >
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">{userRole === 'student' ? '館員入口' : '學生入口'}</span>
            </button>
          </div>

        </div>

        {/* 行動端次級導航列 */}
        <div className="flex lg:hidden overflow-x-auto custom-scroll gap-1.5 pt-3 pb-1">
          {[
            { id: 'floor', label: '平面選座' },
            { id: 'overview', label: '即時空位' },
            { id: 'session', label: '我的座位', badge: bookingState !== 'idle' },
            { id: 'records', label: '個人紀錄' },
            { id: 'patrol', label: '館員巡查' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                activeTab === item.id 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-white text-slate-600 border border-slate-200/80'
              }`}
            >
              {item.label}
              {item.badge && ' ●'}
            </button>
          ))}
        </div>
      </header>

      {/* =========================================================================
          主要內容畫布 (Main Layout Viewport)
         ========================================================================= */}
      <main className="w-full max-w-7xl px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">

        {/* -----------------------------------------------------------------------
            TAB 1: 平面選座預約 (Floor Map & Aurora Booking Drawer)
           ----------------------------------------------------------------------- */}
        {activeTab === 'floor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            
            {/* 左側：平面圖大卡片 (佔 8 欄) */}
            <div className="lg:col-span-8 soft-card p-6 sm:p-8 flex flex-col justify-between">
              <div>
                
                {/* 平面圖頂部指標與篩選膠囊 */}
                <div className="flex flex-wrap items-center justify-between pb-5 border-b border-slate-100 gap-4">
                  <div>
                    <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">Interactive Map</span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">B1 自習室席位平面圖</h2>
                  </div>

                  {/* 篩選標籤膠囊 (Soft Raised Pills) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSocketFilterOnly(!socketFilterOnly)}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition flex items-center gap-1 border ${
                        socketFilterOnly 
                          ? 'bg-amber-400/90 text-amber-950 border-amber-300 shadow-xs' 
                          : 'soft-raised text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>僅看插座</span>
                    </button>
                    <button
                      onClick={() => setZoneFilter(zoneFilter === '靜音區' ? 'all' : '靜音區')}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition border ${
                        zoneFilter === '靜音區' 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                          : 'soft-raised text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🤫 靜音區
                    </button>
                    <button
                      onClick={() => setZoneFilter(zoneFilter === '筆電區' ? 'all' : '筆電區')}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition border ${
                        zoneFilter === '筆電區' 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                          : 'soft-raised text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      💻 筆電區
                    </button>
                  </div>
                </div>

                {/* 狀態圖例 (Legend) */}
                <div className="flex flex-wrap items-center gap-4 py-4 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-white border border-slate-300 shadow-xs"></span>可使用
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-[#fff2e8] border border-amber-300"></span>已登記待報到
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-slate-300"></span>使用中
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md border-2 border-dashed border-slate-400 bg-white"></span>暫離保留中
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-r from-pink-500 to-indigo-500 shadow-xs"></span>目前選中
                  </span>
                </div>

                {/* 6x6 建築平面方陣 (Soft Inset Tray) */}
                <div className="soft-inset p-5 sm:p-6 rounded-3xl my-2">
                  <div className="grid grid-cols-13 gap-2 sm:gap-3 items-center">
                    
                    {/* 左分區：靜音自習區 (Col 1-6) */}
                    <div className="col-span-6">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-500 mb-3">
                        <VolumeX className="w-3.5 h-3.5 text-indigo-500" />
                        <span>靜音研讀區 (嚴禁鍵盤敲擊)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                        {seats.filter(s => s.zone === '靜音區').map(seat => {
                          const isSelected = seat.id === selectedSeatId;
                          const isDimmed = socketFilterOnly && !seat.hasSocket;

                          let seatStyle = "seat-cushion h-12 sm:h-14 flex flex-col items-center justify-center font-black text-xs relative cursor-pointer border ";
                          if (isSelected) {
                            seatStyle += "aurora-btn ring-4 ring-rose-200/80 scale-105 z-10 border-transparent";
                          } else if (seat.status === 'available') {
                            seatStyle += "bg-white text-slate-800 border-white hover:bg-slate-50";
                          } else if (seat.status === 'reserved') {
                            seatStyle += "bg-[#fff2e8] text-amber-800 border-amber-200";
                          } else if (seat.status === 'in_use') {
                            seatStyle += "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed shadow-none";
                          } else if (seat.status === 'away') {
                            seatStyle += "bg-white text-slate-500 border-2 border-dashed border-slate-300";
                          }

                          return (
                            <button
                              key={seat.id}
                              disabled={seat.status !== 'available'}
                              onClick={() => setSelectedSeatId(seat.id)}
                              className={`${seatStyle} ${isDimmed ? 'opacity-20' : ''}`}
                            >
                              <span className="tracking-tight text-xs sm:text-sm">{seat.id}</span>
                              {seat.hasSocket && (
                                <span className="text-[9px] font-bold opacity-80 flex items-center -mt-0.5">
                                  <Zap className="w-2.5 h-2.5 fill-current" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 中央走道 (Col 7) */}
                    <div className="col-span-1 flex flex-col items-center justify-center py-6 border-x border-dashed border-slate-300/80 text-slate-400 text-[10px] font-extrabold tracking-widest">
                      <span>中</span>
                      <span>央</span>
                      <span>走</span>
                      <span>道</span>
                    </div>

                    {/* 右分區：筆電操作區 (Col 8-13) */}
                    <div className="col-span-6">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-500 mb-3">
                        <Monitor className="w-3.5 h-3.5 text-pink-500" />
                        <span>筆電打字區 (密集配電座)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                        {seats.filter(s => s.zone === '筆電區').map(seat => {
                          const isSelected = seat.id === selectedSeatId;
                          const isDimmed = socketFilterOnly && !seat.hasSocket;

                          let seatStyle = "seat-cushion h-12 sm:h-14 flex flex-col items-center justify-center font-black text-xs relative cursor-pointer border ";
                          if (isSelected) {
                            seatStyle += "aurora-btn ring-4 ring-rose-200/80 scale-105 z-10 border-transparent";
                          } else if (seat.status === 'available') {
                            seatStyle += "bg-white text-slate-800 border-white hover:bg-slate-50";
                          } else if (seat.status === 'reserved') {
                            seatStyle += "bg-[#fff2e8] text-amber-800 border-amber-200";
                          } else if (seat.status === 'in_use') {
                            seatStyle += "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed shadow-none";
                          } else if (seat.status === 'away') {
                            seatStyle += "bg-white text-slate-500 border-2 border-dashed border-slate-300";
                          }

                          return (
                            <button
                              key={seat.id}
                              disabled={seat.status !== 'available'}
                              onClick={() => setSelectedSeatId(seat.id)}
                              className={`${seatStyle} ${isDimmed ? 'opacity-20' : ''}`}
                            >
                              <span className="tracking-tight text-xs sm:text-sm">{seat.id}</span>
                              {seat.hasSocket && (
                                <span className="text-[9px] font-bold opacity-80 flex items-center -mt-0.5">
                                  <Zap className="w-2.5 h-2.5 fill-current" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* 平面圖底端地標指引 */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-bold mt-5 pt-3 border-t border-slate-200/80">
                    <span className="flex items-center gap-1.5">
                      🚪 自習室玻璃門入口 · 現場無手機備用登記機
                    </span>
                    <span className="flex items-center gap-1.5">
                      🪜 逃生梯 · 飲水機與洗手間
                    </span>
                  </div>
                </div>

              </div>

              {/* 底部快捷學生通報按鈕 */}
              <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span>發現現場有空位被佔用無人使用？</span>
                <button
                  onClick={() => {
                    setReportingSeatId(selectedSeatId);
                    setShowReportModal(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition flex items-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>線上通報佔位</span>
                </button>
              </div>

            </div>

            {/* 右側：選時段與確認面板 (Aurora Booking Drawer，佔 4 欄) */}
            <div className="lg:col-span-4 soft-card p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">Step 2 / Reservation</span>
                  <span className="text-[11px] font-bold text-slate-400">當日線上登記制</span>
                </div>

                {/* 所選座位卡片 (Soft Inset Tile) */}
                <div className="soft-inset p-4 rounded-2xl mb-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">{selectedSeat.id}</span>
                      <span className="text-xs font-bold text-indigo-600">{selectedSeat.zone}</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-400">靠走道 · 採光佳</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                      {selectedSeat.hasSocket ? '⚡ 具備獨立插座' : '無獨立插座'}
                    </span>
                    <span className="text-[10px] font-extrabold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
                      單人書桌
                    </span>
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      可預約席位
                    </span>
                  </div>
                </div>

                {/* 衝突衝堂測試開關 (模擬 P1, P4 規則) */}
                <div className="flex justify-between items-center bg-indigo-50/70 border border-indigo-100/90 rounded-2xl p-2.5 mb-4 text-xs">
                  <span className="font-bold text-indigo-950">模擬衝堂衝突攔截：</span>
                  <button
                    onClick={() => setConflictSimulated(!conflictSimulated)}
                    className={`px-3 py-1 rounded-full font-black text-[11px] transition ${
                      conflictSimulated 
                        ? 'bg-rose-500 text-white shadow-xs' 
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {conflictSimulated ? '已觸發衝突' : '時段正常'}
                  </button>
                </div>

                {conflictSimulated ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-700 font-extrabold mb-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>無法預約：時段重疊衝堂</span>
                    </div>
                    <p className="text-rose-600 leading-relaxed font-medium">
                      你在 14:00 - 17:00 已預約座位 <strong>B4</strong>，同時間段每位讀者上限登記 1 個席位，請先取消原預約或更換時段。
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 開始時間晶片 */}
                    <div className="mb-3.5">
                      <label className="text-[11px] font-extrabold text-slate-400 block mb-1.5">開始時間</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['13:00', '14:00', '15:00', '16:00'].map(t => (
                          <button
                            key={t}
                            onClick={() => setStartTime(t)}
                            className={`py-2 rounded-xl text-xs font-black transition border ${
                              startTime === t 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                                : 'soft-raised text-slate-700 hover:border-indigo-300'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 結束時間晶片 */}
                    <div className="mb-4">
                      <label className="text-[11px] font-extrabold text-slate-400 block mb-1.5">預計結束時間</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['15:00', '16:00', '17:00', '18:00'].map(t => (
                          <button
                            key={t}
                            onClick={() => setEndTime(t)}
                            className={`py-2 rounded-xl text-xs font-black transition border ${
                              endTime === t 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                                : 'soft-raised text-slate-700 hover:border-indigo-300'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold mt-1.5 block">
                        本次預約時長共 3 小時（最少 1 小時）
                      </span>
                    </div>

                    {/* 規範勾選 Checkbox */}
                    <div className="p-3.5 soft-inset rounded-2xl text-xs mb-4">
                      <label className="flex items-start gap-2.5 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={rulesAgreed}
                          onChange={e => setRulesAgreed(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] leading-relaxed text-slate-600">
                          我已了解登記後需於 <strong className="text-slate-900">30 分鐘內</strong> 至座位掃碼報到；暫離超過 <strong className="text-slate-900">60 分鐘</strong> 系統將自動釋出並記錄違規點數 1 點。
                        </span>
                      </label>
                    </div>
                  </>
                )}

              </div>

              {/* 核心 Aurora 漸層登記按鈕 (參考圖中 Book a Call 的極光膠囊風格) */}
              <button
                disabled={!rulesAgreed || conflictSimulated}
                onClick={handleConfirmBooking}
                className={`w-full py-4 rounded-full font-black text-sm tracking-wide transition flex items-center justify-center gap-2 ${
                  rulesAgreed && !conflictSimulated
                    ? 'aurora-btn cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <span>立即確認線上登記席位</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 2: 即時空位概況 (Overview Dashboard)
           ----------------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* 頂部極光漸層大橫幅 */}
            <div className="soft-card p-8 md:p-10 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="max-w-xl z-10">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                  實體座位動態 · 免登入公開查閱
                </span>
                <h2 className="text-2xl md:text-4xl font-black mt-3 text-slate-900 tracking-tight">
                  北科大 B1 自習室 · 空位即時概況
                </h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                  提供全館 287 席即時動態查詢，採用精準 QR Code 桌上防偽報到機制與暫離 60 分鐘保護規則，徹底杜絕人肉與書包佔位。
                </p>
              </div>

              <button
                onClick={() => setActiveTab('floor')}
                className="aurora-btn px-7 py-4 rounded-full font-black text-sm shrink-0 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>前往線上劃位</span>
              </button>
            </div>

            {/* 指標卡片 (Soft Clay KPI Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="soft-card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Available</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-indigo-600">{availableCount}</span>
                    <span className="text-xs font-bold text-slate-400">/ {seats.length} 席示範區</span>
                  </div>
                </div>
                <div className="w-full soft-inset h-2.5 rounded-full mt-4 overflow-hidden p-0.5">
                  <div className="aurora-blue-btn h-full rounded-full" style={{ width: `${(availableCount / seats.length) * 100}%` }}></div>
                </div>
              </div>

              <div className="soft-card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">🤫 靜音自習區</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-slate-900">{quietAvailable}</span>
                    <span className="text-xs font-bold text-slate-400">席目前可用</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 mt-3">● 嚴禁通話與鍵盤敲擊，深度閱讀首選</span>
              </div>

              <div className="soft-card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">💻 筆電打字區</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-slate-900">{laptopAvailable}</span>
                    <span className="text-xs font-bold text-slate-400">席目前可用</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-pink-600 mt-3">● 全區高密度電源插座，適合編程做報告</span>
              </div>

              <div className="soft-card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">尖峰流動預測</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-amber-600">正常流通</span>
                    <span className="text-xs font-bold text-slate-400">期中評圖前夕</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-500 mt-3">預計 18:30 後開始迎來晚自習人潮</span>
              </div>
            </div>

            {/* 新制規定簡介卡片 */}
            <div className="soft-card p-6 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>
                  <strong>自習室新制規範：</strong> 1. 登記後 30 分鐘內未完成掃碼視同未報到釋出 2. 暫離保留 60 分鐘 3. 全面禁止佔位，累計 2 點停權 3 天。
                </span>
              </div>
              <button 
                onClick={() => setActiveTab('records')}
                className="text-indigo-600 font-extrabold hover:underline"
              >
                查看完整停權細則 →
              </button>
            </div>

          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 3: 我的座位狀態 (Active Session Dashboard & QR Check-in)
           ----------------------------------------------------------------------- */}
        {activeTab === 'session' && (
          <div className="max-w-3xl mx-auto w-full">
            {bookingState === 'idle' ? (
              <div className="soft-card p-12 text-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">目前尚無進行中的預約席次</h3>
                <p className="text-xs text-slate-400 mt-1 mb-6">歡迎前往平面圖選位，挑選適合自己的座位開始自習。</p>
                <button
                  onClick={() => setActiveTab('floor')}
                  className="aurora-btn px-6 py-3.5 rounded-full font-bold text-xs"
                >
                  前往選位
                </button>
              </div>
            ) : (
              <div className="soft-card p-7 sm:p-9">
                
                {/* 頂部座位識別 */}
                <div className="flex flex-wrap items-center justify-between pb-6 border-b border-slate-100 gap-4">
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Active Seat Session</span>
                    <div className="flex items-center gap-3 mt-1">
                      <h2 className="text-3xl font-black text-slate-900">{activeSeatId} 席</h2>
                      <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                        {seats.find(s => s.id === activeSeatId)?.zone || '靜音區'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-400">使用時段</span>
                    <div className="text-sm font-black text-slate-800">今天 {startTime} - {endTime}</div>
                  </div>
                </div>

                {/* 狀態 1: 已預約待報到 (RESERVED) */}
                {bookingState === 'reserved' && (
                  <div className="py-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                      <Clock className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">座位保留中 · 請盡速到場報到</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      請在時限內抵達 B1 自習室座位 <strong className="text-slate-800">{activeSeatId}</strong>，打開手機掃描桌上專屬 QR Code。
                    </p>

                    {/* 倒數計時大膠囊 (Soft Inset Pod) */}
                    <div className="soft-inset p-6 rounded-3xl my-6 w-full max-w-sm">
                      <span className="text-xs font-black text-amber-800">報到剩餘時限</span>
                      <div className="text-4xl font-black text-amber-900 my-1 font-mono tracking-tight">
                        {formatTimer(checkinSeconds)}
                      </div>
                      <span className="text-[10px] font-bold text-amber-700">逾期未到場掃碼，系統將自動取消釋出</span>
                    </div>

                    {/* 報到三步驟 */}
                    <div className="w-full max-w-md soft-inset p-4 rounded-2xl text-left text-xs text-slate-600 space-y-2 mb-6">
                      <div className="font-black text-slate-800">報到 3 步驟：</div>
                      <div className="flex gap-2"><span>1.</span><span>走到座位 {activeSeatId}（靜音區、靠走道）</span></div>
                      <div className="flex gap-2"><span>2.</span><span>點擊下方按鈕，掃描桌面上實體專屬 QR Code</span></div>
                      <div className="flex gap-2"><span>3.</span><span>出現「報到成功」即可開始自習</span></div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
                      <button
                        onClick={() => setShowQRModal(true)}
                        className="aurora-btn flex-1 py-3.5 rounded-full font-black text-xs flex items-center justify-center gap-2"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>打開相機掃描 QR Code 報到</span>
                      </button>
                      <button
                        onClick={handleReleaseSeat}
                        className="px-5 py-3.5 rounded-full soft-raised text-slate-600 font-bold text-xs hover:bg-slate-50"
                      >
                        取消預約
                      </button>
                    </div>
                  </div>
                )}

                {/* 狀態 2: 使用中 (IN USE) */}
                {bookingState === 'in_use' && (
                  <div className="py-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-black px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ● 使用中 · 就座認證通過
                    </span>

                    <div className="soft-inset p-6 rounded-3xl my-6 w-full max-w-sm">
                      <span className="text-xs font-black text-slate-400">剩餘使用時長</span>
                      <div className="text-4xl font-black text-slate-900 my-1 font-mono tracking-tight">
                        {formatTimer(sessionRemainingSeconds)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">預計至 {endTime} 結束，請把握時間</span>
                    </div>

                    <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                      離開座位用餐或去洗手間，請點擊「暫離」啟動 60 分鐘倒數保護；自習完畢離開圖書館時，請務必點擊「提前退席」將座位留給同學。
                    </p>

                    <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
                      <button
                        onClick={handleStartAway}
                        className="aurora-blue-btn flex-1 py-3.5 rounded-full font-black text-xs flex items-center justify-center gap-2"
                      >
                        <Coffee className="w-4 h-4" />
                        <span>暫離座位（啟動 60 分鐘保留）</span>
                      </button>
                      <button
                        onClick={handleReleaseSeat}
                        className="px-6 py-3.5 rounded-full soft-raised text-slate-600 font-bold text-xs hover:bg-slate-50"
                      >
                        提前退席
                      </button>
                    </div>
                  </div>
                )}

                {/* 狀態 3: 暫離保留中 (AWAY) */}
                {bookingState === 'away' && (
                  <div className="py-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                      <Coffee className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-black px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      ● 暫離保護倒數中
                    </span>

                    <div className="soft-inset p-6 rounded-3xl my-6 w-full max-w-sm">
                      <span className="text-xs font-black text-amber-800">暫離保留剩餘時間</span>
                      <div className="text-4xl font-black text-amber-900 my-1 font-mono tracking-tight">
                        {formatTimer(awaySeconds)}
                      </div>
                      <span className="text-[10px] font-bold text-amber-700">逾期未掃碼回座，系統將自動釋出並計違規 1 點</span>
                    </div>

                    <p className="text-xs text-slate-500 max-w-md mb-6">
                      已回到座位？請再次點擊下方按鈕以掃描桌上 QR Code 恢復「使用中」狀態。
                    </p>

                    <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
                      <button
                        onClick={handleReturnFromAway}
                        className="aurora-emerald-btn flex-1 py-3.5 rounded-full font-black text-xs flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>掃碼回座（恢復使用）</span>
                      </button>
                      <button
                        onClick={handleReleaseSeat}
                        className="px-6 py-3.5 rounded-full soft-raised text-slate-600 font-bold text-xs hover:bg-slate-50"
                      >
                        不回去了，直接退席
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 4: 個人違規與申訴紀錄 (My Records & Penalty Ladder)
           ----------------------------------------------------------------------- */}
        {activeTab === 'records' && (
          <div className="max-w-4xl mx-auto w-full space-y-6">
            
            {/* 違規記點與停權對照 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* 點數統計卡 */}
              <div className="soft-card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Penalty Points</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-black text-slate-900">0</span>
                    <span className="text-xs font-extrabold text-slate-400">/ 4 點上限</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="inline-block text-[11px] font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    ● 信用良好 · 權限正常
                  </span>
                </div>
              </div>

              {/* 停權標準階梯卡 */}
              <div className="md:col-span-2 soft-card p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5">
                    自習室停權標準辦法（點數階梯）：
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="soft-inset p-3 rounded-2xl text-center">
                      <span className="text-[11px] font-bold text-slate-400 block">累計 2 點</span>
                      <span className="font-black text-rose-600 text-xs sm:text-sm mt-1 block">停權 3 天</span>
                    </div>
                    <div className="soft-inset p-3 rounded-2xl text-center">
                      <span className="text-[11px] font-bold text-slate-400 block">累計 3 點</span>
                      <span className="font-black text-rose-600 text-xs sm:text-sm mt-1 block">停權 7 天</span>
                    </div>
                    <div className="soft-inset p-3 rounded-2xl text-center">
                      <span className="text-[11px] font-bold text-slate-400 block">累計 4 點</span>
                      <span className="font-black text-rose-600 text-xs sm:text-sm mt-1 block">停權 1 個月</span>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-bold mt-3 block">
                  * 常見記點事項：登記未報到 (1點)、暫離逾時未歸 (1點)、私拉個人延長線 (1點)、同時佔用多個插座 (1點)。
                </span>
              </div>

            </div>

            {/* 近期歷史紀錄列表 */}
            <div className="soft-card p-7">
              <h4 className="text-sm font-black text-slate-900 mb-4 tracking-tight">近期預約與使用歷程</h4>
              <div className="space-y-3">
                {[
                  { seat: 'C2 · 靜音區', date: '今天 11/11', time: '14:00 - 17:00', status: '使用中', badge: 'bg-blue-100 text-blue-800' },
                  { seat: 'A5 · 筆電區', date: '昨天 11/10', time: '09:00 - 12:00', status: '正常完成', badge: 'bg-slate-100 text-slate-700' },
                  { seat: 'B4 · 筆電區', date: '前天 11/09', time: '19:00 - 21:00', status: '提前退席', badge: 'bg-slate-100 text-slate-700' },
                  { seat: 'D1 · 靜音區', date: '11/08', time: '13:00 - 15:00', status: '未報到·已取消', badge: 'bg-amber-100 text-amber-800' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 soft-inset rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-900">{item.seat}</div>
                      <div className="text-[11px] text-slate-400 font-bold">{item.date} {item.time}</div>
                    </div>
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${item.badge}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* -----------------------------------------------------------------------
            TAB 5: 館員巡查清單 (Staff Patrol Dashboard)
           ----------------------------------------------------------------------- */}
        {activeTab === 'patrol' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            
            {/* 巡查待辦清單 (佔 7 欄) */}
            <div className="lg:col-span-7 soft-card p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">現場確認巡查名單</h3>
                  <span className="text-xs text-slate-400 font-bold">依未報到、暫離逾時與學生通報即時彙整</span>
                </div>

                {/* 分類標籤 */}
                <div className="flex gap-1.5 soft-inset p-1 rounded-full text-xs font-bold">
                  {[
                    { key: 'all', label: `全部 (${patrolTasks.length})` },
                    { key: 'noshow', label: '未報到' },
                    { key: 'away', label: '暫離逾時' },
                    { key: 'report', label: '通報佔位' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setPatrolCategoryFilter(f.key as any)}
                      className={`px-3 py-1 rounded-full text-[11px] font-black transition ${
                        patrolCategoryFilter === f.key 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 巡查項目卡片 */}
              <div className="space-y-3 mt-4">
                {patrolTasks
                  .filter(t => patrolCategoryFilter === 'all' || t.category === patrolCategoryFilter)
                  .map(task => (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        task.handled 
                          ? 'bg-slate-50 border-slate-200 opacity-50' 
                          : 'bg-white border-slate-200/90 shadow-sm hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center font-black text-base shrink-0">
                          {task.seatId}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              task.type === '未報到逾時' ? 'bg-amber-100 text-amber-900' :
                              task.type === '暫離逾時' ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {task.type}
                            </span>
                            <span className="text-xs font-bold text-slate-700">{task.zone}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-bold mt-1 block">
                            已逾時：{task.overdueMinutes} 分鐘
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTogglePatrolTask(task.id)}
                        className={`px-4 py-2 rounded-full text-xs font-black transition flex items-center gap-1.5 ${
                          task.handled
                            ? 'bg-slate-200 text-slate-600'
                            : 'aurora-btn'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{task.handled ? '已處理完成' : '現場處理'}</span>
                      </button>
                    </div>
                ))}
              </div>
            </div>

            {/* 巡查動線平面圖同步高亮 (佔 5 欄) */}
            <div className="lg:col-span-5 soft-card p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">巡查動線平面導引</h4>
                    <span className="text-xs text-slate-400 font-bold">紅框光圈席位代表需現場查核</span>
                  </div>
                  <span className="text-xs font-black bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
                    待確認：{patrolTasks.filter(t => !t.handled).length} 席
                  </span>
                </div>

                {/* 6x6 縮小版即時紅框連動圖 */}
                <div className="soft-inset p-4 rounded-2xl my-3">
                  <div className="grid grid-cols-6 gap-1.5">
                    {seats.map(seat => {
                      const isAlert = patrolTasks.some(t => t.seatId === seat.id && !t.handled);
                      return (
                        <div
                          key={seat.id}
                          className={`h-10 rounded-xl text-xs font-black flex items-center justify-center transition border ${
                            isAlert
                              ? 'border-2 border-rose-500 bg-rose-50 text-rose-600 animate-pulse ring-4 ring-rose-200/80 shadow-md scale-105'
                              : 'bg-white text-slate-300 border-slate-200'
                          }`}
                        >
                          {seat.id}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 soft-inset rounded-2xl text-xs text-slate-600 leading-relaxed font-medium">
                <span className="font-black text-slate-900 block mb-1">館員巡查 SOP 指引：</span>
                巡查人員依清單至現場查看，若確無人在場且留有私人物品，點擊「現場處理」按鈕，系統將自動將該席位標記為釋出，並記入違規黑名單。
              </div>
            </div>

          </div>
        )}

      </main>

      {/* =========================================================================
          QR CODE 掃碼模擬彈窗 (Camera Viewfinder Modal)
         ========================================================================= */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="soft-card max-w-sm w-full p-6 text-center relative overflow-hidden">
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">QR Check-in</span>
            <h3 className="text-xl font-black text-slate-900 mt-1">座位掃碼報到</h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">對準座位 {activeSeatId} 桌上的專屬二維碼</p>

            {/* 模擬相機取景框與光掃描線 */}
            <div className="w-56 h-56 rounded-3xl soft-inset mx-auto flex items-center justify-center relative overflow-hidden border-2 border-indigo-400/50 mb-5">
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_12px_#ec4899] animate-pulse"></div>
              <div className="text-center p-4">
                <QrCode className="w-16 h-16 text-slate-400 mx-auto mb-2 opacity-60" />
                <span className="text-[11px] font-black text-slate-500 block">座位 {activeSeatId} 專屬碼</span>
                <span className="text-[9px] text-slate-400">防偽座標驗證已啟動</span>
              </div>
            </div>

            <button
              onClick={handleCheckinSuccess}
              className="aurora-btn w-full py-3.5 rounded-full font-black text-xs"
            >
              模擬掃描成功（完成報到）
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          學生通報佔位彈窗 (Report Modal)
         ========================================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="soft-card max-w-md w-full p-6 sm:p-7 relative">
            <button 
              onClick={() => setShowReportModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-rose-600 font-black text-base mb-1">
              <Flag className="w-5 h-5" />
              <span>通報無人佔位</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              若發現席位長時間無人卻堆放私人物品，請協助通報以維護全校讀者權益。
            </p>

            <div className="space-y-3.5 mb-5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">通報目標座位</label>
                <div className="soft-inset p-3 rounded-xl font-black text-slate-900 text-sm">
                  {reportingSeatId} 席（{seats.find(s => s.id === reportingSeatId)?.zone}）
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">佔位現場狀況說明</label>
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full soft-inset p-3 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="請描述現場狀況（例如：書包放著超過1小時無人、放外套佔位等）"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmitReport}
                className="aurora-btn flex-1 py-3.5 rounded-full font-black text-xs"
              >
                確認送出通報給館員
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-5 py-3.5 rounded-full soft-raised text-slate-600 font-bold text-xs"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 頁腳 */}
      <footer className="w-full text-center py-6 text-xs text-slate-400 font-bold border-t border-slate-200/50 mt-auto">
        國立臺北科技大學 圖書館 · 自習室座位預約與巡查管理系統
      </footer>

    </div>
  );
}
