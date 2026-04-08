// ==========================================
// ФАЙЛ: script.js (Двигун гри)
// Цей файл ТІЛЬКИ керує логікою і бере всі цифри з GAME_CONFIG
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// Налаштування для видалення білого фону (особливо для твоїх .jpg стрибків)
const WHITE_THRESHOLD = 210; 

// ==========================================
// 1. СИСТЕМА ЗАВАНТАЖЕННЯ АСЕТІВ
// ==========================================
async function loadAndCleanImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        img.src = url;
        
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            tCtx.drawImage(img, 0, 0);
            
            const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imgData.data;
            
            // Хромакей: робимо білий фон прозорим
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > WHITE_THRESHOLD && data[i+1] > WHITE_THRESHOLD && data[i+2] > WHITE_THRESHOLD) {
                    data[i + 3] = 0; 
                }
            }
            tCtx.putImageData(imgData, 0, 0);
            resolve(tempCanvas);
        };
        img.onerror = () => {
            console.error(`Помилка! Не знайдено файл: ${url}`);
            resolve(null);
        };
    });
}

// Зберігаємо завантажені картинки
const Assets = {
    run: [], jump: [], obstacles: {},
    async init() {
        console.log("Завантаження асетів з GAME_CONFIG...");
        for (let url of GAME_CONFIG.assets.run) {
            const img = await loadAndCleanImage(url);
            if (img) this.run.push(img);
        }
        for (let url of GAME_CONFIG.assets.jump) {
            const img = await loadAndCleanImage(url);
            if (img) this.jump.push(img);
        }
        this.obstacles.low = await loadAndCleanImage(GAME_CONFIG.assets.obstacles.low);
        this.obstacles.high = await loadAndCleanImage(GAME_CONFIG.assets.obstacles.high);
        this.obstacles.wall = await loadAndCleanImage(GAME_CONFIG.assets.obstacles.wall);
        console.log("Всі картинки готові!");
    }
};

// ==========================================
// 2. СВІТ ТА ЗМІННІ
// ==========================================
const FOV = 250; 
const CAMERA_Y = -120; 
const HORIZON_Y = 200; 
const Z_LIMIT = 2000; 
const PLAYER_Z = 150; 

let score = 0;
let speedMultiplier = 1;
let isGameOver = false;
let isPaused = false;
let obstaclesArray = [];

// ==========================================
// 3. ОБ'ЄКТ ГРАВЦЯ
// ==========================================
const player = {
    lane: 0,           
    visualLane: 0,     
    y: 0,              
    vy: 0,             
    
    // Беремо розміри прямо з конфігу
    baseWidth: GAME_CONFIG.player.width,  
    baseHeight: GAME_CONFIG.player.height, 
    currentHeight: GAME_CONFIG.player.height, 
    
    isGrounded: true,
    isRolling: false,
    rollTimer: 0,

    animState: 'run', 
    frameIndex: 0,
    animTimer: 0,

    update() {
        // 3.1. Фізика стрибка
        if (!this.isGrounded) {
            this.vy += GAME_CONFIG.physics.gravity;
            this.y += this.vy;
            if (this.y >= 0) { 
                this.y = 0;
                this.vy = 0;
                this.isGrounded = true;
                this.animState = 'run';
                this.frameIndex = 0;
            } else {
                this.animState = 'jump';
            }
        }

        // 3.2. Логіка присідання
        if (this.isRolling) {
            this.rollTimer--;
            this.animState = 'roll';
            if (this.rollTimer <= 0) {
                this.isRolling = false;
                this.currentHeight = this.baseHeight; 
                if(this.isGrounded) this.animState = 'run';
            }
        }

        // 3.3. Плавний перехід між смугами
        this.visualLane += (this.lane - this.visualLane) * GAME_CONFIG.physics.laneSmoothness;

        // 3.4. Анімація
        const currentAnimConfig = GAME_CONFIG.animations[this.animState];
        this.animTimer++;
        if (this.animTimer >= currentAnimConfig.speed) {
            this.animTimer = 0;
            this.frameIndex++;
            if (this.frameIndex >= currentAnimConfig.frames.length) {
                this.frameIndex = 0; 
            }
        }
    },

    draw(proj) {
        const drawW = this.baseWidth * proj.scale;
        const drawH = this.currentHeight * proj.scale;
        const drawX = proj.x - drawW / 2;
        const drawY = proj.y - drawH;

        let actualFrameNumber = 0;
        const currentAnimConfig = GAME_CONFIG.animations[this.animState];
        
        if (currentAnimConfig && currentAnimConfig.frames[this.frameIndex] !== undefined) {
            actualFrameNumber = currentAnimConfig.frames[this.frameIndex];
        }

        // Для стрибка беремо картинки з масиву jump, для бігу та присідання - з run
        const spriteArray = (this.animState === 'jump') ? Assets.jump : Assets.run;
        
        if (spriteArray && spriteArray.length > 0) {
            const safeFrame = actualFrameNumber % spriteArray.length;
            const currentImg = spriteArray[safeFrame];
            if (currentImg) {
                ctx.drawImage(currentImg, drawX, drawY, drawW, drawH);
            }
        } else {
            // Заглушка, поки вантажаться картинки
            ctx.fillStyle = '#3498db';
            ctx.fillRect(drawX, drawY, drawW, drawH);
        }
    }
};

