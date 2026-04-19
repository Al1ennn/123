// controls.js

const controls = {
    up: false,
    down: false,
    left: false,
    right: false
};

// --- 1. УПРАВЛІННЯ З КЛАВІАТУРИ (ПК) ---
// Використовуємо e.code, щоб гра працювала навіть якщо включена українська розкладка (Ц, І, Ф, В)
window.addEventListener('keydown', (e) => {
    const key = e.code;
    if (key === 'KeyW' || key === 'ArrowUp') controls.up = true;
    if (key === 'KeyS' || key === 'ArrowDown') controls.down = true;
    if (key === 'KeyA' || key === 'ArrowLeft') controls.left = true;
    if (key === 'KeyD' || key === 'ArrowRight') controls.right = true;
});

window.addEventListener('keyup', (e) => {
    const key = e.code;
    if (key === 'KeyW' || key === 'ArrowUp') controls.up = false;
    if (key === 'KeyS' || key === 'ArrowDown') controls.down = false;
    if (key === 'KeyA' || key === 'ArrowLeft') controls.left = false;
    if (key === 'KeyD' || key === 'ArrowRight') controls.right = false;
});

// --- 2. УПРАВЛІННЯ З СЕНСОРНОГО ЕКРАНА (Мобільні та Планшети) ---
// Ця функція "прив'язує" екранні кнопки до наших рухів
const setupMobileButton = (id, action) => {
    const btn = document.getElementById(id);
    if (!btn) return; // Якщо кнопки немає (наприклад, ще не завантажилась), ігноруємо
    
    // Коли палець торкається екрана або кнопка миші затискається
    const startAction = (e) => { 
        e.preventDefault(); // Забороняє браузеру скролити сторінку
        controls[action] = true; 
    };
    
    // Коли палець відпускає екран або миша відпускається
    const endAction = (e) => { 
        e.preventDefault(); 
        controls[action] = false; 
    };
    
    // Додаємо слухачі для телефонів (touch)
    btn.addEventListener('touchstart', startAction, { passive: false });
    btn.addEventListener('touchend', endAction);
    btn.addEventListener('touchcancel', endAction);
    
    // Додаємо слухачі для мишки (на випадок, якщо хтось клікає по джойстику на ПК)
    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('mouseup', endAction);
    btn.addEventListener('mouseleave', endAction); // Якщо мишка "з'їхала" з кнопки
};

// Запускаємо підключення кнопок, щойно сторінка завантажиться
window.addEventListener('DOMContentLoaded', () => {
    setupMobileButton('btn-up', 'up');
    setupMobileButton('btn-down', 'down');
    setupMobileButton('btn-left', 'left');
    setupMobileButton('btn-right', 'right');
});
