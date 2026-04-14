const levelsData = JSON.parse(document.getElementById('level-data').textContent);
let currentLevelIndex = 0; 

let TILE_SIZE, WAITER_SPEED, ENEMY_SPEED, MAP_WIDTH, MAP_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT;
let gameMap = [];
let totalCoins = 0;
let enemiesList = [];
let gameActive = false;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score-display');
const levelSpan = document.getElementById('level-display');
const winScreen = document.getElementById('win-screen');
const finalWinScreen = document.getElementById('final-win-screen');
const loseScreen = document.getElementById('lose-screen');

// --- КАРТИНКИ ОФІЦІАНТА ---
const sprites = { up: new Image(), down: new Image(), left: new Image(), right: new Image() };
sprites.up.src = 'up.webp';       
sprites.down.src = 'down.webp';   
sprites.left.src = 'left.webp';   
sprites.right.src = 'right.webp'; 

const waiter = { x: 0, y: 0, size: 0, score: 0, dir: 'right' };

// --- КАРТИНКИ 5 ПРИВИДІВ ---
const ghostSprites = {
    red: { up: new Image(), down: new Image(), left: new Image(), right: new Image() },
    yellow: { up: new Image(), down: new Image(), left: new Image(), right: new Image() },
    purple: { up: new Image(), down: new Image(), left: new Image(), right: new Image() },
    blue: { up: new Image(), down: new Image(), left: new Image(), right: new Image() },
    green: { up: new Image(), down: new Image(), left: new Image(), right: new Image() }
};

// Червоний
ghostSprites.red.up.src = 'red_up.webp';
ghostSprites.red.down.src = 'red_down.webp';
ghostSprites.red.left.src = 'red_left.webp';
ghostSprites.red.right.src = 'red_right.webp';
// Жовтий
ghostSprites.yellow.up.src = 'yellow_up.webp';
ghostSprites.yellow.down.src = 'yellow_down.webp';
ghostSprites.yellow.left.src = 'yellow_left.webp';
ghostSprites.yellow.right.src = 'yellow_right.webp';
// Фіолетовий
ghostSprites.purple.up.src = 'purple_up.webp';
ghostSprites.purple.down.src = 'purple_down.webp';
ghostSprites.purple.left.src = 'purple_left.webp';
ghostSprites.purple.right.src = 'purple_right.webp';
// Синій
ghostSprites.blue.up.src = 'blue_up.webp';
ghostSprites.blue.down.src = 'blue_down.webp';
ghostSprites.blue.left.src = 'blue_left.webp';
ghostSprites.blue.right.src = 'blue_right.webp';
// Зелений
ghostSprites.green.up.src = 'green_up.webp';
ghostSprites.green.down.src = 'green_down.webp';
ghostSprites.green.left.src = 'green_left.webp';
ghostSprites.green.right.src = 'green_right.webp';

// --- ФУНКЦІЯ ЗАВАНТАЖЕННЯ РІВНЯ ---
function loadLevel(index) {
    const config = levelsData[index];
    TILE_SIZE = config.tileSize; WAITER_SPEED = config.waiterSpeed; ENEMY_SPEED = config.enemySpeed;
    MAP_WIDTH = config.map[0].length; MAP_HEIGHT = config.map.length;
    CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE; CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;
    
    canvas.width = CANVAS_WIDTH; canvas.height = CANVAS_HEIGHT;
    gameMap = config.map.map(row => [...row]);
    totalCoins = 0;
    
    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) if (gameMap[r][c] === 0) totalCoins++;
    }

    waiter.x = TILE_SIZE * config.waiterStart.x; waiter.y = TILE_SIZE * config.waiterStart.y;
    waiter.size = TILE_SIZE * 1.2; waiter.score = 0; waiter.dir = 'right';
    scoreSpan.innerText = waiter.score; levelSpan.innerText = index + 1;

    enemiesList = config.enemies.map(e => ({
        x: TILE_SIZE * e.x, y: TILE_SIZE * e.y, color: e.color, dir: e.dir, size: TILE_SIZE * 1.2, started: false
    }));

    winScreen.style.display = 'none'; finalWinScreen.style.display = 'none'; loseScreen.style.display = 'none';
    gameActive = true;
}

document.getElementById('next-level-btn').addEventListener('click', () => { 
    currentLevelIndex++; loadLevel(currentLevelIndex); 
});

