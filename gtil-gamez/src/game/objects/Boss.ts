import { Scene } from 'phaser';
import { Enemy, EnemyState } from './Enemy';
import { Player } from './Player';
import { PathfindingManager } from '../systems/PathfindingManager';

export class Boss extends Enemy {
    constructor(scene: Scene, x: number, y: number, target: Player, pathfinding: PathfindingManager, wallsLayer: Phaser.Tilemaps.TilemapLayer) {
        super(scene, x, y, target, pathfinding, wallsLayer);

        // Override properties
        this.setTexture('tex_boss_zabala');
        this.setScale(1.2); // Sligthly larger than player

        // Stats (Using protected fields)
        this.health = 1000; // Stronger
        this.speed = 90;

        // Ensure Physics Body is ready
        if (this.body) {
            // Force enable
            this.body.enable = true;
            // Set Size
            // Set Size based on texture
            // Assume the spider is large. Let's make the hitbox huge too, but centered.
            const bodyW = this.width * 0.6;
            const bodyH = this.height * 0.6;

            this.body.setSize(bodyW, bodyH);
            this.body.setOffset((this.width - bodyW) / 2, (this.height - bodyH) / 2);

            console.log('BOSS BODY DEBUG:', {
                texW: this.width, texH: this.height,
                bodyW, bodyH,
                offsetX: (this.width - bodyW) / 2
            });

            // Console Debug
            console.log('BOSS SPAWNED: Body Active, Health:', this.health, 'Pos:', x, y);

            // Emit Boss Spawn Event for UI
            // Using a slight delay to ensure UI is ready or scene is fully set
            scene.time.delayedCall(100, () => {
                const maxHealth = 500; // Hardcoded matches internal health
                scene.events.emit('boss-spawn', { current: this.health, max: maxHealth });
            });
        } else {
            console.error('BOSS SPAWNED: No Physics Body!');
            scene.physics.add.existing(this); // Try adding again?
        }

        // Visual
        this.setTint(0xffaaaa);
    }

    // Override hit to check for death specifically for boss event
    hit(damage: number) {
        if (this.isDead) return;

        super.hit(damage); // Deducts health, flashes red

        // If dead after hit, super.hit() handles disableBody and 'enemy-died'
        // But we want a specific Boss Death event
        if ((this as any).health <= 0) {
            // Override the default enemy-died emission or add ours
            this.scene.events.emit('boss-died');
            // Huge score
            (this.scene as any).score += 10000;
            (this.scene as any).events.emit('score-change', (this.scene as any).score);

            // Camera shake for boss death
            this.scene.cameras.main.shake(1000, 0.02);
        } else {
            console.log(`Boss Hit! HP: ${this.health}`);
            // Emit Health Change
            const maxHealth = 500;
            this.scene.events.emit('boss-health-change', { current: this.health, max: maxHealth });
        }
    }

    private lastSpawnTime: number = 0;

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        // Minion Spawning Logic (Every 8 seconds)
        if (time > this.lastSpawnTime + 8000) {
            this.lastSpawnTime = time;
            this.spawnMinions();
        }
    }

    spawnMinions() {
        if (!this.scene) return;

        // Spawn 2 minions near the boss
        for (let i = 0; i < 2; i++) {
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 100;

            // We need access to MainScene's methods or just emit an event
            // Emitting event is safer to avoid circular dependencies or tight coupling
            this.scene.events.emit('spawn-minion', this.x + offsetX, this.y + offsetY);
        }
        // Text/Shout
        this.scene.events.emit('show-dialogue', "Zabala: ¡A mí, soldados! ¡Aplastadlos!");
        this.scene.time.delayedCall(2000, () => this.scene.events.emit('hide-dialogue'));
    }
}
