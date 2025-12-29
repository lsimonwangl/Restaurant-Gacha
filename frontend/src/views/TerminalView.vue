<script setup>
import { ref } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const query = ref('')
const results = ref(null)
const error = ref(null)
const loading = ref(false)
const accessCode = ref('')
const isLocked = ref(true)

const unlockTerminal = () => {
    if (accessCode.value.length > 0) {
        isLocked.value = false
    }
}

const executeQuery = async () => {
    if (!query.value.trim()) return

    loading.value = true
    results.value = null
    error.value = null

    try {
        const token = localStorage.getItem('token')
        const response = await axios.post(`${API_URL}/api/terminal/query`, {
            query: query.value,
            accessCode: accessCode.value
        }, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (response.data.success) {
            results.value = response.data.results
        }
    } catch (err) {
        error.value = err.response?.data?.message || err.message
        if (err.response?.data?.sqlMessage) {
            error.value += `\nSQL: ${err.response.data.sqlMessage}`
        }
    } finally {
        loading.value = false
    }
}

// Shortcuts (Ctrl+Enter to run)
const handleKeydown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        executeQuery()
    }
}
</script>

<template>
<div class="terminal-container">
    <div class="glass-panel terminal-panel">
        <div v-if="isLocked" class="lock-screen">
            <h2>🔒 Admin Access Required</h2>
            <p>Please enter the Terminal Access Code provided by the administrator.</p>
            <form @submit.prevent="unlockTerminal">
                <input 
                    type="password" 
                    v-model="accessCode" 
                    placeholder="Access Code"
                    class="input-field" 
                    autofocus
                >
                <button type="submit" class="btn-primary">Unlock</button>
            </form>
        </div>

        <div v-else class="terminal-content">
            <h2>💻 SQL Terminal</h2>
            <p class="subtitle">Direct Database Access (Admin Only)</p>

            <div class="editor-section">
                <textarea 
                    v-model="query" 
                    placeholder="SELECT * FROM users..." 
                    @keydown="handleKeydown"
                    spellcheck="false"
                ></textarea>
                <div class="actions">
                    <button class="btn-primary" @click="executeQuery" :disabled="loading">
                        {{ loading ? 'Running...' : 'Run Query (Ctrl+Enter)' }}
                    </button>
                    <button class="btn-secondary" @click="query = ''">Clear</button>
                    <button class="btn-secondary" @click="isLocked = true">Lock</button>
                </div>
            </div>

            <div v-if="error" class="result-box error">
                <h3>❌ Error</h3>
                <pre>{{ error }}</pre>
            </div>

            <div v-if="results" class="result-box success">
                <h3>✅ Database Results ({{ Array.isArray(results) ? results.length : 'N/A' }} rows)</h3>
                
                <div v-if="Array.isArray(results) && results.length > 0" class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th v-for="key in Object.keys(results[0])" :key="key">{{ key }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, idx) in results" :key="idx">
                                <td v-for="key in Object.keys(row)" :key="key">{{ row[key] }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-else-if="Array.isArray(results) && results.length === 0">
                    <p>No rows returned.</p>
                </div>
                <div v-else>
                    <pre>{{ JSON.stringify(results, null, 2) }}</pre>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<style scoped>
.terminal-container {
    padding: 2rem;
    min-height: 100vh;
    display: flex;
    justify-content: center;
}

.terminal-panel {
    width: 100%;
    max-width: 900px;
    padding: 2rem;
}

.subtitle {
    color: #ffd700;
    margin-bottom: 1rem;
    font-size: 0.9rem;
}

.editor-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

textarea {
    width: 100%;
    height: 150px;
    background: rgba(0, 0, 0, 0.6);
    color: #0f0;
    font-family: 'Fira Code', monospace;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    resize: vertical;
    outline: none;
}

textarea:focus {
    border-color: #ffd700;
}

.actions {
    display: flex;
    gap: 1rem;
}

.result-box {
    margin-top: 2rem;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
}

.result-box.error {
    background: rgba(255, 0, 0, 0.2);
    border: 1px solid #ff4444;
    color: #ffcccc;
}

.result-box.success {
    background: rgba(0, 255, 0, 0.1);
    border: 1px solid #44ff44;
}

.table-container {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    color: #fff;
    font-size: 0.9rem;
}

th, td {
    padding: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-align: left;
}

th {
    background: rgba(255, 255, 255, 0.1);
    font-weight: bold;
    color: #ffd700;
}

pre {
    white-space: pre-wrap;
    word-wrap: break-word;
}
</style>
