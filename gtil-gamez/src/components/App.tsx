import dynamic from 'next/dynamic';
import { useRef, useState, useEffect } from 'react';
import { IPhaserGameProps } from './PhaserGame';
import { GameUI } from './GameUI';


const PhaserGame = dynamic(() => import('./PhaserGame').then(m => m.PhaserGame), { ssr: false });

export default function App() {
    //  The sprite can only be moved in the MainMenu Scene
    const [canMoveSprite, setCanMoveSprite] = useState(true);

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IPhaserGameProps | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Event emitted from the PhaserGame component
    const onCurrentActiveScene = (scene: Phaser.Scene) => {
        // currentActiveScene logic is usually for UI updates based on scene
    }

    if (!mounted) return null;

    return (
        <div id="app" style={{ position: 'relative' }}>
            <PhaserGame ref={phaserRef} currentActiveScene={onCurrentActiveScene} />
            <GameUI />
        </div>
    );
}
