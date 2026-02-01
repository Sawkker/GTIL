import { Weapon } from './Weapon';
import { Scene } from 'phaser';

export class Pistol extends Weapon {
    constructor(scene: Scene) {
        // Pistol: Fast reload, small mag, infinite reserve
        super(scene, 'Pistol', 400, 1, 12, -1, 1000);
    }

    fire(x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group) {
        this.createBullet(x, y, rotation, bullets);
    }
}

export class Rifle extends Weapon {
    constructor(scene: Scene) {
        // Rifle: 30 rounds, standard reload
        super(scene, 'Assault Rifle', 100, 1, 30, 120, 2000);
    }

    fire(x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group) {
        // Add spread/inaccuracy
        const spread = Phaser.Math.FloatBetween(-0.05, 0.05);
        this.createBullet(x, y, rotation + spread, bullets);
    }
}

export class Shotgun extends Weapon {
    constructor(scene: Scene) {
        // Shotgun: Low capacity, slow reload (shell by shell logic omitted for simplicity, just slow bulk reload)
        super(scene, 'Shotgun', 800, 1, 6, 24, 2500);
    }

    fire(x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group) {
        // Fire multiple pellets
        for (let i = -2; i <= 2; i++) {
            const spread = i * 0.1;
            this.createBullet(x, y, rotation + spread, bullets);
        }
    }
}
