// --- КОНФІГУРАЦІЯ ---
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 400,
    floorY: 340,
    gravity: 0.003,      // Гравітація тепер залежить від часу
    gameSpeedBase: 0.4,  // Базова швидкість світу
    debugHitboxes: false // Зміни на true, щоб бачити зони зіткнень!
};

// --- АСЕТИ (Завантаження та очищення фону) ---
const Assets = {
    waiterSrc: 'https://raw.githubusercontent.com/Al1ennn/123/main/game/waiter_sprites.png',
    obstacleSrc: 'https://raw.githubusercontent.com/Al1ennn/123/main/game/obstacles.png',
    sprites: {},

    async loadAndClean(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                const cvs = document.createElement('canvas');
                const ctx = cvs.getContext('2d', { willReadFrequently: true });
                cvs.width = img.width; cvs.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imgData = ctx.getImageData(0, 0, img.width, img.height);
                const data = imgData.data;
                // Агресивне видалення рожевого фону
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 220 && data[i+1] < 50 && data[i+2] > 220) data[i + 3] = 0;
                }
                ctx.putImageData(imgData, 0, 0);
                resolve(cvs);
            };
        });
    },

    async init() {
        this.sprites.waiter = await this.loadAndClean(this.waiterSrc);
        this.sprites.obstacles = await this.loadAndClean(this.obstacleSrc);
        document.getElementById('loadingScreen').classList.add('hidden');
    }
};

// --- КЛАС ГРАВЦЯ ---
class Player {
    constructor(game) {
        this.game = game;
        this.w = 100;
        this.h = 100;
        this.x = 80;
        this.y = CONFIG.floorY - this.h;
        
        // Внутрішній хітбокс для точних зіткнень
        this.hitbox = { ox: 35, oy: 20, w: 40, h: 75 };
        
        this.vy = 0; // Швидкість по вертикалі
        this.jumpPower = -1.1; // Сила стрибка (адаптована під deltaTime)
        this.isGrounded = true;

        // Анімація
        this.frameX = 0;
        this.frameY = 0;
        this.frameTimer = 0;
        this.frameInterval = 80; // Мілісекунди між кадрами
    }

    update(deltaTime, input) {
        // Логіка стрибка
        if (input.includes('Space') && this.isGrounded) {
            this.vy = this.jumpPower;
            this.isGrounded = false;
        }

        // Адаптивний стрибок (якщо відпустив пробіл зарано - падаєш швидше)
        if (!input.includes('Space') && this.vy < -0.5) {
            this.vy *= 0.8; 
        }

        // Застосування гравітації
        this.vy += CONFIG.gravity * deltaTime;
        this.y += this.vy * deltaTime;

        // Перевірка землі
        if (this.y >= CONFIG.floorY - this.h) {
            this.y = CONFIG.floorY - this.h;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Анімація спрайту
        if (this.isGrounded) {
            this.frameY = 0; // Біг
            if (this.frameTimer > this.frameInterval) {
                this.frameX = (this.frameX + 1) % 5;
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
        } else {
            this.frameY = 2; // Стрибок
            this.frameX = 0;
        }
    }

    draw(ctx) {
        ctx.drawImage(Assets.sprites.waiter, 
            this.frameX * 171, this.frameY * 175, 171, 175, 
            this.x, this.y, this.w, this.h
        );

        if (CONFIG.debugHitboxes) {
            ctx.strokeStyle = 'lime';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x + this.hitbox.ox, this.y + this.hitbox.oy, this.hitbox.w, this.hitbox.h);
        }
    }
}

// --- КЛАС ПЕРЕШКОД ---
class Obstacle {
    constructor(game) {
        this.game = game;
        
        // Випадковий вибір перешкоди
        const types = [
            { sx: 20, sy: 550, sw: 130, sh: 70, w: 90, h: 50, hb: {ox: 10, oy: 25, w: 70, h: 25} }, // Калюжа
            { sx: 880, sy: 310, sw: 100, sh: 130, w: 60, h: 80, hb: {ox: 15, oy: 10, w: 30, h: 70} }, // Знак
            { sx: 440, sy: 770, sw: 130, sh: 100, w: 80, h: 65, hb: {ox: 10, oy: 15, w: 60, h: 50} }  // Коробки
        ];
        this.type = types[Math.floor(Math.random() * types.length)];
        
        this.x = CONFIG.canvasWidth;
        this.y = CONFIG.floorY - this.type.h;
        this.markedForDeletion = false;
    }

