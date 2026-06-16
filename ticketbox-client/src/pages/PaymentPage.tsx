import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import axiosClient from '../utils/axiosClient';
import { useBookingTimer } from '../hooks/useBookingTimer';

export const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

  const {
    selectedSeats = [],
    ticketCounts = {},
    totalPrice = 0,
    totalTickets = 0,
    concert_id = 1,
    idempotencyKey,
    timeLeft: initialTimeLeft = 300
  } = location.state || {};

  const { timeLeft, m, s } = useBookingTimer(initialTimeLeft);

  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Lấy config PayPal Client ID từ backend
    axiosClient.get('/payment/config').then((res) => {
      if (res.data && res.data.clientId) {
        setPaypalClientId(res.data.clientId);
      }
    }).catch(console.error);
  }, []);

  // Back-button protection & Before unload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessingRef.current) {
        e.preventDefault();
        e.returnValue = 'Bạn đang trong quá trình thanh toán, bạn có chắc chắn muốn rời đi?';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (isProcessingRef.current) {
        if (!window.confirm('Bạn đang trong quá trình thanh toán, bạn có chắc chắn muốn quay lại?')) {
          // Ngăn quay lại bằng cách push state hiện tại vào lại
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.history.pushState(null, '', window.location.pathname); // Initialize state for popstate
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);


  const serviceFee = 45000;
  const finalPrice = totalPrice + serviceFee;

  const handleCreateOrder = async () => {
    try {
      isProcessingRef.current = true;
      const res = await axiosClient.post('/payment/create-order', {
        concert_id,
        svipSeats: selectedSeats,
        ticketCounts,
        totalAmount: finalPrice,
        idempotencyKey: idempotencyKey || sessionStorage.getItem('idempotency_key')
      });
      return res.data.orderId; // Trả orderId cho PayPal SDK
    } catch (error: any) {
      isProcessingRef.current = false;
      alert(error.response?.data?.message || 'Lỗi khi tạo đơn hàng');
      throw error;
    }
  };

  const handleApprove = async (data: any) => {
    try {
      isProcessingRef.current = true;
      const res = await axiosClient.post('/payment/capture', {
        paypalOrderId: data.orderID,
        idempotencyKey: idempotencyKey || sessionStorage.getItem('idempotency_key'),
        concert_id,
        svipSeats: selectedSeats,
        ticketCounts,
        totalAmount: finalPrice
      });
      
      if (res.data.success) {
        isProcessingRef.current = false;
        navigate('/payment-success.html', { replace: true });
      }
    } catch (error: any) {
      isProcessingRef.current = false;
      alert(error.response?.data?.message || 'Thanh toán không thành công');
    }
  };

  const handleCancel = () => {
    isProcessingRef.current = false;
    alert('Bạn đã hủy thanh toán PayPal. Vui lòng thử lại nếu muốn tiếp tục.');
  };

  const handleError = (err: any) => {
    isProcessingRef.current = false;
    console.error('PayPal Error:', err);
    alert('Đã xảy ra lỗi trong quá trình thanh toán PayPal.');
  };

  return (
    <div className="bg-black font-body-md text-body-md overflow-x-hidden min-h-screen text-on-surface flex flex-col">
      <header className="sticky top-0 w-full z-40 bg-surface-container-low border-b border-outline-variant" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex flex-col gap-base px-6 md:px-margin-desktop py-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/checkout.html', { state: location.state })} className="p-2 hover:bg-surface-bright rounded-full transition-all">
                <span className="material-symbols-outlined text-primary">arrow_back</span>
              </button>
              <h1 className="font-headline-md text-headline-md text-primary font-bold">Liveshow Góc Ban Công: Vệt Nắng</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="glass-timer flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant" style={{ backdropFilter: 'blur(12px)', background: 'rgba(28, 27, 27, 0.8)' }}>
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>timer</span>
                <span className="font-label-md text-on-surface">{m}:{s} Remaining</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-container-max mx-auto px-6 md:px-margin-desktop py-12 grid grid-cols-1 lg:grid-cols-12 gap-gutter flex-1">
        {/* Left Column: Payment Methods */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          <section>
            <h2 className="font-headline-md text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">payments</span>
              Phương thức thanh toán
            </h2>
            <div className="space-y-4">
              {/* PayPal Integration */}
              <div className="bg-surface-container-high rounded-xl p-8 border border-outline-variant shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="w-full object-contain"/>
                  </div>
                  <div>
                    <h3 className="font-body-lg font-bold text-on-surface">Thanh toán an toàn qua PayPal</h3>
                    <p className="text-on-surface-variant font-body-sm">Sử dụng tài khoản Sandbox để thử nghiệm</p>
                  </div>
                </div>

                {paypalClientId ? (
                  <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", intent: "capture" }}>
                    <div className="relative z-0">
                      <PayPalButtons 
                        style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                        createOrder={handleCreateOrder}
                        onApprove={handleApprove}
                        onCancel={handleCancel}
                        onError={handleError}
                      />
                    </div>
                  </PayPalScriptProvider>
                ) : (
                  <div className="text-center py-8 text-on-surface-variant animate-pulse">
                    Đang tải cổng thanh toán...
                  </div>
                )}
              </div>
            </div>
          </section>
          
          {/* Secure Message */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-container/10 border border-primary-container/20">
            <span className="material-symbols-outlined text-primary">verified_user</span>
            <p className="font-body-sm text-on-surface-variant">Thông tin thanh toán của bạn được bảo mật theo tiêu chuẩn quốc tế PCI DSS. Ticketbox không lưu trữ thông tin thẻ của khách hàng.</p>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <aside className="lg:col-span-4 space-y-gutter">
          <div className="bg-surface-container-high rounded-xl border border-outline-variant overflow-hidden shadow-lg sticky top-52">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Order Summary</h3>
              </div>
              <button onClick={() => navigate(`/seat.html?id=${concert_id}`)} className="text-primary font-label-md hover:underline">Chọn lại vé</button>
            </div>
            
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
              
              <div className="flex justify-between items-center">
                <span className="font-body-md text-body-md font-bold text-on-surface">Tạm tính {totalTickets} vé</span>
                <span className="font-headline-md text-headline-md text-primary">{totalPrice.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="font-body-sm text-body-sm">Phí dịch vụ</span>
                <span className="font-body-sm text-body-sm">{serviceFee.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                <span className="font-body-lg text-body-lg font-bold text-on-surface">Tổng thanh toán</span>
                <span className="font-headline-md text-headline-md text-error">{finalPrice.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