// ==========================================
// 4. КЕРУВАННЯ
// ==========================================
window.addEventListener('keydown', (e) => {
    if (isGameOver && e.code === 'Enter') { resetGame(); return; }
    if (e.code === 'Escape') { isPaused = !isPaused; return; }
    if (isPaused || isGameOver) return;

    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > -1) player.lane--;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < 1) player.lane++;

    // Стрибок
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.isGrounded && !player.isRolling) {
        player.vy = GAME_CONFIG.physics.jumpPower;
        player.isGrounded = false;
        player.frameIndex = 0; 
    }

    // Присідання
    if ((e.code === 'ArrowDown' || e.code === 'KeyS') && player.isGrounded && !player.isRolling) {
        player.isRolling = true;
        player.currentHeight = GAME_CONFIG.player.rollHeight; 
        player.rollTimer = GAME_CONFIG.player.rollDuration; 
        player.frameIndex = 0;
    }
});

function spawnObstacle() {
    const lanes = [-1, 0, 1];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const types = [
        { type: 'low', y: 0, w: 80, h: 40, img: Assets.obstacles.low, color: '#e74c3c' },
        { type: 'high', y: -90, w: 60, h: 80, img: Assets.obstacles.high, color: '#f1c40f' },
        { type: 'wall', y: 0, w: 90, h: 100, img: Assets.obstacles.wall, color: '#34495e' }
    ];
    const obsType = types[Math.floor(Math.random() * types.length)];
    obstaclesArray.push({ lane: lane, z: Z_LIMIT, y: obsType.y, w: obsType.w, h: obsType.h, type: obsType.type, img: obsType.img, color: obsType.color });
}

function project(x, y, z) {
    if (z <= 0) return null; 
    const scale = FOV / z;
    return { x: canvas.width / 2 + (x * scale), y: HORIZON_Y + ((y - CAMERA_Y) * scale), scale: scale };
}

function resetGame() {
    score = 0; speedMultiplier = 1; obstaclesArray = [];
    player.lane = 0; player.visualLane = 0; player.y = 0; player.vy = 0;
    player.isGrounded = true; player.isRolling = false; player.currentHeight = player.baseHeight;
    isGameOver = false; isPaused = false;
}

// ==========================================
// 5. ГОЛОВНИЙ ЦИКЛ ГРИ
// ==========================================
function updateAndDraw() {
    if (isGameOver || isPaused) {
        if (isGameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0, canvas.width, canvas.height);
            ctx.fillStyle = '#e74c3c'; ctx.textAlign = 'center'; ctx.font = 'bold 55px Arial';
            ctx.fillText('АВАРІЯ!', canvas.width/2, 190);
            ctx.fillStyle = 'white'; ctx.font = '24px Arial';
            ctx.fillText(`Рахунок: ${Math.floor(score)}`, canvas.width/2, 240);
            ctx.fillText('Натисніть ENTER для рестарту', canvas.width/2, 280);
        }
        if (isPaused) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0, canvas.width, canvas.height);
            ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 50px Arial';
            ctx.fillText('ПАУЗА', canvas.width/2, 200);
        }
        requestAnimationFrame(updateAndDraw); return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    speedMultiplier += GAME_CONFIG.physics.acceleration;
    const currentSpeed = GAME_CONFIG.physics.baseSpeed * speedMultiplier;
    score += currentSpeed * 0.01;

    player.update();

    if (Math.random() * 100 < 2.5) { 
        if (obstaclesArray.length === 0 || obstaclesArray[obstaclesArray.length-1].z < Z_LIMIT - 350) spawnObstacle();
    }

    // Небо і підлога
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, canvas.width, HORIZON_Y); 
    ctx.fillStyle = '#95a5a6'; ctx.fillRect(0, HORIZON_Y, canvas.width, canvas.height - HORIZON_Y); 

    // Смуги
    ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2;
    for (let i = -1.5; i <= 1.5; i += 1) {
        const far = project(i * 150, 0, Z_LIMIT);
        const near = project(i * 150, 0, 10);
        if (far && near) { ctx.beginPath(); ctx.moveTo(far.x, far.y); ctx.lineTo(near.x, near.y); ctx.stroke(); }
    }

    obstaclesArray.sort((a, b) => b.z - a.z);
    for (let i = obstaclesArray.length - 1; i >= 0; i--) {
        let obs = obstaclesArray[i];
        obs.z -= currentSpeed; 
        const proj = project(obs.lane * 150, obs.y, obs.z);

        if (proj) {
            const drawW = obs.w * proj.scale, drawH = obs.h * proj.scale;
            const drawX = proj.x - drawW / 2, drawY = proj.y - drawH; 

            if (obs.img) ctx.drawImage(obs.img, drawX, drawY, drawW, drawH);
            else { ctx.fillStyle = obs.color; ctx.fillRect(drawX, drawY, drawW, drawH); }

            if (obs.z < PLAYER_Z + 20 && obs.z > PLAYER_Z - 40) {
                if (Math.abs(player.visualLane - obs.lane) < 0.6) {
                    if (obs.type === 'low' && player.y > -obs.h) isGameOver = true;
                    else if (obs.type === 'high' && (player.y - player.currentHeight) < obs.y) isGameOver = true;
                    else if (obs.type === 'wall') isGameOver = true;
                }
            }
        }
        if (obs.z < 0) obstaclesArray.splice(i, 1);
    }

    const pProj = project(player.visualLane * 150, player.y, PLAYER_Z);
    if (pProj) player.draw(pProj);

    ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Рахунок: ${Math.floor(score)}`, 20, 40);

    requestAnimationFrame(updateAndDraw);
}

// ==========================================
// 6. СТАРТ ГРИ
// ==========================================
Assets.init().then(() => { resetGame(); updateAndDraw(); });
