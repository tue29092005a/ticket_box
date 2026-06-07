import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../utils/axiosClient';

export const PaymentPage: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(900); // 15:00
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const navigate = useNavigate();
  const location = useLocation();

  const {
    selectedSeats = [],
    vipCount = 0,
    normalCount = 0,
    totalPrice = 0,
    totalTickets = 0
  } = location.state || {};

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return { m, s };
  };

  const { m, s } = formatTime(timeLeft);
  const serviceFee = 45000;
  const finalPrice = totalPrice + serviceFee;

  const [isSuccess, setIsSuccess] = useState(false);

  const handlePayment = async () => {
    try {
      // Giả lập confirm thanh toán - Kích hoạt Worker Pool RabbitMQ
      await axiosClient.post('/booking/pay', {
        showId: '1',
        svipSeats: selectedSeats,
        vipCount,
        normalCount,
        totalAmount: finalPrice
      });
      setIsSuccess(true);
    } catch (error) {
      alert("Thanh toán thất bại. Vui lòng thử lại.");
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-black min-h-screen text-on-surface flex items-center justify-center">
        <div className="bg-surface-container-high p-12 rounded-xl text-center shadow-2xl flex flex-col items-center">
          <span className="material-symbols-outlined text-[80px] text-[#26bc8a] mb-6">check_circle</span>
          <h1 className="text-3xl font-bold mb-4">Thanh Toán Thành Công!</h1>
          <p className="text-on-surface-variant font-body-md mb-8 max-w-md">
            Cảm ơn bạn đã đặt vé. Hệ thống đang tiến hành sinh mã QR. 
            <br/><br/>
            <span className="text-primary font-bold">Vui lòng kiểm tra Email hoặc Zalo để nhận E-ticket.</span>
          </p>
          <button onClick={() => navigate('/event.html')} className="bg-primary text-on-primary px-8 py-3 rounded-lg font-headline-md hover:brightness-110">
            Quay lại trang sự kiện
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black font-body-md text-body-md overflow-x-hidden min-h-screen text-on-surface">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-surface-container-low border-b border-outline-variant" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex flex-col gap-base px-6 md:px-margin-desktop py-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/checkout.html')} className="p-2 hover:bg-surface-bright rounded-full transition-all">
                <span className="material-symbols-outlined text-primary">arrow_back</span>
              </button>
              <h1 className="font-headline-md text-headline-md text-primary font-bold">Liveshow Góc Ban Công: Vệt Nắng</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-error-container text-on-error-container px-3 py-1 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">timer</span>
                <span className="font-label-md text-label-md tracking-widest font-bold">{m}:{s}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-container-max mx-auto px-6 md:px-margin-desktop py-12 grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: Payment & Methods */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          <section>
            <h2 className="font-headline-md text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">payments</span>
              Phương thức thanh toán
            </h2>
            <div className="space-y-4">
              {/* E-Wallets */}
              <div className="bg-surface-container-high rounded-xl p-1">
                <label className="group flex items-center justify-between p-4 cursor-pointer hover:bg-surface-bright transition-all rounded-lg border border-transparent has-[:checked]:border-primary-container has-[:checked]:bg-surface-container-highest">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                      <img alt="Momo" className="w-8 h-8 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtVxYsjd9Rmt-2jDjII6dPy7ioFg7hfdyc4LLXUM5k8iGG6wXwWbQM-VJuHD3e-IZuQm_rKYRIBeqljYvYjha_BOIU1DW5Ynpvu2FhqbWFsJgGnuKJV5LfvVFt_5J9SQKAZaTmLdXXJWYMhsCKMYzWhXMoej5MwuWYjjnG3HGqJWzB5shlQQA8z4HkEace_-p5t9l5ByRsbw5GGslBmHtXRupUc6m9YZmY22m8JVGsUsRwIQo1slrL1Sc56CinTqKVacQFRwnUeOEf" />
                    </div>
                    <div>
                      <p className="font-body-md font-semibold">Ví MoMo</p>
                      <p className="font-body-sm text-on-surface-variant">Thanh toán nhanh chóng qua ứng dụng MoMo</p>
                    </div>
                  </div>
                  <input checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} className="w-5 h-5 text-primary-container focus:ring-primary-container bg-surface border-outline" name="payment" type="radio" value="momo" />
                </label>
                <label className="group flex items-center justify-between p-4 cursor-pointer hover:bg-surface-bright transition-all rounded-lg border border-transparent has-[:checked]:border-primary-container has-[:checked]:bg-surface-container-highest">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#0085FF] rounded-lg flex items-center justify-center overflow-hidden">
                      <img alt="Zalopay" className="w-8 h-8 object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-HHiYnUqLZeLIdVTogM6rIWyCkv620njzZMg9xuYfK3ZzN8MPvRlUmhznoje4ooAXTcQkQDLWt2bQkplWzQ6U77DPQSp9nkKtbAMf-nzHhZbBaQRL730QxnWnGg5EEQxxc9pEjzEor_x2XckxCHmAYkxasJKRPgXPEPT6GH_ZCA0C_9H-Flhu_N5rOO-4HJehLN3X02NXx9mVcFeYPoFOrQvaGD6y3R5o2Me0SiXBIicn-BrdRZ8oTUFUcqtZXnvCYc_xr4hFUb1t" />
                    </div>
                    <div>
                      <p className="font-body-md font-semibold">ZaloPay</p>
                      <p className="font-body-sm text-on-surface-variant">Ưu đãi giảm giá khi thanh toán qua ZaloPay</p>
                    </div>
                  </div>
                  <input checked={paymentMethod === 'zalopay'} onChange={() => setPaymentMethod('zalopay')} className="w-5 h-5 text-primary-container focus:ring-primary-container bg-surface border-outline" name="payment" type="radio" value="zalopay" />
                </label>
              </div>
              {/* Cards */}
              <div className="bg-surface-container-high rounded-xl p-4 border border-outline-variant">
                <label className="flex items-center justify-between cursor-pointer mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface-container-highest rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">credit_card</span>
                    </div>
                    <p className="font-body-md font-semibold">Thẻ Quốc tế (Visa, Master, JCB)</p>
                  </div>
                  <input checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="w-5 h-5 text-primary-container focus:ring-primary-container bg-surface border-outline" name="payment" type="radio" value="card" />
                </label>
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 transition-opacity ${paymentMethod === 'card' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-on-surface-variant">Số thẻ</label>
                    <input className="bg-surface-container-highest border-none rounded-lg p-3 focus:ring-2 focus:ring-primary-container text-on-surface" placeholder="**** **** **** ****" type="text" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-on-surface-variant">Tên chủ thẻ</label>
                    <input className="bg-surface-container-highest border-none rounded-lg p-3 focus:ring-2 focus:ring-primary-container text-on-surface" placeholder="NGUYEN VAN A" type="text" />
                  </div>
                </div>
              </div>
              {/* Bank Transfer */}
              <label className="bg-surface-container-high rounded-xl p-4 border border-outline-variant flex items-center justify-between cursor-pointer hover:bg-surface-bright transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-surface-container-highest rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">account_balance</span>
                  </div>
                  <div>
                    <p className="font-body-md font-semibold">Chuyển khoản ngân hàng</p>
                    <p className="font-body-sm text-on-surface-variant">Quét mã VietQR để thanh toán</p>
                  </div>
                </div>
                <input checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="w-5 h-5 text-primary-container focus:ring-primary-container bg-surface border-outline" name="payment" type="radio" value="bank" />
              </label>
            </div>
          </section>
          {/* Secure Message */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-container/10 border border-primary-container/20">
            <span className="material-symbols-outlined text-primary">verified_user</span>
            <p className="font-body-sm text-on-surface-variant">Thông tin thanh toán của bạn được bảo mật theo tiêu chuẩn quốc tế PCI DSS. Ticketbox không lưu trữ thông tin thẻ của khách hàng.</p>
          </div>
        </div>

        {/* Right Column: Order Summary (Using UI from CheckoutPage) */}
        <aside className="lg:col-span-4 space-y-gutter">
          <div className="bg-surface-container-high rounded-xl border border-outline-variant overflow-hidden shadow-lg sticky top-52">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Order Summary</h3>
                <p className="text-label-md font-label-md text-on-surface-variant">{m}:{s} Remaining</p>
              </div>
              <button onClick={() => navigate('/seat.html')} className="text-primary font-label-md hover:underline">Chọn lại vé</button>
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

              {vipCount > 0 && (
                <div className="flex justify-between items-start pt-2 border-t border-outline-variant/30">
                  <div className="space-y-1">
                    <span className="font-label-md text-label-md text-on-surface-variant">Loại vé</span>
                    <p className="font-body-md text-body-md font-bold text-on-surface">VIP</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">2.450.000 đ</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="font-label-md text-label-md text-on-surface-variant">Số lượng</span>
                    <p className="font-body-md text-body-md font-bold text-on-surface">{vipCount < 10 ? `0${vipCount}` : vipCount}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{(vipCount * 2450000).toLocaleString('vi-VN')} đ</p>
                  </div>
                </div>
              )}

              {normalCount > 0 && (
                <div className="flex justify-between items-start pt-2 border-t border-outline-variant/30">
                  <div className="space-y-1">
                    <span className="font-label-md text-label-md text-on-surface-variant">Loại vé</span>
                    <p className="font-body-md text-body-md font-bold text-on-surface">Normal</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">1.850.000 đ</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="font-label-md text-label-md text-on-surface-variant">Số lượng</span>
                    <p className="font-body-md text-body-md font-bold text-on-surface">{normalCount < 10 ? `0${normalCount}` : normalCount}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{(normalCount * 1850000).toLocaleString('vi-VN')} đ</p>
                  </div>
                </div>
              )}

              <div className="h-px bg-outline-variant border-dashed border-b"></div>
              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-body-md text-body-md font-bold text-on-surface">Tạm tính {totalTickets} vé</span>
                <span className="font-headline-md text-headline-md text-primary">{totalPrice.toLocaleString('vi-VN')} đ</span>
              </div>
              <p className="text-[10px] text-on-surface-variant text-center leading-relaxed">
                Bằng việc nhấn "Thanh toán", bạn đồng ý với <a className="text-primary hover:underline" href="#">Điều khoản &amp; Chính sách</a> của Ticketbox.
              </p>
              {/* CTA */}
              <button onClick={handlePayment} type="button" className="w-full bg-primary-container text-on-primary-container py-4 rounded-lg font-headline-md text-headline-md flex justify-center items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                Thanh toán
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="w-full mt-margin-desktop bg-surface-container-lowest border-t border-outline-variant">
        <div className="grid grid-cols-2 md:grid-cols-4 px-6 md:px-margin-desktop py-12 max-w-container-max mx-auto gap-gutter">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="text-headline-md font-headline-md text-primary font-bold mb-4 hover:opacity-80 transition-opacity cursor-pointer inline-block">ticketbox</a>
            <p className="font-body-sm text-on-surface-variant mb-6">Nền tảng bán vé sự kiện hàng đầu Việt Nam.</p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-label-md text-on-surface font-bold uppercase tracking-wider mb-2">Khám phá</h4>
            <a className="font-body-sm text-on-surface-variant hover:text-primary underline" href="#">Music</a>
            <a className="font-body-sm text-on-surface-variant hover:text-primary underline" href="#">Theater</a>
            <a className="font-body-sm text-on-surface-variant hover:text-primary underline" href="#">Sports</a>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-label-md text-on-surface font-bold uppercase tracking-wider mb-2">Thông tin</h4>
            <a className="font-body-sm text-on-surface-variant hover:text-primary underline" href="#">Workshops</a>
            <a className="font-body-sm text-on-surface-variant hover:text-primary underline" href="#">Legal</a>
            <a className="font-body-sm text-on-surface-variant hover:text-primary underline" href="#">Privacy</a>
          </div>
          <div className="col-span-2 md:col-span-1 flex flex-col items-end justify-end">
            <p className="font-body-sm text-on-surface-variant">© 2024 Ticketbox. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
