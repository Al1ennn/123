const canvas = document.getElementById('gameCanvas');
// Якщо canvas не знайдено в HTML, створимо його програмно (для безпеки)
if (!canvas) {
    document.body.innerHTML = '<canvas id="gameCanvas" width="800" height="400" style="background-color: #2c3e50;"></canvas>';
}
const ctx = document.getElementById('gameCanvas').getContext('2d');

// ==========================================
// 1. НАЛАШТУВАННЯ СКЕЛЕТА ТА РОЗМІРІВ
// ==========================================
const CONFIG = {
    x: 400,       // Позиція по X (по центру)
    y: 220,       // ПІДНЯТО ВИЩЕ: Позиція таза по Y 
    speed: 0.06,  // ЗМЕНШЕНО ШВИДКІСТЬ: Наскільки швидко він перебирає ногами (було 0.15)
    
    // Розміри кісток
    skel: {
        torso: { w: 34, h: 50 },
        thigh: { w: 14, h: 28 }, // Стегно
        calf:  { w: 12, h: 30 }, // Гомілка
        arm:   { w: 10, h: 22 }, // Плече
        forearm:{w: 10, h: 22 }  // Передпліччя
    },
    
    // Кольори (щоб виглядало як офіціант)
    colors: {
        skin: '#f1c40f',     // Шкіра
        skinDark: '#e67e22', // Шкіра (тінь для задніх кінцівок)
        shirt: '#ecf0f1',    // Біла футболка
        pants: '#2980b9',    // Сині шорти
        pantsDark: '#2c3e50',// Сині шорти (тінь)
        apron: '#bdc3c7',    // Фартух
        skate: '#e74c3c',    // Червоні ролики
        tray: '#95a5a6',     // Срібна таця
        glass: '#f1c40f'     // Лимонад
    }
};

let time = 0; // Внутрішній годинник для анімації

// ==========================================
// 2. БАЗОВА ФУНКЦІЯ СКЕЛЕТНОЇ АНІМАЦІЇ (Forward Kinematics)
// ==========================================
function drawJoint(ctx, x, y, width, length, angleInDegrees, color) {
    ctx.save();
    ctx.translate(x, y); // Переносимо точку відліку в суглоб
    ctx.rotate(angleInDegrees * Math.PI / 180); // Повертаємо
    
    ctx.fillStyle = color;
    // Малюємо деталь (центруємо по ширині, малюємо вниз)
    ctx.fillRect(-width / 2, 0, width, length);
    ctx.restore();
}

// ==========================================
// 3. МАЛЮВАННЯ ЧАСТИН ТІЛА
// ==========================================

// Малюємо ногу (Стегно -> Коліно -> Ролик)
function drawLeg(startX, startY, thighAngle, kneeAngle, isBackLeg) {
    const s = CONFIG.skel;
    const c = CONFIG.colors;
    const colorThigh = isBackLeg ? c.pantsDark : c.pants;
    const colorCalf = isBackLeg ? c.skinDark : c.skin;

    ctx.save();
    ctx.translate(startX, startY);

    // 1. СТЕГНО
    ctx.rotate(thighAngle * Math.PI / 180);
    ctx.fillStyle = colorThigh;
    ctx.fillRect(-s.thigh.w / 2, 0, s.thigh.w, s.thigh.h);

    // 2. ГОМІЛКА (відносно кінця стегна)
    ctx.translate(0, s.thigh.h);
    ctx.rotate(kneeAngle * Math.PI / 180);
    ctx.fillStyle = colorCalf;
    ctx.fillRect(-s.calf.w / 2, 0, s.calf.w, s.calf.h);

    // 3. РОЛИК (відносно кінця гомілки)
    ctx.translate(0, s.calf.h);
    ctx.fillStyle = '#ecf0f1'; // Білий черевик
    ctx.fillRect(-s.calf.w, 0, s.calf.w * 2, 15);
    ctx.fillStyle = c.skate;   // Колеса
    ctx.fillRect(-s.calf.w + 2, 15, s.calf.w * 2 - 4, 6);

    ctx.restore();
}

