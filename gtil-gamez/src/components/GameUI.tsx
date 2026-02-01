import { useEffect, useState } from 'react';
import { EventBus } from '../game/EventBus';

type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'CUSTOM_MENU';

const GameUI = () => {
    const [gameState, setGameState] = useState<GameState>('MENU');
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [weapon, setWeapon] = useState('Pistol');
    const [ammo, setAmmo] = useState('Inf');

    useEffect(() => {
        const handleScoreChange = (newScore: number) => setScore(newScore);
        const handleHealthChange = (newHealth: number) => setHealth(newHealth);
        const handleWeaponChange = (newWeapon: string) => setWeapon(newWeapon);
        const handleAmmoChange = (newAmmo: string) => setAmmo(newAmmo);

        const handleStateChange = (newState: GameState, data?: any) => {
            setGameState(newState);
            if (newState === 'GAMEOVER' && typeof data === 'number') {
                setScore(data);
            }
        };

        EventBus.on('score-change', handleScoreChange);
        EventBus.on('health-change', handleHealthChange);
        EventBus.on('weapon-changed', handleWeaponChange);
        EventBus.on('ammo-change', handleAmmoChange);
        EventBus.on('update-ui-state', handleStateChange);

        return () => {
            EventBus.off('score-change', handleScoreChange);
            EventBus.off('health-change', handleHealthChange);
            EventBus.off('weapon-changed', handleWeaponChange);
            EventBus.off('ammo-change', handleAmmoChange);
            EventBus.off('update-ui-state', handleStateChange);
        };
    }, []);

    const startGame = () => {
        EventBus.emit('start-game');
        setGameState('PLAYING');
    };

    const restartGame = () => {
        EventBus.emit('restart-game');
        setGameState('PLAYING');
        setScore(0);
        setHealth(100);
        setWeapon('Pistol');
        setAmmo('Inf');
    };

    if (gameState === 'CUSTOM_MENU') return null;

    if (gameState === 'MENU') {
        return (
            <div style={overlayStyle}>
                <h1 style={titleStyle}>GTIL Phaser Shooter</h1>
                <button onClick={startGame} style={buttonStyle}>Start Game</button>
            </div>
        );
    }

    if (gameState === 'GAMEOVER') {
        return (
            <div style={{ ...overlayStyle, backgroundColor: 'rgba(50, 0, 0, 0.9)' }}>
                <h1 style={{ ...titleStyle, color: '#ff4444' }}>MISSION FAILED</h1>
                <h2 style={subtitleStyle}>Final Score: {score}</h2>
                <button onClick={restartGame} style={buttonStyle}>Restart Mission</button>
            </div>
        );
    }

    // HUD RENDER
    return (
        <div style={hudContainerStyle}>
            {/* Top Left: Stats */}
            <div style={panelStyle}>
                <div style={scoreStyle}>SCORE: {score.toString().padStart(6, '0')}</div>
                <div style={healthContainerStyle}>
                    <div style={{ ...healthBarStyle, width: `${health}%`, backgroundColor: health > 30 ? '#44ff44' : '#ff4444' }}></div>
                </div>
                <div style={healthTextStyle}>{health}% HP</div>
            </div>

            {/* Bottom Right: Weapon */}
            <div style={{ ...panelStyle, bottom: 20, right: 20, top: 'auto', left: 'auto', textAlign: 'right' }}>
                <div style={weaponStyle}>{weapon.toUpperCase()}</div>
                <div style={ammoStyle}>{ammo}</div>
            </div>
        </div>
    );
};

// STYLES
const overlayStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 20, 0.85)', color: 'white', pointerEvents: 'auto',
    backdropFilter: 'blur(5px)'
};

const hudContainerStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    pointerEvents: 'none', padding: '20px', boxSizing: 'border-box'
};

const panelStyle: React.CSSProperties = {
    position: 'absolute', top: 20, left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    padding: '15px 25px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex', flexDirection: 'column', gap: '5px'
};

const titleStyle: React.CSSProperties = {
    fontFamily: 'Orbitron, sans-serif', fontSize: '48px', margin: '0 0 40px 0',
    color: '#00ffff', textShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
};

const subtitleStyle: React.CSSProperties = {
    fontFamily: 'Rajdhani, sans-serif', fontSize: '32px', margin: '0 0 40px 0', color: '#ccc'
};

const buttonStyle: React.CSSProperties = {
    padding: '15px 40px', fontSize: '24px', cursor: 'pointer',
    backgroundColor: '#00ffff', border: 'none', borderRadius: '4px',
    color: '#000', fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif',
    boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)',
    transition: 'all 0.2s', pointerEvents: 'auto'
};

const scoreStyle: React.CSSProperties = {
    fontFamily: 'monospace', fontSize: '28px', color: '#ffcc00', fontWeight: 'bold',
    letterSpacing: '2px'
};

const healthContainerStyle: React.CSSProperties = {
    width: '200px', height: '10px', backgroundColor: '#333', borderRadius: '5px',
    overflow: 'hidden', marginTop: '5px'
};

const healthBarStyle: React.CSSProperties = {
    height: '100%', transition: 'width 0.3s ease-out'
};

const healthTextStyle: React.CSSProperties = {
    fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', color: '#aaa', marginTop: '2px'
};

const weaponStyle: React.CSSProperties = {
    fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#00ffff', letterSpacing: '1px'
};

const ammoStyle: React.CSSProperties = {
    fontFamily: 'Rajdhani, sans-serif', fontSize: '36px', color: '#fff', fontWeight: 'bold'
};

export { GameUI };
