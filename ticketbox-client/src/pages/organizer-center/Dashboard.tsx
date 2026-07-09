import React, { useState } from 'react';
import { EventCard } from './components/EventCard';

const MOCK_EVENTS = [
  {
    id: 1,
    title: 'Electric Forest: Midnight Pulse',
    date: 'Dec 24, 2024 • 20:00',
    location: 'Saigon Exhibition Center (SECC)',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD45MuNv6ym8q_8DqJ5OgH5REAtsjZb5mJ7oV5J38feMF_mYJz_MYuFepMPJIjZtQh_ru1ADauqQ64DGIoY5W2vnyyUc_jvKtGzwfzPk9EnzTU1h2owzt31VYKJHUSOntbkNbkx-ZmQbXRptuD03P3-xsVUysFjIB60AE3RunldN2XmvOEU-001AaP8HELY61Yob973MHf4JCARCd0jDytrwVa462lY6wmNZ47T__nNXYa6XkKmWuDm0-dSWJ8HEvZiDBP4_qGLaz0',
    status: 'selling' as const,
    ticketsSold: 1240,
    totalTickets: 2000,
  },
  {
    id: 2,
    title: 'Neo-Jazz Evening: Obsidian Series',
    date: 'Jan 15, 2025 • 19:30',
    location: 'The Grand Theater, Dist 1',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBPcB-Q1xnXdk0Lkiqv0fwKxvS2nXC8Wnuo7jvBH_bwyj0AGfDQBXTUdsj7lhH14ahGBU-KaA91VqRnI0fyRCoC2zjyXm0W1MD7AOXT81fK9LtbLg6bGmYvJIvLpVWIvjhCvK0GvVkRzF953xxek5Gpu9C4VcKSDofDA352EVp5BNFVEpz7PvUghlxTSP19yjzKaiLIX5gsQiDUzsz2ApdG-w6TYQ_yIGA0cQYqBFNQ5ApQgHlTPRrBZ5av--WZm61DMPsO3937r20',
    status: 'draft' as const,
    ticketsSold: 0,
    totalTickets: 500,
  },
];

export const OrganizerDashboard: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft'>('all');

  const filters = [
    { key: 'all' as const, label: 'Tất cả' },
    { key: 'published' as const, label: 'Đã đăng' },
    { key: 'draft' as const, label: 'Bản nháp' },
  ];

  const filteredEvents = MOCK_EVENTS.filter((event) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'published') return event.status === 'selling';
    if (activeFilter === 'draft') return event.status === 'draft';
    return true;
  });

  return (
    <div className="flex-grow lg:ml-64 px-4 md:px-6 lg:px-10 pb-10 pt-24 md:pt-28 lg:pt-32">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline-lg font-bold text-white mb-2">
              Sự kiện của tôi
            </h1>
            <p className="text-text-medium-emphasis">
              Quản lý và theo dõi các trải nghiệm trực tiếp sắp tới của bạn.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative min-w-[240px] sm:min-w-[280px]">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-full bg-input-level-2 border border-outline-variant rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white"
                placeholder="Tìm kiếm sự kiện..."
                type="text"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-colors ${
                activeFilter === f.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-text-medium-emphasis mb-4 block">
              event_busy
            </span>
            <p className="text-text-medium-emphasis">Không tìm thấy sự kiện nào.</p>
          </div>
        )}
      </div>
    </div>
  );
};
