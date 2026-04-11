// controls.js

// Тепер ми відстежуємо стан кожної кнопки окремо (true - натиснута, false - відпущена)
const controls = {
    up: false,
    down: false,
    left: false,
    right: false
};

window.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp': case 'w': controls.up = true; break;
        case 'ArrowDown': case 's': controls.down = true; break;
        case 'ArrowLeft': case 'a': controls.left = true; break;
        case 'ArrowRight': case 'd': controls.right = true; break;
    }
});

window.addEventListener('keyup', (e) => {
    switch(e.key) {
        case 'ArrowUp': case 'w': controls.up = false; break;
        case 'ArrowDown': case 's': controls.down = false; break;
        case 'ArrowLeft': case 'a': controls.left = false; break;
        case 'ArrowRight': case 'd': controls.right = false; break;
    }
});