// Малюємо руку (Плече -> Лікоть -> Кисть)
function drawArm(startX, startY, shoulderAngle, elbowAngle, isBackArm, holdingTray = false) {
    const s = CONFIG.skel;
    const c = CONFIG.colors;
    const colorArm = isBackArm ? c.skinDark : c.skin;
    const colorSleeve = isBackArm ? '#bdc3c7' : c.shirt;

    ctx.save();
    ctx.translate(startX, startY);

    // 1. ПЛЕЧЕ (з коротким рукавом)
    ctx.rotate(shoulderAngle * Math.PI / 180);
    ctx.fillStyle = colorSleeve;
    ctx.fillRect(-s.arm.w / 2, 0, s.arm.w, s.arm.h - 5); // Рукав
    ctx.fillStyle = colorArm;
    ctx.fillRect(-s.arm.w / 2, s.arm.h - 5, s.arm.w, 5); // Шматок шкіри

    // 2. ПЕРЕДПЛІЧЧЯ
    ctx.translate(0, s.arm.h);
    ctx.rotate(elbowAngle * Math.PI / 180);
    ctx.fillStyle = colorArm;
    ctx.fillRect(-s.forearm.w / 2, 0, s.forearm.w, s.forearm.h);

    // 3. ТАЦЯ З ЛИМОНАДОМ (Якщо ця рука її тримає)
    if (holdingTray) {
        ctx.translate(0, s.forearm.h); // Переходимо в долоню
        // Робимо так, щоб таця завжди була горизонтальною, незалежно від кута руки
        // Для цього віднімаємо загальний кут нахилу плеча і ліктя
        ctx.rotate(-(shoulderAngle + elbowAngle) * Math.PI / 180); 
        
        // Малюємо тацю
        ctx.fillStyle = c.tray;
        ctx.beginPath();
        ctx.ellipse(15, -5, 25, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Малюємо стакан
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Скло
        ctx.fillRect(5, -25, 15, 20);
        ctx.fillStyle = c.glass; // Рідина
        ctx.fillRect(7, -20, 11, 13);
        // Лимон
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(5, -25, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ==========================================
// 4. ГОЛОВНИЙ ЦИКЛ (ЗБИРАЄМО ПЕРСОНАЖА)
// ==========================================
function updateAndDraw() {
    // Очищаємо екран (малюємо фон кафе)
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, 800, 280); // Стіна
    ctx.fillStyle = '#95a5a6'; ctx.fillRect(0, 280, 800, 120); // Підлога

    // Оновлюємо час для анімації (чим менший крок, тим повільніше)
    time += CONFIG.speed;

    // --- МАТЕМАТИКА РУХІВ (Кути в градусах) ---
    // Синусоїда (Math.sin) створює плавні коливання від -1 до 1
    const runCycle = Math.sin(time); 

    // Ноги (протифаза: коли одна йде вперед, інша назад)
    const rightThighAngle = runCycle * 35; 
    const leftThighAngle = -runCycle * 35; 
    
    // Коліна згинаються тільки тоді, коли нога йде назад і піднімається
    const rightKneeAngle = Math.max(0, Math.sin(time - Math.PI / 2) * 50);
    const leftKneeAngle = Math.max(0, Math.sin(time + Math.PI / 2) * 50);

    // Задня рука махає в протифазі до передньої ноги
    const backShoulderAngle = runCycle * 30; 
    const backElbowAngle = -20; // Трохи зігнута завжди

    // Передня рука ТРИМАЄ ТАЦЮ (майже не рухається)
    // Легке похитування для реалізму
    const frontShoulderAngle = 10 + Math.sin(time * 2) * 5; 
    const frontElbowAngle = -80 + Math.cos(time * 2) * 5; // Зігнута під 90 градусів

    // --- МАЛЮВАННЯ СКЕЛЕТА (ЗВЕРНИ УВАГУ НА ПОРЯДОК МАЛЮВАННЯ - ГЛИБИНА) ---
    
    const x = CONFIG.x;
    const y = CONFIG.y;
    const s = CONFIG.skel;
    const c = CONFIG.colors;

    // 1. ЗАДНЯ РУКА (Махає)
    drawArm(x - 10, y - s.torso.h + 10, backShoulderAngle, backElbowAngle, true, false);

    // 2. ЗАДНЯ НОГА (Ліва)
    drawLeg(x - 8, y, leftThighAngle, leftKneeAngle, true);

    // 3. ТУЛУБ
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(5 * Math.PI / 180); // Легкий нахил тіла вперед
    
    // Футболка
    ctx.fillStyle = c.shirt;
    ctx.fillRect(-s.torso.w / 2, -s.torso.h, s.torso.w, s.torso.h);
    // Фартух
    ctx.fillStyle = c.apron;
    ctx.fillRect(-s.torso.w / 2 - 2, -s.torso.h / 3, s.torso.w + 4, s.torso.h / 3 + 10);
    // Бантик від фартуха на спині
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-s.torso.w / 2 - 5, -s.torso.h / 3, 10, 8);

    // 4. ГОЛОВА ТА КАПЕЛЮХ
    // Шия
    ctx.fillStyle = c.skin;
    ctx.fillRect(-6, -s.torso.h - 8, 12, 10);
    // Голова
    ctx.beginPath();
    ctx.arc(0, -s.torso.h - 18, 15, 0, Math.PI * 2);
    ctx.fill();
    // Волосся (вид ззаду)
    ctx.fillStyle = '#5c3a21'; // Коричневе волосся
    ctx.beginPath();
    ctx.arc(0, -s.torso.h - 18, 16, Math.PI, Math.PI * 2);
    ctx.fill();
    // Капелюх ретро-кафе
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.moveTo(-12, -s.torso.h - 30);
    ctx.lineTo(12, -s.torso.h - 30);
    ctx.lineTo(0, -s.torso.h - 45);
    ctx.fill();
    ctx.fillStyle = c.pants; // Синя смужка на капелюсі
    ctx.fillRect(-10, -s.torso.h - 32, 20, 4);

    ctx.restore();

    // 5. ПЕРЕДНЯ НОГА (Права)
    drawLeg(x + 8, y, rightThighAngle, rightKneeAngle, false);

    // 6. ПЕРЕДНЯ РУКА З ТАЦЕЮ (Ближче до камери)
    drawArm(x + 15, y - s.torso.h + 10, frontShoulderAngle, frontElbowAngle, false, true);

    // Запускаємо наступний кадр
    requestAnimationFrame(updateAndDraw);
}

// Запуск
updateAndDraw();
