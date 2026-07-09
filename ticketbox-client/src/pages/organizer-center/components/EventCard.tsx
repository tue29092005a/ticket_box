import React from 'react';

interface EventCardProps {
  title: string;
  date: string;
  location: string;
  image: string;
  status: 'selling' | 'draft';
  ticketsSold: number;
  totalTickets: number;
}

export const EventCard: React.FC<EventCardProps> = ({
  title,
  date,
  location,
  image,
  status,
  ticketsSold,
  totalTickets,
}) => {
  const statusLabel = status === 'selling' ? 'Đang bán' : 'Nháp';
  const statusClass =
    status === 'selling'
      ? 'bg-primary text-on-primary'
      : 'bg-outline-variant text-on-surface';

  return (
    <div className="group bg-surface-container rounded-xl overflow-hidden flex flex-col sm:flex-row border border-transparent hover:border-primary/30 transition-all duration-300 ticket-notch">
      <div className="sm:w-2/5 relative h-48 sm:h-auto overflow-hidden">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src={image}
          alt={title}
        />
        <div
          className={`absolute top-4 left-4 ${statusClass} px-3 py-1 rounded text-[10px] font-bold`}
        >
          {statusLabel}
        </div>
      </div>
      <div className="sm:w-3/5 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-headline-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-on-surface-variant mb-2">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            <span className="text-xs">{date}</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span className="text-xs">{location}</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant pt-4">
          <div className={`flex flex-col ${status === 'draft' ? 'opacity-50' : ''}`}>
            <span className="text-on-surface-variant text-[10px] uppercase font-bold">
              Vé đã bán
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold">
                {ticketsSold.toLocaleString()}
              </span>
              <span className="text-on-surface-variant text-xs">
                / {totalTickets.toLocaleString()}
              </span>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-primary/20 hover:text-primary transition-all">
            <span className="material-symbols-outlined">
              {status === 'selling' ? 'more_vert' : 'edit'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
