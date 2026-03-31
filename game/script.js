const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// --- НАЛАШТУВАННЯ 3D КАМЕРИ ---
const FOV = 250; // Поле зору (ширше = більше спотворення)
const CAMERA_Y = -120; // Камера дивиться трохи зверху
const HORIZON_Y = canvas.height / 2; // Лінія горизонту
const Z_LIMIT = 2000; // Дальність промальовки

// --- СТАН ГРИ ---
let score = 0;
let baseSpeed = 15; // Початкова швидкість світу
let speedMultiplier = 1;
let isGameOver = false;
let isPaused = false;
let animationId;

// --- ОБ'ЄКТ ГРАВЦЯ ---
// Гравець завжди знаходиться на фіксованій Z-координаті (перед камерою)
const PLAYER_Z = 150; 
const player = {
    lane: 0,           // -1 (Ліва), 0 (Центр), 1 (Права)
    visualLane: 0,     // Для плавного руху (Lerp)
    y: 0,              // Висота (0 = на землі, мінус = у повітрі)
    vy: 0,             // Вертикальна швидкість
    gravity: 1.8,
    jumpPower: -22,
    
    // Розміри
    baseWidth: 60,
    baseHeight: 100,
    currentHeight: 100, // Змінюється при присіданні
    
    // Стани
    isGrounded: true,
    isRolling: false,
    rollTimer: 0
};

// --- МАСИВ ПЕРЕШКОД ---
let obstacles = [];

// --- КЕРУВАННЯ ---
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

    // Рух вліво/вправо
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > -1) {
        player.lane--;
    }
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < 1) {
        player.lane++;
    }

    // Стрибок
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.isGrounded && !player.isRolling) {
        player.vy = player.jumpPower;
        player.isGrounded = false;
    }

    // Перекат (Присідання)
    if ((e.code === 'ArrowDown' || e.code === 'KeyS') && player.isGrounded && !player.isRolling) {
        player.isRolling = true;
        player.currentHeight = 40; // Гравець стає "низьким"
        player.rollTimer = 30; // Скільки кадрів триває перекат
    }
});

// --- ФУНКЦІЯ 3D-ПРОЕКЦІЇ ---
// Перетворює світові X, Y, Z у координати Canvas X, Y та Масштаб
function project(x, y, z) {
    if (z <= 0) return null; // Об'єкт за камерою
    
    const scale = FOV / z;
    const projX = canvas.width / 2 + (x * scale);
    const projY = HORIZON_Y + ((y - CAMERA_Y) * scale);
    
    return { x: projX, y: projY, scale: scale };
}

// --- СТВОРЕННЯ ПЕРЕШКОД ---
function spawnObstacle() {
    const lanes = [-1, 0, 1];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    
    // Три типи перешкод
    const types = [
        // 1. Низька (Треба стрибати). Наприклад: бар'єр.
        { type: 'low', y: 0, w: 70, h: 50, color: '#e74c3c' },
        
        // 2. Висока (Треба присідати). Наприклад: арка, знак на ніжці.
        // Малюється високо над землею (y: -80)
        { type: 'high', y: -80, w: 70, h: 40, color: '#f1c40f' },
        
        // 3. Стіна (Треба об'їжджати).
        { type: 'wall', y: 0, w: 70, h: 120, color: '#34495e' }
    ];

    const obsType = types[Math.floor(Math.random() * types.length)];

    obstacles.push({
        lane: lane,
        z: Z_LIMIT, // Спавн на горизонті
        y: obsType.y,
        w: obsType.w,
        h: obsType.h,
        type: obsType.type,
        color: obsType.color
    });
}

