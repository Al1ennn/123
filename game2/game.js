// --- ЧИТАЄМО ТА РОЗБИРАЄМО JSON ---
const jsonText = document.getElementById('level-data').textContent;
const levelConfig = JSON.parse(jsonText); 

const TILE_SIZE = levelConfig.tileSize;
const WAITER_SPEED = levelConfig.waiterSpeed;
const ENEMY_SPEED = levelConfig.enemySpeed;
const INITIAL_MAP = levelConfig.map;

const MAP_WIDTH = INITIAL_MAP[0].length;
const MAP_HEIGHT = INITIAL_MAP.length;
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

// --- НАЛАШТУВАННЯ CANVAS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.querySelector('#score span');
const winScreen = document.getElementById('win-screen');
const loseScreen = document.getElementById('lose-screen');

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let gameMap = INITIAL_MAP.map(row => [...row]);
let gameActive = true;

let totalCoins = 0;
for (let r = 0; r < MAP_HEIGHT; r++) {
    for (let c = 0; c < MAP_WIDTH; c++) {
        if (gameMap[r][c] === 0) totalCoins++;
    }
}

// --- КАРТИНКИ ОФІЦІАНТА ---
const sprites = { up: new Image(), down: new Image(), left: new Image(), right: new Image() };

// ⚠️ ПЕРЕВІР, ЧИ ПРАВИЛЬНІ НАЗВИ ТВОЇХ ФАЙЛІВ ТУТ:
sprites.up.src = 'up.webp';       
sprites.down.src = 'down.webp';   
sprites.left.src = 'left.webp';   
sprites.right.src = 'right.webp'; 

const waiter = {
    x: TILE_SIZE * 1.5,
    y: TILE_SIZE * 1.5,
    size: TILE_SIZE * 1.2,
    score: 0,
    dir: 'right' 
};

// --- ВОРОГИ ---
const enemiesList = [
    { x: TILE_SIZE * 9.5, y: TILE_SIZE * 7.5, color: '#ff0000', dir: 'up', size: TILE_SIZE * 0.8, started: false },
    { x: TILE_SIZE * 10.5, y: TILE_SIZE * 7.5, color: '#ff8800', dir: 'left', size: TILE_SIZE * 0.8, started: false },
    { x: TILE_SIZE * 11.5, y: TILE_SIZE * 7.5, color: '#aa00ff', dir: 'right', size: TILE_SIZE * 0.8, started: false }
];

