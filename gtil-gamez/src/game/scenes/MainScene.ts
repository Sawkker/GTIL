import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Player } from '../objects/Player';
import { Bullet } from '../objects/Bullet';
import { Enemy } from '../objects/Enemy';
import { Boss } from '../objects/Boss';
import { PathfindingManager } from '../systems/PathfindingManager';
import { ParticleManager } from '../systems/ParticleManager';
import { MapGenerator, LevelData } from '../systems/MapGenerator';
import { Door } from '../objects/Door';
import { WeaponPickup } from '../objects/WeaponPickup';
import { SoundManager } from '../systems/SoundManager';

import { StoryLevel } from '../data/StoryData';
import { StoryManager } from '../systems/StoryManager';

export class MainScene extends Scene {
    private keyQ!: Phaser.Input.Keyboard.Key;
    private pickups!: Phaser.Physics.Arcade.Group;

    private mapType: string = 'standard';
    private charType: string = 'commando';
    private isStoryMode: boolean = false;
    private victoryCondition: { type: 'kill_count', value: number } | null = null;
    private kills: number = 0;

    private storyLevelData: StoryLevel | null = null;
    private storyManager: StoryManager | null = null;

    constructor() {
        super('MainScene');
    }

    init(data: { mapType?: string, enemiesKilled?: number, health?: number, score?: number, charType?: string, storyLevel?: any }) {
        this.mapType = data?.mapType || 'standard';
        this.charType = data?.charType || 'commando';
        this.totalEnemiesKilled = data?.enemiesKilled || 0;
        this.health = data?.health ?? 100;
        this.score = data?.score ?? 0;

        // Story Mode
        if (data?.storyLevel) {
            this.isStoryMode = true;
            this.storyLevelData = data.storyLevel;
            this.victoryCondition = data.storyLevel.victoryCondition;
            this.kills = 0;
            this.score = 0; // Reset score for story level
        } else {
            this.isStoryMode = false;
            this.storyLevelData = null;
            this.victoryCondition = null;
        }

        console.log('MainScene initialized with:', {
            mapType: this.mapType,
            charType: this.charType,
            story: this.isStoryMode
        });
    }

    preload() {
        this.load.image('player', 'assets/player.png'); // Keep legacy for fallback
        this.load.image('final_boss', 'assets/final_boss_australian_spyder.png');
        this.load.spritesheet('player_feet', 'assets/player_feet.png', { frameWidth: 64, frameHeight: 64 }); // Assuming 64x64 frames
        this.load.image('player_handgun', 'assets/player_handgun.png');
        this.load.image('player_rifle', 'assets/player_handgun.png');
        this.load.image('player_shotgun', 'assets/player_handgun.png');
        this.load.image('tile', 'assets/tile.png');
        this.load.image('enemy', 'assets/enemy.png');
        // Load furniture as spritesheet (assuming 64x64 or similar grid)
        this.load.spritesheet('furniture', 'assets/furniture.png', { frameWidth: 64, frameHeight: 64 });
        this.load.image('floors', 'assets/floors.png');
        this.load.spritesheet('blood_splats', 'assets/blood_splats.png', { frameWidth: 32, frameHeight: 32 });
    }

    private player!: Player;
    public bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private pathfinding!: PathfindingManager;
    public particleManager!: ParticleManager;
    private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
    private doors!: Phaser.Physics.Arcade.Group;
    private levelData!: LevelData;
    private currentRound: number = 0;
    private maxRounds: number = 3;
    private keyE!: Phaser.Input.Keyboard.Key;
    private wasd!: any;
    private score: number = 0;
    private health: number = 100;
    private lastDamageTime: number = 0;
    private totalEnemiesKilled: number = 0;
    private soundManager!: SoundManager;

    // Blood Surface
    private bloodSurface!: Phaser.GameObjects.RenderTexture;

