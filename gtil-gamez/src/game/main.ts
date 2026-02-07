import { Game } from 'phaser';
import { MainScene } from './scenes/MainScene';

import { MainMenuScene } from './scenes/MainMenuScene';
import { GameOverScene } from './scenes/GameOverScene';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#1a1510',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
        MainMenuScene,
        MainScene,
        GameOverScene
    ],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 }, // Top down game, no gravity
            debug: true // Enable debug for development
        }
    }
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;
