/**
 * ROOFTOP DEFENDER V4
 * With power-ups, hold-to-shoot, and aiming
 */

// --- Configuration & Globals ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const lobbyScreen = document.getElementById('lobbyScreen');
const howToPlayScreen = document.getElementById('howToPlayScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreEl = document.getElementById('scoreDisplay');
const finalScoreEl = document.getElementById('finalScore');
const highScoreEl = document.getElementById('highScoreDisplay');
const newHighScoreEl = document.getElementById('newHighScore');
const hpFill = document.getElementById('healthFill');
const aimIndicator = document.getElementById('aimIndicator');
const powerUpDisplay = document.getElementById('powerUpDisplay');
const missionsCountEl = document.getElementById('missionsCount');
const dronesShotCountEl = document.getElementById('dronesShotCount');
const finalDronesShotEl = document.getElementById('finalDronesShot');
const finalPowerUpsCollectedEl = document.getElementById('finalPowerUpsCollected');

// Buttons
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const howToPlayBtn = document.getElementById('howToPlayBtn');
const backToLobbyBtn = document.getElementById('backToLobbyBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');

// Game State
let width, height;
let gameActive = false;
let score = 0;
let difficulty = 1;
let wave = 1;
let highScore = 0;
let missionsPlayed = 0;
let totalDronesShot = 0;
let powerUpsCollected = 0;

// Entities
let player;
let bullets = [];
let enemies = [];
let powerUps = [];
let particles = [];

// Input State
let isShooting = false;
let autoShootTimer = 0;
let aimX = 0;
let aimY = 0;

// Player Abilities
let playerAbilities = {
    doubleShot: { active: false, timer: 0, duration: 10000 },
    rapidFire: { active: false, timer: 0, duration: 8000, cooldown: 100 },
    healthBoost: { active: false, timer: 0, duration: 0 }, // Instant
    shield: { active: false, timer: 0, duration: 15000 }
};

// Timers & Effects
let enemySpawnTimer = 0;
let enemySpawnInterval = 1500;
let screenShake = 0;
let shootInterval = 200; // Default cooldown

// --- Data Storage ---
const HIGH_SCORE_KEY = 'rooftopDefenderHighScore';
const STATS_KEY = 'rooftopDefenderStats';

function loadData() {
    // High score
    const savedScore = localStorage.getItem(HIGH_SCORE_KEY);
    highScore = savedScore ? parseInt(savedScore) : 0;
    highScoreEl.textContent = highScore;
    
    // Stats
    const savedStats = localStorage.getItem(STATS_KEY);
    if (savedStats) {
        const stats = JSON.parse(savedStats);
        missionsPlayed = stats.missionsPlayed || 0;
        totalDronesShot = stats.totalDronesShot || 0;
        updateStatsDisplay();
    }
}

function saveData() {
    // Save high score
    localStorage.setItem(HIGH_SCORE_KEY, highScore.toString());
    
    // Save stats
    const stats = {
        missionsPlayed,
        totalDronesShot
    };
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function updateStatsDisplay() {
    missionsCountEl.textContent = missionsPlayed;
    dronesShotCountEl.textContent = totalDronesShot;
}

// --- Power-up System ---
const POWERUP_TYPES = {
    DOUBLE_SHOT: 'double',
    RAPID_FIRE: 'rapid',
    HEALTH_BOOST: 'health',
    SHIELD: 'shield'
};

class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.type = this.getRandomType();
        this.active = true;
        this.floatTimer = 0;
        this.speed = 2;
        this.color = this.getColor();
        this.symbol = this.getSymbol();
    }

    getRandomType() {
        const types = Object.values(POWERUP_TYPES);
        return types[Math.floor(Math.random() * types.length)];
    }

    getColor() {
        switch(this.type) {
            case POWERUP_TYPES.DOUBLE_SHOT: return '#ff0055';
            case POWERUP_TYPES.RAPID_FIRE: return '#00ffcc';
            case POWERUP_TYPES.HEALTH_BOOST: return '#ffff00';
            case POWERUP_TYPES.SHIELD: return '#00a8ff';
            default: return '#ffffff';
        }
    }

    getSymbol() {
        switch(this.type) {
            case POWERUP_TYPES.DOUBLE_SHOT: return '⚡';
            case POWERUP_TYPES.RAPID_FIRE: return '🌀';
            case POWERUP_TYPES.HEALTH_BOOST: return '❤️';
            case POWERUP_TYPES.SHIELD: return '🛡️';
            default: return '⭐';
        }
    }

    update() {
        // Float up and down
        this.floatTimer += 0.05;
        this.y += Math.sin(this.floatTimer) * 0.5;
        
        // Fall down slowly
        this.y += this.speed;
        
        // Collect if touching player
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + this.radius) {
            this.collect();
        }
        
        // Deactivate if off screen
        if (this.y > height + 50) {
            this.active = false;
        }
    }

    collect() {
        this.active = false;
        powerUpsCollected++;
        
        switch(this.type) {
            case POWERUP_TYPES.DOUBLE_SHOT:
                activateDoubleShot();
                break;
            case POWERUP_TYPES.RAPID_FIRE:
                activateRapidFire();
                break;
            case POWERUP_TYPES.HEALTH_BOOST:
                activateHealthBoost();
                break;
            case POWERUP_TYPES.SHIELD:
                activateShield();
                break;
        }
        
        // Visual feedback
        spawnExplosion(this.x, this.y, this.color, 10);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Background circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Symbol
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 0);
        
        ctx.restore();
    }
}

