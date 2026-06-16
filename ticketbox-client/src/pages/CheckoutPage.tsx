import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBookingTimer } from '../hooks/useBookingTimer';

export const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    selectedSeats = [],
    ticketCounts = {},
    totalPrice = 0,
    totalTickets = 0,
    concert_id = 1,
    timeLeft: initialTimeLeft = 300
  } = location.state || {};
  const { timeLeft, m, s } = useBookingTimer(initialTimeLeft);

  return (
    <div className="bg-black text-on-surface font-body-md overflow-x-hidden min-h-screen flex flex-col">
      {/* Shared Component: TopNavBar */}
      <header className="bg-primary-container dark:bg-primary-container text-on-primary-container fixed top-0 w-full z-50 shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-margin-desktop py-4 w-full max-w-container-max mx-auto">
          <a href="/" className="text-headline-lg font-headline-lg font-bold text-on-primary-container hover:opacity-80 transition-opacity cursor-pointer inline-block">ticketbox</a>
          <div className="hidden md:flex gap-gutter items-center">
            <nav className="flex gap-gutter">
              <a className="text-on-primary-container/80 font-label-md hover:text-white transition-colors" href="#">Create Event</a>
              <a className="text-on-primary-container/80 font-label-md hover:text-white transition-colors" href="#">My Tickets</a>
              <a className="text-on-primary-container/80 font-label-md hover:text-white transition-colors" href="#">Account</a>
            </nav>

          </div>
        </div>
      </header>

      <main className="pt-20 flex-1">
        {/* Shared Component: TopAppBar (Large Event Info Bar) */}
        <section className="bg-surface-container-low dark:bg-surface-container-low sticky top-0 z-40 border-b border-outline-variant" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="flex flex-col gap-base px-6 md:px-margin-desktop py-6 w-full max-w-container-max mx-auto relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(`/seat.html?id=${concert_id}`)} className="material-symbols-outlined text-primary hover:bg-surface-bright transition-all p-2 rounded-full">arrow_back</button>
                <div className="flex flex-col">
                  <h1 className="font-headline-md text-headline-md text-primary">Liveshow Góc Ban Công: Vệt Nắng</h1>
                  <div className="flex flex-wrap gap-4 mt-1">
                    <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                      20:00 - 22:00, 13 Tháng 06, 2026
                    </div>
                    <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                      Hội trường Trung tâm Văn hoá Thể thao Quần Ngựa
                    </div>
                  </div>
                </div>
              </div>
              {/* Timer Widget */}
              <div className="glass-timer flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant" style={{ backdropFilter: 'blur(12px)', background: 'rgba(28, 27, 27, 0.8)' }}>
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>timer</span>
                <span className="font-label-md text-on-surface">{m}:{s} Remaining</span>
              </div>
            </div>
          </div>
        </section>

        {/* Content Area */}
        <div className="max-w-container-max mx-auto px-6 md:px-margin-desktop py-12">
          <h2 className="font-headline-md text-headline-md text-primary-container mb-8 uppercase tracking-wider">Thông tin cá nhân</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            {/* Main Form Container */}
            <div className="lg:col-span-8 bg-surface-container-high rounded-xl p-8 shadow-lg border border-outline-variant/30">
              <form className="space-y-8">
                {/* Question 1: Agreement */}
                <div className="space-y-4">
                  <label className="font-body-md text-body-md block text-on-surface leading-snug">
                    Tôi đồng ý Ticketbox &amp; BTC sử dụng thông tin đặt vé nhằm mục đích vận hành sự kiện <span className="text-error">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input defaultChecked className="w-5 h-5 text-primary-container bg-surface-container-highest border-outline focus:ring-primary-container" id="agree" name="agreement" type="radio" value="yes" />
                    <label className="font-body-md text-body-md text-on-surface-variant" htmlFor="agree">Có</label>
                  </div>
                </div>
                {/* Email Field */}
                <div className="space-y-3 group">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors" htmlFor="email">
                    Email của bạn <span className="text-error">*</span>
                  </label>
                  <input className="w-full bg-surface-container-highest border border-outline-variant rounded-lg p-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/40 focus:border-transparent outline-none transition-all" id="email" placeholder="Điền câu trả lời của bạn" type="email" />
                </div>
                {/* Phone Field */}
                <div className="space-y-3 group">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest group-focus-within:text-primary transition-colors" htmlFor="phone">
                    Số điện thoại của bạn <span className="text-error">*</span>
                  </label>
                  <input className="w-full bg-surface-container-highest border border-outline-variant rounded-lg p-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/40 focus:border-transparent outline-none transition-all" id="phone" placeholder="Điền câu trả lời của bạn" type="tel" />
                </div>
                <div className="pt-4 border-t border-outline-variant/30 text-on-surface-variant font-body-sm text-body-sm italic">
                  * Vui lòng điền đầy đủ các thông tin bắt buộc để tiếp tục thanh toán.
                </div>
              </form>
            </div>

            {/* Sidebar: Order Summary */}
            <aside className="lg:col-span-4 space-y-gutter">
              <div className="bg-surface-container-high rounded-xl border border-outline-variant overflow-hidden shadow-lg sticky top-52">
                {/* Header */}
                <div className="p-6 border-b border-outline-variant flex justify-between items-center">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Order Summary</h3>
                    <p className="text-label-md font-label-md text-on-surface-variant">{m}:{s} Remaining</p>
                  </div>
                  <button onClick={() => navigate(`/seat.html?id=${concert_id}`)} className="text-primary font-label-md hover:underline">Chọn lại vé</button>
                </div>
                {/* Summary Content */}
                <div className="p-6 space-y-6">
                  {selectedSeats.length > 0 && (
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="font-label-md text-label-md text-on-surface-variant">Loại vé</span>
                        <p className="font-body-md text-body-md font-bold text-on-surface">SVIP</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">2.650.000 đ</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="font-label-md text-label-md text-on-surface-variant">Số lượng</span>
                        <p className="font-body-md text-body-md font-bold text-on-surface">{selectedSeats.length < 10 ? `0${selectedSeats.length}` : selectedSeats.length}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{(selectedSeats.length * 2650000).toLocaleString('vi-VN')} đ</p>
                      </div>
                    </div>
                  )}
                  {/* Seat Tags */}
                  {selectedSeats.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedSeats.map((seat: string) => (
                        <span key={seat} className="bg-primary-container text-on-primary-container px-3 py-1 rounded text-label-md font-label-md">{seat}</span>
                      ))}
                    </div>
                  )}

                  {Object.entries(ticketCounts).map(([zone, count]: [string, any]) => count > 0 && (
                    <div key={zone} className="flex justify-between items-start pt-2 border-t border-outline-variant/30">
                      <div className="space-y-1">
                        <span className="font-label-md text-label-md text-on-surface-variant">Loại vé</span>
                        <p className="font-body-md text-body-md font-bold text-on-surface">{zone}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="font-label-md text-label-md text-on-surface-variant">Số lượng</span>
                        <p className="font-body-md text-body-md font-bold text-on-surface">{count < 10 ? `0${count}` : count}</p>
                      </div>
                    </div>
                  ))}

                  <div className="h-px bg-outline-variant border-dashed border-b"></div>
                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md font-bold text-on-surface">Tạm tính {totalTickets} vé</span>
                    <span className="font-headline-md text-headline-md text-primary">{totalPrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant text-center leading-relaxed">Vui lòng trả lời tất cả các câu hỏi để tiếp tục</p>
                  {/* CTA */}
                  <button 
                    onClick={() => {
                      let idemKey = sessionStorage.getItem('idempotency_key');
                      if (!idemKey) {
                        idemKey = crypto.randomUUID();
                        sessionStorage.setItem('idempotency_key', idemKey);
                      }
                      navigate('/payment.html', { 
                        state: { 
                          ...location.state, 
                          idempotencyKey: idemKey 
                        } 
                      });
                    }} 
                    type="button" 
                    className="w-full bg-primary-container text-on-primary-container py-4 rounded-lg font-headline-md text-headline-md flex justify-center items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md"
                  >
                    Tiếp tục
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};
