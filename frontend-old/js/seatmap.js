class SeatMapManager {
    constructor() {
        this.svipContainer = document.getElementById('svipSeats');
        this.gaContainer = document.getElementById('gaSeats');
        this.seats = new Map();
        
        this.initGrid(this.svipContainer, 50, 'SVIP'); // 5 rows of 10
        this.initGrid(this.gaContainer, 150, 'GA');    // 10 rows of 15
        
        this.fetchInitialSeats();
        this.connectSSE();
    }

    async fetchInitialSeats() {
        try {
            const res = await fetch('http://localhost:3000/booking/show/show_1/seats');
            if (res.ok) {
                const seats = await res.json();
                for (const seatNo of Object.keys(seats)) {
                    // Mặc định hiện tại coi như đang giữ (Held - màu tím)
                    this.updateSeat(seatNo, 'held');
                }
            }
        } catch (error) {
            console.error('Failed to fetch initial seat statuses', error);
        }
    }

    initGrid(container, count, prefix) {
        for (let i = 1; i <= count; i++) {
            const seatId = `${prefix}-${i}`;
            const seatEl = document.createElement('div');
            seatEl.className = 'seat available';
            seatEl.textContent = i;
            seatEl.dataset.id = seatId;
            
            seatEl.addEventListener('click', () => this.handleSeatClick(seatId));
            
            container.appendChild(seatEl);
            this.seats.set(seatId, {
                element: seatEl,
                status: 'available'
            });
        }
    }

    async handleSeatClick(seatId) {
        if (!auth.token) {
            alert('Please login to reserve seats.');
            return;
        }

        const seat = this.seats.get(seatId);
        if (seat.status !== 'available') {
            addLog(`Seat ${seatId} is not available.`, 'warn');
            return;
        }

        const isSVIP = seatId.startsWith('SVIP');
        const endpoint = isSVIP ? 'http://localhost:3000/booking/svip' : 'http://localhost:3000/booking/ga';
        const body = isSVIP 
            ? { showId: 'show_1', userId: auth.username, seatNo: seatId }
            : { showId: 'show_1', userId: auth.username, quantity: 1 };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                addLog(`Transaction sent for ${seatId}. Waiting for server confirmation...`, 'system');
                this.updateSeat(seatId, 'held');
                
                // Trigger virtual inbox email after successful purchase
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('ticket-bought', { 
                        detail: { seatId, type: isSVIP ? 'SVIP' : 'GA' } 
                    }));
                }, 3000);
            } else {
                const err = await res.json();
                addLog(`Booking failed for ${seatId}: ${err.message}`, 'error');
            }
        } catch (error) {
            addLog(`Error booking ${seatId}: ${error.message}`, 'error');
        }
    }

    updateSeat(seatId, status) {
        const seat = this.seats.get(seatId);
        if (seat) {
            seat.status = status;
            seat.element.className = `seat ${status}`;
        }
    }

    connectSSE() {
        const sseClientId = auth.username || `anonymous_${Math.floor(Math.random() * 1000000)}`;
        
        addLog('Connecting to real-time Server-Sent Events...', 'system');
        const eventSource = new EventSource(`http://localhost:3000/booking/sse/${sseClientId}`);
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.seatNo && data.status) {
                this.updateSeat(data.seatNo, data.status);
            }
            if (data.type === 'message') {
                addLog(`[SSE Message]: ${data.message}`, 'system');
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Error:', err);
            // Optionally auto-reconnect
        };
    }
}

const seatMap = new SeatMapManager();
