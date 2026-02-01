import { Scene } from 'phaser';

export class Door extends Phaser.Physics.Arcade.Sprite {
    public isOpen: boolean = false;
    private isLocked: boolean = false;

    constructor(scene: Scene, x: number, y: number, texture: string) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setImmovable(true);
        // Default: Closed = Collide
    }

    toggle() {
        if (this.isLocked) return;

        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            this.setAlpha(0.3);
            this.disableBody(true, true); // Disable body and hide for physics
            // We need to keep it visible for rendering though, just ghost-like
            this.visible = true;
        } else {
            this.setAlpha(1);
            this.enableBody(false, 0, 0, true, true); // Re-enable body
        }
    }

    open() {
        if (!this.isOpen && !this.isLocked) {
            this.toggle();
        }
    }

    close() {
        if (this.isOpen) {
            this.toggle();
        }
    }
}
