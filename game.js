/**
 * 수식 콤보 퍼즐 : 넘버 체인 (Number Chain Puyo)
 * Core Game Engine & Renderer
 */

// Global Constants & Config
const COLS = 6;
const ROWS = 12;
const BLOCK_SIZE = 50; // Canvas Logical Block Size
const CANVAS_WIDTH = COLS * BLOCK_SIZE;  // 300
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE; // 600

// Number Color Schemes
const NUMBER_COLORS = {
    1: { bg: '#06b6d4', border: '#67e8f9', text: '#ffffff' }, // Cyan
    2: { bg: '#10b981', border: '#6ee7b7', text: '#ffffff' }, // Emerald
    3: { bg: '#eab308', border: '#fde047', text: '#ffffff' }, // Yellow
    4: { bg: '#f97316', border: '#ffedd5', text: '#ffffff' }, // Orange
    5: { bg: '#f43f5e', border: '#fecdd3', text: '#ffffff' }, // Rose
    6: { bg: '#8b5cf6', border: '#ddd6fe', text: '#ffffff' }, // Violet
    7: { bg: '#ec4899', border: '#fbcfe8', text: '#ffffff' }, // Pink
    8: { bg: '#3b82f6', border: '#bfdbfe', text: '#ffffff' }, // Blue
    9: { bg: '#84cc16', border: '#d9f99d', text: '#ffffff' }  // Lime
};

// Web Audio API Synthesizer
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playMove() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playRotate() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playDrop() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playClear(combo = 1) {
        if (!this.enabled || !this.ctx) return;
        const baseFreq = 523.25; // C5
        const semitones = (combo - 1) * 2;
        const freq = baseFreq * Math.pow(2, semitones / 12);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.6);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }
}