    create() {
        // Force Fade In to ensure screen isn't black from previous fade out
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // Create placeholder ammo texture
        const ammoGraphics = this.make.graphics({ x: 0, y: 0 });
        ammoGraphics.fillStyle(0x00ff00);
        ammoGraphics.fillRect(0, 0, 32, 32);
        ammoGraphics.lineStyle(2, 0x000000);
        ammoGraphics.strokeRect(0, 0, 32, 32);
        ammoGraphics.generateTexture('ammo_box', 32, 32);
        console.log('MainScene: create started');

        EventBus.emit('update-ui-state', 'PLAYING');

        // ... Anims ...
        if (!this.anims.exists('walk')) {
            this.anims.create({
                key: 'walk',
                frames: this.anims.generateFrameNumbers('player_feet', { start: 0, end: 7 }),
                frameRate: 15,
                repeat: -1
            });
        }

        // Initial values handled in init() or defaults
        this.currentRound = 0;

        // Initialize Pathfinding
        this.pathfinding = new PathfindingManager();

        // Initialize Particle Manager
        this.particleManager = new ParticleManager(this);

        // Initialize Sound Manager
        this.soundManager = new SoundManager(this);

        // ... Graphics Generation ...
        // Generate Ammo Textures (High Visibility Shapes)
        const pistolAmmo = this.make.graphics({ x: 0, y: 0 });
        pistolAmmo.fillStyle(0xffff00); // Yellow
        pistolAmmo.fillCircle(10, 10, 10);
        pistolAmmo.lineStyle(2, 0x000000);
        pistolAmmo.strokeCircle(10, 10, 10);
        pistolAmmo.generateTexture('ammo_pistol', 20, 20);

        const rifleAmmo = this.make.graphics({ x: 0, y: 0 });
        rifleAmmo.fillStyle(0x00ff00); // Green
        rifleAmmo.fillRect(0, 0, 20, 20);
        rifleAmmo.lineStyle(2, 0x000000);
        rifleAmmo.strokeRect(0, 0, 20, 20);
        rifleAmmo.generateTexture('ammo_rifle', 20, 20);

        const shotgunAmmo = this.make.graphics({ x: 0, y: 0 });
        shotgunAmmo.fillStyle(0xff0000); // Red
        shotgunAmmo.fillTriangle(10, 0, 20, 20, 0, 20);
        shotgunAmmo.lineStyle(2, 0x000000);
        shotgunAmmo.strokeTriangle(10, 0, 20, 20, 0, 20);
        shotgunAmmo.generateTexture('ammo_shotgun', 20, 20);

        // --- PLAYER WEAPON TEXTURES (Procedural: Granadero Style) ---
        // Granaderos: Blue Uniform, White Cross Belts, Black Shako with Red Plume
        const cUniform = 0x0000AA; // Dark Blue
        const cBelts = 0xFFFFFF;   // White
        const cSkin = 0xFFCCAA;
        const cHat = 0x111111;     // Black Shako
        const cPlume = 0xFF0000;   // Red Plume

        // Override charType to ensure we use our specific generic name or just use the existing logic but styled
        // For San Lorenzo, we'll force the style regardless of charType for now, or map them.
        const texturePrefix = `tex_player_${this.charType}`;

        // Helper to draw Granadero Body
        const drawGranadero = (g: Phaser.GameObjects.Graphics, x: number, y: number) => {
            // Body (Blue Uniform)
            g.fillStyle(cUniform);
            g.fillCircle(x, y, 14);
            // Cross Belts (White X)
            g.lineStyle(2, cBelts);
            g.lineBetween(x - 10, y - 10, x + 10, y + 10);
            g.lineBetween(x + 10, y - 10, x - 10, y + 10);
            // Head (Skin)
            g.fillStyle(cSkin);
            g.fillCircle(x, y, 9);
            // Shako Hat (Black Cylinder - Circle top down)
            g.fillStyle(cHat);
            g.fillCircle(x, y, 8);
            // Plume (Red dot)
            g.fillStyle(cPlume);
            g.fillCircle(x + 4, y - 4, 3);
        };

        // 1. Pistol (Compact)
        const pPistol = this.make.graphics({ x: 0, y: 0 });
        drawGranadero(pPistol, 20, 20);
        // Arms
        pPistol.fillStyle(cUniform); // Arm sleeves
        pPistol.fillCircle(30, 26, 4); // Right Hand
        pPistol.fillCircle(30, 14, 4); // Left Hand
        // Gun
        pPistol.fillStyle(0x555555);
        pPistol.fillRect(30, 17, 12, 6); // Slide
        pPistol.generateTexture(`${texturePrefix}_pistol`, 44, 40);

        // 2. Rifle (Long)
        const pRifle = this.make.graphics({ x: 0, y: 0 });
        drawGranadero(pRifle, 20, 20);
        // Arms
        pRifle.fillStyle(cUniform);
        pRifle.fillCircle(28, 24, 4);
        pRifle.fillCircle(40, 22, 4);
        // Gun (Musket style)
        pRifle.fillStyle(0x5D4037); // Brown Wood
        pRifle.fillRect(24, 18, 30, 4); // Stock
        pRifle.fillStyle(0x222222);
        pRifle.fillRect(40, 18, 24, 3); // Barrel
        pRifle.generateTexture(`${texturePrefix}_rifle`, 64, 40);

        // 3. Shotgun (Blunderbuss style)
        const pShotgun = this.make.graphics({ x: 0, y: 0 });
        drawGranadero(pShotgun, 20, 20);
        // Arms
        pShotgun.fillStyle(cUniform);
        pShotgun.fillCircle(28, 24, 4);
        pShotgun.fillCircle(45, 20, 4);
        // Gun (Blunderbuss)
        pShotgun.fillStyle(0x5D4037);
        pShotgun.fillRect(28, 17, 24, 6);
        pShotgun.fillStyle(0x222222); // Metal Flared Barrel
        pShotgun.fillTriangle(52, 20, 58, 15, 58, 25);
        pShotgun.generateTexture(`${texturePrefix}_shotgun`, 60, 40);

        // 4. Sable (Melee)
        const pSable = this.make.graphics({ x: 0, y: 0 });
        drawGranadero(pSable, 20, 20);
        // Arms (Holding sword up/forward)
        pSable.fillStyle(cUniform);
        pSable.fillCircle(32, 26, 4); // Right Hand
        pSable.fillCircle(30, 14, 4); // Left Hand
        // Saber
        pSable.lineStyle(2, 0xCCCCCC); // Silver Blade
        pSable.beginPath();
        pSable.moveTo(32, 26);
        pSable.lineTo(50, 16); // Blade pointing forward/diagonal
        pSable.strokePath();
        // Handle
        pSable.lineStyle(2, 0xCCAA00); // Gold Handle
        pSable.lineBetween(30, 28, 34, 24);
        pSable.generateTexture(`${texturePrefix}_sable`, 60, 40);

        // --- FX: SLASH ---
        const slash = this.make.graphics({ x: 0, y: 0 });
        slash.fillStyle(0xFFFFFF, 0.8);
        slash.slice(16, 16, 16, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45), false);
        slash.fillPath();
        slash.generateTexture('slash_effect', 32, 32);

