const conveyor = document.getElementById('conveyor');
const scoreElement = document.getElementById('score');
let score = 0;

// Список ретро-предметів (емодзі замість картинок для початку)
const itemsList = [
    { icon: '🍔', type: 'food' },
    { icon: '🥤', type: 'drink' },
    { icon: '🍩', type: 'food' },
    { icon: '🍦', type: 'food' },
    { icon: '🍹', type: 'drink' }
];

function createItem() {
    const itemData = itemsList[Math.floor(Math.random() * itemsList.length)];
    const item = document.createElement('div');
    
    item.className = 'item';
    item.innerHTML = itemData.icon;
    
    // Початкова позиція (рандомно по горизонталі)
    item.style.left = Math.random() * (340) + 'px';
    item.style.top = '-60px';
    
    conveyor.appendChild(item);

    let topPos = -60;
    
    // Рух вниз
    const fallInterval = setInterval(() => {
        topPos += 2; // Швидкість падіння
        item.style.top = topPos + 'px';

        // Якщо предмет вилетів за межі екрана
        if (topPos > 600) {
            clearInterval(fallInterval);
            item.remove();
        }
    }, 20);

    // Обробка кліку
    item.onclick = () => {
        score += 10;
        scoreElement.innerText = `Бали: ${score}`;
        
        // Додаємо ефект "зникнення"
        item.style.transform = 'scale(0)';
        item.style.transition = '0.2s';
        
        setTimeout(() => {
            clearInterval(fallInterval);
            item.remove();
        }, 200);
    };
}

// Створювати новий предмет кожну секунду
setInterval(createItem, 1200);
