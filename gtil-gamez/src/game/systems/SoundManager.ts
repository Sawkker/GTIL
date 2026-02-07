import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { ZzFX } from './ZzFX';

export class SoundManager {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
        this.initListeners();
    }

    private initListeners() {
        // Initialize Audio Context on first interaction if needed
        this.scene.input.on('pointerdown', () => {
            ZzFX.init();
        });

        // Volume Control Handler
        const volumeHandler = (v: number) => {
            ZzFX.volume = v;
        };
        EventBus.on('set-volume', volumeHandler);

        // Initialize volume from settings
        const settings = localStorage.getItem('gtil_settings_v1');
        if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.volume !== undefined) {
                ZzFX.volume = parsed.volume;
            }
        }

        // Weapon Shoot
        this.scene.events.on('weapon-shoot', (weaponType: string) => {
            if (weaponType === 'handgun') ZzFX.zzfx(1, .05, 300, 0, .05, .1, 1, 1, -0.1);
            if (weaponType === 'rifle') ZzFX.zzfx(.8, .05, 400, 0, .03, .08, 2, 1, -0.1);
            if (weaponType === 'shotgun') ZzFX.zzfx(1.2, .05, 150, 0, .1, .3, 3, 1, -0.5, .1, 0, 0, 0, 1.5);
        });

        // Enemy Hit
        this.scene.events.on('enemy-hit', () => {
            ZzFX.hit();
        });

        // Enemy Died
        this.scene.events.on('enemy-died', () => {
            ZzFX.zzfx(1, .05, 100, 0, .1, .2, 3, 1, -0.1, 0, 0, 0, 0, 1.1);
        });

        // Player Hit Handler
        const healthHandler = (health: number) => {
            ZzFX.zzfx(1, .05, 150, .05, .1, .3, 2, 1, -.1, 0, 0, 0, 0, .5);
        };
        EventBus.on('health-change', healthHandler);

        // CLEANUP
        this.scene.events.once('shutdown', () => {
            EventBus.off('set-volume', volumeHandler);
            EventBus.off('health-change', healthHandler);
        });

        // Pickup
        this.scene.events.on('pickup-collected', () => {
            ZzFX.pickup();
        });

        // Door
        this.scene.events.on('door-toggle', () => {
            ZzFX.zzfx(1, .05, 100, 0, .2, .5, 0, 1, 0, 0, 0, 0, 0, .5); // Slide/Creak
        });

        // Boss
        this.scene.events.on('boss-spawn', () => {
            ZzFX.zzfx(1, .05, 60, 0, .5, 2, 2, 1, .1, 0, 0, 0, 0, .8, 0, .1, .5); // Roar
        });

        // Volume Control
        EventBus.on('set-volume', (vol: number) => {
            ZzFX.volume = vol;
        });
    }
}
