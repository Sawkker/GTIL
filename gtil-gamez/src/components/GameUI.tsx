import { useEffect, useState } from 'react';
import { EventBus } from '../game/EventBus';

type GameState = 'MENU_MAIN' | 'MENU_SETTINGS' | 'MENU_CHAR_SELECT' | 'MENU_MAP_SELECT' | 'PLAYING' | 'GAMEOVER' | 'CUSTOM_MENU';

const GameUI = () => {
    const [gameState, setGameState] = useState<GameState>('MENU_MAIN');
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [highScores, setHighScores] = useState<any[]>([]); // New state for scores
    const [gameOverData, setGameOverData] = useState<{ score: number, victory: boolean }>({ score: 0, victory: false });
    const [bossHealth, setBossHealth] = useState<{ current: number, max: number, visible: boolean }>({ current: 0, max: 0, visible: false });
    const [weapon, setWeapon] = useState('Pistol');
    const [ammo, setAmmo] = useState('Inf');
    const [volume, setVolume] = useState(0.5);
    const [selectedChar, setSelectedChar] = useState('commando'); // Store char selection

    useEffect(() => {
        const handleScoreChange = (newScore: number) => setScore(newScore);
        const handleHealthChange = (newHealth: number) => setHealth(newHealth);
        const handleWeaponChange = (newWeapon: string) => setWeapon(newWeapon);
        const handleAmmoChange = (newAmmo: string) => setAmmo(newAmmo);

        const handleUpdateUI = (state: GameState, data?: any) => {
            setGameState(state);
            if (state === 'GAMEOVER' && data) {
                setBossHealth({ ...bossHealth, visible: false }); // Hide boss bar on game over
                // Handle new data structure
                if (typeof data === 'object') {
                    setGameOverData({ score: data.score, victory: data.victory });
                    if (data.highScores) setHighScores(data.highScores);
                } else {
                    setGameOverData({ score: data, victory: false }); // Legacy fallback
                }
            }
        };

        const handleBossSpawn = (data: { current: number, max: number }) => {
            setBossHealth({ current: data.current, max: data.max, visible: true });
        };

        const handleBossHealthChange = (data: { current: number, max: number }) => {
            setBossHealth({ current: data.current, max: data.max, visible: true });
        };

        const handleBossDied = () => {
            setBossHealth({ ...bossHealth, visible: false });
        };

        EventBus.on('score-change', handleScoreChange);
        EventBus.on('health-change', handleHealthChange);
        EventBus.on('weapon-changed', handleWeaponChange);
        EventBus.on('ammo-change', handleAmmoChange);
        EventBus.on('update-ui-state', handleUpdateUI);
        EventBus.on('boss-spawn', handleBossSpawn);
        EventBus.on('boss-health-change', handleBossHealthChange);
        EventBus.on('boss-died', handleBossDied);

        return () => {
            EventBus.off('score-change', handleScoreChange);
            EventBus.off('health-change', handleHealthChange);
            EventBus.off('weapon-changed', handleWeaponChange);
            EventBus.off('ammo-change', handleAmmoChange);
            EventBus.off('update-ui-state', handleUpdateUI);
            EventBus.off('boss-spawn', handleBossSpawn);
            EventBus.off('boss-health-change', handleBossHealthChange);
            EventBus.off('boss-died', handleBossDied);
        };
    }, []);

    const startGame = (charType?: string) => {
        if (charType) {
            setSelectedChar(charType);
            setGameState('MENU_MAP_SELECT'); // Go to Map Select instead of start
        }
    };

    const launchGame = (mapType: string) => {
        // Emit start game with both params
        EventBus.emit('launch-game', { charType: selectedChar, mapType });
        setGameState('PLAYING');

        // Reset game stats
        setScore(0);
        setHealth(100);
        setWeapon('Pistol');
        setAmmo('Inf');
        setGameOverData({ score: 0, victory: false });
        setHighScores([]);
        setBossHealth({ current: 0, max: 0, visible: false });
    };

    const restartGame = () => {
        // This is strictly "Retry Mission"
        EventBus.emit('restart-game');
        setGameState('PLAYING');
        setScore(0);
        setHealth(100);
        setWeapon('Pistol');
        setAmmo('Inf');
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        EventBus.emit('set-volume', v);
    };

    if (gameState === 'CUSTOM_MENU') return null;

    if (gameState === 'MENU_MAIN') {
        return (
            <div style={overlayStyle} className="menu-overlay">
                <h1 style={titleStyle}>GTIL Phaser Shooter</h1>
                <div style={menuContainerStyle}>
                    <button onClick={() => {
                        setGameState('MENU_CHAR_SELECT');
                        EventBus.emit('back-to-menu'); // Ensure we are in menu scene
                    }} className="menu-button">PLAY</button>
                    <button onClick={() => setGameState('MENU_SETTINGS')} className="menu-button">SETTINGS</button>
                </div>
            </div>
        );
    }

    if (gameState === 'MENU_SETTINGS') {
        return (
            <div style={overlayStyle}>
                <h2 style={subtitleStyle}>SETTINGS</h2>
                <div style={controlsHintStyle}>
                    [WASD] Move &nbsp; [Click] Shoot &nbsp; [Q] Switch Weapon &nbsp; [R] Reload &nbsp; [E] Open Door
                </div>
                <div style={volumeContainerStyle}>
                    <label style={volumeLabelStyle}>Volume: {Math.round(volume * 100)}%</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={handleVolumeChange}
                        style={rangeStyle}
                    />
                </div>
                <button onClick={() => setGameState('MENU_MAIN')} className="menu-button" style={{ marginTop: '40px', fontSize: '20px' }}>BACK</button>
            </div>
        );
    }

    if (gameState === 'MENU_CHAR_SELECT') {
        // Mock Characters
        const characters = [
            { id: 'commando', name: 'Commando', color: '#ffaa00' },
            { id: 'spectre', name: 'Spectre', color: '#00ccff' },
            { id: 'titan', name: 'Titan', color: '#ff4444' },
        ];

        return (
            <div style={overlayStyle} className="menu-overlay">
                <h2 style={subtitleStyle}>SELECT CHARACTER</h2>
                <div style={charSelectContainerStyle}>
                    {characters.map(char => (
                        <div key={char.id} className="char-card" onClick={() => startGame(char.id)}>
                            <div className="char-preview" style={{ ...charPreviewStyle, backgroundColor: char.color }}></div>
                            <div style={charNameStyle}>{char.name}</div>
                        </div>
                    ))}
                </div>
                <button onClick={() => setGameState('MENU_MAIN')} className="menu-button" style={{ marginTop: '40px', fontSize: '20px' }}>BACK</button>
            </div>
        );
    }

    if (gameState === 'MENU_MAP_SELECT') {
        const maps = [
            { id: 'standard', name: 'Standard Map' },
            { id: 'dungeon', name: 'Dungeon' },
            { id: 'terrace', name: 'Terrace' },
            { id: 'bridge', name: 'The Bridge (Long)' }
        ];

        return (
            <div style={overlayStyle} className="menu-overlay">
                <h2 style={subtitleStyle}>SELECT MAP</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {maps.map(map => (
                        <button
                            key={map.id}
                            className="menu-button"
                            style={{ width: '400px' }}
                            onClick={() => launchGame(map.id)}
                        >
                            {map.name}
                        </button>
                    ))}
                </div>
                <button onClick={() => setGameState('MENU_CHAR_SELECT')} className="menu-button" style={{ marginTop: '40px', fontSize: '20px', borderColor: '#555', color: '#ccc' }}>BACK</button>
            </div>
        );
    }

    if (gameState === 'GAMEOVER') {
        return (
            <div style={overlayStyle}>
                <h1 style={{ ...titleStyle, color: gameOverData.victory ? '#00ff00' : '#ff0000' }}>
                    {gameOverData.victory ? 'VICTORY' : 'GAME OVER'}
                </h1>
                <h2 style={subtitleStyle}>SCORE: {gameOverData.score}</h2>

                <div style={highScoreContainerStyle}>
                    <h3 style={{ color: '#fff', borderBottom: '1px solid #555', paddingBottom: '10px' }}>HIGH SCORES</h3>
                    <table style={{ width: '100%', color: '#ddd', fontSize: '14px', textAlign: 'left' }}>
                        <tbody>
                            {highScores.map((s, i) => (
                                <tr key={s.id || i}>
                                    <td style={{ padding: '5px' }}>{i + 1}.</td>
                                    <td style={{ padding: '5px' }}>{s.charType.toUpperCase()}</td>
                                    <td style={{ padding: '5px', textAlign: 'right' }}>{s.score}</td>
                                    <td style={{ padding: '5px', color: '#888', fontSize: '12px' }}>{s.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button onClick={() => {
                    setGameState('MENU_CHAR_SELECT');
                    EventBus.emit('back-to-menu'); // Force Phaser back to MainMenuScene
                }} className="menu-button">PLAY AGAIN</button>
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


const volumeContainerStyle: React.CSSProperties = {
    marginTop: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
};

const volumeLabelStyle: React.CSSProperties = {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: '24px',
    color: '#00ffff'
};

const rangeStyle: React.CSSProperties = {
    width: '300px',
    accentColor: '#00ffff',
    cursor: 'pointer'
};


const menuContainerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '20px'
};

const controlsHintStyle: React.CSSProperties = {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: '18px',
    color: '#888',
    marginBottom: '20px',
    textAlign: 'center'
};

const charSelectContainerStyle: React.CSSProperties = {
    display: 'flex', gap: '30px', margin: '20px 0'
};

const charPreviewStyle: React.CSSProperties = {
    width: '60px', height: '60px', borderRadius: '50%', marginBottom: '20px'
};

const charNameStyle: React.CSSProperties = {
    fontFamily: 'Orbitron, sans-serif', color: 'white', fontSize: '18px'
};

const highScoreContainerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #444',
    width: '400px',
    marginTop: '20px',
    fontFamily: 'monospace'
};

const bossHealthContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '80px', // Below scores which are top-left/right
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    textAlign: 'center',
    zIndex: 100
};

const bossNameStyle: React.CSSProperties = {
    color: '#ff0000',
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '2px 2px 0 #000',
    marginBottom: '5px',
    fontFamily: 'Orbitron, sans-serif',
    letterSpacing: '2px'
};

const bossHealthBarStyle: React.CSSProperties = {
    width: '100%',
    height: '30px',
    backgroundColor: '#330000',
    border: '3px solid #000',
    borderRadius: '4px',
    overflow: 'hidden'
};

const bossHealthFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: '#ff0000',
    transition: 'width 0.2s ease-out'
};

export { GameUI };
