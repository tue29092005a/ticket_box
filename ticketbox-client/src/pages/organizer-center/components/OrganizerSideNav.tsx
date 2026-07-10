import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export const OrganizerSideNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/organizer') {
      return location.pathname === '/organizer' || location.pathname === '/organizer/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest border-r border-outline-variant flex-col py-6 gap-2 z-40">
      <div className="flex flex-col gap-1 px-2">
        <Link
          to="/organizer"
          className={`rounded-xl flex items-center gap-3 px-4 py-3 transition-all ${
            isActive('/organizer') && !location.pathname.includes('/files') && !location.pathname.includes('/create')
              ? 'bg-primary/10 text-primary font-bold'
              : 'text-text-medium-emphasis hover:text-white hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">event</span>
          <span className="text-sm font-semibold">Sự kiện của tôi</span>
        </Link>
        <Link
          to="/organizer/files"
          className={`rounded-xl flex items-center gap-3 px-4 py-3 transition-all ${
            isActive('/organizer/files')
              ? 'bg-primary/10 text-primary font-bold'
              : 'text-text-medium-emphasis hover:text-white hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">folder</span>
          <span className="text-sm font-semibold">Quản lý file</span>
        </Link>
      </div>
      <div className="mt-auto px-2 pt-4 border-t border-outline-variant flex flex-col gap-1">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-text-medium-emphasis hover:text-white px-4 py-3 rounded-xl transition-all w-full text-left"
        >
          <span className="material-symbols-outlined">home</span>
          <span className="text-sm font-semibold">Trang chủ</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 text-text-medium-emphasis hover:text-error-red px-4 py-3 rounded-xl transition-all w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-sm font-semibold">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};
