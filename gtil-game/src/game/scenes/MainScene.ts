import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Player } from '../objects/Player';
import { Bullet } from '../objects/Bullet';
import { Enemy } from '../objects/Enemy';
import { PathfindingManager } from '../systems/PathfindingManager';
import { ParticleManager } from '../systems/ParticleManager';

export class MainScene extends Scene {
    private keyQ!: Phaser.Input.Keyboard.Key;

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('player', 'assets/player.png'); // Keep legacy for fallback
        this.load.spritesheet('player_feet', 'assets/player_feet.png', { frameWidth: 64, frameHeight: 64 }); // Assuming 64x64 frames
        this.load.image('player_handgun', 'assets/player_handgun.png');
        this.load.image('player_rifle', 'assets/player_rifle.png');
        this.load.image('player_shotgun', 'assets/player_shotgun.png');
        this.load.image('tile', 'assets/tile.png');
        this.load.image('enemy', 'assets/enemy.png');
    }



    private player!: Player;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private pathfinding!: PathfindingManager;
    public particleManager!: ParticleManager;
    private wallsLayer!: Phaser.Tilemaps.TilemapLayer; // Promoted to property
    private currentRound: number = 0;
    private maxRounds: number = 3;
    private wasd!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };

    private score: number = 0;
    private health: number = 100;

    create() {
        console.log('MainScene: create started');

        // Create Animations
        if (!this.anims.exists('walk')) {
            this.anims.create({
                key: 'walk',
                frames: this.anims.generateFrameNumbers('player_feet', { start: 0, end: 7 }),
                frameRate: 15,
                repeat: -1
            });
        }

        this.score = 0;
        this.health = 100;
        this.currentRound = 0;

        // Weapon UI


        // DEBUG: Enable Physics Debugging
        // DEBUG: Enable Physics Debugging
        // this.physics.world.createDebugGraphic();
        // this.physics.world.drawDebug = true;

        // Initialize Pathfinding
        this.pathfinding = new PathfindingManager();

        // Initialize Particle Manager
        this.particleManager = new ParticleManager(this);

        // Generate Bullet Texture

        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xffff00); // Yellow (Tracer style)
        graphics.fillRect(0, 0, 4, 4); // Smaller
        graphics.generateTexture('bullet_texture', 4, 4);

        // Generate Neon Wall Texture
        const wallGraphics = this.make.graphics({ x: 0, y: 0 });
        wallGraphics.fillStyle(0x1a1a1a); // Dark background
        wallGraphics.fillRect(0, 0, 32, 32);
        wallGraphics.lineStyle(2, 0x00ffff); // Cyan Neon Border
        wallGraphics.strokeRect(0, 0, 32, 32);
        wallGraphics.fillStyle(0x00ffff, 0.2); // Faint inner glow
        wallGraphics.fillRect(4, 4, 24, 24);
        wallGraphics.generateTexture('wall_tile', 32, 32);

        // --- MAP GENERATION START ---
        // Create the map
        const map = this.make.tilemap({ tileWidth: 32, tileHeight: 32, width: 32, height: 24 });
        const tileset = map.addTilesetImage('tile', undefined, 32, 32);
        const wallTileset = map.addTilesetImage('wall_tile', undefined, 32, 32);

        // let wallsLayer: Phaser.Tilemaps.TilemapLayer | null = null; // Removed local var

        // --- INIT GROUPS UNCONDITIONALLY ---
        // Create Bullets Group
        this.bullets = this.physics.add.group({
            classType: Bullet,
            maxSize: 30,
            runChildUpdate: true,
        });

        // Create Enemies Group
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true,
        });

        if (tileset && wallTileset) {
            const groundLayer = map.createBlankLayer('Ground', tileset);
            groundLayer?.fill(0);

            // Create Walls Layer using NEON tileset
            // wallsLayer = map.createBlankLayer('Walls', wallTileset);
            const layer = map.createBlankLayer('Walls', wallTileset);
            if (layer) {
                this.wallsLayer = layer;
                // Add some random walls
                // Add some random walls
                for (let i = 0; i < 50; i++) {
                    const x = Phaser.Math.Between(0, map.width - 1);
                    const y = Phaser.Math.Between(0, map.height - 1);

                    // Don't spawn walls near the center (Player Spawn)
                    const distFromCenter = Phaser.Math.Distance.Between(x, y, map.width / 2, map.height / 2);
                    if (distFromCenter < 5) continue; // Safe zone of 5 tiles radius

                    this.wallsLayer.putTileAt(0, x, y);
                }
                this.wallsLayer.setCollisionByExclusion([-1]);
                this.wallsLayer.setCollisionByExclusion([-1]); // Duplicate?

                // Update Pathfinding
                this.pathfinding.updateGrid(this.wallsLayer);
            }

            // Set world bounds to map size
            this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

            // ... (Bullets init)

            // ... (Bullets init removed from here)

            // Initialize Player
            this.player = new Player(this, map.widthInPixels / 2, map.heightInPixels / 2);

            // ...

            // ... (Enemies init removed from here)

        }


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
        }

        // Bullets vs Enemies
        this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
            const e = enemy as Enemy;
            const b = bullet as Bullet;

            if (!b.active || !e.active) return;

            // Extra Safety: Raycast to check for walls
            const ray = new Phaser.Geom.Line(b.x, b.y, e.x, e.y);
            // Since we are inside overlap, they are close. 
            // If there is a wall tile at bullet position or between, ignore.
            if (this.wallsLayer.getTilesWithinShape(ray).some(t => t.collides)) {
                this.particleManager.emitWallHit(b.x, b.y);
                b.kill();
                return;
            }

            // Blood effect (only if enemy was alive)
            if (!e.isDead) {
                this.particleManager.emitBlood(e.x, e.y);
                this.score += 10;
                EventBus.emit('score-change', this.score);

                // Use simple hit for now
                e.hit(b.damage);

                // Check Round Completion
                if (this.enemies.countActive(true) === 0) {
                    this.time.delayedCall(1000, () => this.startNextRound());
                }
            }
            b.kill();
        });

        // Start First Round
        this.startNextRound();


        this.physics.add.collider(this.player, this.enemies, (player, enemy) => {
            // Simple Collision Logic
            this.health -= 5;
            EventBus.emit('health-change', this.health);
            this.cameras.main.shake(100, 0.01);
            this.particleManager.emitBlood(this.player.x, this.player.y);

            if (this.health <= 0) {
                this.physics.pause(); // Stop physics to prevent crashes during transition
                this.physics.world.colliders.destroy(); // Clean up all colliders
                this.scene.start('GameOverScene', { score: this.score });
            }
        }, (player, enemy) => {
            const e = enemy as Enemy;
            // Keep simple check here, or move logic to callback.
            // User requested removing processCallback generally, but for Player vs Enemy check
            // "this.physics.add.collider(bullets, enemies..." context. 
            // Let's standardise: move logic to main callback as requested for consistency
            return true;
        });

        // Setup Input
        this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.wasd = this.input.keyboard!.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        }) as any;





        this.add.text(10, 10, 'WASD to Move, Click to Shoot', {
            fontSize: '16px',
            color: '#ffffff'
        }).setScrollFactor(0);

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
    }

    update(time: number, delta: number) {
        if (!this.player) return;

        // Note: Bullets and Enemies updated automatically via runChildUpdate: true

        this.player.update(undefined, this.wasd);
        this.player.setRotationToPointer(this.input.activePointer);

        // Weapon Switching
        if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
            this.player.nextWeapon();
        }

        // Shooting
        if (this.input.activePointer.isDown) {
            this.player.shoot(this.bullets, time);
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
            // Random position away from player
            let x, y;
            let attempts = 0;
            do {
                x = Phaser.Math.Between(100, 900);
                y = Phaser.Math.Between(100, 600);
                attempts++;
            } while (
                (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 200 ||
                    this.wallsLayer.getTileAtWorldXY(x, y)) && attempts < 50
            );

            const enemy = new Enemy(this, x, y, this.player, this.pathfinding, this.wallsLayer);
            this.enemies.add(enemy);
        }
    }
}
