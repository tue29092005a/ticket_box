class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token') || null;
        this.refreshTokenStr = localStorage.getItem('refreshToken') || null;
        this.username = localStorage.getItem('username') || null;
        
        // Simulating the grace period locally for UI demonstration
        this.gracePeriodActive = false;
        
        this.initEventListeners();
        this.updateUI();
    }

    initEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', () => {
            document.getElementById('loginModal').classList.remove('hidden');
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login(
                document.getElementById('username').value,
                document.getElementById('password').value
            );
        });

        document.getElementById('simulateDuplicateRefreshBtn').addEventListener('click', () => {
            this.simulateDuplicateRefresh();
        });
    }

    async login(username, password) {
        addLog(`Attempting login for user: ${username}...`, 'system');
        
        try {
            const res = await fetch('http://localhost:3000/auth/login-dev', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username })
            });

            if (!res.ok) throw new Error('Login failed');

            const data = await res.json();
            
            this.token = data.accessToken;
            this.refreshTokenStr = data.refreshToken;
            this.username = username;
            
            localStorage.setItem('token', this.token);
            localStorage.setItem('refreshToken', this.refreshTokenStr);
            localStorage.setItem('username', this.username);
            
            addLog(`Login successful. Access Token granted.`, 'success');
            
            document.getElementById('loginModal').classList.add('hidden');
            this.updateUI();
            
            window.dispatchEvent(new CustomEvent('auth-success'));
        } catch (error) {
            addLog(`Login error: ${error.message}`, 'error');
        }
    }

    logout() {
        this.token = null;
        this.refreshTokenStr = null;
        this.username = null;
        localStorage.clear();
        addLog('User logged out.', 'warn');
        this.updateUI();
        window.dispatchEvent(new CustomEvent('auth-logout'));
    }

    updateUI() {
        if (this.token) {
            document.getElementById('loginBtn').classList.add('hidden');
            document.getElementById('userInfo').classList.remove('hidden');
            document.getElementById('usernameDisplay').textContent = `Hello, ${this.username}`;
        } else {
            document.getElementById('loginBtn').classList.remove('hidden');
            document.getElementById('userInfo').classList.add('hidden');
        }
    }

    async refreshTokens() {
        addLog('Initiating token refresh...', 'system');
        try {
            const res = await fetch('http://localhost:3000/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.username, refreshToken: this.refreshTokenStr })
            });
            if (!res.ok) throw new Error('Refresh failed');
            
            const data = await res.json();
            addLog('Token refreshed successfully. Old refresh token entering Grace Period.', 'success');
            
            this.token = data.accessToken;
            this.refreshTokenStr = data.refreshToken;
            this.gracePeriodActive = true;
            
            setTimeout(() => {
                this.gracePeriodActive = false;
                addLog('Grace Period expired for old refresh token.', 'system');
            }, 30000); // 30s grace period according to specs
        } catch (error) {
            addLog(`Refresh error: ${error.message}`, 'error');
        }
    }

    async simulateDuplicateRefresh() {
        if (!this.token) {
            addLog('Please login first to simulate token refresh.', 'error');
            return;
        }

        addLog('--- Simulating Duplicate Refresh Scenario ---', 'warn');
        
        // Request 1
        addLog('Request 1: Refreshing token...', 'system');
        
        const oldToken = this.refreshTokenStr;

        try {
            const res1 = await fetch('http://localhost:3000/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.username, refreshToken: oldToken })
            });
            const data1 = await res1.json();
            addLog('Request 1: Success. New tokens issued.', 'success');
            addLog('Request 1: Grace Period started for old token.', 'grace');
            
            this.token = data1.accessToken;
            this.refreshTokenStr = data1.refreshToken;
            
            // Request 2 (concurrent, comes in using old refresh token)
            setTimeout(async () => {
                addLog('Request 2: Duplicate refresh request arrives using OLD refresh token.', 'warn');
                const res2 = await fetch('http://localhost:3000/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: this.username, refreshToken: oldToken })
                });
                if (res2.ok) {
                    addLog('Request 2: Backend detects Grace Period. Serving newly generated tokens from cache.', 'grace');
                }
            }, 1200);

            // Request 3 (malicious, comes in after grace period - 35s)
            setTimeout(async () => {
                addLog('Request 3: Late refresh request arrives using OLD refresh token.', 'error');
                const res3 = await fetch('http://localhost:3000/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: this.username, refreshToken: oldToken })
                });
                if (!res3.ok) {
                    addLog('Request 3: Grace Period expired! Token reuse detected. Revoking family...', 'error');
                    this.logout();
                }
            }, 35000);

        } catch (error) {
            addLog(`Simulation error: ${error.message}`, 'error');
        }
    }
}

const auth = new AuthManager();