// --- МАЛЮВАННЯ ТА ЛОГІКА ---
function drawMap() {
    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) {
            let x = c * TILE_SIZE; let y = r * TILE_SIZE;
            if (gameMap[r][c] === 1) { 
                ctx.fillStyle = '#1e003b'; ctx.fillRect(x, y, TILE_SIZE + 1, TILE_SIZE + 1);
            } else if (gameMap[r][c] === 0) { 
                ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.15, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
}

function drawWaiter() {
    let currentImage;
    if (waiter.dir === 'up') currentImage = sprites.up; else if (waiter.dir === 'down') currentImage = sprites.down;
    else if (waiter.dir === 'left') currentImage = sprites.left; else if (waiter.dir === 'right') currentImage = sprites.right;

    if (currentImage && currentImage.complete && currentImage.naturalWidth !== 0) {
        ctx.drawImage(currentImage, waiter.x - waiter.size / 2, waiter.y - waiter.size / 2, waiter.size, waiter.size);
    } else { ctx.fillStyle = '#0f0'; ctx.fillRect(waiter.x - waiter.size / 2, waiter.y - waiter.size / 2, waiter.size, waiter.size); }
}

function drawEnemies() {
    for (let enemy of enemiesList) {
        let ghostImages = ghostSprites[enemy.color];
        let img;
        if (enemy.dir === 'up') img = ghostImages.up;
        else if (enemy.dir === 'down') img = ghostImages.down;
        else if (enemy.dir === 'left') img = ghostImages.left;
        else if (enemy.dir === 'right') img = ghostImages.right;

        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
        } else {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
        }
    }
}

function isCollision(x, y) {
    const collisionRadius = (TILE_SIZE * 0.45) / 2; 
    const pointsToTest = [
        { x: x - collisionRadius, y: y - collisionRadius }, { x: x + collisionRadius, y: y - collisionRadius },
        { x: x - collisionRadius, y: y + collisionRadius }, { x: x + collisionRadius, y: y + collisionRadius }
    ];
    for (let point of pointsToTest) {
        let gridX = Math.floor(point.x / TILE_SIZE); let gridY = Math.floor(point.y / TILE_SIZE);
        if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) return true;
        if (gameMap[gridY][gridX] === 1) return true;
    }
    return false;
}

