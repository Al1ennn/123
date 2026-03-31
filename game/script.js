const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// ==========================================
// 1. НАЛАШТУВАННЯ ТА ПОСИЛАННЯ НА КАРТИНКИ
// ==========================================

// ВСТАВ СЮДИ СВОЇ ПОСИЛАННЯ З GITHUB!
const ASSET_URLS = {
    // 7 кадрів бігу
    run: [
        'ПОСИЛАННЯ_НА_RUN_0.png', 
        'ПОСИЛАННЯ_НА_RUN_1.png',
        'ПОСИЛАННЯ_НА_RUN_2.png',
        'ПОСИЛАННЯ_НА_RUN_3.png',
        'ПОСИЛАННЯ_НА_RUN_4.png',
        'ПОСИЛАННЯ_НА_RUN_5.png',
        'ПОСИЛАННЯ_НА_RUN_6.png'
    ],
    // 6 кадрів стрибка
    jump: [
        'ПОСИЛАННЯ_НА_JUMP_0.png',
        'ПОСИЛАННЯ_НА_JUMP_1.png',
        'ПОСИЛАННЯ_НА_JUMP_2.png',
        'ПОСИЛАННЯ_НА_JUMP_3.png',
        'ПОСИЛАННЯ_НА_JUMP_4.png',
        'ПОСИЛАННЯ_НА_JUMP_5.png'
    ],
    // Перешкоди (якщо є картинки, встав посилання. Якщо немає - залиш порожнім або старими)
    obstacles: {
        low: 'puddle.png', // Калюжа
        high: 'sign.png',  // Знак
        wall: 'boxes.png'  // Коробки
    }
};

const WHITE_THRESHOLD = 235; // Налаштування видалення фону (255 - ідеально білий)

// ==========================================
// 2. СИСТЕМА ЗАВАНТАЖЕННЯ ТА ОЧИЩЕННЯ (ХРОМАКЕЙ)
// ==========================================

async function loadAndCleanImage(url) {
    return new Promise((resolve, reject) => {
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
            
            // Видаляємо білий фон
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > WHITE_THRESHOLD && data[i+1] > WHITE_THRESHOLD && data[i+2] > WHITE_THRESHOLD) {
                    data[i + 3] = 0; // Прозорість
                }
            }
            tCtx.putImageData(imgData, 0, 0);
            resolve(tempCanvas);
        };
        img.onerror = () => {
            console.warn(`Не вдалося завантажити картинку: ${url}`);
            resolve(null); // Якщо помилка, повертаємо null, щоб гра не впала
        };
    });
}

const Assets = {
    run: [],
    jump: [],
    obstacles: {},

    async init() {
        // Показуємо екран завантаження
        console.log("Завантаження та очищення картинок...");
        
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
// 3. НАЛАШТУВАННЯ 3D СВІТУ ТА СТАНУ
// ==========================================

const FOV = 250; 
const CAMERA_Y = -120; 
const HORIZON_Y = canvas.height / 2; 
const Z_LIMIT = 2000; 
const PLAYER_Z = 150; 

let score = 0;
let baseSpeed = 15; 
let speedMultiplier = 1;
let isGameOver = false;
let isPaused = false;
let obstaclesArray = [];

// ==========================================
// 4. ОБ'ЄКТ ГРАВЦЯ З АНІМАЦІЄЮ
// ==========================================

const player = {
    lane: 0,           
    visualLane: 0,     
    y: 0,              
    vy: 0,             
    gravity: 1.8,
    jumpPower: -22,
    
    baseWidth: 100, 
    baseHeight: 120,
    currentHeight: 120, 
    
    isGrounded: true,
    isRolling: false,
    rollTimer: 0,

    // Система анімації
    animState: 'run', // 'run' або 'jump'
    frameIndex: 0,
    animTimer: 0,
    animSpeed: 4, // Зміна кадру кожні 4 тіки (швидкість бігу)

    update() {
        // Фізика стрибка
        if (!this.isGrounded) {
            this.vy += this.gravity;
            this.y += this.vy;
            if (this.y >= 0) { 
                this.y = 0;
                this.vy = 0;
                this.isGrounded = true;
                this.animState = 'run'; // Повернулась на землю
                this.frameIndex = 0;
            } else {
                this.animState = 'jump';
            }
        }

        // Логіка перекату (присідання)
        if (this.isRolling) {
            this.rollTimer--;
            if (this.rollTimer <= 0) {
                this.isRolling = false;
                this.currentHeight = this.baseHeight; 
            }
        }

        // Анімація (перемикання кадрів)
        this.animTimer++;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer = 0;
            const currentArray = Assets[this.animState];
            if (currentArray && currentArray.length > 0) {
                // Зациклення анімації
                this.frameIndex = (this.frameIndex + 1) % currentArray.length;
            }
        }
    },

    draw(proj) {
        const drawW = this.baseWidth * proj.scale;
        const drawH = this.currentHeight * proj.scale; // Змінюється при присіданні
        const drawX = proj.x - drawW / 2;
        const drawY = proj.y - drawH;

        const currentArray = Assets[this.animState];
        if (currentArray && currentArray.length > 0) {
            // Малюємо поточний кадр з масиву
            const currentImg = currentArray[this.frameIndex];
            ctx.drawImage(currentImg, drawX, drawY, drawW, drawH);
        } else {
            // Заглушка, якщо картинки ще не завантажились
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

    // Зміна смуги
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > -1) player.lane--;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < 1) player.lane++;

    // Стрибок
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.isGrounded && !player.isRolling) {
        player.vy = player.jumpPower;
        player.isGrounded = false;
        player.frameIndex = 0; // Скидаємо анімацію стрибка на перший кадр
    }

    // Перекат (Присідання)
    if ((e.code === 'ArrowDown' || e.code === 'KeyS') && player.isGrounded && !player.isRolling) {
        player.isRolling = true;
        player.currentHeight = 60; // Стискаємо гравця візуально
        player.rollTimer = 35; 
    }
});

