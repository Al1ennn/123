const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Встановлюємо фіксований розмір Canvas, незалежно від CSS
canvas.width = 800;
canvas.height = 400;

// ==========================================
// 1. КОНФІГУРАЦІЯ АСЕТІВ (Нові .webp файли)
// Переконайся, що ці файли лежать у тій же папці!
// ==========================================
const ASSETS_CONFIG = {
    // Твій спрайт-ліст з офіціантом (image_24.png, перейменований на waiter.webp)
    waiterSrc: './waiter.webp', 
    // Твоє зображення з перешкодами (перейменоване на obstacles.webp)
    obstacleSrc: './obstacles.webp', 
    // Налаштування для хромакею (видалення блакитного фону)
    chromaKeyColor: { r: 0, g: 191, b: 255 }, // Яскраво-блакитний з image_24.png
    chromaKeyTolerance: 70 // Допуск для відтінків
};

const gameImages = { waiter: null, obstacles: null };

// --- ФУНКЦІЯ ДЛЯ ЗАВАНТАЖЕННЯ І ОЧИЩЕННЯ ФОНУ (Chroma Key) ---
async function loadAndProcessImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // ВАЖЛИВО: crossOrigin потрібен, якщо картинки вантажаться з іншого домену
        // Наприклад, з GitHub Pages, коли тестуєш локально.
        img.crossOrigin = "Anonymous"; 
        img.src = url;
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            tempCtx.drawImage(img, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            
            const target = ASSETS_CONFIG.chromaKeyColor;
            const tolerance = ASSETS_CONFIG.chromaKeyTolerance;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                
                // Проста перевірка на схожість кольору (Euclidean distance з допусками)
                const rDiff = Math.abs(r - target.r);
                const gDiff = Math.abs(g - target.g);
                const bDiff = Math.abs(b - target.b);
                
                if (rDiff < tolerance && gDiff < tolerance && bDiff < tolerance) {
                    data[i + 3] = 0; // Робимо піксель прозорим
                }
            }
            tempCtx.putImageData(imageData, 0, 0);
            resolve(tempCanvas);
        };
        img.onerror = () => reject(new Error(`Не вдалося завантажити: ${url}`));
    });
}

// Спочатку завантажуємо асети, потім запускаємо гру
async function initGame() {
    try {
        console.log("Завантаження асетів...");
        gameImages.waiter = await loadAndProcessImage(ASSETS_CONFIG.waiterSrc);
        gameImages.obstacles = await loadAndProcessImage(ASSETS_CONFIG.obstacleSrc);
        console.log("Асети завантажено, фон очищено.");
        
        // Ховаємо екран завантаження (якщо є) і запускаємо ігровий цикл
        document.getElementById('loadingScreen').classList.add('hidden');
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error("Помилка ініціалізації гри:", error);
        alert("Ой! Не вдалося завантажити гру. Перевір консоль (F12).");
    }
}

// ==========================================
// 2. ОБ'ЄКТИ ГРИ ТА ЛОГІКА
// ==========================================
let score = 0;
let gameSpeed = 6;
let isGameOver = false;
let frames = 0;

// Параметри офіціанта (Хлопець)
const player = {
    x: 80,
    y: 240, // Початкова позиція (на землі)
    w: 80,  // Розмір, який малюємо на екрані
    h: 100,
    
    // ПАРАМЕТРИ АНІМАЦІЇ (під твій новий спрайт-ліст 2х4)
    spriteW: 80, // Ширина одного кадру в original_image_24.png (приблизно)
    spriteH: 100,// Висота одного кадру
    totalFrames: 8,
    frameIndex: 0,
    animSpeed: 6, // Зміна кадру кожні 6 ігрових кадрів (frames)

    // Фізика
    vy: 0,
    gravity: 0.8,
    jumpPower: -16,
    isGrounded: true,
    
    // Хітбокс для колізій (зміщений, щоб не рахувати порожній простір)
    hitbox: { offsetX: 20, offsetY: 10, w: 40, h: 85 },

    update() {
        // Фізика стрибка
        this.vy += this.gravity;
        this.y += this.vy;

        if (this.y >= 240) { // Торкання землі
            this.y = 240;
            this.isGrounded = true;
            this.vy = 0;
        }

        // Логіка анімації (біг/прокат)
        if (this.isGrounded) {
            // Лише коли на землі, крутимо анімацію
            if (frames % this.animSpeed === 0) {
                this.frameIndex = (this.frameIndex + 1) % this.totalFrames;
            }
        } else {
            // У повітрі показуємо один кадр, наприклад, Кадр 4 ( Extension/Glide Start)
            // або Кадр 7 (Recovery Start). Давай виберемо 3 (4-й кадр).
            this.frameIndex = 3; 
        }
    },

    draw() {
        // Вирізаємо потрібний кадр зі спрайт-ліста (2 ряди, 4 колонки)
        const col = this.frameIndex % 4;
        const row = Math.floor(this.frameIndex / 4);
        
        const sx = col * this.spriteW;
        const sy = row * this.spriteH;

        ctx.drawImage(
            gameImages.waiter, // Спрайт-ліст (оброблене полотно)
            sx, sy, this.spriteW, this.spriteH, // Кропінг
            this.x, this.y, this.w, this.h // Малювання на Canvas
        );
        
        // Відладка: намалювати хітбокс
        // ctx.strokeStyle = 'red';
        // ctx.strokeRect(this.x + this.hitbox.offsetX, this.y + this.hitbox.offsetY, this.hitbox.w, this.hitbox.h);
    }
};

