import { Scene } from 'phaser';
import { Enemy, EnemyState } from './Enemy';
import { Player } from './Player';
import { PathfindingManager } from '../systems/PathfindingManager';

export class Boss extends Enemy {
    constructor(scene: Scene, x: number, y: number, target: Player, pathfinding: PathfindingManager, wallsLayer: Phaser.Tilemaps.TilemapLayer) {
        super(scene, x, y, target, pathfinding, wallsLayer);

        // Override properties
        this.setTexture('final_boss');
        this.setScale(1.0);

        // Stats (Using protected fields)
        this.health = 500;
        this.speed = 80;

        // Ensure Physics Body is ready
        if (this.body) {
            // Force enable
            this.body.enable = true;
            // Set Size
            this.body.setSize(80, 80);
            this.body.setOffset(24, 24); // Center it in 128x128 frame

            // Console Debug
            console.log('BOSS SPAWNED: Body Active, Health:', this.health, 'Pos:', x, y);
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
        }
    }
}
