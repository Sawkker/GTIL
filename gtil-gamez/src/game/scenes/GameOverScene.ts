import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class GameOverScene extends Scene {
    constructor() {
        super('GameOverScene');
    }

    create(data: { score: number }) {
        EventBus.emit('update-ui-state', 'GAMEOVER', data ? data.score : 0);

        // Listen for restart from React UI
        EventBus.on('restart-game', this.restartGame, this);
    }

    restartGame() {
        this.scene.start('MainScene');
    }

    shutdown() {
        EventBus.off('restart-game');
    }
}