function moveWaiter() {
    let dx = 0; let dy = 0;
    if (controls.up) { dy = -WAITER_SPEED; waiter.dir = 'up'; } else if (controls.down) { dy = WAITER_SPEED; waiter.dir = 'down'; }
    else if (controls.left) { dx = -WAITER_SPEED; waiter.dir = 'left'; } else if (controls.right) { dx = WAITER_SPEED; waiter.dir = 'right'; }

    let centerX = Math.floor(waiter.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2; let centerY = Math.floor(waiter.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const snapSpeed = WAITER_SPEED * 0.8;

    if (dx !== 0) {
        if (Math.abs(waiter.y - centerY) <= snapSpeed) waiter.y = centerY;
        else if (waiter.y < centerY) waiter.y += snapSpeed; else if (waiter.y > centerY) waiter.y -= snapSpeed;
        if (!isCollision(waiter.x + dx, waiter.y)) waiter.x += dx;
    }
    if (dy !== 0) {
        if (Math.abs(waiter.x - centerX) <= snapSpeed) waiter.x = centerX;
        else if (waiter.x < centerX) waiter.x += snapSpeed; else if (waiter.x > centerX) waiter.x -= snapSpeed;
        if (!isCollision(waiter.x, waiter.y + dy)) waiter.y += dy;
    }
}

// --- ШТУЧНИЙ ІНТЕЛЕКТ ВОРОГІВ ---
function moveEnemies() {
    for (let enemy of enemiesList) {
        let gridX = Math.floor(enemy.x / TILE_SIZE); let gridY = Math.floor(enemy.y / TILE_SIZE);

        if (!enemy.started) {
            enemy.started = true;
            let validDirs = [];
            if (gridY > 0 && gameMap[gridY-1][gridX] !== 1) validDirs.push('up');
            if (gridY < MAP_HEIGHT-1 && gameMap[gridY+1][gridX] !== 1) validDirs.push('down');
            if (gridX > 0 && gameMap[gridY][gridX-1] !== 1) validDirs.push('left');
            if (gridX < MAP_WIDTH-1 && gameMap[gridY][gridX+1] !== 1) validDirs.push('right');
            if (!validDirs.includes(enemy.dir) && validDirs.length > 0) enemy.dir = validDirs[0]; 
        }

        let prevX = enemy.x; let prevY = enemy.y;
        if (enemy.dir === 'up') enemy.y -= ENEMY_SPEED; else if (enemy.dir === 'down') enemy.y += ENEMY_SPEED;
        else if (enemy.dir === 'left') enemy.x -= ENEMY_SPEED; else if (enemy.dir === 'right') enemy.x += ENEMY_SPEED;

        let tileCenterX = gridX * TILE_SIZE + TILE_SIZE / 2; let tileCenterY = gridY * TILE_SIZE + TILE_SIZE / 2;
        let crossedCenter = false;
        
        if (enemy.dir === 'left' || enemy.dir === 'right') {
            if ((prevX < tileCenterX && enemy.x >= tileCenterX) || (prevX > tileCenterX && enemy.x <= tileCenterX)) crossedCenter = true;
        } else {
            if ((prevY < tileCenterY && enemy.y >= tileCenterY) || (prevY > tileCenterY && enemy.y <= tileCenterY)) crossedCenter = true;
        }

        if (crossedCenter) {
            enemy.x = tileCenterX; enemy.y = tileCenterY;
            let validDirs = [];
            if (gridY > 0 && gameMap[gridY-1][gridX] !== 1) validDirs.push('up');
            if (gridY < MAP_HEIGHT-1 && gameMap[gridY+1][gridX] !== 1) validDirs.push('down');
            if (gridX > 0 && gameMap[gridY][gridX-1] !== 1) validDirs.push('left');
            if (gridX < MAP_WIDTH-1 && gameMap[gridY][gridX+1] !== 1) validDirs.push('right');

            let opposite = '';
            if (enemy.dir === 'up') opposite = 'down'; if (enemy.dir === 'down') opposite = 'up';
            if (enemy.dir === 'left') opposite = 'right'; if (enemy.dir === 'right') opposite = 'left';

            let options = validDirs.filter(d => d !== opposite);

            if (options.length > 0) {
                let targetX = gridX; let targetY = gridY;
                let useTargeting = false;
                let waiterGridX = Math.floor(waiter.x / TILE_SIZE);
                let waiterGridY = Math.floor(waiter.y / TILE_SIZE);

                // Обираємо ціль залежно від кольору (характеру)
                if (enemy.color === 'red') {
                    targetX = waiterGridX; targetY = waiterGridY;
                    useTargeting = true;
                } else if (enemy.color === 'purple') {
                    targetX = waiterGridX; targetY = waiterGridY;
                    if (waiter.dir === 'up') targetY -= 4; if (waiter.dir === 'down') targetY += 4;
                    if (waiter.dir === 'left') targetX -= 4; if (waiter.dir === 'right') targetX += 4;
                    useTargeting = true;
                } else if (enemy.color === 'yellow') {
                    let dist = Math.abs(waiterGridX - gridX) + Math.abs(waiterGridY - gridY);
                    if (dist < 6) { targetX = 0; targetY = MAP_HEIGHT - 1; } // Тікає в лівий нижній кут
                    else { targetX = waiterGridX; targetY = waiterGridY; }
                    useTargeting = true;
                }

                if (useTargeting) {
                    let bestDir = options[0];
                    let minDist = Infinity;
                    // Шукаємо шлях, який фізично найближчий до цілі
                    for (let d of options) {
                        let nextX = gridX; let nextY = gridY;
                        if (d === 'up') nextY--; if (d === 'down') nextY++;
                        if (d === 'left') nextX--; if (d === 'right') nextX++;
                        
                        let distToTarget = Math.pow(targetX - nextX, 2) + Math.pow(targetY - nextY, 2);
                        if (distToTarget < minDist) { minDist = distToTarget; bestDir = d; }
                    }
                    enemy.dir = bestDir;
                } else {
                    // Синій і Зелений ходять хаотично
                    enemy.dir = options[Math.floor(Math.random() * options.length)];
                }
            } else if (validDirs.length > 0) {
                enemy.dir = validDirs[0]; // Тупик, розвертаємось
            }
        }
    }
}

function collectMoney() {
    let gridX = Math.floor(waiter.x / TILE_SIZE); let gridY = Math.floor(waiter.y / TILE_SIZE);
    if (gridY >= 0 && gridY < MAP_HEIGHT && gridX >= 0 && gridX < MAP_WIDTH) {
        if (gameMap[gridY][gridX] === 0) {
            gameMap[gridY][gridX] = 2; waiter.score += 1; scoreSpan.innerText = waiter.score; 

            if (waiter.score === totalCoins) {
                gameActive = false; 
                if (currentLevelIndex < levelsData.length - 1) winScreen.style.display = 'flex'; 
                else finalWinScreen.style.display = 'flex'; 
            }
        }
    }
}

function checkEnemyHit() {
    for (let enemy of enemiesList) {
        let dx = waiter.x - enemy.x; let dy = waiter.y - enemy.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (TILE_SIZE * 0.3 + enemy.size / 2)) {
            gameActive = false; loseScreen.style.display = 'flex'; 
        }
    }
}

function gameLoop() {
    if (gameActive) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        moveWaiter();
        moveEnemies();
        collectMoney();
        checkEnemyHit();
        drawMap();
        drawWaiter();
        drawEnemies();
    }
    requestAnimationFrame(gameLoop);
}

loadLevel(0);
gameLoop();
