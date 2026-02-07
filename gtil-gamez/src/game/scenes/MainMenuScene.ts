import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { ZzFX } from '../systems/ZzFX';

export class MainMenuScene extends Scene {
    private isStarting: boolean = false;
    private selectedChar: string = 'commando';

    constructor() {
        super('MainMenuScene');
        this.handleLaunchGame = this.handleLaunchGame.bind(this);
    }

    create() {
        console.log('MainMenuScene: create');

        // Note: GameUI now handles all Menu Logic (Main, Char, Map)
        // This scene just waits for the 'launch-game' signal

        // Note: GameUI now handles all Menu Logic (Main, Char, Map)
        // This scene just waits for the 'launch-game' signal

        EventBus.on('launch-game', this.handleLaunchGame);

        // Restore Volume Listener so menu volume changes persist
        EventBus.on('set-volume', this.handleSetVolume);

        // Listen for back-to-menu cleanup? 
        // Actually Scene Manager handles shutdown when we leave.
        this.events.on('shutdown', this.shutdown, this);
    }

    private handleSetVolume(vol: number) {
        ZzFX.volume = vol;
    }

    private handleLaunchGame(data: { charType: string, mapType: string }) {
        // Safety Check: Ensure scene is valid and active
        if (!this.sys || !this.sys.settings.active) {
            console.warn('MainMenuScene: Attempted to launch game from inactive scene state.');
            return;
        }

        console.log(`Launching Game: Map=${data.mapType}, Char=${data.charType}`);
        this.scene.start('MainScene', { mapType: data.mapType, charType: data.charType });
    }

    shutdown() {
        EventBus.off('launch-game', this.handleLaunchGame);
        EventBus.off('set-volume', this.handleSetVolume);
    }
}
