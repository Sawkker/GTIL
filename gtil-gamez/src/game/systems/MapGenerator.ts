export interface LevelData {
    width: number;
    height: number;
    walls: { x: number; y: number }[];
    doors: { x: number; y: number; vertical: boolean }[];
    playerStart: { x: number; y: number };
    enemySpawns: { x: number; y: number }[];
    rooms: { x: number; y: number; w: number; h: number; floorType: number }[];
    furniture: { x: number; y: number; type: string }[];
}

export class MapGenerator {
    static generateLevel(width: number, height: number, type: string = 'standard'): LevelData {
        if (type === 'dungeon') {
            return this.generateDungeon(width, height);
        } else if (type === 'terrace' || type === 'boss_terrace') {
            return this.generateTerrace(width, height);
        } else if (type === 'bridge') {
            return this.generateBridge(width, height);
        } else {
            return this.generateStandard(width, height);
        }
    }

    private static generateStandard(width: number, height: number): LevelData {
        // ... (Reuse existing logic but wrapped)
        return this.generateSimpleRooms(width, height);
    }
    private static generateBridge(width: number, height: number): LevelData {
        // Ignoring default width/height, forcing a long map
        const mapW = 100; // Very long
        const mapH = 20;  // Narrow height

        const walls: { x: number; y: number }[] = [];
        const doors: { x: number; y: number; vertical: boolean }[] = [];
        const enemySpawns: { x: number; y: number }[] = [];
        const rooms: { x: number; y: number; w: number; h: number; floorType: number }[] = [];
        const furniture: { x: number; y: number; type: string }[] = [];

        // Define the bridge strip (e.g., y=8 to y=12)
        const bridgeY = 8;
        const bridgeH = 6;

        // Floor
        rooms.push({ x: 0, y: bridgeY, w: mapW, h: bridgeH, floorType: 2 }); // Concrete floor

        // Walls (Railings)
        for (let x = 0; x < mapW; x++) {
            walls.push({ x: x, y: bridgeY - 1 }); // Top Rail
            walls.push({ x: x, y: bridgeY + bridgeH }); // Bottom Rail
        }

        // Periodic Obstacles (Cars? Barricades?)
        for (let x = 10; x < mapW - 10; x += 8) {
            // Randomly place obstacle
            if (Math.random() > 0.5) {
                furniture.push({ x: x * 32, y: (bridgeY + 1) * 32, type: 'table' }); // "Barricade"
                // Or walls
                walls.push({ x: x, y: bridgeY + 2 });
            } else {
                walls.push({ x: x, y: bridgeY + 4 });
            }
        }

        // Enemy Spawns (Hoards along the bridge)
        for (let x = 15; x < mapW - 5; x += 5) {
            enemySpawns.push({ x: x * 32, y: (bridgeY + 3) * 32 });
            if (x % 10 === 0) {
                enemySpawns.push({ x: x * 32, y: (bridgeY + 1) * 32 });
            }
        }

        const playerStart = { x: 2 * 32, y: (bridgeY + 3) * 32 };

        return { width: mapW, height: mapH, walls, doors, playerStart, enemySpawns, rooms, furniture };
    }

    private static removeWall(walls: { x: number, y: number }[], x: number, y: number) {
        // ... (Reuse existing logic but wrapped)
        return this.generateSimpleRooms(width, height);
    }

