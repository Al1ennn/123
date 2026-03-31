const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// --- НАЛАШТУВАННЯ ПЕРСПЕКТИВИ ---
const FOV = 300; // Поле зору (Field of View) - наскільки сильно спотворюється простір
const CAMERA_Y = -100; // Висота камери над землею
const Z_LIMIT = 2000; // Як далеко ми бачимо перешкоди

// Зображення (використовуємо твою офіціантку з білим фоном)
const waiterImg = new Image();
waiterImg.src = './waiter_frame.png'; // Твоя картинка

// --- ОБ'ЄКТИ ГРИ ---
let score = 0;
let speed = 15; // Швидкість руху вперед
let isGameOver = false;

// Гравець
const player = {
    lane: 0, // -1 (ліва), 0 (центр), 1 (права)
    visualLane: 0, // Для плавного переходу між смугами
    y: 0, // Висота стрибка
    vy: 0,
    gravity: 1.5,
    jumpPower: -20,
    isGrounded: true,
    width: 80,
    height: 100
};

// Перешкоди
let obstacles = [];

// --- КЕРУВАННЯ ---
window.addEventListener('keydown', (e) => {
    if (isGameOver && e.code === 'Enter') {
        location.reload();
        return;
    }

    // Зміна смуги (Стрілки або A/D)
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > -1) {
        player.lane--;
    }
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < 1) {
        player.lane++;
    }

    // Стрибок (Стрілка Вгору, W або Пробіл)
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.isGrounded) {
        player.vy = player.jumpPower;
        player.isGrounded = false;
    }
});

// --- ФУНКЦІЯ ПРОЕКЦІЇ (Магія 3D в 2D) ---
// Перетворює 3D координати (x, y, z) у 2D координати екрана
function project(x, y, z) {
    // Якщо об'єкт за камерою, не малюємо
    if (z <= 0) return null; 

    const scale = FOV / z;
    const screenX = canvas.width / 2 + (x * scale);
    const screenY = canvas.height / 2 + ((y - CAMERA_Y) * scale);
    
    return { x: screenX, y: screenY, scale: scale };
}

// --- ГЕНЕРАЦІЯ ПЕРЕШКОД ---
function spawnObstacle() {
    const lanes = [-1, 0, 1];
    // Вибираємо випадкову смугу
    const randomLane = lanes[Math.floor(Math.random() * lanes.length)];
    
    obstacles.push({
        lane: randomLane,
        z: Z_LIMIT, // З'являється далеко на горизонті
        y: 0,       // На землі
        w: 60,      // Базова ширина
        h: 60       // Базова висота
    });
}

// --- ГОЛОВНИЙ ЦИКЛ ---
function gameLoop() {
    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '40px Arial';
        ctx.fillText('АВАРІЯ!', canvas.width / 2, 180);
        ctx.font = '20px Arial';
        ctx.fillText(`Рахунок: ${Math.floor(score)}`, canvas.width / 2, 220);
        ctx.fillText('Натисніть ENTER для рестарту', canvas.width / 2, 260);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Малюємо горизонт і землю
    ctx.fillStyle = '#2c3e50'; // Небо
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2 + 50);
    ctx.fillStyle = '#95a5a6'; // Підлога ресторану
    ctx.fillRect(0, canvas.height / 2 + 50, canvas.width, canvas.height);

    // Малюємо лінії смуг (перспектива)
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 2;
    for (let i = -1.5; i <= 1.5; i += 1) {
        const far = project(i * 150, 0, Z_LIMIT);
        const near = project(i * 150, 0, 10);
        if (far && near) {
            ctx.beginPath();
            ctx.moveTo(far.x, far.y);
            ctx.lineTo(near.x, near.y);
            ctx.stroke();
        }
    }

    // 2. Оновлюємо та малюємо перешкоди (від найдальших до найближчих - Z-сортування)
    if (Math.random() < 0.03) spawnObstacle();

    // Сортуємо масив, щоб спочатку малювати те, що далеко (алгоритм художника)
    obstacles.sort((a, b) => b.z - a.z);

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.z -= speed; // Перешкода летить на нас

        const proj = project(obs.lane * 150, obs.y, obs.z);

        if (proj) {
            const drawW = obs.w * proj.scale;
            const drawH = obs.h * proj.scale;
            const drawX = proj.x - drawW / 2;
            const drawY = proj.y - drawH; // Малюємо від низу (від землі)

            // Малюємо перешкоду (поки що це просто червоний блок-коробка)
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(drawX, drawY, drawW, drawH);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(drawX, drawY, drawW, drawH);

            // Перевірка зіткнення (якщо об'єкт дуже близько до камери (Z < 100) і на тій самій смузі)
            if (obs.z < 150 && obs.z > 50) {
                // Перевіряємо смугу (враховуємо плавний перехід)
                if (Math.abs(player.visualLane - obs.lane) < 0.5) {
                    // Перевіряємо висоту (чи не перестрибнули ми її)
                    if (player.y > -40) { // Якщо гравець нижче верхнього краю коробки
                        isGameOver = true;
                    }
                }
            }
        }

        // Видаляємо перешкоди, які пролетіли повз камеру
        if (obs.z < 0) obstacles.splice(i, 1);
    }

    // 3. Фізика гравця
    // Плавний перехід між смугами (Lerp)
    player.visualLane += (player.lane - player.visualLane) * 0.2;

    // Стрибок
    player.vy += player.gravity;
    player.y += player.vy;
    if (player.y >= 0) {
        player.y = 0;
        player.vy = 0;
        player.isGrounded = true;
    }

    // 4. Малюємо гравця (Офіціантка завжди знаходиться на фіксованій Z відстані перед камерою)
    const PLAYER_Z = 100; 
    const pProj = project(player.visualLane * 150, player.y, PLAYER_Z);
    
    if (pProj) {
        const drawW = player.width * pProj.scale;
        const drawH = player.height * pProj.scale;
        const drawX = pProj.x - drawW / 2;
        const drawY = pProj.y - drawH;

        // Малюємо картинку офіціантки
        try {
            ctx.drawImage(waiterImg, drawX, drawY, drawW, drawH);
        } catch (e) {
            // Якщо картинка ще не завантажилась, малюємо синій квадрат
            ctx.fillStyle = '#3498db';
            ctx.fillRect(drawX, drawY, drawW, drawH);
        }
    }

    score += 0.1;
    speed += 0.002; // Поступове прискорення

    // Інтерфейс
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Дистанція: ${Math.floor(score)}`, 20, 40);

    requestAnimationFrame(gameLoop);
}

// Чекаємо завантаження картинки, щоб не було багів з промальовкою
waiterImg.onload = () => {
    requestAnimationFrame(gameLoop);
};
