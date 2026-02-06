/**
 * ZzFX - Zuper Zmall Zound Zynth - Micro Edition
 * MIT License - Copyright 2019 Frank Force
 * https://github.com/KilledByAPixel/ZzFX
 * 
 * TypeScript adaptation for Phaser integration
 */

export class ZzFX {
    private static context: AudioContext | null = null;
    private static _volume: number = 0.5;

    static get volume(): number {
        return this._volume;
    }

    static set volume(v: number) {
        this._volume = Math.max(0, Math.min(1, v));
    }

    static init() {
        if (!this.context) {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    /**
     * Generate and play a sound
     * @param params Parameters for the sound generation
     */
    static zzfx(...params: (number | undefined)[]) {
        this.init();
        if (!this.context) return;

        // Default parameters
        const [
            volume = 1,
            randomness = .05,
            frequency = 220,
            attack = 0,
            sustain = 0,
            release = .1,
            shape = 0,
            shapeCurve = 1,
            slide = 0,
            deltaSlide = 0,
            pitchJump = 0,
            pitchJumpTime = 0,
            repeatTime = 0,
            noise = 0,
            modulation = 0,
            bitCrush = 0,
            delay = 0,
            sustainVolume = 1,
            decay = 0,
            tremolo = 0
        ] = params;

        // Init randomness
        const PI2 = Math.PI * 2;
        const sampleRate = this.context.sampleRate;
        const sign = (v: number) => v > 0 ? 1 : -1;
        const startSlide = slide * 500 * PI2 / sampleRate ** 2;
        let startFrequency = frequency * (1 + randomness * 2 * Math.random() - randomness) * PI2 / sampleRate;
        const b = [];
        let t = 0;
        let tm = 0;
        let i = 0;
        let j = 1;
        let r = 0;
        let c = 0;
        let s = 0;
        let f: number;
        let length: number;

        // Scale by sample rate
        const scale = sampleRate;
        // Generate waveform
        for (
            length = 0;
            length < scale * (attack + decay + sustain + release + delay) + delay;
            length++
        ) {
            if (!(i = ++i % ((scale * repeatTime) | 0))) {
                f = startFrequency;
                startFrequency += startSlide;
                startFrequency += deltaSlide * 500 * PI2 / sampleRate ** 3;

                j = 1 - noise;
                r = noise * Math.random();
            }

            if (length < delay * scale) {
                b[length] = 0;
                continue;
            }

            t += startFrequency;
            if (pitchJump && ++c > pitchJumpTime * scale) {
                startFrequency += pitchJump * PI2 / sampleRate;
                startFrequency *= 2; // Octave jump for 8-bit feel
                c = 0;
            }

            if (tm++ > 100 * scale && bitCrush) { // Simplified Bitcrush effect
                t += bitCrush * Math.random();
            }

            // Wave shape
            let v = 0;
            switch (shape | 0) {
                case 0: v = Math.sin(t); break; // Sine
                case 1: v = (t % PI2) / PI2 * 2 - 1; break; // Triangle
                case 2: v = sign(Math.sin(t)); break; // Square
                case 3: v = 1 - 2 * (Math.random()); break; // Noise
                default: v = Math.sin(t);
            }

            v = sign(v) * Math.abs(v) ** shapeCurve;

            // Modulation
            if (modulation) {
                v += Math.sin(t * modulation) * .2;
            }

            v *= volume + (1 - volume) * (2 * Math.random() - 1); // Simple volume noise texture

            // Envelope
            s = length < scale * (attack + delay) ?
                1 :
                length < scale * (attack + decay + delay) ?
                    1 - ((length - scale * (attack + delay)) / (scale * decay)) * (1 - sustainVolume) :
                    length < scale * (attack + decay + sustain + delay) ?
                        sustainVolume :
                        length < scale * (attack + decay + sustain + release + delay) ?
                            sustainVolume - ((length - scale * (attack + decay + sustain + delay)) / (scale * release)) * sustainVolume :
                            0;

            s = s >= 0 ? s : 0;

            b[length] = v * s * volume * this._volume; // Final mix
        }

        // Create buffer
        const buffer = this.context.createBuffer(1, b.length, sampleRate);
        buffer.getChannelData(0).set(b);

        // Play sound
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);
        source.start();
        return source;
    }

    // Preset generators
    static shoot() { ZzFX.zzfx(1, .05, 300, 0, .02, .05, 1, 1.5, -.1, .1, 0, 0, 0, 0, 0, 0, .05, .6, .03); }
    static hit() { ZzFX.zzfx(1, .05, 150, .01, .05, .1, 3, 1, -.05, 0, 0, 0, 0, 1.5, 0, 0, .1, .7, .05); }
    static explosion() { ZzFX.zzfx(1, .05, 200, 0, .1, .5, 3, 1, -.1, 0, 0, 0, 0, 2.1, 0, 0, .5, .5, .5); }
    static jump() { ZzFX.zzfx(1, .05, 400, .01, .05, .1, 0, 1, .1, 0, 0, 0, 0, 0, 0, 0, 0, .6, .05); }
    static pickup() { ZzFX.zzfx(1, .05, 800, 0, .05, .1, 0, 1, .1, 0, 20, .05, 0, 0, 0, 0, 0, .8, .03); }
    static powerup() { ZzFX.zzfx(1, .05, 450, 0, .1, .3, 1, 1, 0, 0, 0, 0, 0, 0, 0, .1, 0, .8, .05, .2); }
    static bossHit() { ZzFX.zzfx(1, .05, 100, 0, .1, .3, 2, 1, -.2, 0, 0, 0, 0, 1, 0, 0, 0, .6, .2); }
}
