import { Scene } from 'phaser';
import { MainScene } from '../scenes/MainScene';

export class Bullet extends Phaser.Physics.Arcade.Image {
    private speed: number = 800; // Faster for better range
    private lifespan: number = 5000; // ms
    public isDead: boolean = false;
    public damage: number = 1;
    public trail?: Phaser.GameObjects.Particles.ParticleEmitter;

    // ... (constructor) ...

    fire(x: number, y: number, rotation: number, damage: number = 1) {
        this.isDead = false;
        this.setActive(true);
        this.setVisible(true);
        // ...

        // Manage Trail
        if (!this.trail && (this.scene as MainScene).particleManager) {
            this.trail = (this.scene as MainScene).particleManager.createBulletTrail(this);
        }
        if (this.trail) {
            this.trail.setVisible(true);
            this.trail.start();
        }

        // ...
        if (this.body) {
            this.body.reset(x, y);

            this.enableBody(true, x, y, true, true);
            this.body.enable = true;

            // Use CIRCLE for rotation independence
            this.setCircle(2); // 4px diameter matches 4x4 texture

            // INSURANCE: If enableBody failed (sometimes happens in Pools), force it via World
            if (!this.body.enable) {
                this.scene.physics.world.enable(this);
            }

            this.scene.physics.velocityFromRotation(rotation, this.speed, this.body.velocity);
        }
        this.lifespan = 5000; // Increased range
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
}
