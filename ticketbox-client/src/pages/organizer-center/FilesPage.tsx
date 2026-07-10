import React from 'react';

export const FilesPage: React.FC = () => {
  return (
    <div className="flex-grow lg:ml-64 px-4 md:px-6 lg:px-10 pb-10 pt-24 md:pt-28 lg:pt-32">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-headline-lg font-bold text-white mb-2">
            Quản lý file
          </h1>
          <p className="text-text-medium-emphasis">
            Lưu trữ và tổ chức các báo cáo dữ liệu của bạn.
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                className="w-full bg-surface-container-high border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-primary focus:border-primary outline-none"
                placeholder="Tìm kiếm file .csv..."
                type="text"
              />
            </div>
            <div className="flex gap-3 sm:gap-4">
              <button className="px-4 sm:px-6 py-2 border border-primary text-primary rounded-lg font-bold hover:bg-primary/10 transition-all text-sm">
                Upload .csv
              </button>
              <button className="bg-primary text-on-primary px-4 sm:px-6 py-2 rounded-lg font-bold flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Xuất file mới
              </button>
            </div>
          </div>
        </div>

        {/* Files Table */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-bold text-white">Lịch sử xuất file</h3>
            <span className="text-xs text-text-medium-emphasis">
              Hiển thị các kết quả gần nhất
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-surface-container-high/50 border-b border-outline-variant">
                  <th className="px-4 md:px-6 py-4 text-xs font-bold text-text-medium-emphasis uppercase">
                    Tên file
                  </th>
                  <th className="px-4 md:px-6 py-4 text-xs font-bold text-text-medium-emphasis uppercase">
                    Ngày yêu cầu
                  </th>
                  <th className="px-4 md:px-6 py-4 text-xs font-bold text-text-medium-emphasis uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 md:px-6 py-4 text-xs font-bold text-text-medium-emphasis uppercase text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                <tr className="hover:bg-surface-container-highest/30 transition-colors">
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-container-highest rounded flex items-center justify-center text-primary flex-shrink-0">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          Doanh_thu_t12_2024.csv
                        </p>
                        <p className="text-[10px] text-text-medium-emphasis">
                          1.2 MB • Báo cáo tài chính
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-sm text-on-surface-variant">
                    15/12/2024 14:30
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                      Hoàn tất
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right">
                    <button className="text-primary hover:underline text-xs font-bold">
                      Tải về
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
