// Змістили координати в центр нової великої карти (приблизно 20-й стовпець, 12-й рядок)
const enemiesList = [
    { x: TILE_SIZE * 19.5, y: TILE_SIZE * 11.5, color: '#ff0000', dir: 'up', size: TILE_SIZE * 0.8 },
    { x: TILE_SIZE * 20.5, y: TILE_SIZE * 11.5, color: '#ff8800', dir: 'left', size: TILE_SIZE * 0.8 },
    { x: TILE_SIZE * 21.5, y: TILE_SIZE * 11.5, color: '#aa00ff', dir: 'right', size: TILE_SIZE * 0.8 }
];

const possibleDirections = ['up', 'down', 'left', 'right'];
