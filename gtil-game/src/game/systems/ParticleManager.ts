import { Scene } from 'phaser';

export class ParticleManager {
    private scene: Scene;
    private bloodEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor(scene: Scene) {
        this.scene = scene;

        // Create a simple particle graphic if not exists
        if (!scene.textures.exists('blood_particle')) {
            const graphics = scene.add.graphics();
            graphics.fillStyle(0xff0000, 1);
            graphics.fillCircle(2, 2, 2);
            graphics.generateTexture('blood_particle', 4, 4);
            graphics.destroy();
        }

        // Create spark particle texture
        if (!scene.textures.exists('spark_particle')) {
            const graphics = scene.add.graphics();
            graphics.fillStyle(0xffff00, 1); // Yellow
            graphics.fillRect(0, 0, 2, 2);
            graphics.generateTexture('spark_particle', 2, 2);
            graphics.destroy();
        }

        this.bloodEmitter = scene.add.particles(0, 0, 'blood_particle', {
            lifespan: 500,
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        this.sparkEmitter = scene.add.particles(0, 0, 'spark_particle', {
            lifespan: 200,
            speed: { min: 100, max: 200 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });
    }

    emitBlood(x: number, y: number) {
        this.bloodEmitter.explode(10, x, y);
    }

    emitWallHit(x: number, y: number) {
        this.sparkEmitter.explode(5, x, y);
    }

    createBulletTrail(bullet: Phaser.GameObjects.GameObject) {
        // Create a dedicated emitter for this bullet
        // In a real optimized game, we might use a shared manager, 
        // but for < 30 bullets, individual usage or "follow" is okay.
        // Better implementation: A shared emitter that emits at bullet position in update loop?
        // Simplest visuals: A shared emitter that we "emit" at bullet pos every frame?
        // No, simplest "Trail" is an emitter following the sprite.

        return this.scene.add.particles(0, 0, 'bullet_texture', {
            follow: bullet as any,
            scale: { start: 0.8, end: 0 }, // Bigger start
            alpha: { start: 0.8, end: 0 }, // More opaque
            lifespan: 300, // Longer trail
            blendMode: 'ADD',
            frequency: 10 // More particles (smoother line)
        });
    }
}
