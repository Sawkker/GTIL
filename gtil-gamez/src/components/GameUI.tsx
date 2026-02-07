import { useEffect, useState } from 'react';
import { EventBus } from '../game/EventBus';
import { SettingsManager, GameSettings } from '../game/systems/SettingsManager';
import { STORY_LEVELS, StoryLevel } from '../game/data/StoryData';

type GameState = 'MENU_MAIN' | 'MENU_SETTINGS' | 'MENU_CHAR_SELECT' | 'MENU_MAP_SELECT' | 'MENU_BRIEFING' | 'PLAYING' | 'GAMEOVER' | 'CUSTOM_MENU';

const GameUI = () => {
    const [gameState, setGameState] = useState<GameState>('MENU_MAIN');
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [highScores, setHighScores] = useState<any[]>([]); // New state for scores
    const [gameOverData, setGameOverData] = useState<{ score: number, victory: boolean }>({ score: 0, victory: false });
    const [bossHealth, setBossHealth] = useState<{ current: number, max: number, visible: boolean }>({ current: 0, max: 0, visible: false });
    const [weapon, setWeapon] = useState('Pistol');
    const [ammo, setAmmo] = useState('Inf');
    const [volume, setVolume] = useState(SettingsManager.get().volume);
    const [selectedChar, setSelectedChar] = useState('commando'); // Store char selection
    const [settings, setSettings] = useState(SettingsManager.get()); // Local settings state

    // Story Mode State
    const [currentLevelId, setCurrentLevelId] = useState<number | null>(null);
    const [currentStoryLevel, setCurrentStoryLevel] = useState<StoryLevel | null>(null);
    const [dialogue, setDialogue] = useState<string | null>(null);

    const handleWeaponToggle = (w: keyof GameSettings['allowedWeapons'], checked: boolean) => {
        SettingsManager.setWeaponAllowed(w, checked);
        setSettings({ ...SettingsManager.get() }); // Force update
    };

    useEffect(() => {
        const handleScoreChange = (newScore: number) => setScore(newScore);
        const handleHealthChange = (newHealth: number) => setHealth(newHealth);
        const handleWeaponChange = (newWeapon: string) => setWeapon(newWeapon);
        const handleAmmoChange = (newAmmo: string) => setAmmo(newAmmo);



        const handleUpdateUI = (state: GameState, data?: any) => {
            if (state === 'GAMEOVER' && data) {
                setBossHealth({ ...bossHealth, visible: false });

                // Check for Story Mode Victory
                if (currentLevelId && data.victory) {
                    // Player won a story level
                    const level = STORY_LEVELS.find(l => l.id === currentLevelId);
                    if (level && level.nextLevelId) {
                        // Proceed to next level
                        const nextLevel = STORY_LEVELS.find(l => l.id === level.nextLevelId);
                        if (nextLevel) {
                            setCurrentLevelId(nextLevel.id);
                            setCurrentStoryLevel(nextLevel);
                            setGameState('MENU_BRIEFING');
                            return; // Stop here, don't go to GAMEOVER screen
                        }
                    } else if (level && !level.nextLevelId) {
                        // Campaign Finished!
                        // Show Victory Game Over with special message?
                        // For now fall through to standard Game Over but maybe add a "Campaign Complete" flag?
                    }
                } else if (currentLevelId && !data.victory) {
                    // Failed Story Level
                    // Just show Game Over as usual, maybe "Try Again" restarts level?
                }
            }

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

        EventBus.on('show-dialogue', (text: string) => setDialogue(text));
        EventBus.on('hide-dialogue', () => setDialogue(null));

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

    const startStoryMode = () => {
        setCurrentLevelId(1);
        const level = STORY_LEVELS.find(l => l.id === 1);
        if (level) {
            setCurrentStoryLevel(level);
            setGameState('MENU_BRIEFING');
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
        SettingsManager.setVolume(v);
        EventBus.emit('set-volume', v);
    };

    if (gameState === 'CUSTOM_MENU') return null;

    if (gameState === 'MENU_MAIN') {
        return (
            <div style={overlayStyle} className="menu-overlay">
                <h1 style={titleStyle}>Batalla de San Lorenzo</h1>
                <div style={menuContainerStyle}>
                    <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '10px' }}>3 de Febrero de 1813</div>
                    <button onClick={() => {
                        setGameState('MENU_CHAR_SELECT');
                        setCurrentLevelId(null); // Ensure standard mode
                        EventBus.emit('back-to-menu');
                    }} className="menu-button">JUGAR (ARCADE)</button>
                    <button onClick={() => {
                        startStoryMode();
                        EventBus.emit('back-to-menu');
                    }} className="menu-button" style={{ borderColor: '#d4af37', color: '#d4af37' }}>MODO HISTORIA</button>
                    <button onClick={() => setGameState('MENU_SETTINGS')} className="menu-button">OPCIONES</button>
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

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <h3 style={{ color: '#ccc', marginBottom: '10px' }}>WEAPONS ALLOWED</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {(['pistol', 'rifle', 'shotgun', 'sable'] as const).map(w => (
                            <label key={w} style={{ display: 'flex', justifyContent: 'space-between', width: '200px', margin: '0 auto', color: '#fff', fontSize: '18px' }}>
                                {w.toUpperCase()}
                                <input
                                    type="checkbox"
                                    checked={settings.allowedWeapons[w]}
                                    onChange={(e) => handleWeaponToggle(w, e.target.checked)}
                                    style={{ transform: 'scale(1.5)', accentColor: '#00ffff' }}
                                />
                            </label>
                        ))}
                    </div>
                </div>
                <button onClick={() => setGameState('MENU_MAIN')} className="menu-button" style={{ marginTop: '40px', fontSize: '20px' }}>VOLVER</button>
            </div>
        );
    }

    if (gameState === 'MENU_BRIEFING' && currentStoryLevel) {
        return (
            <div style={overlayStyle}>
                <div style={{ ...panelStyle, width: '800px', alignItems: 'center', backgroundColor: 'rgba(10, 5, 0, 0.95)', border: '4px double #d4af37' }}>
                    <h2 style={{ ...titleStyle, fontSize: '42px', marginBottom: '10px' }}>{currentStoryLevel.title}</h2>
                    <h3 style={{ ...subtitleStyle, fontSize: '24px', marginBottom: '30px', color: '#8a7018' }}>{currentStoryLevel.date}</h3>

                    <div style={{ textAlign: 'center', fontFamily: 'Crimson Text, serif', fontSize: '24px', lineHeight: '1.6', color: '#f0e6d2', marginBottom: '40px', fontStyle: 'italic' }}>
                        {currentStoryLevel.briefing.map((line, i) => (
                            <p key={i} style={{ marginBottom: '15px' }}>{line}</p>
                        ))}
                    </div>

                    <button
                        onClick={() => launchGame(currentStoryLevel.mapType)}
                        className="menu-button"
                        style={{ fontSize: '28px', padding: '20px 60px' }}
                    >
                        COMENZAR BATALLA
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === 'MENU_CHAR_SELECT') {
        // Mock Characters
        const characters = [
            { id: 'commando', name: 'Granadero', color: '#0000AA' },
            { id: 'spectre', name: 'Oficial', color: '#4444FF' },
            { id: 'titan', name: 'Sargento', color: '#AA0000' },
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
            { id: 'standard', name: 'Campo de Batalla' },
            { id: 'dungeon', name: 'Claustro del Convento' },
            { id: 'terrace', name: 'Muros del Convento' },
            { id: 'bridge', name: 'Barrancas del Río' }
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
            {/* In-Game Dialogue Overlay */}
            {dialogue && (
                <div style={{
                    position: 'absolute',
                    bottom: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '600px',
                    backgroundColor: 'rgba(20, 15, 10, 0.95)',
                    border: '2px solid #d4af37',
                    boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)',
                    padding: '20px',
                    borderRadius: '8px',
                    color: '#f0e6d2',
                    fontFamily: '"Crimson Text", serif',
                    fontSize: '22px',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    zIndex: 1000
                }}>
                    <div style={{
                        fontSize: '16px',
                        color: '#8a7018',
                        marginBottom: '5px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>Diario de Guerra</div>
                    {dialogue}
                </div>
            )}
        </div>
    );
};

// STYLES
const overlayStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10, 5, 0, 0.85)', color: '#f0e6d2', pointerEvents: 'auto',
    backdropFilter: 'blur(2px)' // Less blur, more dark overlay
};

const hudContainerStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    pointerEvents: 'none', padding: '20px', boxSizing: 'border-box'
};

const panelStyle: React.CSSProperties = {
    position: 'absolute', top: 20, left: 20,
    backgroundColor: 'rgba(20, 10, 5, 0.8)',
    padding: '15px 25px',
    borderRadius: '2px',
    border: '2px solid #8a7018', // Gold Dim
    display: 'flex', flexDirection: 'column', gap: '5px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
};

const titleStyle: React.CSSProperties = {
    fontFamily: 'Cinzel, serif', fontSize: '56px', margin: '0 0 40px 0',
    color: '#d4af37', textShadow: '2px 2px 4px black', letterSpacing: '4px',
    borderBottom: '2px solid #8a7018', paddingBottom: '10px'
};

const subtitleStyle: React.CSSProperties = {
    fontFamily: 'Cinzel, serif', fontSize: '36px', margin: '0 0 40px 0', color: '#e0d0b0',
    textShadow: '1px 1px 2px black'
};

const scoreStyle: React.CSSProperties = {
    fontFamily: 'Crimson Text, serif', fontSize: '32px', color: '#d4af37', fontWeight: 'bold',
    letterSpacing: '1px'
};

const healthContainerStyle: React.CSSProperties = {
    width: '200px', height: '12px', backgroundColor: '#221111', borderRadius: '2px',
    overflow: 'hidden', marginTop: '5px', border: '1px solid #553333'
};

const healthBarStyle: React.CSSProperties = {
    height: '100%', transition: 'width 0.3s ease-out'
};

const healthTextStyle: React.CSSProperties = {
    fontFamily: 'Cinzel, serif', fontSize: '14px', color: '#aaaaaa', marginTop: '4px'
};

const weaponStyle: React.CSSProperties = {
    fontFamily: 'Cinzel, serif', fontSize: '24px', color: '#fff', letterSpacing: '1px',
    textShadow: '1px 1px 2px black'
};

const ammoStyle: React.CSSProperties = {
    fontFamily: 'Crimson Text, serif', fontSize: '40px', color: '#d4af37', fontWeight: 'bold'
};


const volumeContainerStyle: React.CSSProperties = {
    marginTop: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
};

const volumeLabelStyle: React.CSSProperties = {
    fontFamily: 'Cinzel, serif',
    fontSize: '24px',
    color: '#d4af37'
};

const rangeStyle: React.CSSProperties = {
    width: '300px',
    accentColor: '#d4af37',
    cursor: 'pointer'
};


const menuContainerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center'
};

const controlsHintStyle: React.CSSProperties = {
    fontFamily: 'Crimson Text, serif',
    fontSize: '20px',
    color: '#aaa',
    marginBottom: '20px',
    textAlign: 'center',
    fontStyle: 'italic'
};

const charSelectContainerStyle: React.CSSProperties = {
    display: 'flex', gap: '40px', margin: '20px 0'
};

const charPreviewStyle: React.CSSProperties = {
    width: '80px', height: '80px', borderRadius: '50%', marginBottom: '20px',
    border: '2px solid #d4af37', boxShadow: '0 0 10px rgba(0,0,0,0.5)'
};

const charNameStyle: React.CSSProperties = {
    fontFamily: 'Cinzel, serif', color: '#d4af37', fontSize: '20px', fontWeight: 'bold',
    marginTop: '10px'
};

const highScoreContainerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(10, 5, 0, 0.9)',
    padding: '20px',
    borderRadius: '4px',
    border: '2px solid #8a7018',
    width: '500px',
    marginTop: '20px',
    fontFamily: 'Crimson Text, serif'
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
    color: '#800000',
    fontSize: '32px',
    fontWeight: 'bold',
    textShadow: '2px 2px 0 #000',
    marginBottom: '5px',
    fontFamily: 'Cinzel, serif',
    letterSpacing: '2px'
};

const bossHealthBarStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    backgroundColor: '#330000',
    border: '2px solid #5a3a22',
    borderRadius: '2px',
    overflow: 'hidden'
};

const bossHealthFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: '#cc0000',
    transition: 'width 0.2s ease-out'
};

export { GameUI };
