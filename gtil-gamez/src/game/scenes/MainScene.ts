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

export class MainScene extends Scene {
    private keyQ!: Phaser.Input.Keyboard.Key;
    private pickups!: Phaser.Physics.Arcade.Group;

    private mapType: string = 'standard';

    constructor() {
        super('MainScene');
    }

    init(data: { mapType?: string, enemiesKilled?: number, health?: number, score?: number }) {
        this.mapType = data?.mapType || 'standard';
        this.totalEnemiesKilled = data?.enemiesKilled || 0;
        this.health = data?.health ?? 100;
        this.score = data?.score ?? 0;

        console.log('MainScene initialized with:', {
            mapType: this.mapType,
            enemiesKilled: this.totalEnemiesKilled,
            health: this.health,
            score: this.score
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

        // --- PLAYER WEAPON TEXTURES (Procedural) ---
        // 1. Pistol
        const pPistol = this.make.graphics({ x: 0, y: 0 });
        pPistol.fillStyle(0x0088ff); // Body Blue
        pPistol.fillCircle(20, 20, 12);
        pPistol.fillStyle(0x555555); // Gun Grey
        pPistol.fillRect(28, 17, 12, 6); // Short barrel
        pPistol.generateTexture('tex_player_pistol', 40, 40);

        // 2. Rifle
        const pRifle = this.make.graphics({ x: 0, y: 0 });
        pRifle.fillStyle(0x0088ff);
        pRifle.fillCircle(20, 20, 12);
        pRifle.fillStyle(0x333333); // Darker
        pRifle.fillRect(28, 17, 24, 6); // Long barrel
        pRifle.fillStyle(0x000000); // Mag/Stock hint
        pRifle.fillRect(25, 17, 8, 8);
        pRifle.generateTexture('tex_player_rifle', 52, 40); // Wider texture for long gun

        // 3. Shotgun
        const pShotgun = this.make.graphics({ x: 0, y: 0 });
        pShotgun.fillStyle(0x0088ff);
        pShotgun.fillCircle(20, 20, 12);
        pShotgun.fillStyle(0x222222); // Black
        pShotgun.fillRect(28, 16, 18, 8); // Thick barrel
        pShotgun.fillRect(28, 16, 4, 8); // Pump handle
        pShotgun.generateTexture('tex_player_shotgun', 50, 40);

        // ... (rest of map init) ...
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xffff00);
        graphics.fillRect(0, 0, 4, 4);
        graphics.generateTexture('bullet_texture', 4, 4);

        const wallGraphics = this.make.graphics({ x: 0, y: 0 });
        wallGraphics.fillStyle(0x1a1a1a);
        wallGraphics.fillRect(0, 0, 32, 32);
        wallGraphics.lineStyle(2, 0x00ffff);
        wallGraphics.strokeRect(0, 0, 32, 32);
        wallGraphics.fillStyle(0x00ffff, 0.2);
        wallGraphics.fillRect(4, 4, 24, 24);
        wallGraphics.generateTexture('wall_tile', 32, 32);

        const doorGraphics = this.make.graphics({ x: 0, y: 0 });
        doorGraphics.fillStyle(0x7f8c8d);
        doorGraphics.fillRect(0, 0, 32, 32);
        doorGraphics.lineStyle(2, 0xffaa00);
        doorGraphics.strokeRect(0, 0, 32, 32);
        doorGraphics.generateTexture('door_texture', 32, 32);

        // --- MAP GENERATION START ---

        // 1. Generate Level Data FIRST to get dimensions
        // distinct default size for standard maps vs others is handled inside generator or ignored
        this.levelData = MapGenerator.generateLevel(32, 24, this.mapType);

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

            // Create Walls Layer using NEON tileset
            // wallsLayer = map.createBlankLayer('Walls', wallTileset);
            const layer = map.createBlankLayer('Walls', wallTileset);
            if (layer) {
                this.wallsLayer = layer;

                // (LevelData already generated)

                // Initialize Blood Surface (Before items, after potential background)
                // Size of the map
                this.bloodSurface = this.add.renderTexture(0, 0, map.widthInPixels, map.heightInPixels);
                this.bloodSurface.setDepth(-0.5); // Above floors (depth -1), below walls/items (depth 0+)
                this.particleManager.setBloodSurface(this.bloodSurface);

                // 1. Draw Floors (Custom logic per room)
                // We'll use TileSprites for rooms to have distinct textures
                this.levelData.rooms.forEach(room => {
                    // Create a TileSprite for the floor
                    // We accept that 'floors' texture might need offset/crop, but for now just use it.
                    // To do it properly we'd need separate textures.
                    // For MVP, tint the basic tile or use the new texture as a patterned rect.

                    const floor = this.add.tileSprite(
                        (room.x * 32) + (room.w * 32) / 2,
                        (room.y * 32) + (room.h * 32) / 2,
                        room.w * 32,
                        room.h * 32,
                        'floors'
                    );

                    // Hacky texture selection:
                    if (room.floorType === 0) {
                        floor.setTint(0xffaaaa); // Red tint for "Rug"
                    } else if (room.floorType === 2) {
                        floor.setTint(0xcccccc); // Gray tint for "Terrace/Concrete"
                    } else {
                        floor.setTint(0xaaaaff); // Blue tint for "Tiles"
                    }
                    floor.setDepth(-1); // Below everything
                });

                // 2. Place Furniture
                // Use a standard group but configure objects as static-like manual bodies
                // This avoids StaticGroup 'isParent' issues in some Phaser versions/configs
                const furnitureGroup = this.physics.add.group({
                    immovable: true,
                    allowGravity: false
                });

                if (this.levelData.furniture) {
                    this.levelData.furniture.forEach(item => {
                        const furniture = furnitureGroup.create(item.x, item.y, 'furniture');

                        furniture.setScale(0.5);
                        if (furniture.body) {
                            furniture.body.moves = false; // Make it truly static
                        }

                        // Safety Check: Only set frame if texture is valid and has multiple frames
                        if (this.textures.exists('furniture')) {
                            const tex = this.textures.get('furniture');
                            if (tex.frameTotal > 1) {
                                const frames = tex.getFrameNames();
                                if (frames.length > 0) {
                                    furniture.setFrame(Phaser.Utils.Array.GetRandom(frames));
                                } else {
                                    const idx = Phaser.Math.Between(0, tex.frameTotal - 1);
                                    furniture.setFrame(idx);
                                }
                            }
                        }
                    });
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

            // Set world bounds to map size
            this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
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
            this.player = new Player(this, this.levelData.playerStart.x, this.levelData.playerStart.y);

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
                            this.scene.start('GameOverScene');
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
                            this.scene.start('GameOverScene', { victory: true, score: this.score });
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
    }

    update(time: number, delta: number) {
        if (!this.player) return;

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
            this.scene.start('GameOverScene');
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
