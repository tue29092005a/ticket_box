import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from './components/Stepper';

export const CreateStep3: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="lg:ml-64 pt-24 md:pt-28 pb-32 px-4 md:px-6 min-h-screen">
      <div className="max-w-[1000px] mx-auto">
        <Stepper currentStep={3} />

      <div className="bg-surface-container-low p-6 md:p-10 rounded-xl border border-outline-variant/30 text-sm">
        <h2 className="text-xl md:text-2xl font-headline-lg font-bold text-white mb-4">Thông tin thanh toán</h2>
        <p className="text-on-surface-variant mb-1">Ticketbox sẽ chuyển tiền bán vé đến tài khoản của bạn</p>
        <p className="text-on-surface-variant mb-10 leading-relaxed">
          Tiền bán vé (sau khi trừ phí dịch vụ cho Ticketbox) sẽ vào tài khoản của bạn sau khi xác nhận sale report từ 7 - 10 ngày. Nếu bạn muốn nhận được tiền sớm hơn, vui lòng liên hệ chúng tôi qua số 1900.6408 hoặc info@ticketbox.vn
        </p>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-40 flex-shrink-0 font-bold text-white sm:text-right">Chủ tài khoản:</label>
            <div className="relative flex-1">
              <input type="text" className="w-full h-11 bg-white text-black px-4 pr-16 rounded-md focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">0 / 100</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-40 flex-shrink-0 font-bold text-white sm:text-right">Số tài khoản:</label>
            <div className="relative flex-1">
              <input type="text" defaultValue="0" className="w-full h-11 bg-white text-black px-4 pr-16 rounded-md focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">0 / 100</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-40 flex-shrink-0 font-bold text-white sm:text-right">Tên ngân hàng:</label>
            <div className="relative flex-1">
              <input type="text" className="w-full h-11 bg-white text-black px-4 pr-16 rounded-md focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">0 / 100</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-40 flex-shrink-0 font-bold text-white sm:text-right">Chi nhánh:</label>
            <div className="relative flex-1">
              <input type="text" className="w-full h-11 bg-white text-black px-4 pr-16 rounded-md focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">0 / 100</span>
            </div>
          </div>
        </div>

        <h3 className="text-lg md:text-xl font-headline-lg font-bold text-white mt-12 mb-8">Hoá đơn đỏ</h3>
        
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-40 flex-shrink-0 font-bold text-white sm:text-right">Loại hình kinh doanh:</label>
            <div className="relative flex-1">
              <select className="w-full h-11 bg-white text-black px-4 pr-12 rounded-md focus:outline-none appearance-none">
                <option>Cá nhân</option>
                <option>Doanh nghiệp</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-40 flex-shrink-0 font-bold text-white sm:text-right">Họ tên:</label>
            <div className="relative flex-1">
              <input type="text" className="w-full h-11 bg-white text-black px-4 pr-16 rounded-md focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">0 / 100</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-40 flex-shrink-0 font-bold text-white sm:text-right">Địa chỉ:</label>
            <div className="relative flex-1">
              <input type="text" className="w-full h-11 bg-white text-black px-4 pr-16 rounded-md focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">0 / 100</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-40 flex-shrink-0 font-bold text-white sm:text-right">Mã số thuế:</label>
            <div className="relative flex-1">
              <input type="text" defaultValue="0" className="w-full h-11 bg-white text-black px-4 rounded-md focus:outline-none" />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 lg:left-64 right-0 h-20 bg-surface-container border-t border-outline-variant/30 px-4 md:px-8 flex items-center justify-between z-40">
        <button
          onClick={() => navigate('/organizer/create/step-2')}
          className="flex items-center gap-2 text-on-surface hover:text-primary transition-colors text-sm"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại
        </button>
        <button
          onClick={() => navigate('/organizer/create/step-4')}
          className="bg-primary text-on-primary px-6 md:px-8 py-3 rounded-xl font-bold shadow-md neon-glow hover:brightness-110 transition-all text-sm"
        >
          Bước cuối cùng: Review
        </button>
      </footer>
    </div>
  );
};