// --- МАЛЮВАННЯ КАРТИ ---
function drawMap() {
    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) {
            let tile = gameMap[r][c];
            let x = c * TILE_SIZE;
            let y = r * TILE_SIZE;

            if (tile === 1) { 
                ctx.fillStyle = '#1e003b'; // Суцільні стіни
                ctx.fillRect(x, y, TILE_SIZE + 1, TILE_SIZE + 1);
            } else if (tile === 0) { 
                ctx.fillStyle = '#ff0'; 
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.15, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawWaiter() {
    let currentImage;
    if (waiter.dir === 'up') currentImage = sprites.up;
    else if (waiter.dir === 'down') currentImage = sprites.down;
    else if (waiter.dir === 'left') currentImage = sprites.left;
    else if (waiter.dir === 'right') currentImage = sprites.right;

    if (currentImage && currentImage.complete && currentImage.naturalWidth !== 0) {
        ctx.drawImage(currentImage, waiter.x - waiter.size / 2, waiter.y - waiter.size / 2, waiter.size, waiter.size);
    } else {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(waiter.x - waiter.size / 2, waiter.y - waiter.size / 2, waiter.size, waiter.size);
    }
}

// Функція зіткнень (Тепер потрібна ТІЛЬКИ для гравця)
function isCollision(x, y) {
    const collisionRadius = (TILE_SIZE * 0.45) / 2; // Зменшений хітбокс гравця
    
    const pointsToTest = [
        { x: x - collisionRadius, y: y - collisionRadius }, { x: x + collisionRadius, y: y - collisionRadius },
        { x: x - collisionRadius, y: y + collisionRadius }, { x: x + collisionRadius, y: y + collisionRadius }
    ];

    for (let point of pointsToTest) {
        let gridX = Math.floor(point.x / TILE_SIZE);
        let gridY = Math.floor(point.y / TILE_SIZE);
        if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) return true;
        if (gameMap[gridY][gridX] === 1) return true;
    }
    return false;
}

// ПЛАВНИЙ РУХ ГРАВЦЯ
function moveWaiter() {
    let dx = 0;
    let dy = 0;

    if (controls.up) { dy = -WAITER_SPEED; waiter.dir = 'up'; }
    else if (controls.down) { dy = WAITER_SPEED; waiter.dir = 'down'; }
    else if (controls.left) { dx = -WAITER_SPEED; waiter.dir = 'left'; }
    else if (controls.right) { dx = WAITER_SPEED; waiter.dir = 'right'; }

    let centerX = Math.floor(waiter.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    let centerY = Math.floor(waiter.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const snapSpeed = WAITER_SPEED * 0.8;

    if (dx !== 0) {
        if (Math.abs(waiter.y - centerY) <= snapSpeed) waiter.y = centerY;
        else if (waiter.y < centerY) waiter.y += snapSpeed;
        else if (waiter.y > centerY) waiter.y -= snapSpeed;

        if (!isCollision(waiter.x + dx, waiter.y)) waiter.x += dx;
    }

    if (dy !== 0) {
        if (Math.abs(waiter.x - centerX) <= snapSpeed) waiter.x = centerX;
        else if (waiter.x < centerX) waiter.x += snapSpeed;
        else if (waiter.x > centerX) waiter.x -= snapSpeed;

        if (!isCollision(waiter.x, waiter.y + dy)) waiter.y += dy;
    }
}

function collectMoney() {
    let gridX = Math.floor(waiter.x / TILE_SIZE);
    let gridY = Math.floor(waiter.y / TILE_SIZE);

    if (gridY >= 0 && gridY < MAP_HEIGHT && gridX >= 0 && gridX < MAP_WIDTH) {
        if (gameMap[gridY][gridX] === 0) {
            gameMap[gridY][gridX] = 2; 
            waiter.score += 1; 
            scoreSpan.innerText = waiter.score; 

            if (waiter.score === totalCoins) {
                gameActive = false; 
                winScreen.style.display = 'flex'; 
            }
        }
    }
}

function drawEnemies() {
    for (let enemy of enemiesList) {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
    }
}

// ІДЕАЛЬНИЙ РУХ ВОРОГІВ (без застрягань)
function moveEnemies() {
    for (let enemy of enemiesList) {
        let gridX = Math.floor(enemy.x / TILE_SIZE);
        let gridY = Math.floor(enemy.y / TILE_SIZE);

        if (!enemy.started) {
            enemy.started = true;
            let validDirs = [];
            if (gridY > 0 && gameMap[gridY-1][gridX] !== 1) validDirs.push('up');
            if (gridY < MAP_HEIGHT-1 && gameMap[gridY+1][gridX] !== 1) validDirs.push('down');
            if (gridX > 0 && gameMap[gridY][gridX-1] !== 1) validDirs.push('left');
            if (gridX < MAP_WIDTH-1 && gameMap[gridY][gridX+1] !== 1) validDirs.push('right');
            
            if (!validDirs.includes(enemy.dir) && validDirs.length > 0) enemy.dir = validDirs[0]; 
        }

        let prevX = enemy.x;
        let prevY = enemy.y;

        if (enemy.dir === 'up') enemy.y -= ENEMY_SPEED;
        else if (enemy.dir === 'down') enemy.y += ENEMY_SPEED;
        else if (enemy.dir === 'left') enemy.x -= ENEMY_SPEED;
        else if (enemy.dir === 'right') enemy.x += ENEMY_SPEED;

        let tileCenterX = gridX * TILE_SIZE + TILE_SIZE / 2;
        let tileCenterY = gridY * TILE_SIZE + TILE_SIZE / 2;
        let crossedCenter = false;
        
        if (enemy.dir === 'left' || enemy.dir === 'right') {
            if ((prevX < tileCenterX && enemy.x >= tileCenterX) || (prevX > tileCenterX && enemy.x <= tileCenterX)) crossedCenter = true;
        } else {
            if ((prevY < tileCenterY && enemy.y >= tileCenterY) || (prevY > tileCenterY && enemy.y <= tileCenterY)) crossedCenter = true;
        }

        if (crossedCenter) {
            enemy.x = tileCenterX;
            enemy.y = tileCenterY;

            let validDirs = [];
            if (gridY > 0 && gameMap[gridY-1][gridX] !== 1) validDirs.push('up');
            if (gridY < MAP_HEIGHT-1 && gameMap[gridY+1][gridX] !== 1) validDirs.push('down');
            if (gridX > 0 && gameMap[gridY][gridX-1] !== 1) validDirs.push('left');
            if (gridX < MAP_WIDTH-1 && gameMap[gridY][gridX+1] !== 1) validDirs.push('right');

            let opposite = '';
            if (enemy.dir === 'up') opposite = 'down';
            if (enemy.dir === 'down') opposite = 'up';
            if (enemy.dir === 'left') opposite = 'right';
            if (enemy.dir === 'right') opposite = 'left';

            let options = validDirs.filter(d => d !== opposite);

            if (options.length > 0) enemy.dir = options[Math.floor(Math.random() * options.length)];
            else if (validDirs.length > 0) enemy.dir = validDirs[0]; 
        }
    }
}

function checkEnemyHit() {
    for (let enemy of enemiesList) {
        let dx = waiter.x - enemy.x;
        let dy = waiter.y - enemy.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (TILE_SIZE * 0.3 + enemy.size / 2)) {
            gameActive = false;
            loseScreen.style.display = 'flex'; 
        }
    }
}

function gameLoop() {
    if (!gameActive) return; 
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    moveWaiter(); // <-- Вона повернулася!
    moveEnemies();
    collectMoney();
    checkEnemyHit();
    
    drawMap();
    drawWaiter();
    drawEnemies();
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
