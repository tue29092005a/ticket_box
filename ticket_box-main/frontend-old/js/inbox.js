class VirtualInbox {
    constructor() {
        this.container = document.getElementById('virtualInbox');
        this.listenForTickets();
    }

    listenForTickets() {
        // Listen to local events (simulating worker pool completion)
        window.addEventListener('ticket-bought', (e) => {
            const { seatId, type } = e.detail;
            
            // Simulate asynchronous QR code generation delay
            setTimeout(() => {
                this.receiveTicket(seatId, type);
            }, 2000);
        });

        // In a real app, this might be an SSE endpoint or WebSockets
        // const eventSource = new EventSource(`${CONFIG.API_BASE}/inbox/stream?token=${auth.token}`);
    }

    receiveTicket(seatId, type) {
        // Remove empty state if exists
        const emptyState = this.container.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const ticketEl = document.createElement('div');
        ticketEl.className = 'ticket-email';
        
        // Generate a random QR code looking thing (emoji for simplicity)
        const qrs = ['🔲', '🔳', '🟩', '🟪'];
        const qr = qrs[Math.floor(Math.random() * qrs.length)];

        ticketEl.innerHTML = `
            <div class="qr-code">${qr}</div>
            <div class="ticket-details">
                <h4>Your ${type} Ticket: ${seatId}</h4>
                <p>Transaction ID: TXN-${generateId().toUpperCase()}</p>
                <p>Received: ${formatDate(new Date())}</p>
                <p style="color: var(--primary-color); margin-top: 4px; font-weight: 500;">Valid for Entry</p>
            </div>
        `;

        this.container.prepend(ticketEl);
        addLog(`Received email with QR Code for seat ${seatId}`, 'success');
    }
}

const inbox = new VirtualInbox();
