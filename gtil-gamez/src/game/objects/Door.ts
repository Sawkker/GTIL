import { Scene } from 'phaser';

export class Door extends Phaser.Physics.Arcade.Sprite {
    public isOpen: boolean = false;
    private isLocked: boolean = false;
    private closedAngle: number = 0;
    private openAngle: number = 90;

    constructor(scene: Scene, x: number, y: number, texture: string, isVertical: boolean = false) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setImmovable(true);

        // Set Anchor to the side (Hinge)
        // If we change origin to 0 (Left), we must shift X position by half width to keep it centered in tile
        // Standard tile: 32x32. Center is 16,16.
        // Origin 0,0.5 -> Draws from x.
        // So if x passed is Center (16), and we want it to start at 0 (Left), we shift x by -16.

        // However, Arcade Body usually matches texture.
        // Let's assume texture is 32x32.

        // Pivot Setup
        this.setOrigin(0, 0.5);
        this.x -= 16; // Shift left to align hinge with tile edge

        if (isVertical) {
            this.angle = 90;
            this.closedAngle = 90;
            this.openAngle = 180; // or 0
        } else {
            this.angle = 0;
            this.closedAngle = 0;
            this.openAngle = -90; // Swing "up"
            // Visual tweak: shift y slightly if needed, but 0.5 y-origin checks out.
        }
    }

    toggle() {
        if (this.isLocked) return;
        // avoid spamming
        if (this.scene.tweens.isTweening(this)) return;

        this.isOpen = !this.isOpen;

        const targetAngle = this.isOpen ? this.openAngle : this.closedAngle;

        this.scene.tweens.add({
            targets: this,
            angle: targetAngle,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                // Physics update
                // When OPEN, disable collision
                if (this.isOpen) {
                    // check collision logic in MainScene: usually we just disable body
                    this.disableBody(true, true);
                    this.visible = true; // Keep visible!
                } else {
                    this.enableBody(false, 0, 0, true, true);
                    this.setImmovable(true);
                    // Fix body offset/size if rotation messed it up?
                    // Arcade bodies don't rotate. 
                    // When closed (Angle 0 or 90), the AABB matches the visual if we are lucky.
                    // Vertical (90 deg) visual -> Horizontal Body? NO.
                    // Arcade Physics is strict. 
                    // If visual is 90 deg, body is still unrotated box relative to x,y?
                    // Actually explicit body adjustment might be needed for vertical doors in Arcade.
                    // But for 'open', disabling is fine.
                }
            }
        });

        // Immediate logic: if opening, disable collision immediately? 
        // Or wait for tween? 
        // Let's Disable immediately to prevent getting stuck, enable on complete
        if (this.isOpen) {
            this.disableBody(true, true);
            this.visible = true;
        }
        // If closing, we enable strictly after tween so player doesn't get stuck INSIDE moving door?
        // Or just enable.
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
