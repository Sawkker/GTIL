import { Scene } from 'phaser';

export class WeaponPickup extends Phaser.Physics.Arcade.Sprite {
    public weaponType: string;
    public ammo: number;

    constructor(scene: Scene, x: number, y: number, weaponType: string, ammo: number) {
        super(scene, x, y, `player_${weaponType}`); // specific texture or generic pickup
        // If specific texture doesn't exist as a pickup, maybe use a generic 'crate' or the weapon texture scaled down

        this.weaponType = weaponType;
        this.ammo = ammo;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.5); // Smaller than player holding it

        // Bobbing animation or visual cue
        this.scene.tweens.add({
            targets: this,
            y: y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }
}
