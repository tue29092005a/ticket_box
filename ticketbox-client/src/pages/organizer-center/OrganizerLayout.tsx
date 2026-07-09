import React from 'react';
import { Outlet } from 'react-router-dom';
import { OrganizerTopNav } from './components/OrganizerTopNav';
import { OrganizerSideNav } from './components/OrganizerSideNav';

export const OrganizerLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <OrganizerTopNav />
      <OrganizerSideNav />
      <Outlet />
    </div>
  );
};
