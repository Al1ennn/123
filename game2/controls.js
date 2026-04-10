// Стан управління
const controls = {
    direction: null
};

window.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
            controls.direction = 'up';
            break;
        case 'ArrowDown':
        case 's':
            controls.direction = 'down';
            break;
        case 'ArrowLeft':
        case 'a':
            controls.direction = 'left';
            break;
        case 'ArrowRight':
        case 'd':
            controls.direction = 'right';
            break;
    }
});

// Зупинка при відпусканні клавіші (необов'язково для Пакмена, але ми додамо для тесту)
window.addEventListener('keyup', (e) => {
     // Щоб офіціант продовжував їхати, поки не натиснуть іншу кнопку
     //controls.direction = null; 
});
