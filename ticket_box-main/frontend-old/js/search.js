class SearchManager {
    constructor() {
        this.input = document.getElementById('searchInput');
        this.suggestionsBox = document.getElementById('searchSuggestions');
        
        // Debounced search
        const debouncedSearch = debounce((query) => this.performSearch(query), 300);
        
        this.input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 0) {
                debouncedSearch(query);
            } else {
                this.hideSuggestions();
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSuggestions();
            }
        });
    }

    async performSearch(query) {
        // In a real app, this would hit Meilisearch
        // const response = await fetch(`${CONFIG.MEILISEARCH_URL}/indexes/tickets/search`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.MEILISEARCH_KEY}` },
        //     body: JSON.stringify({ q: query, limit: 5 })
        // });
        // const data = await response.json();

        // Simulating Meilisearch response with typo tolerance / suggestions
        const mockDatabase = [
            { id: 'EV-1', title: 'Taylor Swift Eras Tour - SVIP', date: '2024-10-15', location: 'Stadium' },
            { id: 'EV-2', title: 'Taylor Swift Eras Tour - GA', date: '2024-10-15', location: 'Stadium' },
            { id: 'EV-3', title: 'Coldplay Spheres - SVIP', date: '2024-11-20', location: 'Arena' },
            { id: 'EV-4', title: 'Ed Sheeran Math Tour', date: '2024-12-05', location: 'Park' },
            { id: 'EV-5', title: 'Comedy Night Special', date: '2024-09-30', location: 'Theater' }
        ];

        const lowerQuery = query.toLowerCase();
        
        // Simulate auto-correct / fuzzy match
        const results = mockDatabase.filter(item => 
            item.title.toLowerCase().includes(lowerQuery) || 
            item.location.toLowerCase().includes(lowerQuery)
        );

        this.renderSuggestions(results, query);
    }

    renderSuggestions(results, query) {
        this.suggestionsBox.innerHTML = '';
        
        if (results.length === 0) {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.style.color = 'var(--text-secondary)';
            div.textContent = `No results for "${query}"`;
            this.suggestionsBox.appendChild(div);
        } else {
            results.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `
                    <div style="font-weight: 500;">${this.highlight(item.title, query)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                        ${item.date} • ${item.location}
                    </div>
                `;
                
                div.addEventListener('click', () => {
                    this.input.value = item.title;
                    this.hideSuggestions();
                    addLog(`Selected event: ${item.title}`, 'system');
                });
                
                this.suggestionsBox.appendChild(div);
            });
        }
        
        this.suggestionsBox.classList.remove('hidden');
    }

    highlight(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span style="background-color: #fef08a;">$1</span>');
    }

    hideSuggestions() {
        this.suggestionsBox.classList.add('hidden');
    }
}

const search = new SearchManager();