// ==========================================
// 6. ЛОГІКА СВІТУ ТА ПЕРЕШКОД
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
        if (isGameOver) drawGameOver();
        if (isPaused) drawPause();
        requestAnimationFrame(updateAndDraw);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Логіка швидкості та рахунку
    speedMultiplier += 0.0003;
    const currentSpeed = baseSpeed * speedMultiplier;
    score += currentSpeed * 0.01;

    // Оновлення гравця
    player.visualLane += (player.lane - player.visualLane) * 0.2;
    player.update();

    // Спавн перешкод
    if (Math.random() * 100 < 2.5) { 
        if (obstaclesArray.length === 0 || obstaclesArray[obstaclesArray.length-1].z < Z_LIMIT - 350) {
            spawnObstacle();
        }
    }

    // --- МАЛЮВАННЯ ФОНУ ТА СМУГ ---
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, canvas.width, HORIZON_Y); // Небо
    ctx.fillStyle = '#95a5a6'; ctx.fillRect(0, HORIZON_Y, canvas.width, canvas.height - HORIZON_Y); // Підлога

    ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2;
    for (let i = -1.5; i <= 1.5; i += 1) {
        const far = project(i * 150, 0, Z_LIMIT);
        const near = project(i * 150, 0, 10);
        if (far && near) {
            ctx.beginPath(); ctx.moveTo(far.x, far.y); ctx.lineTo(near.x, near.y); ctx.stroke();
        }
    }

    // --- МАЛЮВАННЯ ПЕРЕШКОД ТА КОЛІЗІЯ ---
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

            // Якщо картинка є - малюємо її, якщо ні - кольоровий блок
            if (obs.img) {
                ctx.drawImage(obs.img, drawX, drawY, drawW, drawH);
            } else {
                ctx.fillStyle = obs.color;
                ctx.fillRect(drawX, drawY, drawW, drawH);
            }

            // Малюємо ніжку для високого знаку
            if (obs.type === 'high') {
                 ctx.fillStyle = '#2c3e50';
                 ctx.fillRect(proj.x - 2, proj.y, 4, -obs.y * proj.scale); 
            }

            // Колізія (тільки коли об'єкт близько до гравця)
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

    // --- UI ---
    ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Рахунок: ${Math.floor(score)}`, 20, 40);

    requestAnimationFrame(updateAndDraw);
}

// Екрани
function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle = '#e74c3c'; ctx.textAlign = 'center'; ctx.font = 'bold 55px Arial';
    ctx.fillText('АВАРІЯ!', canvas.width/2, 190);
    ctx.fillStyle = 'white'; ctx.font = '24px Arial';
    ctx.fillText(`Ваш рахунок: ${Math.floor(score)}`, canvas.width/2, 240);
    ctx.fillText('Натисніть ENTER для рестарту', canvas.width/2, 280);
}

function drawPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 50px Arial';
    ctx.fillText('ПАУЗА', canvas.width/2, 200);
}

// ==========================================
// 8. СТАРТ ГРИ
// ==========================================

// Спочатку завантажуємо і чистимо всі картинки, потім запускаємо цикл
Assets.init().then(() => {
    resetGame();
    updateAndDraw();
});
