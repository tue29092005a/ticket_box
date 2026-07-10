import React from 'react';

export type SeatStatus = 'available' | 'reserved' | 'selected';

export interface SeatSlotProps {
  seatId: string;
  seatNumber: string;
  row: string;
  price: number;
  status: SeatStatus;
  type: 'VIP' | 'SVIP' | 'GA';
  onSelect: (seatId: string) => void;
}

export const SeatSlot: React.FC<SeatSlotProps> = ({
  seatId,
  seatNumber,
  status,
  type,
  onSelect
}) => {
  const getBaseClasses = () => {
    return 'w-10 h-10 rounded-t-lg border-2 flex items-center justify-center font-label-md transition-all cursor-pointer select-none';
  };

  const getStatusClasses = () => {
    if (status === 'reserved') {
      return 'bg-surface-container-high border-outline-variant text-on-surface-variant opacity-50 cursor-not-allowed';
    }
    if (status === 'selected') {
      return 'bg-primary border-primary text-on-primary shadow-[0_0_12px_rgba(84,221,169,0.5)] scale-110';
    }
    if (type === 'SVIP') {
      return 'bg-secondary-container/10 border-secondary-container text-secondary-container hover:bg-secondary-container hover:text-on-secondary-container';
    }
    if (type === 'VIP') {
      return 'bg-tertiary-container/10 border-tertiary-container text-tertiary-container hover:bg-tertiary-container hover:text-on-tertiary-container';
    }
    return 'bg-surface-bright border-outline text-on-surface hover:border-primary-container';
  };

  return (
    <div
      id={`seat-${seatId}`}
      data-seat-id={seatId}
      data-seat-type={type}
      className={`${getBaseClasses()} ${getStatusClasses()}`}
      onClick={() => {
        if (status !== 'reserved') {
          onSelect(seatId);
        }
      }}
      title={`Ghế ${seatNumber} - ${type}`}
    >
      {seatNumber}
    </div>
  );
};
