import { Scene } from 'phaser';
import { MainScene } from '../scenes/MainScene';

export class Bullet extends Phaser.Physics.Arcade.Image {
    private speed: number = 800; // Faster for better range
    public lifespan: number = 5000; // ms
    public isDead: boolean = false;
    public damage: number = 1;
    public ownerType: 'player' | 'enemy' = 'player';
    public trail?: Phaser.GameObjects.Particles.ParticleEmitter;
    public isMelee: boolean = false;

    // ... (constructor) ...

    fire(x: number, y: number, rotation: number, damage: number = 1, owner: 'player' | 'enemy' = 'player', speed: number = 800, lifespan: number = 5000) {
        this.isDead = false;
        this.ownerType = owner;
        this.setActive(true);
        this.setVisible(true);
        this.speed = speed;
        this.lifespan = lifespan;
        this.isMelee = false; // Reset default
        // ...

        this.speed = speed || 800; // Ensure speed is set

        // Manage Trail - Only if NOT melee
        if (!this.isMelee) {
            if (!this.trail && (this.scene as MainScene).particleManager) {
                this.trail = (this.scene as MainScene).particleManager.createBulletTrail(this);
            }
            if (this.trail) {
                this.trail.setVisible(true);
                this.trail.start();
            }
        } else if (this.trail) {
            this.trail.setVisible(false);
            this.trail.stop();
        }

        // ...
        if (this.body) {
            this.body.reset(x, y);

            this.enableBody(true, x, y, true, true);
            this.body.enable = true; // IMPORTANT

            // Use CIRCLE for rotation independence by default, but Slash might want Box?
            // Keep circle for simplicity of physics
            this.setCircle(this.isMelee ? 16 : 2); // Melee hit area is larger

            // INSURANCE: If enableBody failed (sometimes happens in Pools), force it via World
            if (!this.body.enable) {
                this.scene.physics.world.enable(this);
            }

            this.scene.physics.velocityFromRotation(rotation, this.speed, this.body.velocity);
        }

        // Visual distinction
        if (this.isMelee) {
            this.setTexture('slash_effect'); // We need to generate this or use invisible
            this.setTint(0xffffff);
            this.setAlpha(0.5);
        } else if (this.ownerType === 'enemy') {
            this.setTint(0xffaa00); // Orange/Red for enemy
            this.setAlpha(1);
        } else {
            this.setTint(0xffff00); // Yellow for player
            this.setAlpha(1);
        }
    }

    update(time: number, delta: number) {
        if (!this.body) return; // Physics body safety check
        if (this.isDead) return; // Prevent updating dead bullets

        this.lifespan -= delta;

        if (this.lifespan <= 0) {
            console.log('DEBUG: Bullet died of Range/Lifespan');
            this.kill();
            return;
        }

        // Kill if out of bounds
        if (!this.scene.physics.world.bounds.contains(this.x, this.y)) {
            this.kill();
        }
    }

    kill() {
        if (this.isDead) return; // Prevent multiple kills
        this.isDead = true;
        this.setActive(false);
        this.setVisible(false);

        if (this.trail) {
            this.trail.stop();
            this.trail.setVisible(false);
        }

        if (this.body) {
            this.body.reset(0, 0); // Clear residual forces / velocity
            this.disableBody(true, true);
        }
    }

    destroy(fromScene?: boolean) {
        if (this.trail) {
            this.trail.destroy();
            this.trail = undefined;
        }
        super.destroy(fromScene);
    }
}
