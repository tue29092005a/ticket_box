import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from './components/Stepper';
import { TicketModal } from './components/TicketModal';

export const CreateStep2: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="lg:ml-64 pt-24 md:pt-28 pb-32 px-4 md:px-6 min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        <Stepper currentStep={2} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-headline-lg font-bold text-white mb-2">
            Cấu hình loại vé
          </h1>
          <p className="text-on-surface-variant text-sm">
            Tạo các hạng vé khác nhau để phù hợp với nhu cầu.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-on-primary px-5 md:px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-md hover:brightness-110 transition-all text-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Thêm loại vé mới
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ticket list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface-container p-4 md:p-6 rounded-xl border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined">local_activity</span>
              </div>
              <div>
                <h4 className="font-bold text-white">Vé Phổ thông (Early Bird)</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Số lượng: 150 / 500 •{' '}
                  <span className="text-primary">Đang bán</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 md:gap-8 w-full sm:w-auto justify-between sm:justify-end">
              <div className="hidden sm:block">
                <p className="text-xs text-on-surface-variant mb-1">Giá vé</p>
                <p className="font-bold text-white">250.000đ</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button className="p-2 text-on-surface-variant hover:text-error-red transition-colors">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline-variant/20">
            <h3 className="text-lg font-headline-lg font-bold text-white mb-6">
              Tổng quan vé
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                <span className="text-on-surface-variant text-sm">Tổng số hạng vé</span>
                <span className="font-bold text-white">01</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-on-surface-variant text-sm">Tổng số vé</span>
                <span className="font-bold text-white">500</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Modal */}
      <TicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 lg:left-64 right-0 h-20 bg-surface-container border-t border-outline-variant/30 px-4 md:px-8 flex items-center justify-between z-40">
        <button
          onClick={() => navigate('/organizer/create/step-1')}
          className="flex items-center gap-2 text-on-surface hover:text-primary transition-colors text-sm"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại
        </button>
        <button
          onClick={() => navigate('/organizer/create/step-3')}
          className="bg-primary text-on-primary px-6 md:px-8 py-3 rounded-xl font-bold shadow-md neon-glow hover:brightness-110 transition-all text-sm"
        >
          Bước tiếp theo: Thanh toán
        </button>
      </footer>
    </div>
  );
};
