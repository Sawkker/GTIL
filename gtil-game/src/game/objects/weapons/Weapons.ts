import { Weapon } from './Weapon';
import { Scene } from 'phaser';

export class Pistol extends Weapon {
    constructor(scene: Scene) {
        super(scene, 'Pistol', 400, 1, -1); // Infinite Ammo
    }

    fire(x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group) {
        this.createBullet(x, y, rotation, bullets);
    }
}

export class Rifle extends Weapon {
    constructor(scene: Scene) {
        super(scene, 'Assault Rifle', 100, 1, 30); // 30 Ammo
    }

    fire(x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group) {
        // Add spread/inaccuracy
        const spread = Phaser.Math.FloatBetween(-0.05, 0.05);
        this.createBullet(x, y, rotation + spread, bullets);
    }
}

export class Shotgun extends Weapon {
    constructor(scene: Scene) {
        super(scene, 'Shotgun', 800, 1, 8); // 8 Shells
    }

    fire(x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group) {
        // Fire multiple pellets
        for (let i = -2; i <= 2; i++) {
            const spread = i * 0.1;
            this.createBullet(x, y, rotation + spread, bullets);
        }
    }
}