// Main Game Controller
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        // Audio
        this.sound = new SoundEngine();

        // Game Options & Difficulty
        this.difficulty = 'easy'; // 'practice' (sum=10, 1~5), 'easy' (sum=10, 1~9), 'normal' (sum=12, 1~9), 'hard' (sum=20, 1~9)
        this.targetSum = 10;
        this.maxNum = 9;
        this.showHint = true;

        // Board Matrix: ROWS x COLS (null or { num, clearing, animOffset })
        this.grid = this.createEmptyGrid();

        // Piece State
        this.currentPiece = null;
        this.nextPiece = null;

        // Gameplay Variables
        this.score = 0;
        this.maxCombo = 0;
        this.clearCount = 0;
        this.state = 'START'; // START, PLAYING, RESOLVING, PAUSED, GAMEOVER
        this.dropInterval = 800; // ms
        this.lastDropTime = 0;

        // Particle System
        this.particles = [];
        this.screenShake = 0;

        this.initUI();
    }

    createEmptyGrid() {
        const grid = [];
        for (let r = 0; r < ROWS; r++) {
            grid[r] = new Array(COLS).fill(null);
        }
        return grid;
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        if (diff === 'practice') {
            this.targetSum = 10;
            this.maxNum = 5;
            this.baseDropInterval = 800;
        } else if (diff === 'easy') {
            this.targetSum = 10;
            this.maxNum = 9;
            this.baseDropInterval = 750;
        } else if (diff === 'normal') {
            this.targetSum = 12;
            this.maxNum = 9;
            this.baseDropInterval = 700;
        } else if (diff === 'hard') {
            this.targetSum = 20;
            this.maxNum = 9;
            this.baseDropInterval = 550;
        }
        this.dropInterval = this.baseDropInterval;
        document.getElementById('target-sum-display').innerText = this.targetSum;
        document.getElementById('start-target-desc').innerText = this.targetSum;
    }

    initUI() {
        // Difficulty Buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.setDifficulty(target.dataset.diff);
            });
        });

        // Overlay Action Buttons
        document.getElementById('btn-start').addEventListener('click', () => {
            this.sound.init();
            this.startNewGame();
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            this.resumeGame();
        });

        document.getElementById('btn-restart-pause').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('btn-home-pause').addEventListener('click', () => {
            this.goHome();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('btn-home-gameover').addEventListener('click', () => {
            this.goHome();
        });

        const homeMainBtn = document.getElementById('btn-home-main');
        if (homeMainBtn) homeMainBtn.addEventListener('click', () => this.goHome());

        const homeFloatBtn = document.getElementById('btn-home-floating');
        if (homeFloatBtn) homeFloatBtn.addEventListener('click', () => this.goHome());

        // Leaderboard & Admin Triggers
        const openLbBtn = document.getElementById('btn-open-leaderboard');
        if (openLbBtn) openLbBtn.addEventListener('click', () => this.openLeaderboard());

        const openLbGoBtn = document.getElementById('btn-open-leaderboard-gameover');
        if (openLbGoBtn) openLbGoBtn.addEventListener('click', () => this.openLeaderboard());

        const closeLbBtn = document.getElementById('btn-close-leaderboard');
        if (closeLbBtn) closeLbBtn.addEventListener('click', () => this.closeLeaderboard());

        const adminTrophyBtn = document.getElementById('admin-trophy-trigger');
        if (adminTrophyBtn) {
            adminTrophyBtn.addEventListener('click', () => {
                document.getElementById('admin-password-input').value = '';
                document.getElementById('admin-auth-overlay').classList.remove('hidden');
            });
        }

        document.getElementById('btn-submit-admin').addEventListener('click', () => this.authenticateAdmin());
        document.getElementById('admin-password-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.authenticateAdmin();
        });
        document.getElementById('btn-close-admin').addEventListener('click', () => {
            document.getElementById('admin-auth-overlay').classList.add('hidden');
        });

        document.querySelectorAll('.lb-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.lb-tab-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.renderLeaderboardTable(e.currentTarget.dataset.tab);
            });
        });

        // Submit / Skip Score
        document.getElementById('btn-submit-score').addEventListener('click', () => this.submitLeaderboardScore());
        document.getElementById('btn-skip-score').addEventListener('click', () => {
            document.getElementById('register-leaderboard-overlay').classList.add('hidden');
            this.showGameOverModal();
        });

        // Toggle Buttons
        const soundToggleBtn = document.getElementById('btn-sound-toggle');
        soundToggleBtn.addEventListener('click', () => {
            this.sound.enabled = !this.sound.enabled;
            soundToggleBtn.classList.toggle('active', this.sound.enabled);
            soundToggleBtn.innerText = this.sound.enabled ? 'ON' : 'OFF';
        });

        const hintToggleBtn = document.getElementById('btn-hint-toggle');
        hintToggleBtn.addEventListener('click', () => {
            this.showHint = !this.showHint;
            hintToggleBtn.classList.toggle('active', this.showHint);
            hintToggleBtn.innerText = this.showHint ? 'ON' : 'OFF';
        });

        document.getElementById('btn-pause-toggle').addEventListener('click', () => {
            this.togglePause();
        });

        // Keyboard Controls
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Touch Controls
        document.getElementById('tbtn-left').addEventListener('click', () => this.movePiece(-1, 0));
        document.getElementById('tbtn-right').addEventListener('click', () => this.movePiece(1, 0));
        document.getElementById('tbtn-down').addEventListener('click', () => this.softDrop());
        document.getElementById('tbtn-drop').addEventListener('click', () => this.hardDrop());
        document.getElementById('tbtn-rot-left').addEventListener('click', () => this.rotatePiece(-1));
        document.getElementById('tbtn-rot-right').addEventListener('click', () => this.rotatePiece(1));

        // Start Game Loop Animation
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    generateRandomPiece() {
        const val1 = Math.floor(Math.random() * this.maxNum) + 1;
        const val2 = Math.floor(Math.random() * this.maxNum) + 1;
        return {
            x: 2,
            y: 1,
            dir: 0, // 0: Top, 1: Right, 2: Bottom, 3: Left
            val1: val1,
            val2: val2
        };
    }

    getSubBlockPos(x, y, dir) {
        let sx = x;
        let sy = y;
        if (dir === 0) sy -= 1;      // Top
        else if (dir === 1) sx += 1; // Right
        else if (dir === 2) sy += 1; // Bottom
        else if (dir === 3) sx -= 1; // Left
        return { sx, sy };
    }

    startNewGame() {
        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.maxCombo = 0;
        this.clearCount = 0;
        this.updateStatsUI();

        this.currentPiece = this.generateRandomPiece();
        this.nextPiece = this.generateRandomPiece();

        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('gameover-overlay').classList.add('hidden');

        this.state = 'PLAYING';
        this.lastDropTime = performance.now();
        this.drawNextPiece();
    }

    goHome() {
        this.state = 'START';
        this.grid = this.createEmptyGrid();
        this.currentPiece = null;
        this.nextPiece = null;

        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('gameover-overlay').classList.add('hidden');
        document.getElementById('start-overlay').classList.remove('hidden');
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pause-overlay').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.resumeGame();
        }
    }

    resumeGame() {
        this.state = 'PLAYING';
        document.getElementById('pause-overlay').classList.add('hidden');
        this.lastDropTime = performance.now();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.sound.playGameOver();

        // 연습 게임 제외, 쉬움/보통/매운맛 모드에서 10,000점 이상 달성 시 리더보드 등록 팝업 오픈
        if (this.difficulty !== 'practice' && this.score >= 10000) {
            document.getElementById('register-leaderboard-overlay').classList.remove('hidden');
        } else {
            this.showGameOverModal();
        }
    }

    showGameOverModal() {
        document.getElementById('gameover-title').innerText = '💥 GAME OVER';
        document.getElementById('tutorial-clear-msg').classList.add('hidden');
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('final-stats').innerText = `최대 콤보: ${this.maxCombo}회 | 암산 성공: ${this.clearCount}회`;
        document.getElementById('gameover-overlay').classList.remove('hidden');
    }

    gameClearTutorial() {
        this.state = 'GAMEOVER';
        this.sound.playClear(4);
        document.getElementById('gameover-title').innerText = '🎉 튜토리얼 완료!';
        document.getElementById('tutorial-clear-msg').classList.remove('hidden');
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('final-stats').innerText = `최대 콤보: ${this.maxCombo}회 | 암산 성공: ${this.clearCount}회`;
        document.getElementById('gameover-overlay').classList.remove('hidden');
    }

    // --- Firebase & Local Leaderboard Logic ---
    async submitLeaderboardScore() {
        const input = document.getElementById('leaderboard-name-input');
        const name = (input.value || '').trim() || '무명 퍼즐왕';
        const newRecord = {
            id: 'local_' + Date.now(),
            name: name,
            score: this.score,
            difficulty: this.difficulty,
            maxCombo: this.maxCombo,
            clearCount: this.clearCount,
            createdAt: new Date().toISOString()
        };

        // 1) Save to local backup
        const saved = JSON.parse(localStorage.getItem('number_chain_leaderboard') || '[]');
        saved.push(newRecord);
        localStorage.setItem('number_chain_leaderboard', JSON.stringify(saved));

        // 2) Save to Firebase Firestore if connected
        try {
            if (typeof db !== 'undefined' && db) {
                await db.collection('leaderboard').add({
                    name: name,
                    score: this.score,
                    difficulty: this.difficulty,
                    maxCombo: this.maxCombo,
                    clearCount: this.clearCount,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("🔥 Firestore 리더보드 동기화 완료!");
            }
        } catch (err) {
            console.error("Firestore 저장 에러:", err);
        }

        document.getElementById('register-leaderboard-overlay').classList.add('hidden');
        input.value = '';
        this.openLeaderboard(this.difficulty);
    }

    openLeaderboard(defaultDiff = null) {
        const modal = document.getElementById('leaderboard-modal');
        modal.classList.remove('hidden');

        let activeDiff = defaultDiff || this.difficulty || 'easy';
        if (activeDiff === 'practice') activeDiff = 'easy';

        document.querySelectorAll('.lb-tab-btn').forEach(btn => {
            if (btn.dataset.tab === activeDiff) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.renderLeaderboardTable(activeDiff);
    }

    closeLeaderboard() {
        document.getElementById('leaderboard-modal').classList.add('hidden');
    }

    async authenticateAdmin() {
        const input = document.getElementById('admin-password-input');
        const pwd = (input.value || '').trim();

        // SHA-256 Hash calculation for '8582'
        const encoder = new TextEncoder();
        const data = encoder.encode(pwd);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Hash of '8582' = 6e22bd4867cc0da43411dc1e912861738fdab4427a5efbc1e0b0a5e7d07f024f
        if (hashHex === '6e22bd4867cc0da43411dc1e912861738fdab4427a5efbc1e0b0a5e7d07f024f') {
            this.isAdminMode = true;
            document.getElementById('admin-auth-overlay').classList.add('hidden');
            alert('🔓 관리자 인증에 성공했습니다! 리더보드 데이터 개별 삭제 권한이 활성화되었습니다.');
            this.openLeaderboard(this.difficulty || 'easy');
        } else {
            alert('❌ 비밀번호가 올바르지 않습니다.');
        }
    }

    async deleteLeaderboardDoc(docId, diff) {
        if (!confirm("정말 이 랭킹 기록을 삭제하시겠습니까?")) return;

        // Delete from local backup
        let saved = JSON.parse(localStorage.getItem('number_chain_leaderboard') || '[]');
        saved = saved.filter(item => item.id !== docId);
        localStorage.setItem('number_chain_leaderboard', JSON.stringify(saved));

        try {
            if (typeof db !== 'undefined' && db && docId && !docId.startsWith('local_')) {
                await db.collection('leaderboard').doc(docId).delete();
                console.log("Firestore 문서 삭제 완료:", docId);
            }
        } catch (err) {
            console.error("삭제 실패:", err);
        }

        this.renderLeaderboardTable(diff);
    }

    async renderLeaderboardTable(difficulty = 'easy') {
        if (difficulty === 'practice') difficulty = 'easy';
        const tbody = document.getElementById('leaderboard-tbody');
        tbody.innerHTML = '<tr><td colspan="5">⏳ 랭킹 데이터 불러오는 중...</td></tr>';

        // Toggle Admin Column Header
        document.querySelectorAll('.admin-only').forEach(el => {
            if (this.isAdminMode) el.classList.remove('hidden');
            else el.classList.add('hidden');
        });

        let list = [];

        // 1) Fetch from Firestore if connected
        try {
            if (typeof db !== 'undefined' && db) {
                const snapshot = await db.collection('leaderboard')
                    .where('difficulty', '==', difficulty)
                    .orderBy('score', 'desc')
                    .limit(50)
                    .get();

                snapshot.forEach(doc => {
                    list.push({ id: doc.id, ...doc.data() });
                });
            }
        } catch (e) {
            console.error("Firestore Fetch 에러:", e);
        }

        // 2) Merge with localStorage records
        const localSaved = JSON.parse(localStorage.getItem('number_chain_leaderboard') || '[]')
            .filter(item => item.difficulty === difficulty);

        localSaved.forEach(localItem => {
            if (!list.some(item => item.name === localItem.name && item.score === localItem.score)) {
                list.push(localItem);
            }
        });

        // 3) Default Mock Data if still empty
        if (list.length === 0) {
            list = [
                { id: 'mock1', name: '수학 천재', score: 24500, maxCombo: 5 },
                { id: 'mock2', name: '암산왕 철수', score: 18900, maxCombo: 4 },
                { id: 'mock3', name: '초등 퍼즐러', score: 15200, maxCombo: 3 },
                { id: 'mock4', name: '넘버 챔피언', score: 12000, maxCombo: 3 },
                { id: 'mock5', name: '도전왕 영희', score: 10500, maxCombo: 2 }
            ];
        }

        // Sort descending by score & limit 50
        list.sort((a, b) => b.score - a.score);
        list = list.slice(0, 50);

        tbody.innerHTML = '';
        list.forEach((item, index) => {
            const rank = index + 1;
            let rankClass = '';
            let rankBadge = `${rank}위`;
            if (rank === 1) { rankClass = 'rank-1'; rankBadge = '🥇 1위'; }
            else if (rank === 2) { rankClass = 'rank-2'; rankBadge = '🥈 2위'; }
            else if (rank === 3) { rankClass = 'rank-3'; rankBadge = '🥉 3위'; }

            const tr = document.createElement('tr');
            
            let adminTd = '';
            if (this.isAdminMode) {
                adminTd = `<td class="admin-only"><button class="btn-delete-rank" data-id="${item.id}">🗑️ 삭제</button></td>`;
            }

            tr.innerHTML = `
                <td class="${rankClass}">${rankBadge}</td>
                <td><b>${this.escapeHtml(item.name)}</b></td>
                <td>${item.score.toLocaleString()}점</td>
                <td>${item.maxCombo || 1} 콤보</td>
                ${adminTd}
            `;

            if (this.isAdminMode && item.id) {
                const delBtn = tr.querySelector('.btn-delete-rank');
                if (delBtn) {
                    delBtn.addEventListener('click', () => this.deleteLeaderboardDoc(item.id, difficulty));
                }
            }

            tbody.appendChild(tr);
        });
    }

    escapeHtml(str) {
        return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    updateStatsUI() {
        // 1000점당 Level 1씩 상승 (Lv.1 -> Lv.2 -> Lv.3 ...)
        const level = Math.floor(this.score / 1000) + 1;

        // 1000점(1레벨 상승) 당 낙하 주기가 60ms씩 단축되어 강하 속도 증가 (최소 속도 제한 120ms)
        const speedStep = 60;
        const minInterval = 120;
        this.dropInterval = Math.max(minInterval, (this.baseDropInterval || 800) - (level - 1) * speedStep);

        document.getElementById('score-display').innerText = this.score;
        document.getElementById('level-display').innerText = `Lv.${level}`;
        document.getElementById('max-combo-display').innerText = this.maxCombo;
        document.getElementById('clear-count-display').innerText = `${this.clearCount}회`;
    }

    // Controls Logic
    handleKeyDown(e) {
        if (this.state !== 'PLAYING') return;

        switch (e.key) {
            case 'ArrowLeft':
                this.movePiece(-1, 0);
                e.preventDefault();
                break;
            case 'ArrowRight':
                this.movePiece(1, 0);
                e.preventDefault();
                break;
            case 'ArrowDown':
                this.softDrop();
                e.preventDefault();
                break;
            case 'ArrowUp':
            case 'x':
            case 'X':
                this.rotatePiece(1); // Clockwise
                e.preventDefault();
                break;
            case 'z':
            case 'Z':
                this.rotatePiece(-1); // Counter-clockwise
                e.preventDefault();
                break;
            case ' ':
                this.hardDrop();
                e.preventDefault();
                break;
        }
    }

    isValidPosition(x, y, dir) {
        const { sx, sy } = this.getSubBlockPos(x, y, dir);

        // Check bounds for main block (x, y)
        if (x < 0 || x >= COLS || y >= ROWS) return false;
        if (y >= 0 && this.grid[y][x] !== null) return false;

        // Check bounds for sub block (sx, sy)
        if (sx < 0 || sx >= COLS || sy >= ROWS) return false;
        if (sy >= 0 && this.grid[sy][sx] !== null) return false;

        return true;
    }

    movePiece(dx, dy) {
        if (!this.currentPiece) return false;
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;

        if (this.isValidPosition(newX, newY, this.currentPiece.dir)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            this.sound.playMove();
            return true;
        }
        return false;
    }

    rotatePiece(dirDelta) {
        if (!this.currentPiece) return;
        const newDir = (this.currentPiece.dir + dirDelta + 4) % 4;

        // Try direct rotation
        if (this.isValidPosition(this.currentPiece.x, this.currentPiece.y, newDir)) {
            this.currentPiece.dir = newDir;
            this.sound.playRotate();
            return;
        }

        // Try Wall Kick (offset left, right, or up)
        const kicks = [-1, 1, -2, 2];
        for (let k of kicks) {
            if (this.isValidPosition(this.currentPiece.x + k, this.currentPiece.y, newDir)) {
                this.currentPiece.x += k;
                this.currentPiece.dir = newDir;
                this.sound.playRotate();
                return;
            }
        }
    }

    softDrop() {
        if (!this.movePiece(0, 1)) {
            this.lockCurrentPiece();
        } else {
            this.sound.playMove();
        }
    }

    hardDrop() {
        if (!this.currentPiece) return;
        while (this.movePiece(0, 1)) {
            // Drop without score increment
        }
        this.sound.playDrop();
        this.lockCurrentPiece();
    }

    lockCurrentPiece() {
        if (!this.currentPiece) return;

        const { x, y, dir, val1, val2 } = this.currentPiece;
        const { sx, sy } = this.getSubBlockPos(x, y, dir);

        if (y < 0 || sy < 0) {
            this.gameOver();
            return;
        }

        // Place blocks on grid
        this.grid[y][x] = { num: val1, clearing: false };
        this.grid[sy][sx] = { num: val2, clearing: false };

        this.currentPiece = null;
        this.state = 'RESOLVING';

        // Process Gravity and Chain Combos
        this.processChains(1);
    }

    async processChains(comboCount = 1) {
        // Step 1: Apply Gravity first
        this.applyGravity();

        // Step 2: Check for matching sum groups
        const matches = this.findSumMatches();

        if (matches.length > 0) {
            // Highlighting match blocks
            matches.forEach(m => {
                this.grid[m.r][m.c].clearing = true;
                this.createParticles(m.c * BLOCK_SIZE + BLOCK_SIZE / 2, m.r * BLOCK_SIZE + BLOCK_SIZE / 2, NUMBER_COLORS[this.grid[m.r][m.c].num].bg);
            });

            this.sound.playClear(comboCount);
            this.triggerScreenShake(comboCount * 4);
            this.showComboPopup(comboCount);

            // Calculate Score
            const gainedScore = matches.length * 100 * comboCount;
            this.score += gainedScore;
            this.clearCount += matches.length;
            if (comboCount > this.maxCombo) this.maxCombo = comboCount;
            this.updateStatsUI();

            // Wait for clear animation
            await this.sleep(400);

            // Clear matched blocks
            matches.forEach(m => {
                this.grid[m.r][m.c] = null;
            });

            // Wait after clear
            await this.sleep(200);

            // Check Tutorial Clear condition for Practice Mode (practice)
            if (this.difficulty === 'practice' && this.score >= 10000) {
                this.gameClearTutorial();
                return;
            }

            // Recursive Next Chain
            await this.processChains(comboCount + 1);
        } else {
            // Check Tutorial Clear condition before spawning next piece
            if (this.difficulty === 'practice' && this.score >= 10000) {
                this.gameClearTutorial();
                return;
            }

            // No more combos, spawn next piece
            this.spawnNextPiece();
        }
    }

    applyGravity() {
        for (let c = 0; c < COLS; c++) {
            for (let r = ROWS - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    // Find block above to drop
                    for (let k = r - 1; k >= 0; k--) {
                        if (this.grid[k][c] !== null) {
                            this.grid[r][c] = this.grid[k][c];
                            this.grid[k][c] = null;
                            break;
                        }
                    }
                }
            }
        }
    }

    findSumMatches() {
        const matchedKeys = new Set();
        const matches = [];

        // 4 Straight directional vectors: Horizontal, Vertical, Diagonal(↘), Diagonal(↙)
        const dirs = [
            { dr: 0, dc: 1 },  // 가로 (Horizontal)
            { dr: 1, dc: 0 },  // 세로 (Vertical)
            { dr: 1, dc: 1 },  // 대각선 (↘ Down-Right)
            { dr: 1, dc: -1 }  // 대각선 (↙ Down-Left)
        ];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] === null) continue;

                for (let d of dirs) {
                    let currentSum = 0;
                    const path = [];

                    let currR = r;
                    let currC = c;

                    while (
                        currR >= 0 && currR < ROWS &&
                        currC >= 0 && currC < COLS &&
                        this.grid[currR][currC] !== null
                    ) {
                        currentSum += this.grid[currR][currC].num;
                        path.push({ r: currR, c: currC });

                        if (currentSum === this.targetSum && path.length >= 2) {
                            path.forEach(p => {
                                const key = `${p.r},${p.c}`;
                                if (!matchedKeys.has(key)) {
                                    matchedKeys.add(key);
                                    matches.push({ r: p.r, c: p.c });
                                }
                            });
                            break;
                        }

                        if (currentSum > this.targetSum) {
                            break;
                        }

                        currR += d.dr;
                        currC += d.dc;
                    }
                }
            }
        }

        return matches;
    }

    spawnNextPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.generateRandomPiece();
        this.drawNextPiece();

        // Check Game Over condition
        if (!this.isValidPosition(this.currentPiece.x, this.currentPiece.y, this.currentPiece.dir)) {
            this.gameOver();
            return;
        }

        this.state = 'PLAYING';
        this.lastDropTime = performance.now();
    }

    showComboPopup(combo) {
        const popup = document.getElementById('combo-popup');
        const text = document.getElementById('combo-text');
        const subtext = document.getElementById('combo-subtext');

        text.innerText = `${combo} COMBO!`;
        if (combo === 1) subtext.innerText = 'NICE MATH!';
        else if (combo === 2) subtext.innerText = 'GREAT COMBO!';
        else if (combo === 3) subtext.innerText = 'FANTASTIC!';
        else subtext.innerText = 'MATH MASTER!! 🔥';

        popup.classList.remove('hidden', 'show');
        void popup.offsetWidth; // Trigger reflow
        popup.classList.add('show');

        setTimeout(() => {
            popup.classList.remove('show');
            popup.classList.add('hidden');
        }, 1000);
    }

    triggerScreenShake(intensity) {
        this.screenShake = intensity;
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 4 + 2,
                color,
                alpha: 1,
                life: 30
            });
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Rendering Engine ---
    gameLoop(time) {
        if (this.state === 'PLAYING') {
            if (time - this.lastDropTime > this.dropInterval) {
                this.softDrop();
                this.lastDropTime = time;
            }
        }

        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    render() {
        this.ctx.save();

        // Screen Shake
        if (this.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.screenShake;
            const dy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(dx, dy);
            this.screenShake *= 0.85;
            if (this.screenShake < 0.5) this.screenShake = 0;
        }

        // Clear Canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Grid Lines
        this.drawGridLines();

        // Draw Hint Guide if enabled
        if (this.showHint && this.currentPiece && this.state === 'PLAYING') {
            this.drawHintGuide();
        }

        // Draw Grid Locked Blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] !== null) {
                    const block = this.grid[r][c];
                    this.drawBlock(c * BLOCK_SIZE, r * BLOCK_SIZE, block.num, block.clearing);
                }
            }
        }

        // Draw Current Falling Piece
        if (this.currentPiece && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
            const { x, y, dir, val1, val2 } = this.currentPiece;
            const { sx, sy } = this.getSubBlockPos(x, y, dir);

            this.drawBlock(x * BLOCK_SIZE, y * BLOCK_SIZE, val1);
            this.drawBlock(sx * BLOCK_SIZE, sy * BLOCK_SIZE, val2);
        }

        // Render Particles
        this.renderParticles();

        this.ctx.restore();
    }

    drawGridLines() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        for (let r = 0; r <= ROWS; r++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, r * BLOCK_SIZE);
            this.ctx.lineTo(CANVAS_WIDTH, r * BLOCK_SIZE);
            this.ctx.stroke();
        }

        for (let c = 0; c <= COLS; c++) {
            this.ctx.beginPath();
            this.ctx.moveTo(c * BLOCK_SIZE, 0);
            this.ctx.lineTo(c * BLOCK_SIZE, CANVAS_HEIGHT);
            this.ctx.stroke();
        }
    }

    drawBlock(x, y, num, isClearing = false) {
        const color = NUMBER_COLORS[num] || NUMBER_COLORS[1];
        const padding = 3;
        const bx = x + padding;
        const by = y + padding;
        const bw = BLOCK_SIZE - padding * 2;
        const bh = BLOCK_SIZE - padding * 2;
        const radius = 10;

        this.ctx.save();

        if (isClearing) {
            this.ctx.shadowColor = '#ffffff';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = '#ffffff';
        } else {
            this.ctx.fillStyle = color.bg;
            this.ctx.shadowColor = color.bg;
            this.ctx.shadowBlur = 8;
        }

        // Rounded Rect
        this.ctx.beginPath();
        this.ctx.roundRect(bx, by, bw, bh, radius);
        this.ctx.fill();

        if (!isClearing) {
            // Inner Border Glow
            this.ctx.strokeStyle = color.border;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Draw Number Text
        this.ctx.fillStyle = isClearing ? color.bg : color.text;
        this.ctx.font = '800 24px "Outfit", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(num, x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2);

        this.ctx.restore();
    }

    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, 100, 100);
        if (!this.nextPiece) return;

        const val1 = this.nextPiece.val1;
        const val2 = this.nextPiece.val2;

        // Render in small preview canvas
        const size = 36;
        const p1X = 50 - size / 2;
        const p1Y = 24;
        const p2Y = p1Y + size + 4;

        this.drawBlockCanvas(this.nextCtx, p1X, p1Y, size, val1);
        this.drawBlockCanvas(this.nextCtx, p1X, p2Y, size, val2);
    }

    drawBlockCanvas(ctx, x, y, size, num) {
        const color = NUMBER_COLORS[num] || NUMBER_COLORS[1];
        ctx.fillStyle = color.bg;
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 8);
        ctx.fill();

        ctx.strokeStyle = color.border;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = color.text;
        ctx.font = '800 18px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num, x + size / 2, y + size / 2);
    }

    drawHintGuide() {
        // Calculate Hard Drop Y
        let testY = this.currentPiece.y;
        while (this.isValidPosition(this.currentPiece.x, testY + 1, this.currentPiece.dir)) {
            testY++;
        }

        const { x, dir, val1, val2 } = this.currentPiece;
        const { sx, sy } = this.getSubBlockPos(x, testY, dir);

        // Ghost Preview
        this.ctx.save();
        this.ctx.globalAlpha = 0.25;
        this.drawBlock(x * BLOCK_SIZE, testY * BLOCK_SIZE, val1);
        this.drawBlock(sx * BLOCK_SIZE, sy * BLOCK_SIZE, val2);
        this.ctx.restore();
    }

    renderParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = p.life / 30;

            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
}

// Instantiate and Run when DOM loaded
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
