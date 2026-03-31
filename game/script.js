const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// Прямі посилання на твої файли в GitHub
const waiterImg = new Image();
waiterImg.src = 'https://raw.githubusercontent.com/Al1ennn/123/main/game/waiter_sprites.png';

const obstacleImg = new Image();
obstacleImg.src = 'https://raw.githubusercontent.com/Al1ennn/123/main/game/obstacles.png';

let imagesLoaded = 0;
function checkLoading() {
    imagesLoaded++;
    if (imagesLoaded === 2) {
        requestAnimationFrame(gameLoop);
    }
}
waiterImg.onload = checkLoading;
obstacleImg.onload = checkLoading;

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
    frameY: 0, // 0 - рух, 2 - стрибок (згідно з твоїм спрайт-лістом)
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
        location.reload(); // Перезавантаження сторінки для рестарту
    }
});

function createObstacle() {
    // Налаштування координат вирізання з твого файлу obstacles.png
    const types = [
        { sx: 20, sy: 550, sw: 130, sh: 70, w: 80, h: 45, name: 'puddle' }, // Калюжа
        { sx: 880, sy: 310, sw: 100, sh: 130, w: 55, h: 80, name: 'sign' },   // Жовтий знак
        { sx: 440, sy: 770, sw: 130, sh: 100, w: 70, h: 60, name: 'boxes' }  // Коробки
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
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ГРА ЗАКІНЧЕНА!', canvas.width/2, 180);
        ctx.font = '20px Arial';
        ctx.fillText(`Ваш результат: ${Math.floor(score/10)}м`, canvas.width/2, 220);
        ctx.fillText('Натисніть ENTER для рестарту', canvas.width/2, 260);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Малюємо підлогу (сіра лінія)
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(0, 340, canvas.width, 60);
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 340, canvas.width, 2);

    // Логіка стрибка та анімації гравця
    if (player.jump) {
        player.y += player.jumpV;
        player.jumpV += player.gravity;
        player.frameY = 2; // Перемикаємо на ряд зі стрибком
        if (player.y >= 240) {
            player.y = 240;
            player.jump = false;
        }
    } else {
        player.frameY = 0; // Ряд звичайного руху
        if (frameCount % 7 === 0) { // Швидкість зміни кадрів
            player.frameX = (player.frameX + 1) % 5; 
        }
    }

    // Малювання офіціантки
    // Вирізаємо кадр розміром ~170x175 з твого спрайт-ліста
    ctx.drawImage(waiterImg, 
        player.frameX * 171, player.frameY * 175, 171, 175, 
        player.x, player.y, player.width, player.height
    );

    // Генерація та рух перешкод
    if (frameCount % 100 === 0) createObstacle();
    frameCount++;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        o.x -= gameSpeed;

        // Малюємо перешкоду
        ctx.drawImage(obstacleImg, o.sx, o.sy, o.sw, o.sh, o.x, o.y, o.w, o.h);

        // Перевірка зіткнення (з невеликим відступом для точності)
        if (player.x + 30 < o.x + o.w && 
            player.x + player.width - 30 > o.x &&
            player.y + 20 < o.y + o.h && 
            player.y + player.height > o.y) {
            isGameOver = true;
        }

        // Видаляємо перешкоди, що вилетіли за екран
        if (o.x < -150) obstacles.splice(i, 1);
    }

    // Рахунок та прискорення
    score++;
    gameSpeed = 6 + Math.floor(score/1000);
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Дистанція: ${Math.floor(score/10)}м`, 20, 40);
    
    requestAnimationFrame(gameLoop);
}
