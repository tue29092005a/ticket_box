import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTicketEvents } from '../hooks/useTicketEvents';
import axiosClient from '../utils/axiosClient';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/LoginModal';
import { useBookingTimer } from '../hooks/useBookingTimer';

export const SeatMapPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  
  const { timeLeft, formattedTime } = useBookingTimer(300); // 5 phút

  const navigate = useNavigate();
  
  const searchParams = new URLSearchParams(window.location.search);
  const concert_id = Number(searchParams.get('id')) || 1;

  const [eventData, setEventData] = useState<any>(null);
  const [isBookingDown, setIsBookingDown] = useState(false);
  
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [bookedSeats, setBookedSeats] = useState<Set<string>>(new Set());
  
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [inventory, setInventory] = useState<Record<string, number>>({});

  // Removing formatTime as we use formattedTime from hook


  useEffect(() => {
    // Kiểm tra đơn hàng đang chờ thanh toán
    if (sessionStorage.getItem('idempotency_key') && sessionStorage.getItem('booking_expireAt')) {
      const expireAt = parseInt(sessionStorage.getItem('booking_expireAt') || '0', 10);
      if (expireAt > Date.now()) {
        const wantsToContinue = window.confirm('Bạn đang có một đơn hàng đang chờ thanh toán. Bạn có muốn tiếp tục thanh toán không? Nhấn OK để tiếp tục, nhấn Cancel để hủy và chọn lại.');
        if (wantsToContinue) {
          const savedCart = sessionStorage.getItem('cart_state');
          if (savedCart) {
            navigate('/checkout.html', { state: JSON.parse(savedCart) });
          } else {
            navigate('/checkout.html');
          }
          return;
        } else {
          sessionStorage.removeItem('idempotency_key');
          sessionStorage.removeItem('booking_expireAt');
          sessionStorage.removeItem('cart_state');
          // Có thể gọi API hủy đơn ở đây nếu cần, nhưng timeout/rollback worker sẽ tự xử lý
        }
      } else {
        sessionStorage.removeItem('idempotency_key');
        sessionStorage.removeItem('booking_expireAt');
      }
    }

    // Lấy thông tin sự kiện và zones
    axiosClient.get(`/info/show/${concert_id}`).then((res) => {
      setEventData(res.data);
      const initialInventory: Record<string, number> = {};
      const initialCounts: Record<string, number> = {};
      if (res.data.zones) {
        res.data.zones.forEach((z: any) => {
          initialInventory[z.zone] = z.availableSlots;
          initialCounts[z.zone] = 0;
        });
      }
      setInventory(initialInventory);
      setTicketCounts(initialCounts);
    }).catch(() => setIsBookingDown(true));

    // Lấy trạng thái ghế SVIP ban đầu
    axiosClient.get(`/booking/show/${concert_id}/seats`).then((res) => {
      if (res.data) {
        const booked = new Set<string>();
        Object.keys(res.data).forEach(seatId => booked.add(seatId));
        setBookedSeats(booked);
      }
    }).catch(() => setIsBookingDown(true));
  }, [concert_id, navigate]);

  useTicketEvents(user?.id || 'guest', (payload) => {
    if (payload.seatNo) {
      setBookedSeats((prev) => {
        const next = new Set(prev);
        if (payload.status === 'booked' || payload.status === 'held') {
          next.add(payload.seatNo!);
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

    if (payload.type && payload.quantity) {
      setInventory((prev) => ({
        ...prev,
        [payload.type!]: Math.max(0, (prev[payload.type!] || 0) - payload.quantity!)
      }));
    }
  });

  const toggleSeat = (seatId: string) => {
    if (isBookingDown) {
      alert("Hệ thống đặt vé hiện đang bảo trì hoặc mất kết nối. Xin vui lòng thử lại sau.");
      return;
    }
    if (!user) {
      setLoginMessage('Vui lòng đăng nhập để tiếp tục chọn ghế');
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

  const getZonePrice = (zoneName: string) => {
    const zone = eventData?.zones?.find((z: any) => z.zone === zoneName);
    return zone ? zone.price : 0;
  };

  const svipPrice = getZonePrice('SVIP');
  let totalPrice = selectedSeats.size * svipPrice;
  let totalTickets = selectedSeats.size;

  Object.entries(ticketCounts).forEach(([zone, count]) => {
    if (zone !== 'SVIP') {
      totalPrice += count * getZonePrice(zone);
      totalTickets += count;
    }
  });

  const handleCheckout = async () => {
    if (isBookingDown) {
      alert("Hệ thống đặt vé hiện đang bảo trì hoặc mất kết nối. Xin vui lòng thử lại sau.");
      return;
    }
    if (!user) {
      setLoginMessage('Vui lòng đăng nhập để tiếp tục thanh toán');
      setIsLoginModalOpen(true);
      return;
    }
    if (totalTickets === 0) {
      alert("Vui lòng chọn ít nhất 1 vé!");
      return;
    }
    
    try {
      await axiosClient.post('/booking/hold', {
        concert_id,
        seats: Array.from(selectedSeats),
        ticketCounts
      });
      
      sessionStorage.removeItem('idempotency_key');

      const statePayload = {
        selectedSeats: Array.from(selectedSeats),
        ticketCounts,
        totalPrice,
        totalTickets,
        concert_id,
        timeLeft: timeLeft
      };

      sessionStorage.setItem('cart_state', JSON.stringify(statePayload));
      
      navigate('/checkout.html', {
        state: statePayload
      });
    } catch (error: any) {
      if (error.response?.status === 400) {
        alert("Lỗi đặt vé: " + (error.response.data?.message || "Ghế đã có người đặt hoặc bạn đã vượt quá giới hạn vé!"));
      } else if (!error.response || error.response.status === 502 || error.response.status === 504) {
        setIsBookingDown(true);
        alert("Hệ thống đặt vé hiện đang bảo trì hoặc mất kết nối. Xin vui lòng thử lại sau.");
      } else {
        alert("Có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại.");
      }
    }
  };

  const hasSVIP = eventData?.zones?.some((z: any) => z.zone === 'SVIP');

  const renderSVIPRow = (rowLabel: string) => (
    <div className="flex items-center gap-4">
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
        {[...Array(4)].map((_, i) => {
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
      <span className="text-[10px] w-4 font-bold text-center opacity-50">{rowLabel}</span>
    </div>
  );

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-hidden flex flex-col h-screen">
      <header className="sticky top-0 z-40 bg-surface-container-low border-b border-outline-variant flex flex-col gap-base px-margin-desktop py-4 w-full shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.href = `/event.html?id=${concert_id}`}
              className="p-2 hover:bg-surface-container-high transition-all rounded-full flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>arrow_back</span>
            </button>
            <h1 className="font-headline-md text-headline-md text-white">{eventData?.name || 'Đang tải...'}</h1>
          </div>
          <div className="flex items-center gap-gutter">
            <div className="glass-timer flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant" style={{ backdropFilter: 'blur(12px)', background: 'rgba(28, 27, 27, 0.8)' }}>
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>timer</span>
              <span className="font-label-md text-on-surface">{formattedTime} Remaining</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex h-[calc(100vh-80px)] overflow-hidden flex-row relative">
        {isBookingDown && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface-container-high p-8 rounded-xl flex flex-col items-center max-w-md text-center border border-outline-variant shadow-2xl">
              <span className="material-symbols-outlined text-[64px] text-error mb-4">cloud_off</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">Hệ thống đặt vé đang gián đoạn</h3>
              <p className="text-on-surface-variant mb-6">Lượng truy cập hiện đang quá tải hoặc hệ thống bảo trì. Vui lòng thử lại sau.</p>
              <button onClick={() => window.location.reload()} className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold hover:brightness-110 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">refresh</span>
                Tải lại trang
              </button>
            </div>
          </div>
        )}
        
        {hasSVIP ? (
          <section className="flex-1 overflow-auto seat-map-scroll flex flex-col items-center p-12 bg-black h-full relative" style={{ scrollbarWidth: 'thin' }}>

            <div className="flex gap-8 mb-12">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#e53935]"></div>
                <span className="text-xs text-on-surface-variant">Đang trống</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#26bc8a]"></div>
                <span className="text-xs text-on-surface-variant">Đang chọn</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#5c5c5c]"></div>
                <span className="text-xs text-on-surface-variant">Không chọn được</span>
              </div>
            </div>

            <div className="w-[500px] h-14 bg-[#c5c6d0] flex items-center justify-center mb-16 rounded-sm shadow-inner">
              <h2 className="text-3xl font-bold text-white tracking-[0.8em]">STAGE</h2>
            </div>

            <div className="flex flex-col gap-4 items-center">
              <div className="border border-outline-variant/30 p-8 rounded-lg bg-surface-container-lowest/20 backdrop-blur-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2">
                    {renderSVIPRow('A')}
                    {renderSVIPRow('B')}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex-1 flex flex-col items-center justify-center bg-surface-container-low p-12">
            <span className="material-symbols-outlined text-6xl text-primary mb-4">local_activity</span>
            <h2 className="text-2xl font-bold text-on-surface mb-2">Sự kiện không có sơ đồ ghế</h2>
            <p className="text-on-surface-variant text-center max-w-md">Sự kiện này bán vé vào cổng hoặc vé đứng tự do. Vui lòng chọn số lượng vé ở cột bên phải để tiếp tục thanh toán.</p>
          </section>
        )}

        <aside className="h-[calc(100vh-80px)] w-[360px] bg-surface-container-high border-l border-outline-variant shadow-2xl flex flex-col p-6 gap-6 z-30 relative shrink-0 overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col gap-1">
            <h3 className="font-headline-md text-on-surface">Order Summary</h3>
            <p className="font-body-md text-primary font-semibold">{eventData?.name}</p>
            <div className="flex items-start gap-2 text-on-surface-variant mt-2">
              <span className="material-symbols-outlined text-[18px] mt-1" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>location_on</span>
              <span className="text-sm">{eventData?.location}</span>
            </div>
          </div>
          
          <div className="h-[1px] bg-outline-variant/30"></div>

          <div className="flex flex-col gap-3">
            <span className="font-label-md text-xs uppercase tracking-wider text-on-surface-variant">Giá vé</span>
            {hasSVIP && <span className="text-[10px] italic text-on-surface-variant/80 block mt-1">*Chỉ khu SVIP mới chọn ghế</span>}
            
            {eventData?.zones?.map((zone: any) => {
              if (zone.zone === 'SVIP') {
                return (
                  <div key={zone.zone} className="flex justify-between items-center bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: zone.color || '#e53935' }}></div>
                      <span className="font-label-md">{zone.zone}</span>
                    </div>
                    <span className="font-body-sm font-bold">{zone.price.toLocaleString('vi-VN')} đ</span>
                  </div>
                );
              }
              
              const currentCount = ticketCounts[zone.zone] || 0;
              const remaining = inventory[zone.zone] || 0;
              
              return (
                <div key={zone.zone} className="flex flex-col gap-4 bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color || '#8e24aa' }}></div>
                      <div className="flex flex-col">
                        <span className="font-headline-md text-on-surface" style={{ color: zone.color }}>{zone.zone}</span>
                        <span className="font-body-md text-primary font-bold">{zone.price.toLocaleString('vi-VN')} đ</span>
                        <span className="text-xs text-on-surface-variant mt-1">Còn lại: <b className="text-white">{remaining}</b> vé</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => {
                        if (isBookingDown) {
                          alert("Hệ thống đặt vé hiện đang bảo trì hoặc mất kết nối. Xin vui lòng thử lại sau.");
                          return;
                        }
                        if (!user) { 
                          setLoginMessage('Vui lòng đăng nhập để tiếp tục chọn ghế');
                          setIsLoginModalOpen(true); 
                          return; 
                        }
                        setTicketCounts(prev => ({...prev, [zone.zone]: Math.max(0, currentCount - 1)}));
                      }}
                      className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors">
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <div className="w-12 h-8 flex items-center justify-center bg-white rounded-lg">
                      <span className="text-black font-bold">{currentCount}</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (isBookingDown) {
                          alert("Hệ thống đặt vé hiện đang bảo trì hoặc mất kết nối. Xin vui lòng thử lại sau.");
                          return;
                        }
                        if (!user) { 
                          setLoginMessage('Vui lòng đăng nhập để tiếp tục chọn ghế');
                          setIsLoginModalOpen(true); 
                          return; 
                        }
                        setTicketCounts(prev => ({...prev, [zone.zone]: Math.min(remaining, currentCount + 1)}));
                      }}
                      className="w-8 h-8 rounded-lg bg-primary border border-primary flex items-center justify-center text-on-primary hover:brightness-110 transition-colors">
                      <span className="material-symbols-outlined text-sm font-bold">add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto"></div>

          <div className="pt-6 border-t border-outline-variant flex flex-col gap-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-white">confirmation_number</span>
              <span className="text-white font-bold text-lg">x{totalTickets}</span>
            </div>
            {selectedSeats.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <span className="material-symbols-outlined text-primary">event_seat</span>
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
              <span className="material-symbols-outlined">double_arrow</span>
            </button>
          </div>
        </aside>
      </main>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        message={loginMessage}
      />
    </div>
  );
};
