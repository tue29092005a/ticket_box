import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTicketEvents } from '../hooks/useTicketEvents';
import axiosClient from '../utils/axiosClient';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/LoginModal';

export const SeatMapPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút
  const navigate = useNavigate();
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // State to manage seat selection dynamically for the demo
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [vipCount, setVipCount] = useState(0);
  const [normalCount, setNormalCount] = useState(0);
  const [vipRemaining, setVipRemaining] = useState(50);
  const [normalRemaining, setNormalRemaining] = useState(100);

  useEffect(() => {
    // Lấy số lượng vé VIP và Normal còn lại khi load trang
    axiosClient.get('/booking/show/1/inventory').then((res) => {
      setVipRemaining(res.data.VIP);
      setNormalRemaining(res.data.Normal);
    }).catch(console.error);

    // Lấy trạng thái ghế SVIP ban đầu
    axiosClient.get('/booking/show/1/seats').then((res) => {
      if (res.data) {
        const booked = new Set<string>();
        Object.keys(res.data).forEach(seatId => booked.add(seatId));
        setBookedSeats(booked);
      }
    }).catch(console.error);
  }, []);

  const [bookedSeats, setBookedSeats] = useState<Set<string>>(new Set());

  // Lắng nghe SSE từ Backend bằng Callback để tránh bị sót event khi React batching state
  useTicketEvents(user?.id || 'guest', (payload) => {
    if (payload.seatNo) {
      setBookedSeats((prev) => {
        const next = new Set(prev);
        if (payload.status === 'booked' || payload.status === 'held') {
          next.add(payload.seatNo!);
          // Bỏ chọn nếu user đang chọn ghế này (Zero Seat Clash)
          setSelectedSeats((sel) => {
            if (sel.has(payload.seatNo!)) {
              const newSel = new Set(sel);
              newSel.delete(payload.seatNo!);
              return newSel;
            }
            return sel;
          });
        } else if (payload.status === 'available') {
          next.delete(payload.seatNo!);
        }
        return next;
      });
    }

    if (payload.type === 'VIP' && payload.quantity) {
      setVipRemaining((prev) => Math.max(0, prev - payload.quantity!));
    } else if (payload.type === 'Normal' && payload.quantity) {
      setNormalRemaining((prev) => Math.max(0, prev - payload.quantity!));
    }
  });

  const toggleSeat = (seatId: string) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    setSelectedSeats(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  };

  const totalPrice = (selectedSeats.size * 2650000) + (vipCount * 2450000) + (normalCount * 1850000);
  const totalTickets = selectedSeats.size + vipCount + normalCount;

  const handleCheckout = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (totalTickets === 0) {
      alert("Vui lòng chọn ít nhất 1 vé!");
      return;
    }
    
    try {
      // Gọi API giữ chỗ (Hold Ticket) -> Kích hoạt HSETNX (SVIP) và INCRBY (VIP/Normal)
      await axiosClient.post('/booking/hold', {
        showId: '1',
        seats: Array.from(selectedSeats),
        vipCount,
        normalCount
      });
      
      // Nếu thành công (Không bị 400), tiến hành chuyển trang
      navigate('/checkout.html', {
        state: {
          selectedSeats: Array.from(selectedSeats),
          vipCount,
          normalCount,
          totalPrice,
          totalTickets
        }
      });
    } catch (error: any) {
      if (error.response?.status === 400) {
        // Handle lỗi vượt quá quota vé thường, hoặc bị trùng ghế SVIP
        alert("Lỗi đặt vé: " + (error.response.data?.message || "Ghế đã có người đặt (Zero Seat Clash) hoặc bạn đã vượt quá giới hạn vé!"));
      } else {
        alert("Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại.");
      }
    }
  };

  const renderSVIPRow = (rowLabel: string) => (
    <div className="flex items-center gap-4">
      {/* Left Margin Label */}
      <span className="text-[10px] w-4 font-bold text-center opacity-50">{rowLabel}</span>
      
      <div className="flex gap-2">
        {[...Array(8)].map((_, i) => {
          const seatNum = i + 1;
          const seatId = `${rowLabel}-${seatNum}`;
          return (
            <div 
              key={seatId} 
              className={`w-[36px] h-[42px] rounded-md flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-transform duration-100 shadow-sm select-none ${bookedSeats.has(seatId) ? 'bg-[#5c5c5c] cursor-not-allowed opacity-50' : 'bg-[#e53935] hover:scale-110'} ${selectedSeats.has(seatId) ? '!bg-[#26bc8a]' : ''}`}
              onClick={() => {
                if (!bookedSeats.has(seatId)) toggleSeat(seatId);
              }}
            >
              {seatId}
            </div>
          );
        })}
      </div>
      
      <div className="flex gap-2">
        {[...Array(8)].map((_, i) => {
          const seatNum = i + 9;
          const seatId = `${rowLabel}-${seatNum}`;
          return (
            <div 
              key={seatId} 
              className={`w-[36px] h-[42px] rounded-md flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-transform duration-100 shadow-sm select-none ${bookedSeats.has(seatId) ? 'bg-[#5c5c5c] cursor-not-allowed opacity-50' : 'bg-[#e53935] hover:scale-110'} ${selectedSeats.has(seatId) ? '!bg-[#26bc8a]' : ''}`}
              onClick={() => {
                if (!bookedSeats.has(seatId)) toggleSeat(seatId);
              }}
            >
              {seatId}
            </div>
          );
        })}
      </div>
      
      <div className="flex gap-2">
        {[...Array(8)].map((_, i) => {
          const seatNum = i + 17;
          const seatId = `${rowLabel}-${seatNum}`;
          return (
            <div 
              key={seatId} 
              className={`w-[36px] h-[42px] rounded-md flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-transform duration-100 shadow-sm select-none ${bookedSeats.has(seatId) ? 'bg-[#5c5c5c] cursor-not-allowed opacity-50' : 'bg-[#e53935] hover:scale-110'} ${selectedSeats.has(seatId) ? '!bg-[#26bc8a]' : ''}`}
              onClick={() => {
                if (!bookedSeats.has(seatId)) toggleSeat(seatId);
              }}
            >
              {seatId}
            </div>
          );
        })}
      </div>

      {/* Right Margin Label */}
      <span className="text-[10px] w-4 font-bold text-center opacity-50">{rowLabel}</span>
    </div>
  );

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-hidden flex flex-col h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-container-low border-b border-outline-variant flex flex-col gap-base px-margin-desktop py-4 w-full shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.href = '/event.html'}
              className="p-2 hover:bg-surface-container-high transition-all rounded-full flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>arrow_back</span>
            </button>
            <h1 className="font-headline-md text-headline-md text-white">Liveshow Góc Ban Công: Vệt Nắng</h1>
          </div>
          <div className="flex items-center gap-gutter">
            <div className="glass-timer flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant" style={{ backdropFilter: 'blur(12px)', background: 'rgba(28, 27, 27, 0.8)' }}>
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>timer</span>
              <span className="font-label-md text-on-surface">{formatTime(timeLeft)} Remaining</span>
            </div>
            {user ? (
              <div className="flex items-center gap-4 border border-outline-variant rounded-full px-4 py-1.5 bg-surface-container-high/50 backdrop-blur-sm">
                <span className="text-sm font-medium text-purple-400">{user.email}</span>
                <button 
                  onClick={logout}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <span className="material-symbols-outlined text-primary cursor-pointer hover:bg-surface-container-high p-2 rounded-full transition-all" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }} onClick={() => setIsLoginModalOpen(true)}>account_circle</span>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex h-[calc(100vh-80px)] overflow-hidden flex-row">
        {/* Zoom Controls */}
        <div className="absolute left-6 top-6 z-30 flex flex-col gap-3">
          <button className="w-10 h-10 rounded-full border border-outline-variant bg-surface-container-high flex items-center justify-center text-white hover:bg-surface-bright shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>add</span>
          </button>
          <button className="w-10 h-10 rounded-full border border-outline-variant bg-surface-container-high flex items-center justify-center text-white hover:bg-surface-bright shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>refresh</span>
          </button>
          <button className="w-10 h-10 rounded-full border border-outline-variant bg-surface-container-high flex items-center justify-center text-white hover:bg-surface-bright shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>remove</span>
          </button>
        </div>

        {/* Seat Map Canvas */}
        <section className="flex-1 overflow-auto seat-map-scroll flex flex-col items-center p-12 bg-black h-full relative" style={{ scrollbarWidth: 'thin' }}>
          {/* Legend */}
          <div className="flex gap-8 mb-12">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white"></div>
              <span className="text-xs text-on-surface-variant">Đang trống</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-container"></div>
              <span className="text-xs text-on-surface-variant">Đang chọn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-error"></div>
              <span className="text-xs text-on-surface-variant">Không chọn được</span>
            </div>
          </div>

          {/* Stage */}
          <div className="w-[500px] h-14 bg-[#c5c6d0] flex items-center justify-center mb-16 rounded-sm shadow-inner">
            <h2 className="text-3xl font-bold text-white tracking-[0.8em]">STAGE</h2>
          </div>

          {/* Seating Blocks Container */}
          <div className="flex flex-col gap-4 items-center">
            {/* Top Block: SVIP & VIP */}
            <div className="border border-outline-variant/30 p-8 rounded-lg bg-surface-container-lowest/20 backdrop-blur-sm">
              <div className="flex flex-col gap-2">
                {/* Row A-B: SVIP (Red) */}
                <div className="flex flex-col gap-2">
                  {renderSVIPRow('A')}
                  {renderSVIPRow('B')}
                </div>

                {/* Row C-J: VIP (Yellow) */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] w-4 font-bold text-center opacity-50">C</span>
                      <span className="text-[10px] w-4 font-bold text-center opacity-50">D</span>
                      <span className="text-[10px] w-4 font-bold text-center opacity-50">E</span>
                      <span className="text-[10px] w-4 font-bold text-center opacity-50">F</span>
                    </div>
                    <div className="flex-1 h-[112px] w-[500px] bg-[#fdd835] rounded-lg flex items-center justify-center shadow-lg border border-yellow-600/20 mx-4">
                      <span className="text-black font-bold text-2xl tracking-widest">VIP</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] w-4 font-bold text-center opacity-50">C</span>
                      <span className="text-[10px] w-4 font-bold text-center opacity-50">D</span>
                      <span className="text-[10px] w-4 font-bold text-center opacity-50">E</span>
                      <span className="text-[10px] w-4 font-bold text-center opacity-50">F</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Block: Deluxe (Purple) */}
            <div className="border border-outline-variant/30 p-8 rounded-lg bg-surface-container-lowest/20 backdrop-blur-sm">
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] w-4 font-bold text-center opacity-50">L</span>
                    <span className="text-[10px] w-4 font-bold text-center opacity-50">M</span>
                    <span className="text-[10px] w-4 font-bold text-center opacity-50">...</span>
                    <span className="text-[10px] w-4 font-bold text-center opacity-50">W</span>
                  </div>
                  <div className="w-[600px] h-[160px] bg-[#A331C0] rounded-lg flex items-center justify-center shadow-lg border border-purple-600/20 mx-4">
                    <span className="text-white font-headline-lg text-3xl font-bold tracking-widest uppercase">Normal</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] w-4 font-bold text-center opacity-50">L</span>
                    <span className="text-[10px] w-4 font-bold text-center opacity-50">M</span>
                    <span className="text-[10px] w-4 font-bold text-center opacity-50">...</span>
                    <span className="text-[10px] w-4 font-bold text-center opacity-50">W</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Order Summary */}
        <aside className="h-[calc(100vh-80px)] w-[360px] bg-surface-container-high border-l border-outline-variant shadow-2xl flex flex-col p-6 gap-6 z-30 relative shrink-0 overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col gap-1">
            <h3 className="font-headline-md text-on-surface">Order Summary</h3>
            <p className="font-body-md text-primary font-semibold">Vệt Nắng</p>
            <div className="flex items-start gap-2 text-on-surface-variant mt-2">
              <span className="material-symbols-outlined text-[18px] mt-1" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>location_on</span>
              <span className="text-sm">Hội trường Trung tâm Văn hoá Thể thao Quần Ngựa</span>
            </div>
          </div>
          
          <div className="h-[1px] bg-outline-variant/30"></div>

          {/* Price Legend with Swatches */}
          <div className="flex flex-col gap-3">
            <span className="font-label-md text-xs uppercase tracking-wider text-on-surface-variant">Giá vé</span>
            <span className="text-[10px] italic text-on-surface-variant/80 block mt-1">*Chỉ khu SVIP mới chọn ghế</span>
            
            <div className="flex justify-between items-center bg-surface-container-low p-3 rounded-lg border border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm bg-[#e53935]"></div>
                <span className="font-label-md">SVIP</span>
              </div>
              <span className="font-body-sm font-bold">2.650.000 đ</span>
            </div>
            
            <div className="flex flex-col gap-4 bg-surface-container-low p-4 rounded-lg border border-outline-variant">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-[#ffdb3c]"></div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-on-surface">VIP</span>
                    <span className="font-body-md text-primary font-bold">2.450.000 đ</span>
                    <span className="text-xs text-on-surface-variant mt-1">Còn lại: <b className="text-white">{vipRemaining}</b> vé</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button 
                  onClick={() => {
                    if (!user) { setIsLoginModalOpen(true); return; }
                    setVipCount(Math.max(0, vipCount - 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>remove</span>
                </button>
                <div className="w-12 h-8 flex items-center justify-center bg-white rounded-lg">
                  <span className="text-black font-bold">{vipCount}</span>
                </div>
                <button 
                  onClick={() => {
                    if (!user) { setIsLoginModalOpen(true); return; }
                    setVipCount(Math.min(vipRemaining, vipCount + 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-primary border border-primary flex items-center justify-center text-on-primary hover:brightness-110 transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>add</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-surface-container-low p-4 rounded-lg border border-outline-variant">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-sm bg-[#8e24aa]"></div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-on-surface">Normal</span>
                    <span className="font-body-md text-primary font-bold">1.850.000 đ</span>
                    <span className="text-xs text-on-surface-variant mt-1">Còn lại: <b className="text-white">{normalRemaining}</b> vé</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button 
                  onClick={() => {
                    if (!user) { setIsLoginModalOpen(true); return; }
                    setNormalCount(Math.max(0, normalCount - 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>remove</span>
                </button>
                <div className="w-12 h-8 flex items-center justify-center bg-white rounded-lg">
                  <span className="text-black font-bold">{normalCount}</span>
                </div>
                <button 
                  onClick={() => {
                    if (!user) { setIsLoginModalOpen(true); return; }
                    setNormalCount(Math.min(normalRemaining, normalCount + 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-primary border border-primary flex items-center justify-center text-on-primary hover:brightness-110 transition-colors">
                  <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Selected Seats List */}
          <div className="flex-1 overflow-y-auto"></div>

          {/* Checkout Section */}
          <div className="pt-6 border-t border-outline-variant flex flex-col gap-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>confirmation_number</span>
              <span className="text-white font-bold text-lg">x{totalTickets}</span>
            </div>
            {selectedSeats.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>event_seat</span>
                <span className="text-sm font-semibold text-primary">{Array.from(selectedSeats).join(', ')}</span>
              </div>
            )}
            
            <div className="flex justify-between items-end">
              <span className="font-label-md text-on-surface-variant">TẠM TÍNH</span>
              <span className="text-2xl font-bold text-primary">{totalPrice.toLocaleString('vi-VN')} đ</span>
            </div>
            
            <button 
              onClick={handleCheckout}
              className="w-full py-4 bg-primary text-on-primary font-headline-md rounded-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(84,221,169,0.3)]"
            >
              Tiếp tục
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>double_arrow</span>
            </button>
          </div>
        </aside>
      </main>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
};
