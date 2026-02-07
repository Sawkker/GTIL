import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { StoryLevel } from '../data/StoryData';

export class StoryManager {
    private scene: Scene;
    private levelData: StoryLevel;
    private triggeredEvents: Set<string> = new Set();
    private startTime: number = 0;
    private kills: number = 0;

    constructor(scene: Scene, levelData: StoryLevel) {
        this.scene = scene;
        this.levelData = levelData;
        this.startTime = scene.time.now;

        this.initListeners();
        this.checkTrigger('start');
    }

    private initListeners() {
        // Listen for enemy death to track kills
        this.scene.events.on('enemy-died', () => {
            this.kills++;
            this.checkTrigger(`kills:${this.kills}`);
        });

        // Listen for specific boss events
        this.scene.events.on('boss-spawn', () => this.checkTrigger('boss_spawn'));
        this.scene.events.on('boss-low-health', () => this.checkTrigger('boss_low_health'));
    }

    public update(time: number, delta: number) {
        // Check time-based triggers
        const elapsedSeconds = Math.floor((time - this.startTime) / 1000);
        this.checkTrigger(`time:${elapsedSeconds}`);
    }

    private checkTrigger(trigger: string) {
        if (this.triggeredEvents.has(trigger)) return;

        const event = this.levelData.dialogueEvents?.find(e => e.trigger === trigger);
        if (event) {
            this.triggeredEvents.add(trigger);
            EventBus.emit('show-dialogue', event.text);

            // Auto-hide after 5 seconds
            this.scene.time.delayedCall(5000, () => {
                EventBus.emit('hide-dialogue');
            });
        }
    }

    public destroy() {
        this.scene.events.off('enemy-died');
        this.scene.events.off('boss-spawn');
        this.scene.events.off('boss-low-health');
    }
}
