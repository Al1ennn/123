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

const sprites = {
    up: new Image(), down: new Image(), left: new Image(), right: new Image()
};

// ⚠️ УВАГА: ТВОЇ ФАЙЛИ
sprites.up.src = 'up.webp';       
sprites.down.src = 'down.webp';   
sprites.left.src = 'left.webp';   
sprites.right.src = 'right.webp'; 

const waiter = {
    x: TILE_SIZE * 1.5,
    y: TILE_SIZE * 1.5,
    size: TILE_SIZE * 1.1, // ВІН ТЕПЕР ВЕЛИКИЙ (110% від розміру клітинки)
    score: 0,
    dir: 'right' 
};

function drawMap() {
    for (let r = 0; r < MAP_HEIGHT; r++) {
        for (let c = 0; c < MAP_WIDTH; c++) {
            let tile = gameMap[r][c];
            let x = c * TILE_SIZE;
            let y = r * TILE_SIZE;

            if (tile === 1) { 
                ctx.fillStyle = '#333';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#f0f'; 
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            } else if (tile === 0) { 
                ctx.fillStyle = '#ff0'; 
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.2, 0, Math.PI * 2);
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
        ctx.drawImage(
            currentImage,
            waiter.x - waiter.size / 2, 
            waiter.y - waiter.size / 2, 
            waiter.size, 
            waiter.size
        );
    } else {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(waiter.x - waiter.size / 2, waiter.y - waiter.size / 2, waiter.size, waiter.size);
    }
}

function isCollision(x, y, isPlayer) {
    // МАГІЯ: Якщо це гравець, робимо "хітбокс" значно меншим за картинку, щоб він не чіплявся за стіни
    const physicalSize = isPlayer ? (TILE_SIZE * 0.6) : (TILE_SIZE * 0.8);
    const collisionRadius = physicalSize / 2;
    
    const pointsToTest = [
        { x: x - collisionRadius, y: y - collisionRadius },
        { x: x + collisionRadius, y: y - collisionRadius },
        { x: x - collisionRadius, y: y + collisionRadius },
        { x: x + collisionRadius, y: y + collisionRadius }
    ];

    for (let point of pointsToTest) {
        let gridX = Math.floor(point.x / TILE_SIZE);
        let gridY = Math.floor(point.y / TILE_SIZE);

        if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) return true;
        if (gameMap[gridY][gridX] === 1) return true;
    }
    return false;
}

function moveWaiter() {
    let nextX = waiter.x;
    let nextY = waiter.y;

    if (controls.up) { nextY -= WAITER_SPEED; waiter.dir = 'up'; }
    if (controls.down) { nextY += WAITER_SPEED; waiter.dir = 'down'; }
    if (controls.left) { nextX -= WAITER_SPEED; waiter.dir = 'left'; }
    if (controls.right) { nextX += WAITER_SPEED; waiter.dir = 'right'; }

    // Передаємо "true", бо це гравець
    if (!isCollision(nextX, waiter.y, true)) waiter.x = nextX;
    if (!isCollision(waiter.x, nextY, true)) waiter.y = nextY;
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

function moveEnemies() {
    for (let enemy of enemiesList) {
        let nextX = enemy.x;
        let nextY = enemy.y;

        if (enemy.dir === 'up') nextY -= ENEMY_SPEED;
        if (enemy.dir === 'down') nextY += ENEMY_SPEED;
        if (enemy.dir === 'left') nextX -= ENEMY_SPEED;
        if (enemy.dir === 'right') nextX += ENEMY_SPEED;

        // Передаємо "false", бо це ворог
        if (isCollision(nextX, nextY, false)) {
            enemy.dir = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
            enemy.x = Math.floor(enemy.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
            enemy.y = Math.floor(enemy.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        } else {
            enemy.x = nextX;
            enemy.y = nextY;
        }
    }
}

function checkEnemyHit() {
    for (let enemy of enemiesList) {
        let dx = waiter.x - enemy.x;
        let dy = waiter.y - enemy.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        // Хітбокс для програшу теж трохи менший, щоб було чесно
        if (distance < (TILE_SIZE * 0.4 + enemy.size / 2)) {
            gameActive = false;
            loseScreen.style.display = 'flex'; 
        }
    }
}

function gameLoop() {
    if (!gameActive) return; 

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    moveWaiter();
    moveEnemies();
    collectMoney();
    checkEnemyHit();
    
    drawMap();
    drawWaiter();
    drawEnemies();
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
