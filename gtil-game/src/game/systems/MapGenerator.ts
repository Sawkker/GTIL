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
    static generateSimpleRooms(width: number, height: number): LevelData {
        const walls: { x: number; y: number }[] = [];
        const doors: { x: number; y: number; vertical: boolean }[] = [];
        const enemySpawns: { x: number; y: number }[] = [];
        const rooms: { x: number; y: number; w: number; h: number; floorType: number }[] = [];
        const furniture: { x: number; y: number; type: string }[] = [];

        // Initialize simple 2-room layout
        // Room 1: Living Room (Red Rug?)
        const room1 = { x: 2, y: 2, w: 10, h: 10, floorType: 0 };
        // Room 2: Bedroom (Blue Tile?)
        const room2 = { x: 18, y: 5, w: 12, h: 15, floorType: 1 };

        rooms.push(room1, room2);

        // Corridor connecting them
        const corridorY = 6;
        const corridorStart = room1.x + room1.w; // 12
        const corridorEnd = room2.x; // 18

        // Helper to add walls for a rect
        const addRoomWalls = (r: { x: number, y: number, w: number, h: number }) => {
            for (let x = r.x; x <= r.x + r.w; x++) {
                for (let y = r.y; y <= r.y + r.h; y++) {
                    // Only edges
                    if (x === r.x || x === r.x + r.w || y === r.y || y === r.y + r.h) {
                        walls.push({ x, y });
                    }
                }
            }
        };

        addRoomWalls(room1);
        addRoomWalls(room2);

        // Create corridor
        for (let x = corridorStart; x < corridorEnd; x++) {
            // Corridor floor (implicitly not walls)
            // Walls above and below
            walls.push({ x, y: corridorY - 1 });
            walls.push({ x, y: corridorY + 3 });
        }

        // Add Doors
        // Door 1: Exit of Room 1
        // Remove wall at connection
        this.removeWall(walls, corridorStart, corridorY + 1); // Center of corridor
        this.removeWall(walls, corridorStart, corridorY + 2); // Wider door? let's do 1 tile for now

        // actually remove wall at corridor start
        const door1Pos = { x: room1.x + room1.w, y: corridorY + 1 };
        // We added walls at edges of room1.
        // room1.x + room1.w is the right edge.
        this.removeWall(walls, door1Pos.x, door1Pos.y);
        doors.push({ x: door1Pos.x, y: door1Pos.y, vertical: true });

        // Door at Room 2 entrance
        const door2Pos = { x: room2.x, y: corridorY + 1 };
        // Room 2 left edge is room2.x
        this.removeWall(walls, door2Pos.x, door2Pos.y);
        doors.push({ x: door2Pos.x, y: door2Pos.y, vertical: true });

        // Player Start (Center of Room 1)
        const playerStart = {
            x: (room1.x + room1.w / 2) * 32,
            y: (room1.y + room1.h / 2) * 32
        };

        // Enemy Spawns (Room 2)
        // Add multiple spawns
        enemySpawns.push({ x: (room2.x + 2) * 32, y: (room2.y + 2) * 32 });
        enemySpawns.push({ x: (room2.x + room2.w - 2) * 32, y: (room2.y + room2.h - 2) * 32 });
        enemySpawns.push({ x: (room2.x + 2) * 32, y: (room2.y + room2.h - 2) * 32 });

        // Add some furniture
        // Room 1: Sofa
        furniture.push({ x: (room1.x + 2) * 32, y: (room1.y + 2) * 32, type: 'sofa' });
        furniture.push({ x: (room1.x + 5) * 32, y: (room1.y + 5) * 32, type: 'table' });

        // Room 2: Bed
        furniture.push({ x: (room2.x + room2.w - 3) * 32, y: (room2.y + 2) * 32, type: 'bed' });


        return {
            width,
            height,
            walls,
            doors,
            playerStart,
            enemySpawns,
            rooms,
            furniture
        };
    }

    private static removeWall(walls: { x: number, y: number }[], x: number, y: number) {
        const idx = walls.findIndex(w => w.x === x && w.y === y);
        if (idx !== -1) {
            walls.splice(idx, 1);
        }
    }
}
