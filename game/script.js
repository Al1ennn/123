// window.onload гарантує, що гра не запуститься, поки не з'явиться Canvas
window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Помилка: Canvas не знайдено!");
        return;
    }
    const ctx = canvas.getContext('2d');

    // ==========================================
    // 1. НАЛАШТУВАННЯ СКЕЛЕТА (Без картинок)
    // ==========================================
    const SKEL = {
        torso: { w: 34, h: 50 },
        thigh: { w: 14, h: 28 }, 
        calf:  { w: 12, h: 30 }, 
        arm:   { w: 10, h: 22 }, 
        forearm:{w: 10, h: 22 }  
    };

    const COLORS = {
        skin: '#f1c40f',     skinDark: '#e67e22', 
        shirt: '#ecf0f1',    pants: '#2980b9',    pantsDark: '#2c3e50',
        apron: '#bdc3c7',    skate: '#e74c3c',    
        tray: '#95a5a6',     glass: '#f1c40f'     
    };

    // ==========================================
    // 2. СВІТ ТА ЗМІННІ ГРИ
    // ==========================================
    const FOV = 250, CAMERA_Y = -120, HORIZON_Y = 200, Z_LIMIT = 2000, PLAYER_Z = 150; 
    let score = 0, speedMultiplier = 1, isGameOver = false;
    let obstaclesArray = [];

    // ==========================================
    // 3. ФУНКЦІЇ МАЛЮВАННЯ ЧАСТИН ТІЛА
    // ==========================================
    function drawLeg(ctx, startX, startY, thighAngle, kneeAngle, isBackLeg) {
        const colorThigh = isBackLeg ? COLORS.pantsDark : COLORS.pants;
        const colorCalf = isBackLeg ? COLORS.skinDark : COLORS.skin;

        ctx.save();
        ctx.translate(startX, startY);

        ctx.rotate(thighAngle * Math.PI / 180);
        ctx.fillStyle = colorThigh;
        ctx.fillRect(-SKEL.thigh.w / 2, 0, SKEL.thigh.w, SKEL.thigh.h);

        ctx.translate(0, SKEL.thigh.h);
        ctx.rotate(kneeAngle * Math.PI / 180);
        ctx.fillStyle = colorCalf;
        ctx.fillRect(-SKEL.calf.w / 2, 0, SKEL.calf.w, SKEL.calf.h);

        ctx.translate(0, SKEL.calf.h);
        ctx.fillStyle = '#ecf0f1'; 
        ctx.fillRect(-SKEL.calf.w, 0, SKEL.calf.w * 2, 15); // Черевик
        ctx.fillStyle = COLORS.skate;
        ctx.fillRect(-SKEL.calf.w + 2, 15, SKEL.calf.w * 2 - 4, 6); // Колеса

        ctx.restore();
    }

    function drawArm(ctx, startX, startY, shoulderAngle, elbowAngle, isBackArm, holdingTray) {
        const colorArm = isBackArm ? COLORS.skinDark : COLORS.skin;
        const colorSleeve = isBackArm ? '#bdc3c7' : COLORS.shirt;

        ctx.save();
        ctx.translate(startX, startY);

        ctx.rotate(shoulderAngle * Math.PI / 180);
        ctx.fillStyle = colorSleeve;
        ctx.fillRect(-SKEL.arm.w / 2, 0, SKEL.arm.w, SKEL.arm.h - 5); 
        ctx.fillStyle = colorArm;
        ctx.fillRect(-SKEL.arm.w / 2, SKEL.arm.h - 5, SKEL.arm.w, 5); 

        ctx.translate(0, SKEL.arm.h);
        ctx.rotate(elbowAngle * Math.PI / 180);
        ctx.fillStyle = colorArm;
        ctx.fillRect(-SKEL.forearm.w / 2, 0, SKEL.forearm.w, SKEL.forearm.h);

        if (holdingTray) {
            ctx.translate(0, SKEL.forearm.h); 
            ctx.rotate(-(shoulderAngle + elbowAngle) * Math.PI / 180); 
            
            ctx.fillStyle = COLORS.tray;
            ctx.beginPath(); ctx.ellipse(15, -5, 25, 4, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.fillRect(5, -25, 15, 20); 
            ctx.fillStyle = COLORS.glass; ctx.fillRect(7, -20, 11, 13); 
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(5, -25, 5, 0, Math.PI * 2); ctx.fill(); 
        }

        ctx.restore();
    }

    // ==========================================
    // 4. ОБ'ЄКТ ГРАВЦЯ
    // ==========================================
    const player = {
        lane: 0, visualLane: 0, y: 0, vy: 0,
        isGrounded: true, isRolling: false, rollTimer: 0, animTimer: 0,

        update() {
            if (!this.isGrounded) {
                this.vy += 1.5;
                this.y += this.vy;
                if (this.y >= 0) {
                    this.y = 0; this.vy = 0; this.isGrounded = true;
                }
            }

            if (this.isRolling) {
                this.rollTimer--;
                if (this.rollTimer <= 0) this.isRolling = false;
            }

            this.visualLane += (this.lane - this.visualLane) * 0.15;

            if (this.isGrounded && !this.isRolling) {
                this.animTimer += 0.15; 
            }
        },

        draw(proj) {
            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.scale(proj.scale, proj.scale);

            // ВИПРАВЛЕННЯ ПРОВАЛЮВАННЯ: 
            // Піднімаємо весь скелет вгору на висоту прямих ніг з роликами (28 + 30 + 15 + 6 = 79)
            ctx.translate(0, -79);

            let torsoTilt = 5, rightThighAngle = 0, leftThighAngle = 0;
            let rightKneeAngle = 0, leftKneeAngle = 0;
            let backShoulderAngle = 0, backElbowAngle = -20;
            let frontShoulderAngle = 10, frontElbowAngle = -80;

            if (this.isGrounded) {
                if (this.isRolling) {
                    torsoTilt = 35;
                    rightThighAngle = -60; leftThighAngle = -60;
                    rightKneeAngle = 120; leftKneeAngle = 120;
                    frontShoulderAngle = -30;
                } else {
                    const runCycle = Math.sin(this.animTimer);
                    rightThighAngle = runCycle * 35;
                    leftThighAngle = -runCycle * 35;
                    rightKneeAngle = Math.max(0, Math.sin(this.animTimer - Math.PI / 2) * 50);
                    leftKneeAngle = Math.max(0, Math.sin(this.animTimer + Math.PI / 2) * 50);
                    backShoulderAngle = runCycle * 30;
                    frontShoulderAngle = 10 + Math.sin(this.animTimer * 2) * 5;
                    frontElbowAngle = -80 + Math.cos(this.animTimer * 2) * 5;
                }
            } else {
                torsoTilt = -5;
                rightThighAngle = -30; leftThighAngle = 10;
                rightKneeAngle = 60; leftKneeAngle = 10;
                backShoulderAngle = -40; frontShoulderAngle = 20;
            }

            drawArm(ctx, -10, -SKEL.torso.h + 10, backShoulderAngle, backElbowAngle, true, false);
            drawLeg(ctx, -8, 0, leftThighAngle, leftKneeAngle, true);
            
            ctx.save();
            ctx.rotate(torsoTilt * Math.PI / 180);
            ctx.fillStyle = COLORS.shirt; ctx.fillRect(-SKEL.torso.w / 2, -SKEL.torso.h, SKEL.torso.w, SKEL.torso.h);
            ctx.fillStyle = COLORS.apron; ctx.fillRect(-SKEL.torso.w / 2 - 2, -SKEL.torso.h / 3, SKEL.torso.w + 4, SKEL.torso.h / 3 + 10);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-SKEL.torso.w / 2 - 5, -SKEL.torso.h / 3, 10, 8); 
            ctx.fillStyle = COLORS.skin; ctx.fillRect(-6, -SKEL.torso.h - 8, 12, 10); 
            ctx.beginPath(); ctx.arc(0, -SKEL.torso.h - 18, 15, 0, Math.PI * 2); ctx.fill(); 
            ctx.fillStyle = '#5c3a21'; ctx.beginPath(); ctx.arc(0, -SKEL.torso.h - 18, 16, Math.PI, Math.PI * 2); ctx.fill(); 
            ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.moveTo(-12, -SKEL.torso.h - 30); ctx.lineTo(12, -SKEL.torso.h - 30); ctx.lineTo(0, -SKEL.torso.h - 45); ctx.fill(); 
            ctx.fillStyle = COLORS.pants; ctx.fillRect(-10, -SKEL.torso.h - 32, 20, 4);
            ctx.restore();

            drawLeg(ctx, +8, 0, rightThighAngle, rightKneeAngle, false);
            drawArm(ctx, +15, -SKEL.torso.h + 10, frontShoulderAngle, frontElbowAngle, false, true);

            ctx.restore();
        }
    };

    // ==========================================
    // 5. УПРАВЛІННЯ ТА ПЕРЕШКОДИ
    // ==========================================
    window.addEventListener('keydown', (e) => {
        if (isGameOver && e.code === 'Enter') {
            score = 0; speedMultiplier = 1; obstaclesArray = [];
            player.lane = 0; player.y = 0; player.vy = 0; player.isGrounded = true; player.isRolling = false;
            isGameOver = false;
            return;
        }
        if (isGameOver) return;

        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > -1) player.lane--;
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < 1) player.lane++;
        
        if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.isGrounded && !player.isRolling) {
            player.vy = -18; player.isGrounded = false;
        }
        if ((e.code === 'ArrowDown' || e.code === 'KeyS') && player.isGrounded && !player.isRolling) {
            player.isRolling = true; player.rollTimer = 35;
        }
    });

    function project(x, y, z) {
        if (z <= 0) return null; 
        const scale = FOV / z;
        return { x: canvas.width / 2 + (x * scale), y: HORIZON_Y + ((y - CAMERA_Y) * scale), scale: scale };
    }

    function spawnObstacle() {
        const lanes = [-1, 0, 1];
        const types = [
            { type: 'low', y: 0, w: 80, h: 40, color: '#e74c3c' }, 
            { type: 'high', y: -90, w: 60, h: 80, color: '#f1c40f' }, 
            { type: 'wall', y: 0, w: 90, h: 100, color: '#34495e' } 
        ];
        const t = types[Math.floor(Math.random() * types.length)];
        obstaclesArray.push({ lane: lanes[Math.floor(Math.random() * lanes.length)], z: Z_LIMIT, type: t.type, y: t.y, w: t.w, h: t.h, color: t.color });
    }

    // ==========================================
    // 6. ІГРОВИЙ ЦИКЛ
    // ==========================================
    function updateAndDraw() {
        if (isGameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0, 800, 400);
            ctx.fillStyle = '#e74c3c'; ctx.textAlign = 'center'; ctx.font = 'bold 55px Arial'; ctx.fillText('АВАРІЯ!', 400, 190);
            ctx.fillStyle = 'white'; ctx.font = '24px Arial'; ctx.fillText('Натисніть ENTER для рестарту', 400, 240);
            requestAnimationFrame(updateAndDraw); return;
        }

        ctx.clearRect(0, 0, 800, 400);

        ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, 800, HORIZON_Y); 
        ctx.fillStyle = '#95a5a6'; ctx.fillRect(0, HORIZON_Y, 800, 400 - HORIZON_Y); 

        speedMultiplier += 0.00015;
        const currentSpeed = 10 * speedMultiplier;
        score += currentSpeed * 0.01;

        player.update();

        ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2;
        for (let i = -1.5; i <= 1.5; i += 1) {
            const far = project(i * 150, 0, Z_LIMIT), near = project(i * 150, 0, 10);
            if (far && near) { ctx.beginPath(); ctx.moveTo(far.x, far.y); ctx.lineTo(near.x, near.y); ctx.stroke(); }
        }

        // Спавн перешкод
        if (Math.random() * 100 < 2.5) {
            if (obstaclesArray.length === 0 || obstaclesArray[0].z < Z_LIMIT - 350) {
                spawnObstacle();
            }
        }

        obstaclesArray.sort((a, b) => b.z - a.z);
        for (let i = obstaclesArray.length - 1; i >= 0; i--) {
            let obs = obstaclesArray[i];
            obs.z -= currentSpeed; 
            const proj = project(obs.lane * 150, obs.y, obs.z);

            if (proj) {
                const drawW = obs.w * proj.scale, drawH = obs.h * proj.scale;
                ctx.fillStyle = obs.color; ctx.fillRect(proj.x - drawW / 2, proj.y - drawH, drawW, drawH);

                // Колізія (Оновлена під новий зріст)
                if (obs.z < PLAYER_Z + 20 && obs.z > PLAYER_Z - 40 && Math.abs(player.visualLane - obs.lane) < 0.6) {
                    if (obs.type === 'low' && player.y > -obs.h) isGameOver = true;
                    // Якщо це високий знак (high), перевіряємо чи він пригнувся. Якщо пригнувся (isRolling) - висота хітбоксу 45, інакше 110.
                    else if (obs.type === 'high' && (player.y - (player.isRolling ? 45 : 110)) < obs.y) isGameOver = true;
                    else if (obs.type === 'wall') isGameOver = true;
                }
            }
            if (obs.z < 0) obstaclesArray.splice(i, 1);
        }

        const pProj = project(player.visualLane * 150, player.y, PLAYER_Z);
        if (pProj) player.draw(pProj);

        ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left';
        ctx.fillText(`Рахунок: ${Math.floor(score)}`, 20, 40);

        requestAnimationFrame(updateAndDraw);
    }

    console.log("Гра успішно ініціалізована!");
    updateAndDraw();
};
