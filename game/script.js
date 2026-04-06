const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// ==========================================
// 1. АСЕТИ (ТОЧНІ НАЗВИ З ТВОГО GITHUB)
// ==========================================
const ASSET_URLS = {
    // 8 кадрів бігу (формат .webp)
    run: [
        'waiter_run_0.webp', 'waiter_run_1.webp', 'waiter_run_2.webp', 'waiter_run_3.webp',
        'waiter_run_4.webp', 'waiter_run_5.webp', 'waiter_run_6.webp', 'waiter_run_7.webp'
    ],
    // 6 кадрів стрибка (формат .jpg)
    jump: [
        'waiter_jump_0.jpg', 'waiter_jump_1.jpg', 'waiter_jump_2.jpg',
        'waiter_jump_3.jpg', 'waiter_jump_4.jpg', 'waiter_jump_5.jpg'
    ],
    obstacles: {
        low: 'puddle.png', // Якщо цих картинок ще немає, будуть малюватися кольорові квадрати
        high: 'sign.png',  
        wall: 'boxes.png'  
    }
};

const WHITE_THRESHOLD = 210; // Налаштування видалення фону (менше число видаляє більше бруду)

// ==========================================
// 2. СИСТЕМА ЗАВАНТАЖЕННЯ (З ХРОМАКЕЄМ)
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
            
            // Видаляємо білий/світлий фон (особливо актуально для твоїх .jpg)
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > WHITE_THRESHOLD && data[i+1] > WHITE_THRESHOLD && data[i+2] > WHITE_THRESHOLD) {
                    data[i + 3] = 0; // Робимо піксель прозорим
                }
            }
            tCtx.putImageData(imgData, 0, 0);
            resolve(tempCanvas);
        };
        img.onerror = () => {
            console.error(`Помилка! Не знайдено: ${url}`);
            resolve(null); // Повертаємо null, щоб гра не впала через 1 файл
        };
    });
}

const Assets = {
    run: [],
    jump: [],
    obstacles: {},

    async init() {
        console.log("Завантаження асетів...");
        for (let url of ASSET_URLS.run) {
            const img = await loadAndCleanImage(url);
            if (img) this.run.push(img);
        }
        for (let url of ASSET_URLS.jump) {
            const img = await loadAndCleanImage(url);
            if (img) this.jump.push(img);
        }
        this.obstacles.low = await loadAndCleanImage(ASSET_URLS.obstacles.low);
        this.obstacles.high = await loadAndCleanImage(ASSET_URLS.obstacles.high);
        this.obstacles.wall = await loadAndCleanImage(ASSET_URLS.obstacles.wall);
        console.log("Всі картинки готові!");
    }
};

// ==========================================
// 3. НАЛАШТУВАННЯ 3D СВІТУ
// ==========================================
const FOV = 250; 
const CAMERA_Y = -120; 
const HORIZON_Y = 200; 
const Z_LIMIT = 2000; 
const PLAYER_Z = 150; 

let score = 0;
// ЗМЕНШЕНО ШВИДКІСТЬ ДЛЯ КОМФОРТУ
let baseSpeed = 10; // Було 15
let speedMultiplier = 1;
let isGameOver = false;
let isPaused = false;
let obstaclesArray = [];

// ==========================================
// 4. ОБ'ЄКТ ГРАВЦЯ (З АНІМАЦІЄЮ МАСИВІВ)
// ==========================================
const player = {
    lane: 0,           // -1 (ліва), 0 (центр), 1 (права)
    visualLane: 0,     // Для плавного переходу
    y: 0,              
    vy: 0,             
    gravity: 1.8,
    jumpPower: -22,
    
    baseWidth: 70,  
    baseHeight: 90, 
    currentHeight: 90, 
    
    isGrounded: true,
    isRolling: false,
    rollTimer: 0,

    // Система анімації
    animState: 'run', // 'run' або 'jump'
    frameIndex: 0,
    animTimer: 0,
    animSpeed: 6, // ЗБІЛЬШЕНО ЧИСЛО ДЛЯ ПОВІЛЬНІШОЇ АНІМАЦІЇ НІГ (було 4)

    update() {
        // Фізика стрибка
        if (!this.isGrounded) {
            this.vy += this.gravity;
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

        // Логіка присідання (перекату)
        if (this.isRolling) {
            this.rollTimer--;
            if (this.rollTimer <= 0) {
                this.isRolling = false;
                this.currentHeight = this.baseHeight; 
            }
        }

        // Перемикання кадрів анімації
        this.animTimer++;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer = 0;
            const currentArray = Assets[this.animState];
            if (currentArray && currentArray.length > 0) {
                this.frameIndex = (this.frameIndex + 1) % currentArray.length;
            }
        }
    },

    draw(proj) {
        const drawW = this.baseWidth * proj.scale;
        const drawH = this.currentHeight * proj.scale;
        const drawX = proj.x - drawW / 2;
        const drawY = proj.y - drawH;

        const currentArray = Assets[this.animState];
        if (currentArray && currentArray.length > 0) {
            // Захист від помилок індексу під час перемикання станів
            if (this.frameIndex >= currentArray.length) {
                this.frameIndex = 0;
            }
            const currentImg = currentArray[this.frameIndex];
            ctx.drawImage(currentImg, drawX, drawY, drawW, drawH);
        } else {
            // Заглушка, якщо картинки ще вантажаться
            ctx.fillStyle = '#3498db';
            ctx.fillRect(drawX, drawY, drawW, drawH);
        }
    }
};

