import { useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from '../game/main';
import { EventBus } from '../game/EventBus';

export interface IPhaserGameProps {
    currentActiveScene?: (scene_instance: Phaser.Scene) => void;
}

export const PhaserGame = ({ currentActiveScene }: IPhaserGameProps) => {
    const game = useRef<Phaser.Game | null>(null);

    useLayoutEffect(() => {
        if (game.current === null) {
            game.current = StartGame("game-container");

            if (currentActiveScene) {
                EventBus.on('current-scene-ready', (scene_instance: Phaser.Scene) => {
                    currentActiveScene(scene_instance);
                });
            }
        }

        return () => {
            if (game.current) {
                game.current.destroy(true);
                game.current = null;
            }
        }
    }, [currentActiveScene]);

    return (
        <div id="game-container"></div>
    );
}
