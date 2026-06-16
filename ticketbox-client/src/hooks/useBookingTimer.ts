import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useBookingTimer = (initialSeconds: number = 180) => {
  const navigate = useNavigate();

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const savedExpireAt = sessionStorage.getItem('booking_expireAt');
    if (savedExpireAt) {
      const remaining = Math.floor((parseInt(savedExpireAt) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    const newExpireAt = Date.now() + initialSeconds * 1000;
    sessionStorage.setItem('booking_expireAt', newExpireAt.toString());
    return initialSeconds;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      alert('Đã hết thời gian giữ vé! Phiên giao dịch đã bị hủy. Vui lòng thử lại.');
      sessionStorage.removeItem('booking_expireAt');
      navigate('/');
    }
  }, [timeLeft, navigate]);

  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  const formattedTime = `${m}:${s}`;

  return { timeLeft, m, s, formattedTime };
};
