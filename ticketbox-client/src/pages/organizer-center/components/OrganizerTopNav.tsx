import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export const OrganizerTopNav: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <nav className="bg-surface-container-lowest fixed top-0 w-full z-50 h-16 border-b border-outline-variant shadow-md">
      <div className="flex justify-between items-center px-4 md:px-6 h-16 w-full max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4 md:gap-8">
          <Link
            to="/organizer"
            className="text-xl md:text-2xl font-headline-lg font-bold text-primary tracking-tight hover:opacity-80 transition-opacity"
          >
            Organizer Center
          </Link>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => navigate('/')}
            className="hidden sm:flex items-center gap-2 text-text-medium-emphasis hover:text-white text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Trang chủ
          </button>
          <Link
            to="/organizer/create/step-1"
            className="h-10 bg-primary text-on-primary px-4 md:px-6 rounded-lg font-semibold text-sm hover:brightness-110 flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px] hidden sm:inline">add</span>
            Tạo Sự Kiện
          </Link>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-surface-container-high flex items-center justify-center">
            {user ? (
              <span className="text-xs font-bold text-primary">
                {user.email.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="material-symbols-outlined text-[18px] text-text-medium-emphasis">
                person
              </span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
