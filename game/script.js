const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// Колір, який ми хочемо зробити прозорим (Hex: #FF00FF)
const CHROMA_KEY_COLOR = { r: 255, g: 0, b: 255 };

// Прямі посилання на GitHub
const waiterSrc = 'https://raw.githubusercontent.com/Al1ennn/123/main/game/waiter_sprites.png';
const obstacleSrc = 'https://raw.githubusercontent.com/Al1ennn/123/main/game/obstacles.png';

// Функція для завантаження картинки та видалення фону
function loadAndProcessImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            // Створюємо тимчасовий canvas для обробки
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            
            // Малюємо оригінал
            tempCtx.drawImage(img, 0, 0);
            
            // Отримуємо дані про пікселі
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            
            // Перебираємо пікселі (кожен піксель це 4 значення: RGBA)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Якщо колір збігається з Chroma Key, робимо альфа-канал (прозорість) = 0
                if (r === CHROMA_KEY_COLOR.r && g === CHROMA_KEY_COLOR.g && b === CHROMA_KEY_COLOR.b) {
                    data[i + 3] = 0; 
                }
            }
            
            // Записуємо оброблені дані назад
            tempCtx.putImageData(imageData, 0, 0);
            
            // Повертаємо оброблений canvas як джерело зображення
            resolve(tempCanvas);
        };
        img.onerror = reject;
    });
}

// Завантаження та запуск
Promise.all([
    loadAndProcessImage(waiterSrc),
    loadAndProcessImage(obstacleSrc)
]).then(([processedWaiter, processedObstacles]) => {
    // Зберігаємо оброблені версії
    images.waiter = processedWaiter;
    images.obstacles = processedObstacles;
    requestAnimationFrame(gameLoop);
}).catch(err => console.error("Помилка завантаження:", err));

const images = { waiter: null, obstacles: null };

// Параметри гри
let score = 0;
let gameSpeed = 6;
let isGameOver = false;
let frameCount = 0;

const player = {
    x: 80,
    y: 240,
    width: 100,
    height: 100,
    frameX: 0,
    frameY: 0, // Ряд бігу (згідно з твоїм спрайт-лістом)
    jump: false,
    jumpV: 0,
    gravity: 0.8
};

const obstacles = [];

// Керування
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !player.jump && !isGameOver) {
        player.jump = true;
        player.jumpV = -16;
    }
    if (e.code === 'Enter' && isGameOver) {
        location.reload(); 
    }
});

function createObstacle() {
    // Точні координати вирізання з твого obstacles.png
    const types = [
        { sx: 20, sy: 550, sw: 130, sh: 70, w: 80, h: 45 }, // Калюжа
        { sx: 880, sy: 310, sw: 100, sh: 130, w: 55, h: 80 }, // Знак
        { sx: 440, sy: 770, sw: 130, sh: 100, w: 70, h: 60 } // Коробки
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    
    obstacles.push({
        x: canvas.width + 100,
        y: 340 - t.h,
        ...t
    });
}

function gameLoop() {
    if (isGameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ГРА ЗАКІНЧЕНА!', canvas.width/2, 180);
        ctx.font = '20px Arial';
        ctx.fillText(`Результат: ${Math.floor(score/10)}м`, canvas.width/2, 220);
        ctx.fillText('Натисніть ENTER для рестарту', canvas.width/2, 260);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Малюємо підлогу
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(0, 340, canvas.width, 60);

    // Логіка гравця
    if (player.jump) {
        player.y += player.jumpV;
        player.jumpV += player.gravity;
        player.frameY = 2; // Ряд стрибка
        if (player.y >= 240) {
            player.y = 240;
            player.jump = false;
        }
    } else {
        player.frameY = 0; // Ряд бігу
        if (frameCount % 7 === 0) player.frameX = (player.frameX + 1) % 5; 
    }

    // Малювання офіціантки (тепер прозора!)
    // Використовуємо оброблений images.waiter
    ctx.drawImage(images.waiter, 
        player.frameX * 171, player.frameY * 175, 171, 175, 
        player.x, player.y, player.width, player.height
    );

    // Логіка перешкод
    if (frameCount % 100 === 0) createObstacle();
    frameCount++;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        o.x -= gameSpeed;

        // Малюємо перешкоду (тепер прозора!)
        // Використовуємо оброблений images.obstacles
        ctx.drawImage(images.obstacles, o.sx, o.sy, o.sw, o.sh, o.x, o.y, o.w, o.h);

        // Перевірка зіткнення
        if (player.x + 30 < o.x + o.w && 
            player.x + player.width - 30 > o.x &&
            player.y + 20 < o.y + o.h && 
            player.y + player.height > o.y) {
            isGameOver = true;
        }

        if (o.x < -150) obstacles.splice(i, 1);
    }

    score++;
    gameSpeed = 6 + Math.floor(score/1000);
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Дистанція: ${Math.floor(score/10)}м`, 20, 40);
    
    requestAnimationFrame(gameLoop);
}