    update(deltaTime) {
        this.x -= this.game.speed * deltaTime;
        if (this.x < -100) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.drawImage(Assets.sprites.obstacles, 
            this.type.sx, this.type.sy, this.type.sw, this.type.sh, 
            this.x, this.y, this.type.w, this.type.h
        );

        if (CONFIG.debugHitboxes) {
            ctx.strokeStyle = 'red';
            ctx.strokeRect(this.x + this.type.hb.ox, this.y + this.type.hb.oy, this.type.hb.w, this.type.hb.h);
        }
    }
}

// --- ГОЛОВНИЙ КЛАС ГРИ ---
class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.player = new Player(this);
        this.input = [];
        this.obstacles = [];
        this.obstacleTimer = 0;
        this.obstacleInterval = 1200; // Час між перешкодами в мс
        
        this.score = 0;
        this.speed = CONFIG.gameSpeedBase;
        this.gameOver = false;

        // Обробка клавіатури
        window.addEventListener('keydown', e => {
            if (e.code === 'Space' && this.input.indexOf('Space') === -1) {
                this.input.push('Space');
            }
        });
        window.addEventListener('keyup', e => {
            if (e.code === 'Space') {
                this.input.splice(this.input.indexOf('Space'), 1);
            }
        });

        // Кнопка рестарту
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
    }

    update(deltaTime) {
        if (this.gameOver) return;

        this.player.update(deltaTime, this.input);

        // Генерація перешкод
        if (this.obstacleTimer > this.obstacleInterval) {
            this.obstacles.push(new Obstacle(this));
            this.obstacleTimer = 0;
            // Рандомізуємо інтервал для різноманітності
            this.obstacleInterval = Math.random() * 800 + 800;
        } else {
            this.obstacleTimer += deltaTime;
        }

        // Оновлення перешкод та колізія
        this.obstacles.forEach(obs => {
            obs.update(deltaTime);
            
            // AABB Колізія по хітбоксах
            const p = this.player;
            if (p.x + p.hitbox.ox < obs.x + obs.type.hb.ox + obs.type.hb.w &&
                p.x + p.hitbox.ox + p.hitbox.w > obs.x + obs.type.hb.ox &&
                p.y + p.hitbox.oy < obs.y + obs.type.hb.oy + obs.type.hb.h &&
                p.y + p.hitbox.oy + p.hitbox.h > obs.y + obs.type.hb.oy) {
                this.triggerGameOver();
            }
        });

        // Видалення старих перешкод
        this.obstacles = this.obstacles.filter(obs => !obs.markedForDeletion);

        // Збільшення складності
        this.score += deltaTime * 0.01;
        this.speed = CONFIG.gameSpeedBase + (this.score * 0.0005);
        document.getElementById('scoreValue').innerText = Math.floor(this.score);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Малюємо підлогу
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(0, CONFIG.floorY, this.canvas.width, this.canvas.height - CONFIG.floorY);
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, CONFIG.floorY);
        this.ctx.lineTo(this.canvas.width, CONFIG.floorY);
        this.ctx.stroke();

        this.player.draw(this.ctx);
        this.obstacles.forEach(obs => obs.draw(this.ctx));
    }

    triggerGameOver() {
        this.gameOver = true;
        document.getElementById('finalScore').innerText = Math.floor(this.score);
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    restart() {
        this.player = new Player(this);
        this.obstacles = [];
        this.score = 0;
        this.speed = CONFIG.gameSpeedBase;
        this.gameOver = false;
        document.getElementById('gameOverScreen').classList.add('hidden');
    }
}

// --- ІНІЦІАЛІЗАЦІЯ ТА ЦИКЛ ---
window.addEventListener('load', async () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;

    await Assets.init(); // Чекаємо, поки очистяться картинки

    const game = new Game(canvas, ctx);
    let lastTime = 0;

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        game.update(deltaTime);
        game.draw();

        requestAnimationFrame(animate);
    }
    animate(0);
});
