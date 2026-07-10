import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from './components/Stepper';

export const CreateStep4: React.FC = () => {
  const navigate = useNavigate();
  const [published, setPublished] = useState(false);

  const handlePublish = () => {
    setPublished(true);
    setTimeout(() => {
      setPublished(false);
      navigate('/organizer');
    }, 2000);
  };

  return (
    <div className="lg:ml-64 pt-24 md:pt-28 pb-32 px-4 md:px-6 min-h-screen">
      <div className="max-w-[1000px] mx-auto">
        <Stepper currentStep={4} />

      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-full mb-6 relative animate-bounce">
          <span className="material-symbols-outlined text-5xl text-primary">stars</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-headline-lg font-bold text-white mb-3">
          Sẵn sàng xuất bản!
        </h1>
        <p className="text-on-surface-variant max-w-xl mx-auto">
          Kiểm tra thông tin lần cuối để đảm bảo mọi thứ hoàn hảo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left: Preview */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden">
            <div className="relative h-48 bg-surface-container-high">
              <img
                className="w-full h-full object-cover opacity-60"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZzzGTE1ahkQAFKw24lvDxjnEo2SKA2O0nJGcByRIMDDz8NBWg2mR_qWarxmO7INB5vmTLCL90Ax8ARG1vqb-fvN37S4k_-seRtxz31GhqztCl3vfeRyJN0tKy6RCcCNOVe1L0kQkFhV_yyQj8WS6VsZH65TxolqFhcckfyiqM6XM7Pdy5Xyper1ECuappAr6ynMQIV-xdwUPAa1LEaR5bYlSeo6MFzGAgazlHsXGmc9XyVaedKi5s1N-pFsg5TBP9cXiR0zR-lxg"
                alt="Preview"
              />
              <div className="absolute bottom-4 left-4 md:left-6">
                <span className="px-3 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-full mb-2 inline-block">
                  PREVIEW
                </span>
                <h2 className="text-lg md:text-xl font-headline-lg font-bold text-white">
                  Hội nghị Công nghệ 2024
                </h2>
              </div>
            </div>
            <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                <span className="text-xs font-bold">25/12/2024</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <span className="text-xs font-bold">09:00 - 17:00</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <span className="text-xs font-bold truncate">Trung tâm SECC</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Checklist */}
        <div className="space-y-6">
          <section className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-4 md:p-6">
            <h3 className="font-bold text-white mb-4">Checklist</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-xs text-primary">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Thông tin sự kiện
              </li>
              <li className="flex items-center gap-2 text-xs text-primary">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Cấu hình vé
              </li>
              <li className="flex items-center gap-2 text-xs text-primary">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Thanh toán
              </li>
            </ul>
          </section>
        </div>
      </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 lg:left-64 right-0 h-20 bg-surface-container border-t border-outline-variant/30 px-4 md:px-8 flex items-center justify-between z-40">
        <button
          onClick={() => navigate('/organizer/create/step-3')}
          className="flex items-center gap-2 text-on-surface hover:text-primary transition-colors text-sm"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại
        </button>
        <button
          onClick={handlePublish}
          className="bg-primary text-on-primary px-8 md:px-10 py-3 rounded-xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-sm"
        >
          XUẤT BẢN NGAY
          <span className="material-symbols-outlined">rocket_launch</span>
        </button>
      </footer>

      {/* Toast */}
      {published && (
        <div className="fixed bottom-24 right-4 md:right-8 bg-surface-container-highest text-primary px-6 py-4 rounded-xl shadow-2xl border border-primary/30 flex items-center gap-3 animate-fade-in z-50">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="font-bold text-sm">Sự kiện đã được xuất bản thành công!</span>
        </div>
      )}
    </div>
  );
};
