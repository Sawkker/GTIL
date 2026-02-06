import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class GameOverScene extends Scene {
    constructor() {
        super('GameOverScene');
    }

    create(data: { score: number, charType?: string, victory?: boolean }) {
        const score = data && data.score ? data.score : 0;
        const charType = data && data.charType ? data.charType : 'unknown';

        // HIGH SCORE LOGIC
        const newScore = {
            id: new Date().getTime(),
            score: score,
            charType: charType,
            date: new Date().toLocaleDateString()
        };

        // Get existing scores
        const savedScores = localStorage.getItem('gtil_highscores');
        let highScores: any[] = savedScores ? JSON.parse(savedScores) : [];

        // Add new score
        highScores.push(newScore);

        // Sort by score desc, keep top 10
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 10);

        // Save
        localStorage.setItem('gtil_highscores', JSON.stringify(highScores));

        EventBus.emit('update-ui-state', 'GAMEOVER', { score, highScores, victory: data?.victory || false });

        // Listen for restart from React UI
        EventBus.on('restart-game', this.restartGame, this);
        EventBus.on('back-to-menu', this.backToMenu, this);
    }

    restartGame() {
        this.scene.start('MainScene');
    }

    backToMenu() {
        this.scene.start('MainMenuScene');
    }

    shutdown() {
        EventBus.off('restart-game');
        EventBus.off('back-to-menu');
    }
}