        // --- FOOT TEXTURE ---
        const pFoot = this.make.graphics({ x: 0, y: 0 });
        pFoot.fillStyle(0x111111); // Black Boots
        pFoot.fillRoundedRect(0, 0, 12, 6, 2);
        pFoot.generateTexture('tex_foot', 12, 6);

        // --- ENEMY TEXTURE (Realistas: Red/White) ---
        // Generates 'enemy' texture to override the loaded one if possible, or we use a new key
        // We'll generate 'enemy_texture' and update Enemy class or alias it.
        const eGraphics = this.make.graphics({ x: 0, y: 0 });
        // Body (Red Coat)
        eGraphics.fillStyle(0xAA0000);
        eGraphics.fillCircle(16, 16, 14);
        // White Straps
        eGraphics.lineStyle(2, 0xFFFFFF);
        eGraphics.lineBetween(6, 6, 26, 26);
        eGraphics.lineBetween(26, 6, 6, 26);
        // Head
        eGraphics.fillStyle(cSkin);
        eGraphics.fillCircle(16, 16, 9);
        // Hat (Tricorn or similar dark hat)
        eGraphics.fillStyle(0x222222);
        eGraphics.fillTriangle(6, 6, 26, 6, 16, 26); // Simple Tricorn shape top down
        // Gun
        eGraphics.fillStyle(0x333333);
        eGraphics.fillRect(20, 14, 20, 4); // Musket
        eGraphics.generateTexture('enemy', 48, 32); // Overwrite 'enemy' key? Phaser might warn but it works usually if not in use yet. 
        // Actually, 'enemy' was loaded in preload. We should use a different name or destroy the old one.
        // Safer: 'tex_enemy'
        eGraphics.generateTexture('tex_enemy', 48, 32);

        // --- BOSS TEXTURE (Comandante Zabala) ---
        const bGraphics = this.make.graphics({ x: 0, y: 0 });
        // Royalist Officer Uniform (Red/White/Gold)
        // Body
        bGraphics.fillStyle(0xCC0000); // Bright Red
        bGraphics.fillCircle(24, 24, 20); // Larger body
        // Gold Epaulettes
        bGraphics.fillStyle(0xFFD700);
        bGraphics.fillCircle(10, 24, 6);
        bGraphics.fillCircle(38, 24, 6);
        // Cross Belts
        bGraphics.lineStyle(3, 0xFFFFFF);
        bGraphics.lineBetween(12, 12, 36, 36);
        bGraphics.lineBetween(36, 12, 12, 36);
        // Head
        bGraphics.fillStyle(cSkin);
        bGraphics.fillCircle(24, 24, 12);
        // Bicorne Hat (Black with Gold trim)
        bGraphics.fillStyle(0x111111);
        bGraphics.fillRoundedRect(4, 14, 40, 10, 2); // Hat base
        bGraphics.fillCircle(24, 18, 10); // Hat top
        bGraphics.fillStyle(0xFFD700); // Cockade
        bGraphics.fillCircle(24, 16, 3);

        bGraphics.generateTexture('tex_boss_zabala', 48, 48);