// ==========================================
// 5. КЕРУВАННЯ
// ==========================================
window.addEventListener('keydown', (e) => {
    if (isGameOver && e.code === 'Enter') {
        resetGame();
        return;
    }
    if (e.code === 'Escape') {
        isPaused = !isPaused;
        return;
    }
    if (isPaused || isGameOver) return;

    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > -1) player.lane--;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < 1) player.lane++;

    // Стрибок
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.isGrounded && !player.isRolling) {
        player.vy = player.jumpPower;
        player.isGrounded = false;
        player.frameIndex = 0; // Скидаємо на перший кадр стрибка
    }

    // Присідання (Ковзання під перешкодою)
    if ((e.code === 'ArrowDown' || e.code === 'KeyS') && player.isGrounded && !player.isRolling) {
        player.isRolling = true;
        player.currentHeight = 50; 
        player.rollTimer = 35; 
    }
});

// ==========================================
// 6. МАТЕМАТИКА 3D ТА ПЕРЕШКОДИ
// ==========================================
function project(x, y, z) {
    if (z <= 0) return null; 
    const scale = FOV / z;
    return { 
        x: canvas.width / 2 + (x * scale), 
        y: HORIZON_Y + ((y - CAMERA_Y) * scale), 
        scale: scale 
    };
}

function spawnObstacle() {
    const lanes = [-1, 0, 1];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    
    const types = [
        { type: 'low', y: 0, w: 80, h: 40, img: Assets.obstacles.low, color: '#e74c3c' },
        { type: 'high', y: -90, w: 60, h: 80, img: Assets.obstacles.high, color: '#f1c40f' },
        { type: 'wall', y: 0, w: 90, h: 100, img: Assets.obstacles.wall, color: '#34495e' }
    ];

    const obsType = types[Math.floor(Math.random() * types.length)];

    obstaclesArray.push({
        lane: lane, z: Z_LIMIT, y: obsType.y, w: obsType.w, h: obsType.h,
        type: obsType.type, img: obsType.img, color: obsType.color
    });
}

function resetGame() {
    score = 0;
    speedMultiplier = 1;
    obstaclesArray = [];
    player.lane = 0;
    player.visualLane = 0;
    player.y = 0;
    player.vy = 0;
    player.isGrounded = true;
    player.isRolling = false;
    player.currentHeight = player.baseHeight;
    isGameOver = false;
    isPaused = false;
}

// ==========================================
// 7. ГОЛОВНИЙ ЦИКЛ ГРИ
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
        requestAnimationFrame(updateAndDraw);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ЗМЕНШЕНО ПРИСКОРЕННЯ З ЧАСОМ (було 0.0003)
    speedMultiplier += 0.00015;
    const currentSpeed = baseSpeed * speedMultiplier;
    score += currentSpeed * 0.01;

    // Оновлення гравця з ПЛАВНИМ ПЕРЕХОДОМ (було 0.2, стало 0.08)
    player.visualLane += (player.lane - player.visualLane) * 0.08; 
    player.update();

    // Спавн перешкод
    if (Math.random() * 100 < 2.5) { 
        if (obstaclesArray.length === 0 || obstaclesArray[obstaclesArray.length-1].z < Z_LIMIT - 350) {
            spawnObstacle();
        }
    }

    // --- МАЛЮВАННЯ ФОНУ ---
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, canvas.width, HORIZON_Y); // Небо
    ctx.fillStyle = '#95a5a6'; ctx.fillRect(0, HORIZON_Y, canvas.width, canvas.height - HORIZON_Y); // Підлога

    // Смуги
    ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2;
    for (let i = -1.5; i <= 1.5; i += 1) {
        const far = project(i * 150, 0, Z_LIMIT);
        const near = project(i * 150, 0, 10);
        if (far && near) {
            ctx.beginPath(); ctx.moveTo(far.x, far.y); ctx.lineTo(near.x, near.y); ctx.stroke();
        }
    }

    // --- МАЛЮВАННЯ ПЕРЕШКОД ---
    obstaclesArray.sort((a, b) => b.z - a.z);

    for (let i = obstaclesArray.length - 1; i >= 0; i--) {
        let obs = obstaclesArray[i];
        obs.z -= currentSpeed; 

        const proj = project(obs.lane * 150, obs.y, obs.z);

        if (proj) {
            const drawW = obs.w * proj.scale;
            const drawH = obs.h * proj.scale;
            const drawX = proj.x - drawW / 2;
            const drawY = proj.y - drawH; 

            if (obs.img) {
                ctx.drawImage(obs.img, drawX, drawY, drawW, drawH);
            } else {
                ctx.fillStyle = obs.color;
                ctx.fillRect(drawX, drawY, drawW, drawH);
            }

            // Колізія у 3D просторі
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

    // --- МАЛЮВАННЯ ГРАВЦЯ ---
    const pProj = project(player.visualLane * 150, player.y, PLAYER_Z);
    if (pProj) {
        player.draw(pProj);
    }

    // --- UI (Інтерфейс) ---
    ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Рахунок: ${Math.floor(score)}`, 20, 40);

    requestAnimationFrame(updateAndDraw);
}

// ==========================================
// 8. СТАРТ ГРИ
// ==========================================
Assets.init().then(() => {
    resetGame();
    updateAndDraw();
});
