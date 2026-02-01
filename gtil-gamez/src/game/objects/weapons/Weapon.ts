import { Scene } from 'phaser';
import { Bullet } from '../Bullet';

export abstract class Weapon {
    public name: string;
    public fireRate: number;
    public damage: number;
    protected lastFired: number = 0;
    protected scene: Scene;

    public maxReserve: number; // Max ammo you can carry
    public currentReserve: number; // Current ammo in bag
    public magSize: number; // Ammo per clip
    public currentMag: number; // Ammo in current clip
    public reloadTime: number; // Time to reload in ms
    public isReloading: boolean = false;

    constructor(scene: Scene, name: string, fireRate: number, damage: number = 1, magSize: number = 12, maxReserve: number = 60, reloadTime: number = 1500) {
        this.scene = scene;
        this.name = name;
        this.fireRate = fireRate;
        this.damage = damage;

        this.magSize = magSize;
        this.currentMag = magSize;

        this.maxReserve = maxReserve;
        this.currentReserve = maxReserve;

        this.reloadTime = reloadTime; // Default 1.5s
    }

    addAmmo(amount: number) {
        this.currentReserve = Math.min(this.currentReserve + amount, this.maxReserve);
    }

    canFire(time: number): boolean {
        if (this.isReloading) return false;
        const hasAmmo = this.currentMag > 0;
        return time > this.lastFired + this.fireRate && hasAmmo;
    }

    tryShoot(time: number, x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group): boolean {
        if (this.canFire(time)) {
            this.currentMag--;
            this.fire(x, y, rotation, bullets);
            return true;
        }

        // Auto-reload attempt if empty and trying to shoot? 
        // Or let Player handle explicit reload? 
        // For game feel, if empty and click, click sound or auto-reload. 
        // Let's return false here and handle logic elsewhere or just fail silent.
        return false;
    }

    reload() {
        if (this.isReloading || this.currentMag === this.magSize) return;
        // Check reserve if not infinite
        if (this.maxReserve !== -1 && this.currentReserve <= 0) return;

        console.log('Reloading...');
        this.isReloading = true;

        // Callback handled by Scene or Player usually? 
        // Or we use a delayed call here directly since we have reference to scene.
        this.scene.time.delayedCall(this.reloadTime, () => {
            this.finishReload();
        });
    }

    private finishReload() {
        if (!this.isReloading) return; // Cancelled?

        const needed = this.magSize - this.currentMag;
        let take = needed;

        if (this.maxReserve !== -1) {
            take = Math.min(needed, this.currentReserve);
            this.currentReserve -= take;
        }

        this.currentMag += take;
        this.isReloading = false;
        console.log('Reload Complete', this.currentMag, '/', this.currentReserve);
    }

    getAmmoStatus(): string {
        if (this.isReloading) return 'RELOADING...';
        const reserveText = this.maxReserve === -1 ? '∞' : this.currentReserve.toString();
        return `${this.currentMag} / ${reserveText}`;
    }

    abstract fire(x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group): void;

    protected createBullet(x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group) {
        const bullet = bullets.get(x, y) as Bullet; // Cast to custom Bullet class
        if (bullet) {
            // Obligamos a la bala a resetear su estado interno antes de disparo
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.fire(x, y, rotation, this.damage);
        } else {
            console.warn('Weapon: No bullets available in pool!');
        }
        this.lastFired = this.scene.time.now;
    }
}
