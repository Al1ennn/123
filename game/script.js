const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// --- НАЛАШТУВАННЯ ---
const DEBUG_MODE = false; // Зміни на true, щоб побачити зелені/червоні "хітбокси" зіткнень!
const PINK_BG = { r: 255, g: 0, b: 255 }; // Колір, який видаляємо

const waiterSrc = 'https://raw.githubusercontent.com/Al1ennn/123/main/game/waiter_sprites.png';
const obstacleSrc = 'https://raw.githubusercontent.com/Al1ennn/123/main/game/obstacles.png';

let sprites = { waiter: null, obstacles: null };

// --- 1. СИСТЕМА ВИДАЛЕННЯ ФОНУ ---
async function loadAndCleanImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Важливо для роботи з пікселями через GitHub
        img.src = url;
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const tCtx = tempCanvas.getContext('2d');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            tCtx.drawImage(img, 0, 0);
            
            const imgData = tCtx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                // Якщо піксель дуже близький до яскраво-рожевого - робимо прозорим
                if (data[i] > 240 && data[i+1] < 20 && data[i+2] > 240) {
                    data[i + 3] = 0; // Альфа-канал = 0
                }
            }
            tCtx.putImageData(imgData, 0, 0);
            resolve(tempCanvas); // Повертаємо canvas замість картинки, він малюється так само швидко
        };
    });
}

// Ініціалізація гри
async function initGame() {
    sprites.waiter = await loadAndCleanImage(waiterSrc);
    sprites.obstacles = await loadAndCleanImage(obstacleSrc);
    requestAnimationFrame(gameLoop);
}

// --- 2. ОБ'ЄКТИ ГРИ ---
let score = 0;
let gameSpeed = 7;
let isGameOver = false;
let frames = 0;

const player = {
    x: 80,
    y: 240,
    w: 100, // Розмір малювання
    h: 100,
    // Хітбокс: зміщення відносно координат x, y. Це реальний розмір тіла для зіткнень.
    hitbox: { offsetX: 35, offsetY: 20, w: 40, h: 75 },
    
    frameX: 0,
    frameY: 0,
    jumpV: 0,
    gravity: 1.2,    // Сильніша гравітація - швидше падає
    jumpPower: -18,  // Сильніший початковий ривок
    isGrounded: true,
    spaceHeld: false // Для адаптивного стрибка
};

const obstacles = [];
let lastObstacleX = 0; // Зберігаємо позицію останньої перешкоди

// --- 3. КЕРУВАННЯ ---
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isGameOver) {
            location.reload();
            return;
        }
        player.spaceHeld = true;
        if (player.isGrounded) {
            player.jumpV = player.jumpPower;
            player.isGrounded = false;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        player.spaceHeld = false;
        // Якщо відпустили пробіл раніше - стрибок стає коротшим (зрізаємо швидкість)
        if (player.jumpV < -6) {
            player.jumpV = -6; 
        }
    }
});

// --- 4. ЛОГІКА ПЕРЕШКОД ---
function spawnObstacle() {
    // Мінімальна відстань між перешкодами, щоб можна було приземлитися
    const minDistance = 400 + (Math.random() * 200); 
    
    if (canvas.width - lastObstacleX < minDistance) return;

    const types = [
        // Координати з твого спрайту (sx, sy, sw, sh) + розміри в грі (w, h) + їхні хітбокси
        { sx: 20, sy: 550, sw: 130, sh: 70, w: 90, h: 50, hitbox: {ox: 10, oy: 25, w: 70, h: 25} }, // Калюжа
        { sx: 880, sy: 310, sw: 100, sh: 130, w: 60, h: 80, hitbox: {ox: 15, oy: 10, w: 30, h: 70} }, // Знак
        { sx: 440, sy: 770, sw: 130, sh: 100, w: 80, h: 65, hitbox: {ox: 10, oy: 15, w: 60, h: 50} }  // Коробки
    ];
    
    const t = types[Math.floor(Math.random() * types.length)];
    obstacles.push({
        x: canvas.width,
        y: 340 - t.h,
        ...t
    });
}

// --- 5. ІГРОВИЙ ЦИКЛ ---
function gameLoop() {
    if (isGameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px Arial';
        ctx.fillText('АВАРІЯ!', canvas.width/2, 170);
        ctx.font = '20px Arial';
        ctx.fillText(`Доставлено на: ${Math.floor(score/10)} метрів`, canvas.width/2, 220);
        ctx.fillText('Натисніть ПРОБІЛ для рестарту', canvas.width/2, 260);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Малюємо підлогу
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(0, 340, canvas.width, 60);
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 340, canvas.width, 3);

    // --- ФІЗИКА ГРАВЦЯ ---
    player.jumpV += player.gravity; // Гравітація тягне вниз постійно
    player.y += player.jumpV;

    if (player.y >= 240) { // Торкання землі
        player.y = 240;
        player.isGrounded = true;
        player.jumpV = 0;
        player.frameY = 0; // Анімація їзди
        if (frames % 6 === 0) player.frameX = (player.frameX + 1) % 5;
    } else {
        player.frameY = 2; // Анімація стрибка
        player.frameX = 0; // Зафіксувати один кадр у повітрі
    }

    // Малювання гравця
    ctx.drawImage(sprites.waiter, 
        player.frameX * 171, player.frameY * 175, 171, 175, 
        player.x, player.y, player.w, player.h
    );

    // --- ПЕРЕШКОДИ ТА КОЛІЗІЇ ---
    if (frames % 60 === 0 && Math.random() < 0.6) spawnObstacle();

    // Оновлюємо позицію останньої перешкоди (для логіки спавну)
    if (obstacles.length > 0) {
        lastObstacleX = obstacles[obstacles.length - 1].x;
    } else {
        lastObstacleX = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        o.x -= gameSpeed;

        ctx.drawImage(sprites.obstacles, o.sx, o.sy, o.sw, o.sh, o.x, o.y, o.w, o.h);

        // -- ПЕРЕВІРКА ЗІТКНЕННЯ ПО ХІТБОКСАХ --
        const pBox = {
            x: player.x + player.hitbox.offsetX,
            y: player.y + player.hitbox.offsetY,
            w: player.hitbox.w,
            h: player.hitbox.h
        };
        const oBox = {
            x: o.x + o.hitbox.ox,
            y: o.y + o.hitbox.oy,
            w: o.hitbox.w,
            h: o.hitbox.h
        };

        // Дебаг-режим: малюємо хітбокси, щоб бачити, як гра рахує зіткнення
        if (DEBUG_MODE) {
            ctx.strokeStyle = 'lime';
            ctx.strokeRect(pBox.x, pBox.y, pBox.w, pBox.h); // Хітбокс гравця
            ctx.strokeStyle = 'red';
            ctx.strokeRect(oBox.x, oBox.y, oBox.w, oBox.h); // Хітбокс перешкоди
        }

        // Логіка перетину двох прямокутників (AABB Collision)
        if (pBox.x < oBox.x + oBox.w && 
            pBox.x + pBox.w > oBox.x &&
            pBox.y < oBox.y + oBox.h && 
            pBox.y + pBox.h > oBox.y) {
            isGameOver = true;
        }

        if (o.x < -150) obstacles.splice(i, 1);
    }

    // Рахунок та поступове ускладнення
    score++;
    gameSpeed = 7 + (score / 1500); // Збільшуємо швидкість повільніше, але база вища
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Дистанція: ${Math.floor(score/10)}м`, 20, 40);
    
    frames++;
    requestAnimationFrame(gameLoop);
}

// Стартуємо!
initGame();
