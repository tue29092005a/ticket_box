// Configuration
const CONFIG = {
    API_BASE: 'http://localhost:8080/api', // Adjust as needed
    MEILISEARCH_URL: 'http://localhost:7700', // Adjust as needed
    MEILISEARCH_KEY: '', // Or use proxy endpoint
};

// Utils
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function formatDate(date) {
    return new Date(date).toLocaleTimeString();
}

function addLog(message, type = 'system') {
    const logsContainer = document.getElementById('authLogs');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `<span style="color:#6b7280">[${formatDate(new Date())}]</span> ${message}`;
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}
