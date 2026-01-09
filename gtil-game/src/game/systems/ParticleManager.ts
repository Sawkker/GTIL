import { Scene } from 'phaser';

export class ParticleManager {
    private scene: Scene;
    private bloodEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    private bloodSurface: Phaser.GameObjects.RenderTexture | null = null;

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
            blendMode: 'NORMAL',
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

    setBloodSurface(surface: Phaser.GameObjects.RenderTexture) {
        this.bloodSurface = surface;
    }

    emitBlood(x: number, y: number) {
        this.bloodEmitter.explode(10, x, y);
        this.emitPersistentBlood(x, y);
    }

    private emitPersistentBlood(x: number, y: number) {
        if (!this.bloodSurface) return;

        const textureKey = this.scene.textures.exists('blood_splats') ? 'blood_splats' : 'blood_particle';

        // Create a stamp image. Position doesn't matter much if we pass x,y to draw, 
        // but let's keep it 0,0 and rely on draw(x,y).
        const stamp = this.scene.make.image({
            x: 0,
            y: 0,
            key: textureKey
        }, false);

        stamp.setOrigin(0.5, 0.5); // Center stamp
        stamp.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        stamp.setScale(Phaser.Math.FloatBetween(0.5, 1.0));

        if (this.scene.textures.exists('blood_splats')) {
            const tex = this.scene.textures.get('blood_splats');
            // Helper logic to pick random frame if it's a sheet
            // Assuming generated image was copied as 'blood_splats.png' and loaded as spritesheet
            if (tex.frameTotal > 1) {
                const frameNames = tex.getFrameNames();
                if (frameNames.length > 0) {
                    // Filter out __BASE if present? Phaser usually handles this.
                    const name = Phaser.Utils.Array.GetRandom(frameNames);
                    stamp.setFrame(name);
                } else {
                    stamp.setFrame(Phaser.Math.Between(0, tex.frameTotal - 2));
                }
            }
        } else {
            stamp.setScale(Phaser.Math.FloatBetween(2, 4));
            stamp.setTint(0x880000);
        }

        this.bloodSurface.draw(stamp, x, y);
        stamp.destroy();
    }

    emitWallHit(x: number, y: number) {
        this.sparkEmitter.explode(5, x, y);
    }

    createBulletTrail(bullet: Phaser.GameObjects.GameObject) {
        return this.scene.add.particles(0, 0, 'bullet_texture', {
            follow: bullet as any,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 300,
            blendMode: 'ADD',
            frequency: 10
        });
    }
}
