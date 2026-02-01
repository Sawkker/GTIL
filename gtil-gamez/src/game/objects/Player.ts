import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

// ... (inside class methods)


import { Weapon } from './weapons/Weapon';
import { Pistol, Rifle, Shotgun } from './weapons/Weapons';
import { WeaponPickup } from './WeaponPickup';


export class Player extends Phaser.Physics.Arcade.Sprite {
    private speed: number = 300;
    private torso: Phaser.GameObjects.Sprite;
    private weapons: Weapon[] = [];
    private currentWeaponIndex: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        // LEGS (Base Sprite)
        super(scene, x, y, 'player_feet');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setOrigin(0.5, 0.5);
        this.setScale(0.15);

        // Adjust body size
        this.body?.setCircle(12);

        // TORSO (Child Sprite)
        this.torso = scene.add.sprite(x, y, 'player_handgun');
        this.torso.setOrigin(0.5, 0.5);
        this.torso.setScale(0.15);
        this.torso.setDepth(this.depth + 1); // Ensure torso is above legs

        // Initialize Weapons
        this.weapons.push(new Pistol(scene));
        this.weapons.push(new Rifle(scene));
        this.weapons.push(new Shotgun(scene));
        this.currentWeaponIndex = 0;
    }

    private isDashing: boolean = false;
    private dashCooldown: number = 0;
    private dashDuration: number = 200; // Duration of dash in ms
    private lastDashTime: number = 0;
    private dashVelocity: { x: number, y: number } = { x: 0, y: 0 };

    update(cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined, wasd: any) {
        // If dashing, ignore input and maintain dash velocity
        if (this.isDashing) {
            this.setVelocity(this.dashVelocity.x, this.dashVelocity.y);
            return;
        }

        if (!wasd || !this.body || !this.active) return;

        // Handle Dash Input (Spacebar) - Check cooldown
        if (cursors?.space?.isDown && this.scene.time.now > this.lastDashTime + 1000) {

            // Only dash if moving
            if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
                this.isDashing = true;
                this.lastDashTime = this.scene.time.now;

                // Set Dash Velocity (Current Vel * 3)
                this.dashVelocity.x = this.body.velocity.x * 3;
                this.dashVelocity.y = this.body.velocity.y * 3;

                // Visual feedback (Flash/Tint)
                this.setTint(0x00ffff);

                // End Dash Timer
                this.scene.time.delayedCall(this.dashDuration, () => {
                    this.isDashing = false;
                    this.clearTint();
                    this.setVelocity(0, 0); // Stop after dash (optional)
                });
                return;
            }
        }

        // RELOAD INPUT (R)
        // Check manually for R key since it's not in cursors
        const rKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        if (rKey && Phaser.Input.Keyboard.JustDown(rKey)) {
            this.forceReload();
        }

        this.setVelocity(0);

        // Horizontal movement
        if (wasd.left.isDown) {
            this.setVelocityX(-this.speed);
        } else if (wasd.right.isDown) {
            this.setVelocityX(this.speed);
        }

        // Vertical movement
        if (wasd.up.isDown) {
            this.setVelocityY(-this.speed);
        } else if (wasd.down.isDown) {
            this.setVelocityY(this.speed);
        }

        // Normalize velocity
        if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
            this.body.velocity.normalize().scale(this.speed);

            // LEGS ROTATION: Face movement direction
            this.setRotation(this.body.velocity.angle());

            // WALK ANIMATION
            if (!this.anims.isPlaying) {
                this.play('walk');
            }
        } else {
            this.stop();
        }

        // SYNC TORSO POSITION
        this.torso.setPosition(this.x, this.y);
    }

    setRotationToPointer(pointer: Phaser.Input.Pointer) {
        // TORSO ROTATION: Face Mouse
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
        this.torso.setRotation(angle);

        // We don't rotate 'this' (legs) to pointer anymore, only to movement
    }

    shoot(bullets: Phaser.Physics.Arcade.Group, time: number) {
        const weapon = this.weapons[this.currentWeaponIndex];
        // Fire from Torso rotation/position
        if (weapon.tryShoot(time, this.x, this.y, this.torso.rotation, bullets)) {
            EventBus.emit('ammo-change', weapon.getAmmoStatus());
            return true;
        } else if (weapon.currentMag === 0 && !weapon.isReloading && Phaser.Input.Keyboard.JustDown(this.scene.input.activePointer.button as any)) {
            // Optional: Click sound or auto-reload on empty click
            // weapon.reload();
        }
        return false;
    }

    forceReload() {
        const weapon = this.weapons[this.currentWeaponIndex];
        weapon.reload();
        // Update UI immediately to show "RELOADING..." or similar handled in getAmmoStatus logic updates
        // We might want a tick update for UI if it says "Reloading...", but simplistic event driven is fine
        EventBus.emit('ammo-change', weapon.getAmmoStatus());

        // Schedule update after reload finishes?
        this.scene.time.delayedCall(weapon.reloadTime + 50, () => {
            if (this.weapons[this.currentWeaponIndex] === weapon) {
                EventBus.emit('ammo-change', weapon.getAmmoStatus());
            }
        });
    }

    nextWeapon() {
        // Cancel current reload if switching? Or let it continue in bg?
        // Let's cancel or just switch. The Weapon class doesn't have cancel logic exposed cleanly but flag holds.
        // If we switch back, it might still be reloading. That's a feature!

        this.currentWeaponIndex++;
        if (this.currentWeaponIndex >= this.weapons.length) {
            this.currentWeaponIndex = 0;
        }

        const weapon = this.weapons[this.currentWeaponIndex];
        console.log(`Switched to: ${weapon.name}`);

        // Keep consistent texture
        // if (weapon.name === 'Pistol') this.torso.setTexture('player_handgun');
        // else if (weapon.name === 'Assault Rifle') this.torso.setTexture('player_rifle');
        // else if (weapon.name === 'Shotgun') this.torso.setTexture('player_shotgun');

        EventBus.emit('weapon-changed', weapon.name);
        EventBus.emit('ammo-change', weapon.getAmmoStatus());
    }


    getCurrentWeaponName(): string {
        return this.weapons[this.currentWeaponIndex].name;
    }

    handlePickup(pickup: WeaponPickup) {
        let nameMatch = '';
        if (pickup.weaponType === 'handgun') nameMatch = 'Pistol';
        else if (pickup.weaponType === 'rifle') nameMatch = 'Assault Rifle';
        else if (pickup.weaponType === 'shotgun') nameMatch = 'Shotgun';

        const weapon = this.weapons.find(w => w.name === nameMatch);
        if (weapon) {
            weapon.addAmmo(pickup.ammo);
            console.log(`Picked up ${nameMatch} ammo: ${pickup.ammo}`);

            // If it's the current weapon, update UI
            if (this.getCurrentWeaponName() === nameMatch) {
                EventBus.emit('ammo-change', weapon.getAmmoStatus());
            }
        }

        pickup.destroy();
    }


    // Cleanup
    destroy(fromScene?: boolean) {
        this.torso.destroy();
        super.destroy(fromScene);
    }
}