function activateDoubleShot() {
    playerAbilities.doubleShot.active = true;
    playerAbilities.doubleShot.timer = playerAbilities.doubleShot.duration;
    updatePowerUpDisplay();
}

function activateRapidFire() {
    playerAbilities.rapidFire.active = true;
    playerAbilities.rapidFire.timer = playerAbilities.rapidFire.duration;
    shootInterval = playerAbilities.rapidFire.cooldown;
    updatePowerUpDisplay();
}

function activateHealthBoost() {
    player.hp = Math.min(player.maxHp, player.hp + 30);
    spawnHealingEffect(player.x, player.y - 50);
    updateHealthUI();
}

function activateShield() {
    playerAbilities.shield.active = true;
    playerAbilities.shield.timer = playerAbilities.shield.duration;
    updatePowerUpDisplay();
}

function updateAbilities(deltaTime) {
    for (const ability in playerAbilities) {
        if (playerAbilities[ability].active) {
            playerAbilities[ability].timer -= deltaTime;
            if (playerAbilities[ability].timer <= 0) {
                playerAbilities[ability].active = false;
                if (ability === 'rapidFire') {
                    shootInterval = 200; // Reset to default
                }
                updatePowerUpDisplay();
            }
        }
    }
}

function updatePowerUpDisplay() {
    powerUpDisplay.innerHTML = '';
    
    for (const ability in playerAbilities) {
        if (playerAbilities[ability].active) {
            const div = document.createElement('div');
            div.className = `power-up-icon power-up-${ability}`;
            
            let symbol = '⭐';
            switch(ability) {
                case 'doubleShot': symbol = '⚡'; break;
                case 'rapidFire': symbol = '🌀'; break;
                case 'healthBoost': symbol = '❤️'; break;
                case 'shield': symbol = '🛡️'; break;
            }
            
            const timer = document.createElement('div');
            timer.className = 'power-up-timer';
            timer.textContent = `${Math.ceil(playerAbilities[ability].timer / 1000)}s`;
            
            div.textContent = symbol;
            div.appendChild(timer);
            powerUpDisplay.appendChild(div);
        }
    }
}

function spawnHealingEffect(x, y) {
    for (let i = 0; i < 15; i++) {
        const particle = {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 6 - 2,
            life: 1.0,
            decay: 0.03,
            color: '#00ff00'
        };
        particles.push(particle);
    }
}

// --- Screen Management ---
function showLobby() {
    lobbyScreen.classList.remove('hidden');
    howToPlayScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameActive = false;
    loadData();
}

function showHowToPlay() {
    lobbyScreen.classList.add('hidden');
    howToPlayScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
}

function showGameOver() {
    lobbyScreen.classList.add('hidden');
    howToPlayScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    
    finalScoreEl.textContent = `Score: ${score}`;
    finalDronesShotEl.textContent = totalDronesShot - (totalDronesShot - score / 100); // Calculate this game's drones
    finalPowerUpsCollectedEl.textContent = powerUpsCollected;
    
    const isNewHighScore = checkAndUpdateHighScore();
    newHighScoreEl.classList.toggle('hidden', !isNewHighScore);
    
    // Update stats
    missionsPlayed++;
    saveData();
}

// --- Core Game Classes ---
class Player {
    constructor() {
        this.x = width / 2;
        this.y = height - 80;
        this.angle = -Math.PI / 2;
        this.hp = 100;
        this.maxHp = 100;
        this.lastShot = 0;
        this.cooldown = shootInterval;
        this.radius = 30;
        this.shieldActive = false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Shield effect
        if (playerAbilities.shield.active) {
            ctx.strokeStyle = '#00a8ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, -15, 40, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00a8ff';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Base
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-60, 0, 120, height - this.y);
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(-60, 0, 120, 10);

        // Body
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(15, 0);
        ctx.lineTo(8, -25);
        ctx.lineTo(-8, -25);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(0, -30, 10, 0, Math.PI * 2);
        ctx.fill();

        // Gun - rotate to aim
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-6, -55, 12, 35);
        
