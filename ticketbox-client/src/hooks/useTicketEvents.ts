import { useState, useEffect } from 'react';

interface SSEventPayload {
  seatNo?: string;
  status?: 'booked' | 'held' | 'available';
  availableTickets?: number;
  message?: string;
  type?: string;
}

export const useTicketEvents = (showId: string, onEvent?: (payload: SSEventPayload) => void) => {
  const [lastEvent, setLastEvent] = useState<SSEventPayload | null>(null);

  useEffect(() => {
    // Backend đẩy SSE ở endpoint /booking/sse/:userId
    // Ở đây ta fake userId là '1' (hoặc showId để demo)
    const eventSource = new EventSource(`http://localhost:3000/booking/sse/${showId}`);

    eventSource.onmessage = (event) => {
      try {
        const payload: SSEventPayload = JSON.parse(event.data);
        setLastEvent(payload);
        if (onEvent) onEvent(payload);
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // Trình duyệt sẽ tự động reconnect (Fallback SSE)
    };

    return () => {
      eventSource.close();
    };
  }, [showId]);

  return { lastEvent };
};
