import { Scene } from 'phaser';
import { Bullet } from '../Bullet';

export abstract class Weapon {
    public name: string;
    public fireRate: number;
    public damage: number;
    protected lastFired: number = 0;
    protected scene: Scene;

    public maxAmmo: number;
    public currentAmmo: number;

    constructor(scene: Scene, name: string, fireRate: number, damage: number = 1, maxAmmo: number = -1) {
        this.scene = scene;
        this.name = name;
        this.fireRate = fireRate;
        this.damage = damage;
        this.maxAmmo = maxAmmo;
        this.currentAmmo = maxAmmo;
    }

    canFire(time: number): boolean {
        // Check fire rate AND ammo
        // If maxAmmo is -1, it's infinite, so only check fire rate
        const hasAmmo = this.maxAmmo === -1 || this.currentAmmo > 0;
        return time > this.lastFired + this.fireRate && hasAmmo;
    }

    tryShoot(time: number, x: number, y: number, rotation: number, bullets: Phaser.Physics.Arcade.Group): boolean {
        if (this.canFire(time)) {
            if (this.maxAmmo !== -1) {
                this.currentAmmo--;
            }
            this.fire(x, y, rotation, bullets);
            return true;
        }
        return false;
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
