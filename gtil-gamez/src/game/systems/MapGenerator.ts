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
        } else if (type === 'terrace') {
            return this.generateTerrace(width, height);
        } else {
            return this.generateStandard(width, height);
        }
    }

    private static generateStandard(width: number, height: number): LevelData {
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

        furniture.push({ x: (room1.x + 2) * 32, y: (room1.y + 2) * 32, type: 'sofa' });
        furniture.push({ x: (room1.x + 5) * 32, y: (room1.y + 5) * 32, type: 'table' });
        furniture.push({ x: (room2.x + room2.w - 3) * 32, y: (room2.y + 2) * 32, type: 'bed' });

        return { width, height, walls, doors, playerStart, enemySpawns, rooms, furniture };
    }

    private static generateDungeon(width: number, height: number): LevelData {
        // Grid of 3x3 small rooms
        const walls: { x: number; y: number }[] = [];
        const doors: { x: number; y: number; vertical: boolean }[] = [];
        const enemySpawns: { x: number; y: number }[] = [];
        const rooms: { x: number; y: number; w: number; h: number; floorType: number }[] = [];
        const furniture: { x: number; y: number; type: string }[] = [];

        // Fill all with walls initially (or just add walls for rooms)
        // Let's make 4 rooms in a square
        const rW = 8;
        const rH = 8;
        const gap = 4;

        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
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

                // Enemy in every room except first
                if (row !== 0 || col !== 0) {
                    enemySpawns.push({ x: (room.x + 2) * 32, y: (room.y + 2) * 32 });
                    enemySpawns.push({ x: (room.x + room.w - 2) * 32, y: (room.y + room.h - 2) * 32 });
                }
            }
        }

        // Connect them
        // Horizontal connection (Room 0 -> 1)
        const yH = rooms[0].y + 4;
        for (let x = rooms[0].x + rooms[0].w; x < rooms[1].x; x++) {
            walls.push({ x, y: yH - 1 });
            walls.push({ x, y: yH + 1 }); // Narrow corridor
            // Floor logic handled by global tiles or specific render
        }
        // Remove walls for door
        this.removeWall(walls, rooms[0].x + rooms[0].w, yH);
        this.removeWall(walls, rooms[1].x, yH);
        doors.push({ x: rooms[1].x, y: yH, vertical: true });

        // Vertical connection (Room 0 -> 2)
        const xV = rooms[0].x + 4;
        for (let y = rooms[0].y + rooms[0].h; y < rooms[2].y; y++) {
            walls.push({ x: xV - 1, y: y });
            walls.push({ x: xV + 1, y: y });
        }
        this.removeWall(walls, xV, rooms[0].y + rooms[0].h);
        this.removeWall(walls, xV, rooms[2].y);

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

        // Inner obstacles (planters/vents)
        const obstacleX = 15;
        const obstacleY = 10;
        walls.push({ x: obstacleX, y: obstacleY });
        walls.push({ x: obstacleX + 1, y: obstacleY });
        walls.push({ x: obstacleX, y: obstacleY + 1 });
        walls.push({ x: obstacleX + 1, y: obstacleY + 1 });

        // Spawns
        enemySpawns.push({ x: (platform.x + 2) * 32, y: (platform.y + 2) * 32 });
        enemySpawns.push({ x: (platform.x + platform.w - 2) * 32, y: (platform.y + 2) * 32 });
        enemySpawns.push({ x: (platform.x + platform.w - 2) * 32, y: (platform.y + platform.h - 2) * 32 });

        const playerStart = { x: (platform.x + platform.w / 2) * 32, y: (platform.y + platform.h / 2) * 32 };

        furniture.push({ x: (platform.x + 4) * 32, y: (platform.y + 10) * 32, type: 'table' });

        return { width, height, walls, doors, playerStart, enemySpawns, rooms, furniture };
    }

    private static removeWall(walls: { x: number, y: number }[], x: number, y: number) {
        const idx = walls.findIndex(w => w.x === x && w.y === y);
        if (idx !== -1) {
            walls.splice(idx, 1);
        }
    }
}
