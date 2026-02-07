export interface GameSettings {
    volume: number;
    allowedWeapons: {
        pistol: boolean;
        rifle: boolean;
        shotgun: boolean;
        sable: boolean;
    };
}

const DEFAULT_SETTINGS: GameSettings = {
    volume: 0.5,
    allowedWeapons: {
        pistol: true,
        rifle: true,
        shotgun: true,
        sable: true
    }
};

const STORAGE_KEY = 'gtil_settings_v1';

export class SettingsManager {
    private static _settings: GameSettings = { ...DEFAULT_SETTINGS };

    static init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure structure
                this._settings = {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    allowedWeapons: {
                        ...DEFAULT_SETTINGS.allowedWeapons,
                        ...(parsed.allowedWeapons || {})
                    }
                };
            } catch (e) {
                console.error('Failed to load settings', e);
            }
        }
    }

    static get(): GameSettings {
        return this._settings;
    }

    static setVolume(vol: number) {
        this._settings.volume = Math.max(0, Math.min(1, vol));
        this.save();
    }

    static setWeaponAllowed(weapon: keyof GameSettings['allowedWeapons'], allowed: boolean) {
        this._settings.allowedWeapons[weapon] = allowed;
        this.save();
    }

    static save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
    }
}

// Auto-init on load
if (typeof window !== 'undefined') {
    SettingsManager.init();
}
