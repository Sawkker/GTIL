import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenuScene extends Scene {
    private isStarting: boolean = false;

    constructor() {
        super('MainMenuScene');
    }

    create() {
        console.log('MainMenuScene: create');

        EventBus.emit('update-ui-state', 'CUSTOM_MENU');

        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, height / 3, 'GAME TITLE', {
            fontSize: '64px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Map Options
        this.createButton(width / 2, height / 2, 'Standard Map', 'standard');
        this.createButton(width / 2, height / 2 + 60, 'Dungeon', 'dungeon');
        this.createButton(width / 2, height / 2 + 120, 'Terrace', 'terrace');
    }

    private createButton(x: number, y: number, label: string, mapType: string) {
        const text = this.add.text(x, y, label, {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => text.setStyle({ fill: '#ff0' }))
            .on('pointerout', () => text.setStyle({ fill: '#fff' }))
            .on('pointerdown', () => this.startGame(mapType));
    }

    private startGame(mapType: string) {
        console.log(`Starting game with map: ${mapType}`);
        this.scene.start('MainScene', { mapType });
    }
}