        ctx.restore();
    }

    takeDamage(amount) {
        // Shield blocks damage
        if (playerAbilities.shield.active) {
            spawnExplosion(this.x, this.y - 30, '#00a8ff', 5);
            return;
        }
        
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            endGame();
        }
        updateHealthUI();
        screenShake = 15;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        updateHealthUI();
    }
}

class Bullet {
    constructor(x, y, angle, offset = 0) {
        this.x = x + Math.cos(angle + Math.PI/2) * offset;
        this.y = y + Math.sin(angle + Math.PI/2) * offset;
        this.vx = Math.cos(angle) * 20;
        this.vy = Math.sin(angle) * 20;
        this.radius = 4;
        this.active = true;
        this.trail = [];
    }

    update() {
        // Store trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.active = false;
        }
    }

    draw() {
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, this.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw bullet
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffff00';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

class Enemy {
    constructor() {
        this.x = Math.random() * (width - 40) + 20;
        this.y = -30;
        this.radius = 18;
        this.speed = (1.5 + Math.random()) * difficulty;
        this.active = true;
        this.hp = 1;
        this.maxHp = 1;
        this.willDropPowerUp = Math.random() < 0.3; // 30% chance to drop power-up
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        this.angle = Math.atan2(dy, dx);
        
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        
        this.color = Math.random() > 0.5 ? '#ff4444' : '#ff8800';
        this.spin = 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.spin += 0.1;

        // Hit player
        if (this.y > player.y - 40 && Math.abs(this.x - player.x) < 60) {
            player.takeDamage(20);
            this.active = false;
            spawnExplosion(this.x, this.y, '#ff0000', 10);
        }
        
        // Hit ground
        if (this.y > height) {
            this.active = false;
            player.takeDamage(10);
        }
    }

    takeDamage() {
        this.hp--;
        if (this.hp <= 0) {
            this.active = false;
            score += 100;
            totalDronesShot++;
            scoreEl.textContent = "SCORE: " + score;
            spawnExplosion(this.x, this.y, this.color, 8);
            
            // Chance to drop power-up
            if (this.willDropPowerUp) {
                powerUps.push(new PowerUp(this.x, this.y));
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.spin);
        
        // Health bar for tougher enemies
        if (this.hp > 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-12, -20, 24, 4);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(-12, -20, 24 * (this.hp / this.maxHp), 4);
        }
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.rect(-10, -10, 20, 20);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, -15);
        ctx.lineTo(15, 15);
        ctx.moveTo(15, -15);
        ctx.lineTo(-15, 15);
        ctx.stroke();

        ctx.restore();
    }
}

// --- Helper Functions ---
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    if (player) {
        player.x = width / 2;
        player.y = height - 80;
    }
}

function spawnExplosion(x, y, color, count) {
    for(let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1.0,
            decay: 0.03 + Math.random() * 0.02,
            color: color
        });
    }
}

function updateHealthUI() {
    if (!player) return;
    const pct = (player.hp / player.maxHp) * 100;
    hpFill.style.width = `${pct}%`;
}

function checkAndUpdateHighScore() {
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        saveData();
        return true;
    }
    return false;
}

// --- Shooting System ---
function startShooting(x, y) {
    isShooting = true;
    aimX = x;
    aimY = y;
    aimIndicator.classList.remove('hidden');
    updateAimIndicator();
    shoot();
}

function stopShooting() {
    isShooting = false;
    aimIndicator.classList.add('hidden');
}

function updateAimIndicator() {
    aimIndicator.style.left = aimX + 'px';
    aimIndicator.style.top = aimY + 'px';
}

function updateShooting(deltaTime) {
    if (isShooting) {
        autoShootTimer += deltaTime;
        if (autoShootTimer >= shootInterval) {
            shoot();
            autoShootTimer = 0;
        }
    }
}

function shoot() {
    const now = Date.now();
    if (now - player.lastShot < shootInterval) return;

    const originX = player.x;
    const originY = player.y - 35;
    const dx = aimX - originX;
    const dy = aimY - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and limit distance for angle calculation
    const targetX = originX + (dx / Math.max(distance, 1)) * Math.min(distance, 300);
    const targetY = originY + (dy / Math.max(distance, 1)) * Math.min(distance, 300);
    
    const angle = Math.atan2(targetY - originY, targetX - originX);
    
    player.angle = angle;
    player.lastShot = now;

    const tipX = originX + Math.cos(angle) * 40;
    const tipY = originY + Math.sin(angle) * 40;

    // Single or double shot
    if (playerAbilities.doubleShot.active) {
        bullets.push(new Bullet(tipX, tipY, angle, -8));
        bullets.push(new Bullet(tipX, tipY, angle, 8));
    } else {
        bullets.push(new Bullet(tipX, tipY, angle));
    }
    
    spawnExplosion(tipX, tipY, '#ffff00', 3);
}

