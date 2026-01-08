import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenuScene extends Scene {
    private isStarting: boolean = false;

    constructor() {
        super('MainMenuScene');
    }

    create() {
        console.log('MainMenuScene: create');
        this.isStarting = false;

        // Just emit that we are in menu
        EventBus.emit('update-ui-state', 'MENU');

        // Listen for start game event from React UI
        EventBus.on('start-game', this.onStartGame, this);

        // Listen for shutdown event to clean up
        this.events.on('shutdown', this.shutdown, this);
    }

    private onStartGame = () => {
        // IMMMEDIATELY remove listener to prevent double taps or zombie calls
        EventBus.off('start-game', this.onStartGame);

        if (this.isStarting) return;

        console.log('MainMenuScene: startGame called');
        this.isStarting = true;

        // Check if scene is valid AND has a manager (prevent queueOp error)
        if (this.scene && this.scene.manager) {
            console.log('MainMenuScene: Switching to MainScene');
            this.scene.start('MainScene');
        } else {
            console.warn('MainMenuScene: Scene manager unavailable - ignoring start request');
        }
    }

    shutdown() {
        console.log('MainMenuScene: shutdown');
        EventBus.off('start-game'); // Uses the custom "remove all" we added, or add listener back if needed
    }
}
