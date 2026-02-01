import { Scene } from 'phaser';

export class WeaponPickup extends Phaser.Physics.Arcade.Sprite {
    public weaponType: string;
    public ammo: number;

    constructor(scene: Scene, x: number, y: number, weaponType: string, ammo: number) {
        let textureKey = 'ammo_box'; // Fallback
        if (weaponType === 'handgun') textureKey = 'ammo_pistol';
        else if (weaponType === 'rifle') textureKey = 'ammo_rifle';
        else if (weaponType === 'shotgun') textureKey = 'ammo_shotgun';

        super(scene, x, y, textureKey);
        // If specific texture doesn't exist as a pickup, maybe use a generic 'crate' or the weapon texture scaled down

        this.weaponType = weaponType;
        this.ammo = ammo;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1); // Reset scale since we are generating small textures (20x20)

        // Add a glow effect (tween alpha)
        this.alpha = 0.8;
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: 1.2,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }
}
