import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from './components/Stepper';

export const CreateStep1: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="lg:ml-64 pt-24 md:pt-28 pb-32 px-4 md:px-6 min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        <Stepper currentStep={1} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:gap-8">
          {/* Thông tin cơ bản */}
          <section className="bg-card-level-1 rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg md:text-xl font-headline-lg font-bold text-on-surface">
                Thông tin cơ bản
              </h2>
            </div>
            <div className="p-4 md:p-6 flex flex-col gap-6">
              <div>
                <label className="block text-xs font-bold text-text-medium-emphasis mb-2 uppercase">
                  Tên sự kiện <span className="text-error-red">*</span>
                </label>
                <input
                  className="w-full h-11 px-4 border border-outline-variant rounded-lg bg-input-level-2 text-on-surface focus:ring-primary focus:border-primary outline-none"
                  placeholder="Nhập tên sự kiện hấp dẫn của bạn"
                  type="text"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-text-medium-emphasis mb-2 uppercase">
                    Thể loại
                  </label>
                  <select className="w-full h-11 px-4 border border-outline-variant rounded-lg bg-input-level-2 text-on-surface focus:ring-primary outline-none">
                    <option>Âm nhạc</option>
                    <option>Thể thao</option>
                    <option>Hội thảo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-medium-emphasis mb-2 uppercase">
                    Hashtag
                  </label>
                  <input
                    className="w-full h-11 px-4 border border-outline-variant rounded-lg bg-input-level-2 text-on-surface focus:ring-primary outline-none"
                    placeholder="#music #concert"
                    type="text"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Thời gian & Địa điểm */}
          <section className="bg-card-level-1 rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg md:text-xl font-headline-lg font-bold text-on-surface">
                Thời gian & Địa điểm
              </h2>
            </div>
            <div className="p-4 md:p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-text-medium-emphasis mb-2 uppercase">
                    Bắt đầu
                  </label>
                  <input
                    className="w-full h-11 px-4 border border-outline-variant rounded-lg bg-input-level-2 text-on-surface outline-none"
                    type="datetime-local"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-medium-emphasis mb-2 uppercase">
                    Kết thúc
                  </label>
                  <input
                    className="w-full h-11 px-4 border border-outline-variant rounded-lg bg-input-level-2 text-on-surface outline-none"
                    type="datetime-local"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-medium-emphasis mb-2 uppercase">
                  Địa chỉ tổ chức
                </label>
                <input
                  className="w-full h-11 px-4 border border-outline-variant rounded-lg bg-input-level-2 text-on-surface outline-none"
                  placeholder="Địa chỉ cụ thể..."
                  type="text"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right: Image upload */}
        <div className="flex flex-col gap-6 lg:gap-8">
          <section className="bg-card-level-1 rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg md:text-xl font-headline-lg font-bold text-on-surface">
                Hình ảnh sự kiện
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="relative group cursor-pointer border-2 border-dashed border-outline-variant rounded-xl h-48 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all bg-input-level-2">
                <span className="material-symbols-outlined text-4xl text-text-medium-emphasis">
                  add_photo_alternate
                </span>
                <p className="text-xs text-primary font-bold">Tải ảnh lên</p>
              </div>
            </div>
          </section>
        </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="fixed bottom-0 left-0 right-0 lg:left-64 bg-card-level-1 border-t border-outline-variant shadow-2xl z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <button className="flex items-center gap-2 text-text-medium-emphasis font-semibold text-sm hover:text-white transition-colors">
            <span className="material-symbols-outlined text-base">save</span>
            Lưu bản nháp
          </button>
          <button
            onClick={() => navigate('/organizer/create/step-2')}
            className="h-11 px-6 md:px-8 bg-primary text-on-primary font-bold rounded-lg text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
          >
            Bước tiếp theo
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
