import { Scene } from 'phaser';
import { Player } from './Player';
import { PathfindingManager } from '../systems/PathfindingManager';

export enum EnemyState {
    IDLE,
    CHASE
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private speed: number = 100;
    private enemyState: EnemyState = EnemyState.IDLE;
    private target: Player;
    private pathfinding: PathfindingManager;
    private wallsLayer: Phaser.Tilemaps.TilemapLayer;
    private currentPath: { x: number, y: number }[] | null = null;
    private pathUpdateTimer: number = 0;
    public isDead: boolean = false; // Flag for deferred destruction

    constructor(scene: Scene, x: number, y: number, target: Player, pathfinding: PathfindingManager, wallsLayer: Phaser.Tilemaps.TilemapLayer) {
        super(scene, x, y, 'enemy'); // Texture created in MainScene or loaded
        this.target = target;
        this.pathfinding = pathfinding;
        this.wallsLayer = wallsLayer;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setScale(0.15);

        // Center the hitbox
        const newWidth = this.width * 0.6;
        const newHeight = this.height * 0.6;
        this.body?.setSize(newWidth, newHeight);
        this.body?.setOffset((this.width - newWidth) / 2, (this.height - newHeight) / 2);
    }

    update(time: number, delta: number) {
        if (!this.body) return; // Physics body safety check

        switch (this.enemyState) {
            case EnemyState.IDLE:
                this.idleBehavior(time);
                break;
            case EnemyState.CHASE:
                this.chaseBehavior(time);
                break;
        }
    }

    private idleBehavior(time: number) {
        this.setVelocity(0);

        // Simple check: if player is close and visible -> CHASE
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (dist < 400 && this.canSeePlayer()) {
            this.enemyState = EnemyState.CHASE;
            this.pathUpdateTimer = 0; // Force immediate path update
        }
    }

    private chaseBehavior(time: number) {
        if (!this.target || !this.target.body) return; // Wait for target to be ready
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // If lost sight or too far, maybe go back to IDLE (simplified)
        if (dist > 800) {
            this.enemyState = EnemyState.IDLE;
            this.setVelocity(0);
            return;
        }

        // Update path periodically
        if (time > this.pathUpdateTimer) {
            this.pathfinding.findPath(this.x, this.y, this.target.x, this.target.y, (path) => {
                // Async Safety Check: Ensure enemy still exists when callback fires
                if (!this.active || this.isDead) return;

                if (this.active) {
                    this.currentPath = path;
                }
            });
            this.pathUpdateTimer = time + 500;
        }

        if (this.currentPath && this.currentPath.length > 1) {
            const nextPoint = this.currentPath[1];
            if (nextPoint) {
                // Physics Safety Check
                if (this.body && this.body.enable) {
                    this.scene.physics.moveTo(this, nextPoint.x, nextPoint.y, this.speed);
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, nextPoint.x, nextPoint.y);
                    this.setRotation(angle);
                }

                if (Phaser.Math.Distance.Between(this.x, this.y, nextPoint.x, nextPoint.y) < 15) {
                    this.currentPath.shift();
                }
            }
        } else if (this.canSeePlayer()) {
            // Physics Safety Check
            if (this.body && this.body.enable) {
                this.scene.physics.moveToObject(this, this.target, this.speed);
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
                this.setRotation(angle);
            }
        } else {
            this.setVelocity(0);
        }
    }

    private canSeePlayer(): boolean {
        // Raycast from enemy to player
        const ray = new Phaser.Geom.Line(this.x, this.y, this.target.x, this.target.y);
        const tiles = this.wallsLayer.getTilesWithinShape(ray);

        // Check if any tile in the line is colliding
        for (const tile of tiles) {
            if (tile.collides) {
                return false; // Wall in the way
            }
        }
        return true;
    }

    private health: number = 3; // Reset to 3 (since we implement damage now)

    hit(damage: number) {
        if (this.isDead) return;

        this.health -= damage;

        // Visual Feedback: Flash Red
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (!this.isDead) this.clearTint();
        });

        if (this.health <= 0) {
            this.isDead = true;
            if (this.body) {
                this.disableBody(true, true);
            }
        }
    }
}