    // Kept for backward compatibility logic reuse
    static generateSimpleRooms(width: number, height: number): LevelData {
        const walls: { x: number; y: number }[] = [];
        const doors: { x: number; y: number; vertical: boolean }[] = [];
        const enemySpawns: { x: number; y: number }[] = [];
        const rooms: { x: number; y: number; w: number; h: number; floorType: number }[] = [];
        const furniture: { x: number; y: number; type: string }[] = [];

        // Initialize simple 2-room layout
        const room1 = { x: 2, y: 2, w: 10, h: 10, floorType: 0 };
        const room2 = { x: 18, y: 5, w: 12, h: 15, floorType: 1 };
        rooms.push(room1, room2);

        const corridorY = 6;
        const corridorStart = room1.x + room1.w;
        const corridorEnd = room2.x;

        // Walls
        const addRoomWalls = (r: { x: number, y: number, w: number, h: number }) => {
            for (let x = r.x; x <= r.x + r.w; x++) {
                for (let y = r.y; y <= r.y + r.h; y++) {
                    if (x === r.x || x === r.x + r.w || y === r.y || y === r.y + r.h) {
                        walls.push({ x, y });
                    }
                }
            }
        };

        addRoomWalls(room1);
        addRoomWalls(room2);

        for (let x = corridorStart; x < corridorEnd; x++) {
            walls.push({ x, y: corridorY - 1 });
            walls.push({ x, y: corridorY + 3 });
        }

        // Doors
        this.removeWall(walls, corridorStart, corridorY + 1);
        this.removeWall(walls, corridorStart, corridorY + 2);
        const door1Pos = { x: room1.x + room1.w, y: corridorY + 1 };
        this.removeWall(walls, door1Pos.x, door1Pos.y);
        doors.push({ x: door1Pos.x, y: door1Pos.y, vertical: true });

        const door2Pos = { x: room2.x, y: corridorY + 1 };
        this.removeWall(walls, door2Pos.x, door2Pos.y);
        doors.push({ x: door2Pos.x, y: door2Pos.y, vertical: true });

        const playerStart = { x: (room1.x + room1.w / 2) * 32, y: (room1.y + room1.h / 2) * 32 };

        enemySpawns.push({ x: (room2.x + 2) * 32, y: (room2.y + 2) * 32 });
        enemySpawns.push({ x: (room2.x + room2.w - 2) * 32, y: (room2.y + room2.h - 2) * 32 });
        enemySpawns.push({ x: (room2.x + 2) * 32, y: (room2.y + room2.h - 2) * 32 });

        // Props Placement
        // Room 1 (Grass/Garden): Add Trees
        if (room1.floorType === 0) {
            furniture.push({ x: (room1.x + 2) * 32, y: (room1.y + 2) * 32, type: 'tree' });
            furniture.push({ x: (room1.x + room1.w - 3) * 32, y: (room1.y + room1.h - 3) * 32, type: 'tree' });
        }

        // Room 2 (Interior): Add Crates
        furniture.push({ x: (room2.x + 2) * 32, y: (room2.y + 2) * 32, type: 'crate' });
        furniture.push({ x: (room2.x + 3) * 32, y: (room2.y + 2) * 32, type: 'crate' });
        furniture.push({ x: (room2.x + 2) * 32, y: (room2.y + 3) * 32, type: 'crate' });

        // Corridor/Strategic: Add Cannon
        furniture.push({ x: (corridorStart + 5) * 32, y: (corridorY + 1) * 32, type: 'cannon' });

        return { width, height, walls, doors, playerStart, enemySpawns, rooms, furniture };
    }

