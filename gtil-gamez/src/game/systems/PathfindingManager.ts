import * as EasyStar from 'easystarjs';

export class PathfindingManager {
    private easystar: EasyStar.js;
    private tileSize: number = 32;
    private gridWidth: number = 32; // 1024 / 32
    private gridHeight: number = 24; // 768 / 32

    constructor() {
        this.easystar = new EasyStar.js();
        this.initializeGrid();
    }

    private initializeGrid() {
        const grid: number[][] = [];
        for (let y = 0; y < this.gridHeight; y++) {
            const row: number[] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                row.push(0); // 0 = walkable
            }
            grid.push(row);
        }
        this.easystar.setGrid(grid);
        this.easystar.setAcceptableTiles([0]);
    }

    updateGrid(layer: Phaser.Tilemaps.TilemapLayer) {
        // Reset grid to walkable
        const grid: number[][] = [];
        for (let y = 0; y < this.gridHeight; y++) {
            const row: number[] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                row.push(0);
            }
            grid.push(row);
        }

        // iterate over layer to find collidable tiles
        layer.forEachTile((tile) => {
            if (tile.collides) {
                grid[tile.y][tile.x] = 1; // 1 = obstacle
            }
        });

        this.easystar.setGrid(grid);
        this.easystar.setAcceptableTiles([0]);
    }

    findPath(startX: number, startY: number, endX: number, endY: number, callback: (path: { x: number, y: number }[] | null) => void) {
        const startTileX = Math.floor(startX / this.tileSize);
        const startTileY = Math.floor(startY / this.tileSize);
        const endTileX = Math.floor(endX / this.tileSize);
        const endTileY = Math.floor(endY / this.tileSize);

        // Ensure within bounds
        if (startTileX < 0 || startTileX >= this.gridWidth || startTileY < 0 || startTileY >= this.gridHeight ||
            endTileX < 0 || endTileX >= this.gridWidth || endTileY < 0 || endTileY >= this.gridHeight) {
            callback(null);
            return;
        }

        this.easystar.findPath(startTileX, startTileY, endTileX, endTileY, (path) => {
            if (path) {
                // Convert tile coordinates back to world coordinates (center of tile)
                const worldPath = path.map(p => ({
                    x: p.x * this.tileSize + this.tileSize / 2,
                    y: p.y * this.tileSize + this.tileSize / 2
                }));
                callback(worldPath);
            } else {
                callback(null);
            }
        });
        this.easystar.calculate();
    }

    getInstance() {
        return this.easystar;
    }
}
