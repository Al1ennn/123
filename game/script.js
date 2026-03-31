const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Налаштування екрану
canvas.width = 800;
canvas.height = 400;

// Завантаження зображень (ЗАМІНИ НАЗВИ НА СВОЇ ФАЙЛИ)
const waiterImg = new Image();
waiterImg.src = 'waiter_sprites.png'; // Твій спрайт-ліст офіціанта

const obstacleImg = new Image();
obstacleImg.src = 'obstacles.png'; // Твій спрайт-ліст перешкод

// Змінні гри
let score = 0;
let gameSpeed = 5;
let isGameOver = false;

const player = {
    x: 50,
    y: 280,
    width: 64,
    height: 64,
    frameX: 0,
    frameY: 0, // Ряд анімації
    moving: false,
    jump: false,
    jumpVelocity: 0,
    gravity: 0.8
};

const obstacles = [];

// Керування
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !player.jump) {
        player.jump = true;
        player.jumpVelocity = -15;
    }
});

function createObstacle() {
    const types = [
        { name: 'puddle', sx: 10, sy: 130, sw: 60, sh: 40 }, // Калюжа
        { name: 'table', sx: 10, sy: 10, sw: 100, sh: 80 }   // Столик
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    
    obstacles.push({
        x: canvas.width,
        y: 320 - (type.sh / 2),
        ...type
    });
}

function handleObstacles() {
    if (Math.random() < 0.02) createObstacle();

    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].x -= gameSpeed;

        // Малювання перешкоди
        ctx.drawImage(obstacleImg, 
            obstacles[i].sx, obstacles[i].sy, obstacles[i].sw, obstacles[i].sh,
            obstacles[i].x, obstacles[i].y, obstacles[i].sw, obstacles[i].sh
        );

        // Перевірка зіткнення
        if (player.x < obstacles[i].x + obstacles[i].sw &&
            player.x + player.width > obstacles[i].x &&
            player.y < obstacles[i].y + obstacles[i].sh &&
            player.y + player.height > obstacles[i].y) {
                isGameOver = true;
        }

        // Видалення зайвих перешкод
        if (obstacles[i].x < -100) obstacles.splice(i, 1);
    }
}

function animatePlayer() {
    // Фізика стрибка
    if (player.jump) {
        player.y += player.jumpVelocity;
        player.jumpVelocity += player.gravity;
        player.frameY = 2; // Ряд стрибка
        
        if (player.y >= 280) {
            player.y = 280;
            player.jump = false;
            player.frameY = 0; // Повернення до бігу
        }
    }

    // Анімація кадрів
    if (Date.now() % 100 < 50) { // Швидка зміна кадрів
        player.frameX = (player.frameX + 1) % 6;
    }

    ctx.drawImage(waiterImg,
        player.frameX * 64, player.frameY * 64, 64, 64,
        player.x, player.y, player.width, player.height
    );
}

function gameLoop() {
    if (isGameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.fillText('ГРА ЗАКІНЧЕНА', 250, 200);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Малюємо підлогу (лінія)
    ctx.beginPath();
    ctx.moveTo(0, 344);
    ctx.lineTo(canvas.width, 344);
    ctx.stroke();

    handleObstacles();
    animatePlayer();

    score++;
    document.getElementById('score').innerText = `Дистанція: ${Math.floor(score/10)}м`;
    
    requestAnimationFrame(gameLoop);
}

// Запуск гри
gameLoop();
