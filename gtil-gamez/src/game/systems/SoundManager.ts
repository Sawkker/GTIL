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

        // Weapon Shoot
        this.scene.events.on('weapon-shoot', (weaponType: string) => {
            // Distinct sounds per weapon?
            // For now, varying pitch slightly could work, or just one nice shoot sound.
            // ZzFX params: [vol, rand, freq, ...]
            if (weaponType === 'handgun') ZzFX.zzfx(1, .05, 300, 0, .05, .1, 1, 1, -0.1); // Pew
            if (weaponType === 'rifle') ZzFX.zzfx(.8, .05, 400, 0, .03, .08, 2, 1, -0.1); // Rat-tat
            if (weaponType === 'shotgun') ZzFX.zzfx(1.2, .05, 150, 0, .1, .3, 3, 1, -0.5, .1, 0, 0, 0, 1.5); // Boom
        });

        // Enemy Hit
        this.scene.events.on('enemy-hit', () => {
            ZzFX.hit();
        });

        // Enemy Died
        this.scene.events.on('enemy-died', () => {
            ZzFX.zzfx(1, .05, 100, 0, .1, .2, 3, 1, -0.1, 0, 0, 0, 0, 1.1); // Crunch/Splat
        });

        // Player Hit
        EventBus.on('health-change', (health: number) => {
            // We don't know previous health easily here without state, 
            // but MainScene emits this on damage. 
            // Ideally we want to distinguish damage from healing.
            // But usually this event fires on damage in our current code.
            ZzFX.zzfx(1, .05, 150, .05, .1, .3, 2, 1, -.1, 0, 0, 0, 0, .5); // Ouch
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