const obstacles = [];
let lastObstacleX = 0;

// --- КЕРУВАННЯ (Пробіл для стрибка) ---
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isGameOver) {
            // Швидкий рестарт
            isGameOver = false;
            score = 0;
            gameSpeed = 6;
            obstacles.length = 0;
            player.y = 240;
            player.frameIndex = 0;
            requestAnimationFrame(gameLoop);
            return;
        }
        if (player.isGrounded) {
            player.vy = player.jumpPower;
            player.isGrounded = false;
        }
    }
});

function spawnObstacle() {
    // Чесна відстань між перешкодами, щоб можна було перестрибнути
    if (canvas.width - lastObstacleX < 400) return;

    // Типи перешкод з твого obstacles.webp (кропінг та хітбокси)
    // ВСТАВ СЮДИ ТОЧНІ КООРДИНАТИ ТА ХІТБОКСИ ДЛЯ ТВОЇХ ПЕРЕШКОД
    const types = [
        // Приклад: Калюжа (низька перешкода)
        { sx: 0, sy: 0, sw: 128, sh: 64, w: 80, h: 40, hitbox: {ox: 10, oy: 20, w: 60, h: 20} },
        // Приклад: Столик (вища перешкода)
        { sx: 128, sy: 0, sw: 96, sh: 128, w: 60, h: 80, hitbox: {ox: 15, oy: 10, w: 30, h: 70} }
    ];
    
    // Тимчасова заглушка, якщо немає obstacles.webp: просто кольоровий квадрат
    const usePlaceholder = !gameImages.obstacles || gameImages.obstacles.width === 0;

    const t = types[Math.floor(Math.random() * types.length)];
    const obstacleY = 340 - (usePlaceholder ? 50 : t.h); // 340 - рівень підлоги

    obstacles.push({
        x: canvas.width,
        y: obstacleY,
        ...t,
        usePlaceholder: usePlaceholder // Зберігаємо стан для малювання
    });
}

// --- ІГРОВИЙ ЦИКЛ ---
function gameLoop() {
    if (isGameOver) {
        // Екран Game Over
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px Arial';
        ctx.fillText('АВАРІЯ!', canvas.width/2, 180);
        ctx.font = '20px Arial';
        ctx.fillText(`Рахунок: ${Math.floor(score/10)} метрів`, canvas.width/2, 220);
        ctx.fillText('Натисніть ПРОБІЛ для рестарту', canvas.width/2, 260);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Малюємо підлогу
    ctx.fillStyle = '#f1c40f'; // Неоново-жовта підлога кафе
    ctx.fillRect(0, 340, canvas.width, 60);

    // Оновлення та малювання гравця
    player.update();
    player.draw();

    // Генерація та рух перешкод
    // Спавнимо кожні 90 кадрів з ймовірністю 60%, якщо гравець на землі
    if (frames % 90 === 0 && Math.random() < 0.6 && player.isGrounded) {
        spawnObstacle();
    }
    if (obstacles.length > 0) {
        lastObstacleX = obstacles[obstacles.length - 1].x;
    } else {
        lastObstacleX = 0;
    }

    // Перебираємо перешкоди з кінця масиву, щоб безпечно видаляти
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        o.x -= gameSpeed;

        if (o.usePlaceholder) {
            // Малюємо тимчасову заглушку (кольоровий квадрат)
            ctx.fillStyle = '#e74c3c'; // Червоний
            ctx.fillRect(o.x, o.y, 50, 50);
        } else {
            // Малюємо картинку перешкоди
            ctx.drawImage(
                gameImages.obstacles,
                o.sx, o.sy, o.sw, o.sh,
                o.x, o.y, o.w, o.h
            );
        }
        
        // Відладка: намалювати хітбокс перешкоди
        // ctx.strokeStyle = 'blue';
        // if (o.usePlaceholder) ctx.strokeRect(o.x, o.y, 50, 50);
        // else ctx.strokeRect(o.x + o.hitbox.ox, o.y + o.hitbox.oy, o.hitbox.w, o.hitbox.h);

        // --- ПЕРЕВІРКА ЗІТКНЕННЯ (AABB) ---
        const pBox = {
            x: player.x + player.hitbox.offsetX,
            y: player.y + player.hitbox.offsetY,
            w: player.hitbox.w,
            h: player.hitbox.h
        };
        // Використовуємо спрощений хітбокс для заглушки
        const oBox = o.usePlaceholder ? {
            x: o.x, y: o.y, w: 50, h: 50
        } : {
            x: o.x + o.hitbox.ox,
            y: o.y + o.hitbox.oy,
            w: o.hitbox.w,
            h: o.hitbox.h
        };

        if (pBox.x < oBox.x + oBox.w && 
            pBox.x + pBox.w > oBox.x &&
            pBox.y < oBox.y + oBox.h && 
            pBox.y + pBox.h > oBox.y) {
            isGameOver = true;
        }

        // Видаляємо перешкоди, які пролетіли повз екран
        if (o.x < -150) obstacles.splice(i, 1);
    }

    // Збільшуємо рахунок та швидкість
    score++;
    gameSpeed = 6 + (score / 1500); // Поступове прискорення
    
    // UI
    document.getElementById('scoreValue').innerText = Math.floor(score/10);
    
    frames++;
    requestAnimationFrame(gameLoop);
}

initGame(); // Починаємо ініціалізацію