function resetGame() {
    score = 0;
    speedMultiplier = 1;
    obstacles = [];
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

// --- ГОЛОВНИЙ ЦИКЛ ГРИ ---
function updateAndDraw() {
    if (isGameOver || isPaused) {
        if (isGameOver) drawGameOver();
        if (isPaused) drawPause();
        requestAnimationFrame(updateAndDraw);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- 1. ОНОВЛЕННЯ ФІЗИКИ ---
    
    // Прискорення гри
    speedMultiplier += 0.0005;
    const currentSpeed = baseSpeed * speedMultiplier;
    score += currentSpeed * 0.01;

    // Плавний рух гравця (Lerp)
    player.visualLane += (player.lane - player.visualLane) * 0.2;

    // Гравітація та стрибок
    if (!player.isGrounded) {
        player.vy += player.gravity;
        player.y += player.vy;
        
        if (player.y >= 0) { // Торкання землі
            player.y = 0;
            player.vy = 0;
            player.isGrounded = true;
        }
    }

    // Логіка перекату
    if (player.isRolling) {
        player.rollTimer--;
        if (player.rollTimer <= 0) {
            player.isRolling = false;
            player.currentHeight = player.baseHeight; // Повертаємо нормальний зріст
        }
    }

    // Спавн перешкод
    // Чим більша швидкість, тим рідше вони мають з'являтися (щоб не накладалися)
    const spawnRate = 40 - (speedMultiplier * 5); 
    if (Math.random() * 100 < 2) { 
        // Запобігаємо спавну двох перешкод надто близько
        if (obstacles.length === 0 || obstacles[obstacles.length-1].z < Z_LIMIT - 300) {
            spawnObstacle();
        }
    }

    // --- 2. МАЛЮВАННЯ СВІТУ (3D) ---
    
    // Небо
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, HORIZON_Y);
    
    // Підлога
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(0, HORIZON_Y, canvas.width, canvas.height - HORIZON_Y);

    // Смуги (Лінії перспективи)
    ctx.strokeStyle = '#ecf0f1';
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

    // --- 3. МАЛЮВАННЯ ТА КОЛІЗІЯ ПЕРЕШКОД ---
    
    // Сортуємо по Z (щоб дальні малювалися першими)
    obstacles.sort((a, b) => b.z - a.z);

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.z -= currentSpeed; // Рух на гравця

        const proj = project(obs.lane * 150, obs.y, obs.z);

        if (proj) {
            const drawW = obs.w * proj.scale;
            const drawH = obs.h * proj.scale;
            const drawX = proj.x - drawW / 2;
            const drawY = proj.y - drawH; // Малюємо вгору від землі

            // Малюємо перешкоду (прямокутник)
            ctx.fillStyle = obs.color;
            ctx.fillRect(drawX, drawY, drawW, drawH);
            
            // Малюємо "ніжки" для високих перешкод (наприклад, знак)
            if (obs.type === 'high') {
                 ctx.fillStyle = 'black';
                 ctx.fillRect(proj.x - 2, proj.y, 4, -obs.y * proj.scale); // Стовпчик до землі
            }

            // --- 4. 3D КОЛІЗІЯ (Найважливіша частина) ---
            // 1. Перевірка глибини Z: Чи об'єкт в зоні гравця?
            // Товщина перешкоди умовно 40 одиниць. Гравець на Z = 150.
            if (obs.z < PLAYER_Z + 20 && obs.z > PLAYER_Z - 40) {
                
                // 2. Перевірка смуги X: (допускаємо невелике відхилення при зміні смуги)
                if (Math.abs(player.visualLane - obs.lane) < 0.6) {
                    
                    // 3. Перевірка висоти Y: (Різні типи = різна логіка вбивства)
                    
                    if (obs.type === 'low') {
                        // Якщо гравець не підстрибнув вище перешкоди
                        if (player.y > -obs.h) isGameOver = true;
                    } 
                    else if (obs.type === 'high') {
                        // Якщо гравець не пригнувся (або підстрибнув прямо в неї)
                        // player.y (0) - player.currentHeight (100) = верхівка гравця
                        const playerTop = player.y - player.currentHeight;
                        const obsBottom = obs.y; // -80
                        
                        // Якщо голова гравця вище, ніж низ перешкоди
                        if (playerTop < obsBottom) isGameOver = true;
                    }
                    else if (obs.type === 'wall') {
                        // Стіна б'є завжди, якщо ти на цій смузі
                        isGameOver = true;
                    }
                }
            }
        }

        // Видалення сміття
        if (obs.z < 0) obstacles.splice(i, 1);
    }

    // --- 5. МАЛЮВАННЯ ГРАВЦЯ ---
    const pProj = project(player.visualLane * 150, player.y, PLAYER_Z);
    if (pProj) {
        const drawW = player.baseWidth * pProj.scale;
        const drawH = player.currentHeight * pProj.scale; // Змінюється при присіданні
        const drawX = pProj.x - drawW / 2;
        const drawY = pProj.y - drawH;

        // Малюємо гравця (синій блок)
        ctx.fillStyle = '#3498db';
        ctx.fillRect(drawX, drawY, drawW, drawH);
        
        // Малюємо "обличчя", щоб розуміти, куди він дивиться (і щоб бачити, як він присідає)
        ctx.fillStyle = 'white';
        ctx.fillRect(drawX + drawW * 0.2, drawY + drawH * 0.1, drawW * 0.6, drawH * 0.2);
    }

    // --- UI ---
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Рахунок: ${Math.floor(score)}`, 20, 40);
    ctx.fillText(`Швидкість: ${Math.floor(currentSpeed)}`, 20, 70);

    requestAnimationFrame(updateAndDraw);
}

// Функції екранів
function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = '50px Arial';
    ctx.fillText('ГРА ЗАКІНЧЕНА', canvas.width/2, 200);
    ctx.font = '20px Arial';
    ctx.fillText(`Ваш рахунок: ${Math.floor(score)}`, canvas.width/2, 240);
    ctx.fillText('Натисніть ENTER для рестарту', canvas.width/2, 280);
}

function drawPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = '50px Arial';
    ctx.fillText('ПАУЗА', canvas.width/2, 200);
    ctx.font = '20px Arial';
    ctx.fillText('Натисніть ESC щоб продовжити', canvas.width/2, 240);
}

// Запуск
resetGame();
updateAndDraw();
