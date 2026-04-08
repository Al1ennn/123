// ==========================================
// ФАЙЛ: script.js (Двигун скелетної анімації)
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// 3D Світ
const FOV = 250, CAMERA_Y = -120, HORIZON_Y = 200, Z_LIMIT = 2000, PLAYER_Z = 150; 
let score = 0, speedMultiplier = 1, isGameOver = false, obstaclesArray = [];

// ==========================================
// ОБ'ЄКТ ГРАВЦЯ (Скелетна модель)
// ==========================================
const player = {
    lane: 0,           
    visualLane: 0,     
    y: 0,              
    vy: 0,             
    
    isGrounded: true,
    animTimer: 0, // Це наш час для синусоїди

    // Змінні для збереження поточних кутів суглобів
    angles: {
        leftThigh: 0, leftKnee: 0,
        rightThigh: 0, rightKnee: 0,
        torsoTilt: 0
    },

    update() {
        // 1. Фізика стрибка
        if (!this.isGrounded) {
            this.vy += GAME_CONFIG.physics.gravity;
            this.y += this.vy;
            if (this.y >= 0) { 
                this.y = 0; this.vy = 0; this.isGrounded = true;
            }
        }

        this.visualLane += (this.lane - this.visualLane) * GAME_CONFIG.physics.laneSmoothness;

        // 2. МАТЕМАТИКА РУХУ (Кінематика)
        if (this.isGrounded) {
            this.animTimer += GAME_CONFIG.runAnimation.speed;
            
            // Math.sin дає плавні хвилі від -1 до 1. Множимо їх на градуси (legSwing).
            // Права і ліва нога рухаються в протифазі (додаємо Math.PI для лівої)
            
            // Стегна (гойдаються вперед-назад)
            this.angles.rightThigh = Math.sin(this.animTimer) * GAME_CONFIG.runAnimation.legSwing;
            this.angles.leftThigh = Math.sin(this.animTimer + Math.PI) * GAME_CONFIG.runAnimation.legSwing;

            // Коліна (згинаються тільки в один бік, тому беремо Math.max(0, ...))
            // Додаємо зсув фази, щоб коліно згиналося тоді, коли нога йде назад
            this.angles.rightKnee = Math.max(0, Math.sin(this.animTimer - Math.PI/2) * GAME_CONFIG.runAnimation.kneeBend);
            this.angles.leftKnee = Math.max(0, Math.sin(this.animTimer + Math.PI/2) * GAME_CONFIG.runAnimation.kneeBend);
            
            // Тіло трохи нахиляється вперед під час бігу
            this.angles.torsoTilt = 10; 
        } else {
            // Поза в повітрі (стрибок)
            this.angles.rightThigh = -20;
            this.angles.rightKnee = 40;
            this.angles.leftThigh = 10;
            this.angles.leftKnee = 10;
            this.angles.torsoTilt = 0;
        }
    },

    // 3. МАЛЮВАННЯ СКЕЛЕТА
    draw(proj) {
        ctx.save(); // Запам'ятовуємо чисте полотно
        
        // Переносимо центр координат у таз персонажа (опускаємо на землю)
        ctx.translate(proj.x, proj.y);
        ctx.scale(proj.scale, proj.scale); // Масштабуємо за законами 3D

        const skel = GAME_CONFIG.skeleton;

        // --- ЛІВА НОГА (Дальня) ---
        this.drawLeg(
            -skel.torso.width/4, 0, // Точка кріплення (тазостегновий суглоб)
            this.angles.leftThigh, this.angles.leftKnee, 
            '#2c3e50', '#34495e' // Кольори (зробимо трохи темнішими для глибини)
        );

        // --- ТУЛУБ ---
        ctx.save();
        ctx.translate(0, 0); // Від таза
        ctx.rotate(this.angles.torsoTilt * Math.PI / 180); // Нахил
        
        ctx.fillStyle = '#3498db'; // Синя уніформа
        // Малюємо тулуб вгору від таза
        ctx.fillRect(-skel.torso.width/2, -skel.torso.height, skel.torso.width, skel.torso.height);
        
        // ГОЛОВА (на тулубі)
        ctx.fillStyle = '#f1c40f'; // Колір шкіри
        ctx.beginPath();
        ctx.arc(0, -skel.torso.height - 10, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- ПРАВА НОГА (Ближня) ---
        this.drawLeg(
            skel.torso.width/4, 0, // Точка кріплення
            this.angles.rightThigh, this.angles.rightKnee, 
            '#e67e22', '#d35400' // Шкіра
        );

        ctx.restore(); // Повертаємо координати до нормальних
    },

    // ФУНКЦІЯ МАЛЮВАННЯ НОГИ (Forward Kinematics)
    drawLeg(x, y, thighAngle, kneeAngle, thighColor, calfColor) {
        const skel = GAME_CONFIG.skeleton;
        
        ctx.save(); // Зберігаємо позицію перед малюванням ноги
        
        // 1. СТЕГНО
        ctx.translate(x, y); // Стаємо в суглоб таза
        ctx.rotate(thighAngle * Math.PI / 180); // Обертаємо стегно
        
        ctx.fillStyle = thighColor;
        // Малюємо вниз від суглоба
        ctx.fillRect(-skel.leg.width/2, 0, skel.leg.width, skel.leg.thighLength);

        // 2. КОЛІНО ТА ГОМІЛКА
        // Переносимо центр координат на кінець стегна (у коліно!)
        ctx.translate(0, skel.leg.thighLength); 
        ctx.rotate(kneeAngle * Math.PI / 180); // Обертаємо гомілку ВІДНОСНО стегна
        
        ctx.fillStyle = calfColor;
        ctx.fillRect(-skel.leg.width/2, 0, skel.leg.width, skel.leg.calfLength);

        // РОЛИК (на кінці гомілки)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-skel.leg.width, skel.leg.calfLength, skel.leg.width * 2, 8);

        ctx.restore(); // Повертаємо координати назад
    }
};

// ==========================================
// КЕРУВАННЯ ТА ЛОГІКА ГРИ (Спрощено для прикладу)
// ==========================================
window.addEventListener('keydown', (e) => {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > -1) player.lane--;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < 1) player.lane++;
    if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.isGrounded) {
        player.vy = GAME_CONFIG.physics.jumpPower;
        player.isGrounded = false;
    }
});

function project(x, y, z) {
    if (z <= 0) return null; 
    const scale = FOV / z;
    return { x: canvas.width / 2 + (x * scale), y: HORIZON_Y + ((y - CAMERA_Y) * scale), scale: scale };
}

function updateAndDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    speedMultiplier += GAME_CONFIG.physics.acceleration;
    score += GAME_CONFIG.physics.baseSpeed * speedMultiplier * 0.01;

    player.update();

    // Небо і підлога
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, canvas.width, HORIZON_Y); 
    ctx.fillStyle = '#95a5a6'; ctx.fillRect(0, HORIZON_Y, canvas.width, canvas.height - HORIZON_Y); 

    // Малюємо гравця (виклик нашого скелета)
    const pProj = project(player.visualLane * 150, player.y, PLAYER_Z);
    if (pProj) player.draw(pProj);

    requestAnimationFrame(updateAndDraw);
}

updateAndDraw(); // Запуск
