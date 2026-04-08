// ==========================================
// ФАЙЛ: config.js (Для 8 кадрів бігу)
// ==========================================

const GAME_CONFIG = {
    
    // 1. НАЛАШТУВАННЯ АНІМАЦІЙ
    animations: {
        run: {
            // Крутимо всі 8 кадрів по колу
            frames: [0, 1, 2, 3, 4, 5, 6, 7], 
            // Оскільки кадрів багато, швидкість можна поставити 4 або 5, 
            // щоб він не перебирав ногами занадто повільно
            speed: 5  
        },
        jump: {
            // Для стрибка вибираємо один найкращий кадр з масиву jump (наприклад, 3-й)
            frames: [3], 
            speed: 999 
        },
        roll: {
            // Для присідання (якщо немає окремого, беремо кадр зі згрупованим тілом)
            frames: [6], 
            speed: 999 
        }
    },

    // 2. ФІЗИКА ТА РУХ
    physics: {
        gravity: 1.5,          
        jumpPower: -20,        
        laneSmoothness: 0.1,   
        baseSpeed: 10,         
        acceleration: 0.00015  
    },

    // 3. ПАРАМЕТРИ ГРАВЦЯ
    player: {
        width: 70,             
        height: 90,            
        rollHeight: 50,        
        rollDuration: 40       
    },

    // 4. ТВОЇ ФАЙЛИ (АСЕТИ)
    assets: {
        run: [
            // Завантажуємо всі 8 твоїх webp файлів
            'waiter_run_0.webp', 
            'waiter_run_1.webp', 
            'waiter_run_2.webp', 
            'waiter_run_3.webp',
            'waiter_run_4.webp', 
            'waiter_run_5.webp', 
            'waiter_run_6.webp', 
            'waiter_run_7.webp'
        ],
        jump: [
            'waiter_jump_0.jpg',
            'waiter_jump_1.jpg',
            'waiter_jump_2.jpg',
            'waiter_jump_3.jpg',
            'waiter_jump_4.jpg',
            'waiter_jump_5.jpg'
        ],
        obstacles: {
            low: 'puddle.png',
            high: 'sign.png',
            wall: 'boxes.png'
        }
    }
};