    private static generateDungeon(width: number, height: number): LevelData {
        // Grid of small rooms based on width/height
        const walls: { x: number; y: number }[] = [];
        const doors: { x: number; y: number; vertical: boolean }[] = [];
        const enemySpawns: { x: number; y: number }[] = [];
        const rooms: { x: number; y: number; w: number; h: number; floorType: number }[] = [];
        const furniture: { x: number; y: number; type: string }[] = [];

        // Parameters
        const rW = 10;
        const rH = 10;
        const gap = 4;

        // Calculate rows and cols
        const cols = Math.floor((width - 4) / (rW + gap));
        const rows = Math.floor((height - 4) / (rH + gap));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const room = {
                    x: 4 + col * (rW + gap),
                    y: 4 + row * (rH + gap),
                    w: rW,
                    h: rH,
                    floorType: 1 // Blue/Darker
                };
                rooms.push(room);

                // Walls
                for (let x = room.x; x <= room.x + room.w; x++) {
                    for (let y = room.y; y <= room.y + room.h; y++) {
                        if (x === room.x || x === room.x + room.w || y === room.y || y === room.y + room.h) {
                            walls.push({ x, y });
                        }
                    }
                }

                // Enemy in every room except first (spawn)
                if (row !== 0 || col !== 0) {
                    enemySpawns.push({ x: (room.x + 2) * 32, y: (room.y + 2) * 32 });
                    enemySpawns.push({ x: (room.x + room.w - 2) * 32, y: (room.y + room.h - 2) * 32 });
                }

                // Add Props (Crate/Table)
                if (Math.random() > 0.5) {
                    furniture.push({ x: (room.x + room.w / 2) * 32, y: (room.y + room.h / 2) * 32, type: 'crate' });
                }
            }
        }

        // Connect rooms horizontally
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols - 1; col++) {
                const r1 = rooms[row * cols + col];
                const r2 = rooms[row * cols + col + 1];
                const yH = r1.y + Math.floor(r1.h / 2);

                // Tunnel
                for (let x = r1.x + r1.w; x < r2.x; x++) {
                    walls.push({ x, y: yH - 1 });
                    walls.push({ x, y: yH + 1 });
                }
                this.removeWall(walls, r1.x + r1.w, yH);
                this.removeWall(walls, r2.x, yH);

                // Door?
                if (Math.random() > 0.3) {
                    doors.push({ x: r2.x, y: yH, vertical: true });
                }
            }
        }

        // Connect rooms vertically
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows - 1; row++) {
                const r1 = rooms[row * cols + col];
                const r2 = rooms[(row + 1) * cols + col];
                const xV = r1.x + Math.floor(r1.w / 2);

                // Tunnel
                for (let y = r1.y + r1.h; y < r2.y; y++) {
                    walls.push({ x: xV - 1, y });
                    walls.push({ x: xV + 1, y });
                }
                this.removeWall(walls, xV, r1.y + r1.h);
                this.removeWall(walls, xV, r2.y);
            }
        }

        const playerStart = { x: (rooms[0].x + 2) * 32, y: (rooms[0].y + 2) * 32 };

        return { width, height, walls, doors, playerStart, enemySpawns, rooms, furniture };
    }


    private static generateTerrace(width: number, height: number): LevelData {
        // Open concept, fewer walls, "Sky" implied by lack of walls/bounds
        const walls: { x: number; y: number }[] = [];
        const doors: { x: number; y: number; vertical: boolean }[] = [];
        const enemySpawns: { x: number; y: number }[] = [];
        const rooms: { x: number; y: number; w: number; h: number; floorType: number }[] = [];
        const furniture: { x: number; y: number; type: string }[] = [];

        // One giant platform
        const platform = { x: 5, y: 5, w: 22, h: 14, floorType: 2 }; // New floor type for terrace
        rooms.push(platform);

        // Edges are walls (fences)
        for (let x = platform.x; x <= platform.x + platform.w; x++) {
            walls.push({ x, y: platform.y });
            walls.push({ x, y: platform.y + platform.h });
        }
        for (let y = platform.y; y <= platform.y + platform.h; y++) {
            walls.push({ x: platform.x, y });
            walls.push({ x: platform.x + platform.w, y });
        }

        // Inner obstacles (planters/vents) - Move to corners to clear center
        // Top Left
        walls.push({ x: platform.x + 4, y: platform.y + 4 });
        walls.push({ x: platform.x + 5, y: platform.y + 4 });
        // Top Right
        walls.push({ x: platform.x + platform.w - 4, y: platform.y + 4 });
        walls.push({ x: platform.x + platform.w - 5, y: platform.y + 4 });
        // Bottom Left
        walls.push({ x: platform.x + 4, y: platform.y + platform.h - 4 });
        walls.push({ x: platform.x + 5, y: platform.y + platform.h - 4 });
        // Bottom Right
        walls.push({ x: platform.x + platform.w - 4, y: platform.y + platform.h - 4 });
        walls.push({ x: platform.x + platform.w - 5, y: platform.y + platform.h - 4 });

        // Spawns
        enemySpawns.push({ x: (platform.x + 2) * 32, y: (platform.y + 2) * 32 });
        enemySpawns.push({ x: (platform.x + platform.w - 2) * 32, y: (platform.y + 2) * 32 });
        enemySpawns.push({ x: (platform.x + platform.w - 2) * 32, y: (platform.y + platform.h - 2) * 32 });

        const playerStart = { x: (platform.x + platform.w / 2) * 32, y: (platform.y + platform.h / 2) * 32 };

        furniture.push({ x: (platform.x + 4) * 32, y: (platform.y + 10) * 32, type: 'cannon' });
        furniture.push({ x: (platform.x + platform.w - 4) * 32, y: (platform.y + 10) * 32, type: 'cannon' });
        furniture.push({ x: (platform.x + 10) * 32, y: (platform.y + 4) * 32, type: 'crate' });

        return { width, height, walls, doors, playerStart, enemySpawns, rooms, furniture };
    }

    private static removeWall(walls: { x: number, y: number }[], x: number, y: number) {
        const idx = walls.findIndex(w => w.x === x && w.y === y);
        if (idx !== -1) {
            walls.splice(idx, 1);
        }
    }
}
