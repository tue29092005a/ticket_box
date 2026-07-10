import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Xoá thông tin booking trong session sau khi thành công
    sessionStorage.removeItem('booking_expireAt');
    sessionStorage.removeItem('idempotency_key');
  }, []);

  return (
    <div className="bg-black min-h-screen text-on-surface flex items-center justify-center">
      <div className="bg-surface-container-high p-12 rounded-xl text-center shadow-2xl flex flex-col items-center">
        <span className="material-symbols-outlined text-[80px] text-[#26bc8a] mb-6">check_circle</span>
        <h1 className="text-3xl font-bold mb-4">Thanh Toán Thành Công!</h1>
        <p className="text-on-surface-variant font-body-md mb-8 max-w-md">
          Cảm ơn bạn đã đặt vé. Hệ thống đang tiến hành sinh mã QR. 
          <br/><br/>
          <span className="text-primary font-bold">Vui lòng kiểm tra Email để nhận E-ticket.</span>
        </p>
        <button onClick={() => navigate('/')} className="bg-primary text-on-primary px-8 py-3 rounded-lg font-headline-md hover:brightness-110">
          Quay về trang chủ
        </button>
      </div>
    </div>
  );
};