// --- Input Handling ---
function handleMouseDown(e) {
    if (!gameActive) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    startShooting(x, y);
    e.preventDefault();
}

function handleMouseMove(e) {
    if (!gameActive || !isShooting) return;
    
    const rect = canvas.getBoundingClientRect();
    aimX = e.clientX - rect.left;
    aimY = e.clientY - rect.top;
    
    updateAimIndicator();
}

function handleTouchStart(e) {
    if (!gameActive) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    startShooting(x, y);
    e.preventDefault();
}

function handleTouchMove(e) {
    if (!gameActive || !isShooting) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    aimX = touch.clientX - rect.left;
    aimY = touch.clientY - rect.top;
    
    updateAimIndicator();
    e.preventDefault();
}

// --- Game Flow ---
function initGame() {
    resize();
    player = new Player();
    bullets = [];
    enemies = [];
    powerUps = [];
    particles = [];
    score = 0;
    difficulty = 1;
    wave = 1;
    enemySpawnInterval = 1500;
    shootInterval = 200;
    powerUpsCollected = 0;
    
    // Reset abilities
    for (const ability in playerAbilities) {
        playerAbilities[ability].active = false;
        playerAbilities[ability].timer = 0;
    }
    
    scoreEl.textContent = "SCORE: 0";
    updateHealthUI();
    updatePowerUpDisplay();
    document.querySelector('.difficulty-display').textContent = `WAVE: ${wave}`;
    
    gameActive = true;
    lobbyScreen.classList.add('hidden');
    howToPlayScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    isShooting = false;
    aimIndicator.classList.add('hidden');
    
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false;
    showGameOver();
}

function gameLoop(timestamp) {
    if (!gameActive) return;
    
    const deltaTime = 16; // Assuming ~60fps
    
    // Update Logic
    updateAbilities(deltaTime);
    updateShooting(deltaTime);
    
    // Spawn enemies
    enemySpawnTimer += deltaTime;
    if (enemySpawnTimer > enemySpawnInterval) {
        enemies.push(new Enemy());
        enemySpawnTimer = 0;
        
        // Increase difficulty
        if (enemySpawnInterval > 600) enemySpawnInterval -= 20;
        difficulty += 0.02;
        
        // Update wave display every 10 seconds
        if (Math.floor(difficulty * 10) > wave) {
            wave = Math.floor(difficulty * 10);
            document.querySelector('.difficulty-display').textContent = `WAVE: ${wave}`;
        }
    }
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        if (!bullets[i].active) bullets.splice(i, 1);
    }
    
    // Update enemies and check collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update();
        
        // Check bullet collisions
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < enemy.radius + bullet.radius) {
                enemy.takeDamage();
                bullet.active = false;
                break;
            }
        }
        
        if (!enemy.active) enemies.splice(i, 1);
    }
    
    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].update();
        if (!powerUps[i].active) powerUps.splice(i, 1);
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= particle.decay;
        
        if (particle.life <= 0) particles.splice(i, 1);
    }
    
    // Rendering
    ctx.fillStyle = '#0d0d15';
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }
    
    // Background
    ctx.fillStyle = '#151525';
    for (let i = 0; i < width; i += 80) {
        const h = 60 + Math.sin(i * 0.02 + timestamp * 0.001) * 40;
        ctx.fillRect(i, height - h, 60, h);
    }
    
    // Draw particles
    particles.forEach(particle => {
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, 4, 4);
        ctx.globalAlpha = 1.0;
    });
    
    // Draw power-ups
    powerUps.forEach(powerUp => powerUp.draw());
    
    // Draw bullets
    bullets.forEach(bullet => bullet.draw());
    
    // Draw enemies
    enemies.forEach(enemy => enemy.draw());
    
    // Draw player
    player.draw();
    
    ctx.restore();
    
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initGame();
});

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initGame();
});

howToPlayBtn.addEventListener('click', () => {
    showHowToPlay();
});

backToLobbyBtn.addEventListener('click', () => {
    showLobby();
});

backToMenuBtn.addEventListener('click', () => {
    showLobby();
});

// Mouse controls
canvas.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', stopShooting);

// Touch controls
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', stopShooting);

window.addEventListener('resize', resize);

// Prevent context menu on long press
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// --- Initialize ---
resize();
showLobby();
loadData();