        // ... (rest of map init) ...
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xffff00);
        graphics.fillRect(0, 0, 4, 4);
        graphics.generateTexture('bullet_texture', 4, 4);

        const wallGraphics = this.make.graphics({ x: 0, y: 0 });
        wallGraphics.fillStyle(0x8B4513); // Adobe/Brick Brown
        wallGraphics.fillRect(0, 0, 32, 32);
        wallGraphics.lineStyle(2, 0x5D4037); // Darker Brown
        wallGraphics.strokeRect(0, 0, 32, 32);
        wallGraphics.fillStyle(0xA0522D, 0.5); // Lighter detail
        wallGraphics.fillRect(4, 4, 24, 24);
        wallGraphics.generateTexture('wall_tile', 32, 32);

        const doorGraphics = this.make.graphics({ x: 0, y: 0 });
        doorGraphics.fillStyle(0x7f8c8d);
        doorGraphics.fillRect(0, 0, 32, 32);
        doorGraphics.lineStyle(2, 0xffaa00);
        doorGraphics.strokeRect(0, 0, 32, 32);
        doorGraphics.generateTexture('door_texture', 32, 32);

        // --- PROPS TEXTURES (San Lorenzo Theme) ---
        // 1. Cannon (Cañon)
        const pCannon = this.make.graphics({ x: 0, y: 0 });
        // Wheels
        pCannon.fillStyle(0x8B4513); // Wood
        pCannon.fillCircle(10, 16, 8);
        pCannon.fillCircle(38, 16, 8);
        pCannon.lineStyle(2, 0x000000);
        pCannon.strokeCircle(10, 16, 8);
        pCannon.strokeCircle(38, 16, 8);
        // Barrel (Bronze)
        pCannon.fillStyle(0xcd7f32);
        pCannon.fillRect(8, 10, 32, 12);
        pCannon.lineStyle(2, 0x5a3a22);
        pCannon.strokeRect(8, 10, 32, 12);
        pCannon.generateTexture('tex_cannon', 48, 32);

        // 2. Tree (Ombú / Pino)
        const pTree = this.make.graphics({ x: 0, y: 0 });
        // Trunk
        pTree.fillStyle(0x5D4037);
        pTree.fillRect(26, 40, 12, 24);
        // Leaves (Clumps)
        pTree.fillStyle(0x228B22); // Forest Green
        pTree.fillCircle(32, 30, 20);
        pTree.fillCircle(20, 40, 16);
        pTree.fillCircle(44, 40, 16);
        pTree.fillCircle(32, 15, 14);
        pTree.generateTexture('tex_tree', 64, 64);

        // 3. Crate (Suministros)
        const pCrate = this.make.graphics({ x: 0, y: 0 });
        pCrate.fillStyle(0xC19A6B); // Light Wood
        pCrate.fillRect(0, 0, 32, 32);
        pCrate.lineStyle(2, 0x5D4037); // Dark Wood Frame
        pCrate.strokeRect(0, 0, 32, 32);
        // Diagonal bracing
        pCrate.lineBetween(0, 0, 32, 32);
        pCrate.lineBetween(32, 0, 0, 32);
        pCrate.generateTexture('tex_crate', 32, 32);


        // --- MAP GENERATION START ---

        // 1. Generate Level Data FIRST to get dimensions
        const mapW = this.storyLevelData?.mapWidth || 32;
        const mapH = this.storyLevelData?.mapHeight || 24;
        this.levelData = MapGenerator.generateLevel(mapW, mapH, this.mapType);

        // 2. Create Tilemap with correct dimensions from LevelData
        const map = this.make.tilemap({
            tileWidth: 32,
            tileHeight: 32,
            width: this.levelData.width,
            height: this.levelData.height
        });

        // Add Tilesets
        const tileset = map.addTilesetImage('tile', undefined, 32, 32);
        const wallTileset = map.addTilesetImage('wall_tile', undefined, 32, 32);

        if (tileset && wallTileset) {
            const groundLayer = map.createBlankLayer('Ground', tileset);
            groundLayer?.fill(0);

            // Create Walls Layer
            const layer = map.createBlankLayer('Walls', wallTileset);
            if (layer) {
                this.wallsLayer = layer;

                // Initialize Blood Surface
                this.bloodSurface = this.add.renderTexture(0, 0, map.widthInPixels, map.heightInPixels);
                this.bloodSurface.setDepth(-0.5);
                this.particleManager.setBloodSurface(this.bloodSurface);

                // 1. Draw Floors (Custom logic per room)
                this.levelData.rooms.forEach(room => {
                    const floor = this.add.tileSprite(
                        (room.x * 32) + (room.w * 32) / 2,
                        (room.y * 32) + (room.h * 32) / 2,
                        room.w * 32,
                        room.h * 32,
                        'floors'
                    );

                    // Hacky texture selection for San Lorenzo Theme:
                    if (room.floorType === 0) {
                        floor.setTint(0x558855); // Grass Green
                    } else if (room.floorType === 2) {
                        floor.setTint(0x888888); // Cobblestone Gray
                    } else {
                        floor.setTint(0x8B7355); // Dirt/Ground Brown
                    }
                    floor.setDepth(-1); // Below everything
                });

                // 2. Place Furniture
                // Use a standard group but configure objects as static-like manual bodies
                const furnitureGroup = this.physics.add.group({
                    immovable: true,
                    allowGravity: false
                });

                if (this.levelData.furniture) {
                    this.levelData.furniture.forEach(item => {
                        let textureKey = 'furniture'; // fallback
                        let isProp = false;

                        // Map themes to textures
                        if (item.type === 'cannon') {
                            textureKey = 'tex_cannon';
                            isProp = true;
                        } else if (item.type === 'tree') {
                            textureKey = 'tex_tree';
                            isProp = true;
                        } else if (item.type === 'crate') {
                            textureKey = 'tex_crate';
                            isProp = true;
                        } else {
                            // Fallback for legacy types (table, bed, etc.) if we don't change MapGenerator yet
                            // Or map them:
                            if (item.type === 'table' || item.type === 'bed') textureKey = 'tex_crate';
                        }

                        const furniture = furnitureGroup.create(item.x, item.y, textureKey);

                        if (isProp) {
                            furniture.setScale(1);
                        } else {
                            furniture.setScale(0.5); // Legacy scaling
                        }

                        if (furniture.body) {
                            furniture.body.moves = false; // Make it truly static
                            // Adjust body size for trees
                            if (item.type === 'tree') {
                                furniture.body.setCircle(12, 20, 40); // Small trunk collider
                            }
                        }

                        // Frame setting only for legacy 'furniture' spritesheet
                        if (textureKey === 'furniture' && this.textures.exists('furniture')) {
                            const tex = this.textures.get('furniture');
                            if (tex.frameTotal > 1) {
                                const frames = tex.getFrameNames();
                                if (frames.length > 0) {
                                    furniture.setFrame(Phaser.Utils.Array.GetRandom(frames));
                                }
                            }
                        }

                        // AMBIENT MOVEMENT: Swaying Trees
                        if (textureKey === 'tex_tree') {
                            this.tweens.add({
                                targets: furniture,
                                angle: { from: -2, to: 2 },
                                duration: 2000 + Math.random() * 1000,
                                yoyo: true,
                                repeat: -1,
                                ease: 'Sine.easeInOut'
                            });
                        }
                    });
                }

                // AMBIENT LIGHTING: Night Mode for 'Madrugada'
                if (this.isStoryMode && this.storyLevelData?.date.includes('Madrugada')) {
                    // Dark Blue Overlay
                    const overlay = this.add.rectangle(0, 0, map.widthInPixels, map.heightInPixels, 0x050510, 0.5)
                        .setOrigin(0, 0)
                        .setDepth(100); // Top of everything

                    // Vignette (simple radial gradient approximation using image or just overlay is enough for now)
                    console.log('Night Mode Enabled: Madrugada');
                }

                // Place Walls
                this.levelData.walls.forEach(w => {
                    this.wallsLayer.putTileAt(0, w.x, w.y);
                });

                this.wallsLayer.setCollisionByExclusion([-1]);

                // Update Pathfinding
                this.pathfinding.updateGrid(this.wallsLayer);

                // Place Doors
                this.doors = this.physics.add.group({
                    classType: Door,
                    runChildUpdate: true
                });

                this.levelData.doors.forEach(d => {
                    const wx = d.x * 32 + 16;
                    const wy = d.y * 32 + 16;
                    const door = new Door(this, wx, wy, 'door_texture', d.vertical);
                    this.doors.add(door);
                });
            }
        } // Close if (layer) AND if (tileset)

        // Set world bounds to map size
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.physics.world.TILE_BIAS = 48; // Increase bias to prevent tunneling at high speeds
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Initialize Bullet Group
        this.bullets = this.physics.add.group({
            classType: Bullet,
            runChildUpdate: true
        });

        // Initialize Enemy Group
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true,
            collideWorldBounds: true
        });

        // Initialize Player
        this.player = new Player(this, this.levelData.playerStart.x, this.levelData.playerStart.y, this.charType);

        // Camera Follow
        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
        this.cameras.main.setZoom(1); // Ensure zoom is 1 (or change if we want 1.5x)


        // --- COLLISION SETUP (Reordered for Wall safety) ---
        if (this.wallsLayer) {
            this.physics.add.collider(this.player, this.wallsLayer);

            // Bullets vs Walls (Defined BEFORE Enemies to prevent shoot-through)
            this.physics.add.collider(this.bullets, this.wallsLayer, (bullet, tile) => {
                const b = bullet as Bullet;
                if (!b.active) return;
                this.particleManager.emitWallHit(b.x, b.y);
                b.kill();
            });

            // Enemies vs Walls
            this.physics.add.collider(this.enemies, this.wallsLayer);

            // Enemies vs Player (Physical push)
            this.physics.add.collider(this.player, this.enemies, (obj1, obj2) => {
                this.handlePlayerEnemyCollision(obj1 as Player, obj2 as Enemy);
            });

            // Collisions with Doors
            this.physics.add.collider(this.player, this.doors);
            this.physics.add.collider(this.enemies, this.doors);
            this.physics.add.collider(this.bullets, this.doors, (bullet, door) => {
                const b = bullet as Bullet;
                const d = door as Door;
                // Destroy bullet if door is closed (collidable)
                // Note: Arcade physics collision happens if body is enabled.
                // Our toggle logic disables body if open.
                // So if we are here, it's closed.
                if (!d.isOpen) {
                    this.particleManager.emitWallHit(b.x, b.y);
                    b.kill();
                }
            });
            // Bullets vs Enemies
            this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
                const e = enemy as Enemy;
                const b = bullet as Bullet;

                if (!b.active || !e.active) return;

                // Prevent friendly fire (Enemies don't hit enemies)
                if (b.ownerType === 'enemy') {
                    return;
                }

                console.log(`Bullet Hit Enemy (ID: ${e.getData('id') || '?'})`);
                console.log(`Enemy Hit by Bullet! Owner: ${b.ownerType}, Damage: ${b.damage}`);
                e.hit(b.damage);
                b.kill();
            });

            // Bullets vs Player
            this.physics.add.overlap(this.bullets, this.player, (bullet, player) => {
                const b = bullet as Bullet;
                // Strict owner check
                if (b.ownerType === 'enemy' && b.active) {
                    console.log('DEBUG: Player hit by enemy bullet! Damage:', b.damage);
                    b.kill();

                    // Player Hit Logic
                    this.health -= 10;
                    EventBus.emit('health-change', this.health);
                    this.cameras.main.shake(100, 0.01);

                    console.log('Player Hit! Health:', this.health);

                    if (this.health <= 0) {
                        console.log('GAME OVER');
                        this.scene.start('GameOverScene', { score: this.score, charType: this.charType });
                    }
                }
            });


            // Setup Input
            this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
            this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
            this.wasd = this.input.keyboard!.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            }) as any;

            // Initialize Pickups Group (Deferred from enemy creation, but good to have group ready if we manage it here)
            // Actually, Enemy creates the Sprite. We just need to ensure physics works.
            // Better pattern: Enemies add to a scene group, or we handle it dynamically?
            // For now, let's overlap with dynamic objects check or a dedicated group.
            // Simplest: Enemy creates it, scene detects it via a global Group if added.
            // BUT: In Phaser, if an object adds itself to scene.physics.add.existing, it has a body.
            // We can't easily collide "all pickups" unless they are in a Group.
            // Ideally, MainScene should manage the group.

            // Initialize Pickups Group
            this.pickups = this.physics.add.group({
                classType: WeaponPickup,
                runChildUpdate: true
            });
            // Hack to expose to enemies (bad practice but quick fix)
            (this as any).pickupGroup = this.pickups;

            this.physics.add.overlap(this.player, this.pickups, (player, pickup) => {
                const p = player as Player;
                const w = pickup as WeaponPickup;

                // Interaction logic: Auto-pickup or interact?
                // User asked: "si es arma que ya tengo que sume las balas"

                // Let's implement Auto-Pickup for now logic simplicity or check invalid input
                // Auto-pickup when walking over
                p.handlePickup(w);
            });





            this.add.text(10, 10, 'WASD to Move, Click to Shoot', {
                fontSize: '16px',
                color: '#ffffff'
            }).setScrollFactor(0);

            // Initialize Room tracking (could be optimized)
            this.time.addEvent({
                delay: 500,
                loop: true,
                callback: () => {
                    this.updateRoomOccupancy();
                }
            });

            EventBus.emit('current-scene-ready', this);
            // Initial Emit
            this.time.delayedCall(100, () => {
                if (this.scene.key === 'MainScene') {
                    EventBus.emit('score-change', this.score);
                    EventBus.emit('health-change', this.health);

                    // FORCE INITIAL WEAPON UI UPDATE
                    const weaponName = this.player.getCurrentWeaponName();
                    // Default pistol is infinite
                    this.events.emit('ammo-change', 'Inf');
                }
            });

            // Listen for enemy death to respawn
            this.events.on('enemy-died', () => {
                this.totalEnemiesKilled++;
                // SCORING IMPLEMENTATION
                this.score += 100;
                EventBus.emit('score-change', this.score);

                // Logic: Change map every 23 kills -> Boss Map
                if (this.totalEnemiesKilled === 23) {
                    console.log('23 Kills Reached! Traveling to Final Boss...');
                    this.physics.pause();
                    this.cameras.main.fade(1000, 0, 0, 0, false, (camera: any, progress: number) => {
                        if (progress === 1) {
                            // Transition to Boss Map
                            this.scene.restart({
                                mapType: 'boss_terrace',
                                charType: this.charType,
                                enemiesKilled: this.totalEnemiesKilled,
                                health: this.health,
                                score: this.score
                            });
                        }
                    });
                } else if (this.totalEnemiesKilled < 23) {
                    // Regular respawn logic
                    this.time.delayedCall(5000, () => {
                        if (this.mapType !== 'boss_terrace') { // Don't respawn regulars in boss map
                            this.spawnEnemies(1);
                        }
                    });
                }
            });

            // Listen for Boss Death
            this.events.on('boss-died', () => {
                console.log('BOSS DEFEATED!');
                this.physics.pause();

                this.cameras.main.fade(2000, 0, 0, 0, false, (camera: any, progress: number) => {
                    if (progress === 1) {
                        this.scene.start('GameOverScene', { victory: true, score: this.score, charType: this.charType });
                    }
                });
            });

            // Start the game loop
            // If this is the Boss Map, start the Boss Wave immediately
            if (this.mapType === 'boss_terrace') {
                this.time.delayedCall(1000, () => {
                    this.spawnBossWave();
                });
            } else {
                this.startNextRound();
            }

        }
    }

    gameOver(victory: boolean) {
        this.physics.pause();
        this.scene.start('GameOverScene', {
            victory: victory,
            score: this.score,
            charType: this.charType
        });
        // --- STORY MANAGER INIT ---
        if (this.isStoryMode && this.storyLevelData) {
            this.storyManager = new StoryManager(this, this.storyLevelData);
        }

    }

    update(time: number, delta: number) {
        if (!this.player) return;

        if (this.storyManager) {
            this.storyManager.update(time, delta);
        }

        // Note: Bullets and Enemies updated automatically via runChildUpdate: true

        this.player.update(this.input.keyboard?.createCursorKeys(), this.wasd);
        this.player.setRotationToPointer(this.input.activePointer);

        // Weapon Switching
        if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
            this.player.nextWeapon();
        }

        // Shooting
        if (this.input.activePointer.isDown) {
            this.player.shoot(this.bullets, time);
        }

        // Interaction
        if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
            // Find nearest door
            let nearest: Door | null = null;
            let minDst = 64; // Interaction range

            this.doors.children.iterate((entry: Phaser.GameObjects.GameObject) => {
                const d = entry as Door;
                const dst = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.x, d.y);
                if (dst < minDst) {
                    minDst = dst;
                    nearest = d;
                }
                return true;
            });

            if (nearest) {
                (nearest as Door).toggle();
            }
        }

        // Listen for Minion Spawns from Boss
        this.events.on('spawn-minion', (x: number, y: number) => {
            if (!this.wallsLayer || !this.player) return; // Safety check
            // Create standard enemy
            // Use PathfindingManager instance
            const enemy = new Enemy(this, x, y, this.player, this.pathfinding, this.wallsLayer);
            this.enemies.add(enemy);

            // Ensure minion has death logic
            enemy.on('died', () => {
                this.kills++;
                // Story Mode Victory Check (for Minions)
                if (this.isStoryMode && this.victoryCondition) {
                    if (this.victoryCondition.type === 'kill_count' && this.kills >= this.victoryCondition.value) {
                        // Check if Boss is also dead? No, usually kill count includes minions or is separate.
                        // For Level 3, victory is Kill Count 15. Boss is 1. Minions are 14.
                        // If we want Boss death to be mandatory, we should check boss state or make Boss death the trigger.
                        // But 'kill_count' is generic. Let's stick to it.
                        this.gameOver(true);
                    }
                }
            });
        });


    }

    startNextRound() {
        if (this.currentRound >= this.maxRounds) {
            console.log('All rounds complete!');

            // VICTORY SEQUENCE
            const winText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'VICTORY!', {
                fontSize: '64px',
                color: '#00ff00',
                fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0);

            // Reward
            this.score += 1000;
            this.health = 100;
            EventBus.emit('score-change', this.score);
            EventBus.emit('health-change', this.health);

            // Cleanup projectiles
            this.bullets.clear(true, true);
            this.enemies.clear(true, true);

            return;
        }

        this.currentRound++;
        console.log(`Starting Round ${this.currentRound}`);

        // Show Round Text
        const roundText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, `Round ${this.currentRound}`, {
            fontSize: '32px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: roundText,
            alpha: 0,
            duration: 2000,
            onComplete: () => roundText.destroy()
        });

        this.spawnEnemies(3);
    }

    spawnEnemies(count: number) {
        if (!this.wallsLayer) return;

        for (let i = 0; i < count; i++) {
            // Pick a random room
            const room = Phaser.Utils.Array.GetRandom(this.levelData.rooms);
            if (!room) continue;

            // Pick a random spot in the room (padded)
            let x = Phaser.Math.Between((room.x + 1) * 32, (room.x + room.w - 1) * 32);
            let y = Phaser.Math.Between((room.y + 1) * 32, (room.y + room.h - 1) * 32);

            // Simple distance check from player to avoid instant spawn kill
            if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 150) {
                // Try one more time
                x = Phaser.Math.Between((room.x + 1) * 32, (room.x + room.w - 1) * 32);
                y = Phaser.Math.Between((room.y + 1) * 32, (room.y + room.h - 1) * 32);
            }

            const enemy = new Enemy(this, x, y, this.player, this.pathfinding, this.wallsLayer);

            // Enemy Death Event
            enemy.on('died', () => {
                this.kills++;
                EventBus.emit('score-change', this.score + (this.kills * 100)); // Dummy score update

                // Story Mode Victory Check
                if (this.isStoryMode && this.victoryCondition) {
                    if (this.victoryCondition.type === 'kill_count' && this.kills >= this.victoryCondition.value) {
                        this.gameOver(true); // Victory!
                    }
                }
            });

            this.enemies.add(enemy);
        }
    }

    spawnBossWave() {
        // Warning Text
        const warnText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'FINAL BOSS + 23 MINIONS', {
            fontSize: '48px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0);

        this.tweens.add({
            targets: warnText,
            alpha: 0,
            yoyo: true,
            repeat: 5,
            duration: 200,
            onComplete: () => warnText.destroy()
        });

        // Spawn Boss (Find center of terrace)
        // Terrace is ~ 22x14. Center ~ 11, 7.
        let x = 11 * 32, y = 7 * 32;

        // If rooms exist (it should), use logic
        if (this.levelData.rooms.length > 0) {
            const r = this.levelData.rooms[0]; // Terrace usually has 1 big room
            x = (r.x + r.w / 2) * 32;
            y = (r.y + r.h / 2) * 32;
        }

        const boss = new Boss(this, x, y, this.player, this.pathfinding, this.wallsLayer);
        console.log(`SPAWNING BOSS AT: ${x}, ${y} (Tile: ${x / 32}, ${y / 32})`);
        this.enemies.add(boss);
        this.events.emit('boss-spawn');

        // Spawn 23 Minions as requested
        // Stagger them slightly so it doesn't lag instant spawn
        this.time.delayedCall(1500, () => {
            this.spawnEnemies(23);
        });
    }

    handlePlayerEnemyCollision(player: Player, enemy: Enemy) {
        if (enemy.isDead) return;

        const now = this.time.now;
        if (now - this.lastDamageTime < 1000) {
            return; // Invulnerable
        }

        this.lastDamageTime = now;
        this.health -= 10; // Fixed damage for now
        EventBus.emit('health-change', this.health);

        console.log('Player Damaged by Enemy! Health:', this.health);

        // Visual Feedback
        this.cameras.main.shake(200, 0.01);
        player.setTint(0xff0000);
        this.time.delayedCall(200, () => {
            player.clearTint();
        });

        // Knockback (Simple)
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        const knockbackForce = 300;
        player.body!.velocity.x = Math.cos(angle) * knockbackForce;
        player.body!.velocity.y = Math.sin(angle) * knockbackForce;

        if (this.health <= 0) {
            console.log('GAME OVER');
            this.scene.start('GameOverScene', { score: this.score, charType: this.charType });
        }
    }

    updateRoomOccupancy() {
        if (!this.levelData || !this.player) return;

        // Helper to find room for x,y
        const findRoomOptions = (x: number, y: number) => {
            // Convert to tile coords
            const tx = Math.floor(x / 32);
            const ty = Math.floor(y / 32);

            // Check rooms
            for (let i = 0; i < this.levelData.rooms.length; i++) {
                const r = this.levelData.rooms[i];
                if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
                    return i;
                }
            }
            return -1;
        };

        const playerRoom = findRoomOptions(this.player.x, this.player.y);

        this.enemies.children.iterate((entry: Phaser.GameObjects.GameObject) => {
            const enemy = entry as Enemy;
            if (!enemy.active || enemy.isDead) return true;

            const enemyRoom = findRoomOptions(enemy.x, enemy.y);
            enemy.roomId = enemyRoom;

            // AI REACTION: If in same room as player, ALERT/CHASE
            if (playerRoom !== -1 && enemyRoom === playerRoom) {
                enemy.alertToPlayerInRoom();
            }
            return true;
        });
    }
}
