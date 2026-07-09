import React from 'react';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface-container w-full max-w-2xl rounded-2xl border border-outline-variant/30 overflow-hidden">
        <div className="px-6 md:px-8 py-6 flex justify-between items-center border-b border-outline-variant/20">
          <h2 className="text-xl font-headline-lg font-bold">Cấu hình loại vé mới</h2>
          <button
            onClick={onClose}
            className="material-symbols-outlined p-2 hover:bg-surface-variant rounded-full transition-colors"
          >
            close
          </button>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">
              Tên loại vé <span className="text-error-red">*</span>
            </label>
            <input
              className="w-full h-11 px-4 bg-surface-container-high border border-outline-variant/30 rounded-lg text-white focus:ring-primary focus:border-primary outline-none"
              placeholder="VD: Vé VIP sớm..."
              type="text"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Giá (VNĐ)</label>
              <input
                className="w-full h-11 px-4 bg-surface-container-high border border-outline-variant/30 rounded-lg text-white focus:ring-primary focus:border-primary outline-none"
                placeholder="500000"
                type="number"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Số lượng</label>
              <input
                className="w-full h-11 px-4 bg-surface-container-high border border-outline-variant/30 rounded-lg text-white focus:ring-primary focus:border-primary outline-none"
                placeholder="100"
                type="number"
              />
            </div>
          </div>
        </div>
        <div className="p-6 md:p-8 border-t border-outline-variant/20 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onClose}
            className="bg-primary text-on-primary px-8 py-2.5 rounded-lg font-bold hover:brightness-110 transition-all"
          >
            Lưu loại vé
          </button>
        </div>
      </div>
    </div>
  );
};
