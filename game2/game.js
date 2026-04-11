const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.querySelector('#score span');
const winScreen = document.getElementById('win-screen');
// Встановлюємо розмір canvas
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Створюємо копію карти, щоб можна було змінювати її в грі
let gameMap = INITIAL_MAP.map(row => [...row]);
let gameActive = true;

let totalCoins = 0;
for (let r = 0; r < MAP_HEIGHT; r++) {
    for (let c = 0; c < MAP_WIDTH; c++) {
        if (gameMap[r][c] === 0) totalCoins++;
    }
}
// Стан офіціанта
const waiter = {
    x: TILE_SIZE * 1.5, // Початкова позиція в координатах canvas
    y: TILE_SIZE * 1.5,
    size: TILE_SIZE * 0.8, // Трохи менше плитки, щоб легше проходити
    score: 0
};

function drawMap() {
    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) {
            let tile = gameMap[r][c];
            let x = c * TILE_SIZE;
            let y = r * TILE_SIZE;

            if (tile === 1) { // Стіна (столик)
                ctx.fillStyle = '#333'; // Темно-сірий плейсхолдер
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#f0f'; // Неоновий маджента для межі
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            } else if (tile === 0) { // Гроші
                ctx.fillStyle = '#ff0'; // Жовтий плейсхолдер грошей
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawWaiter() {
    let currentImage;

    // Вибираємо правильну картинку зі списку sprites
    if (waiter.dir === 'up') {
        currentImage = sprites.up; // Для руху вгору у нас одна картинка
    } else if (waiter.dir === 'down') {
        currentImage = sprites.down; // Для руху вниз (до нас) у нас одна картинка
    } else if (waiter.dir === 'left') {
        // Якщо їде - беремо картинку ходьби, якщо відпустили кнопку - стоїть
        currentImage = waiter.isMoving ? sprites.leftWalk : sprites.leftStand;
    } else if (waiter.dir === 'right') {
        // Те саме для правої сторони
        currentImage = waiter.isMoving ? sprites.rightWalk : sprites.rightStand;
    }

    // Перевіряємо, чи встигла картинка завантажитись з комп'ютера
    if (currentImage && currentImage.complete && currentImage.naturalWidth !== 0) {
        // Малюємо вибрану картинку цілком (без вирізання)
        ctx.drawImage(
            currentImage,
            waiter.x - waiter.size / 2, 
            waiter.y - waiter.size / 2, 
            waiter.size, 
            waiter.size
        );
    } else {
        // Заглушка, якщо ти неправильно вказав назву файлу, або він ще вантажиться
        ctx.fillStyle = '#0f0';
        ctx.fillRect(waiter.x - waiter.size / 2, waiter.y - waiter.size / 2, waiter.size, waiter.size);
    }
}
function moveWaiter() {
    let nextX = waiter.x;
    let nextY = waiter.y;

    // За замовчуванням вважаємо, що він стоїть
    waiter.isMoving = false; 

    // Якщо натиснута кнопка - змінюємо координати, напрямок і ставимо isMoving = true
    if (controls.up) { nextY -= WAITER_SPEED; waiter.dir = 'up'; waiter.isMoving = true; }
    if (controls.down) { nextY += WAITER_SPEED; waiter.dir = 'down'; waiter.isMoving = true; }
    if (controls.left) { nextX -= WAITER_SPEED; waiter.dir = 'left'; waiter.isMoving = true; }
    if (controls.right) { nextX += WAITER_SPEED; waiter.dir = 'right'; waiter.isMoving = true; }

    if (!isCollision(nextX, waiter.y, waiter.size)) waiter.x = nextX;
    if (!isCollision(waiter.x, nextY, waiter.size)) waiter.y = nextY;
}

    // Роздільна перевірка зіткнень (щоб офіціант міг ковзати вздовж стін)
    // Перевіряємо рух по горизонталі (X)
    if (!isCollision(nextX, waiter.y)) {
        waiter.x = nextX;
    }
    
    // Перевіряємо рух по вертикалі (Y)
    if (!isCollision(waiter.x, nextY)) {
        waiter.y = nextY;
    }
}
// Завантажуємо всі окремі картинки в один зручний об'єкт
const sprites = {
    up: new Image(),
    down: new Image(),
    leftStand: new Image(),
    leftWalk: new Image(),
    rightStand: new Image(),
    rightWalk: new Image()
};

// ВПИШИ ТУТ СВОЇ РЕАЛЬНІ НАЗВИ ФАЙЛІВ!
sprites.up.src = 'walk_up.webp';          // йде прямо (від нас)
sprites.down.src = 'look_down.webp';      // дивиться до нас (назад)
sprites.leftStand.src = 'stand_left.webp';// просто стоїть вліво
sprites.leftWalk.src = 'walk_left.webp';  // йде наліво
sprites.rightStand.src = 'stand_right.webp';// просто стоїть вправо
sprites.rightWalk.src = 'walk_right.webp';// йде направо

// Оновлюємо стан офіціанта (додаємо статус "чи рухається він зараз")
const waiter = {
    x: TILE_SIZE * 1.5,
    y: TILE_SIZE * 1.5,
    size: TILE_SIZE * 0.8,
    score: 0,
    dir: 'right', // Напрямок
    isMoving: false // Нова змінна: чи натиснута зараз кнопка?
};
// Функція перевірки зіткнення
function isCollision(x, y) {
    // Радіус для перевірки зіткнень, щоб офіціант не чіплявся краєм
    const collisionRadius = waiter.size / 2;
    
    // Перевіряємо 4 точки навколо офіціанта
    const pointsToTest = [
        { x: x - collisionRadius, y: y - collisionRadius },
        { x: x + collisionRadius, y: y - collisionRadius },
        { x: x - collisionRadius, y: y + collisionRadius },
        { x: x + collisionRadius, y: y + collisionRadius }
    ];

    for (let point of pointsToTest) {
        let gridX = Math.floor(point.x / TILE_SIZE);
        let gridY = Math.floor(point.y / TILE_SIZE);

        // Перевіряємо межі карти
        if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) return true;
        // Перевіряємо стіну
        if (gameMap[gridY][gridX] === 1) return true;
    }
    return false;
}

function collectMoney() {
    let gridX = Math.floor(waiter.x / TILE_SIZE);
    let gridY = Math.floor(waiter.y / TILE_SIZE);

    // Перевірка, щоб офіціант не вийшов за межі масиву
    if (gridY >= 0 && gridY < MAP_HEIGHT && gridX >= 0 && gridX < MAP_WIDTH) {
        if (gameMap[gridY][gridX] === 0) {
            gameMap[gridY][gridX] = 2; 
            waiter.score += 1; 
            scoreSpan.innerText = waiter.score; 

            // ПЕРЕВІРКА НА ПЕРЕМОГУ
            if (waiter.score === totalCoins) {
                gameActive = false; // Зупиняємо гру
                winScreen.style.display = 'flex'; // Показуємо екран перемоги
            }
        }
    }
}

// Основний ігровий цикл
function gameLoop() {
    // Якщо гра закінчилася (gameActive === false), просто припиняємо малювати нові кадри
    if (!gameActive) return; 

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    moveWaiter();
    collectMoney();
    
    drawMap();
    drawWaiter();
    
    requestAnimationFrame(gameLoop);
}

// Запуск
gameLoop();
