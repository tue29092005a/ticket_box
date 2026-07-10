import React from 'react';

interface StepperProps {
  currentStep: number;
}

const steps = [
  { id: 1, label: 'Thông tin' },
  { id: 2, label: 'Loại vé' },
  { id: 3, label: 'Thông tin thanh toán' },
  { id: 4, label: 'Hoàn tất' },
];

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  return (
    <div className="mb-10 bg-card-level-1 p-6 rounded-xl border border-outline-variant">
      <div className="flex flex-wrap items-center justify-between gap-4 md:gap-0 relative">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= step.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-input-level-2 text-text-medium-emphasis'
              }`}
            >
              {currentStep > step.id ? (
                <span className="material-symbols-outlined text-sm">check</span>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`text-xs font-bold ${
                currentStep === step.id ? 'text-primary' : 'text-text-medium-emphasis'
              }`}
            >
              {step.label}
            </span>
            {currentStep === step.id && <div className="active-step-indicator"></div>}
          </div>
        ))}
        <div className="absolute top-5 left-[12.5%] right-[12.5%] h-px bg-outline-variant -z-0"></div>
      </div>
    </div>
  );
};
