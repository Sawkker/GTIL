import { Scene } from 'phaser';
import { Player } from './Player';
import { PathfindingManager } from '../systems/PathfindingManager';
import { WeaponPickup } from './WeaponPickup';

export enum EnemyState {
    IDLE,
    ALERT, // Looking around or moving to investigate
    CHASE
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    protected speed: number = 100;
    private enemyState: EnemyState = EnemyState.IDLE;
    private target: Player;
    private pathfinding: PathfindingManager;
    private wallsLayer: Phaser.Tilemaps.TilemapLayer;
    private currentPath: { x: number, y: number }[] | null = null;
    private pathUpdateTimer: number = 0;
    private shootTimer: number = 0;
    public isDead: boolean = false; // Flag for deferred destruction

    // Room info
    public roomId: number = -1; // -1 = corridor/unknown

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
        if (this.isDead) return;

        switch (this.enemyState) {
            case EnemyState.IDLE:
                this.idleBehavior(time);
                break;
            case EnemyState.ALERT:
                this.alertBehavior(time);
                break;
            case EnemyState.CHASE:
                this.chaseBehavior(time);
                break;
        }
    }

    private idleBehavior(time: number) {
        this.setVelocity(0);

        // 1. Check Line of Sight
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (dist < 400 && this.canSeePlayer()) {
            this.becomeAlert();
            return;
        }

        // 2. Check Room Entry (Pseudo-hearing / awareness)
        // This assumes some external system or the enemy calculates room
        this.checkRoomLogic();
    }

    private alertBehavior(time: number) {
        // Stop for a moment to "process"
        this.setVelocity(0);

        // If we see the player, CHASE immediately
        if (this.canSeePlayer()) {
            this.enemyState = EnemyState.CHASE;
            this.pathUpdateTimer = 0;
            return;
        }
    }

    private becomeAlert() {
        if (this.enemyState !== EnemyState.CHASE) {
            this.enemyState = EnemyState.ALERT;
            // Reaction delay
            this.scene.time.delayedCall(200, () => {
                if (this.active && !this.isDead) {
                    this.enemyState = EnemyState.CHASE;
                    this.pathUpdateTimer = 0;
                }
            });
        }
    }

    private checkRoomLogic() {
        // Simplified "Same Room" logic or hearing
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (dist < 200) {
            // If close, we might hear footsteps
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

                // Shoot if within range
                if (Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) < 600) {
                    this.shoot(angle);
                }
            }
        } else {
            this.setVelocity(0);
        }
    }

    public alertToPlayerInRoom() {
        if (this.enemyState === EnemyState.IDLE) {
            this.becomeAlert();
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



    protected dropWeapon() {
        // Create pickup
        const types = ['handgun', 'rifle', 'shotgun'];
        // Weighted random?
        const type = Phaser.Utils.Array.GetRandom(types);
        const ammo = type === 'handgun' ? 12 : (type === 'rifle' ? 30 : 5);

        const pickup = new WeaponPickup(this.scene, this.x, this.y, type, ammo);

        // Add to MainScene group for collision
        const mainScene = this.scene as any;
        if (mainScene.pickupGroup) {
            mainScene.pickupGroup.add(pickup);
        }
    }

    protected health: number = 3;

    private shoot(rotation: number) {
        if (this.scene.time.now > this.shootTimer) {
            const bullet = (this.scene as any).bullets.get(this.x, this.y);
            if (bullet) {
                bullet.fire(this.x, this.y, rotation, 1, 'enemy');
                this.shootTimer = this.scene.time.now + 1000; // 1 second fire rate
            }
        }
    }

    hit(damage: number) {
        if (this.isDead) return;

        this.health -= damage;

        // --- BLOOD FX & DAMAGE NUMBERS ---
        const mainScene = this.scene as any;
        if (mainScene.particleManager) {
            mainScene.particleManager.emitBlood(this.x, this.y);
        }

        // Floating Damage Number
        const damageText = this.scene.add.text(this.x, this.y - 20, damage.toString(), {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);

        this.scene.tweens.add({
            targets: damageText,
            y: this.y - 50,
            alpha: 0,
            duration: 800,
            onComplete: () => damageText.destroy()
        });
        // --------------------------------

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
            this.dropWeapon();
            this.scene.events.emit('enemy-died');
        }
    }
}
