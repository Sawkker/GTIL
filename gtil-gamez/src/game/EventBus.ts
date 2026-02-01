// Custom Event Emitter to avoid importing 'phaser' package in SSR context

export class EventEmitter {
    private events: { [key: string]: { listener: Function, context?: any }[] } = {};

    on(event: string, listener: Function, context?: any) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push({ listener, context });
        return this;
    }

    off(event: string, listener?: Function) {
        if (!this.events[event]) return this;
        if (!listener) {
            delete this.events[event];
        } else {
            this.events[event] = this.events[event].filter(l => l.listener !== listener);
        }
        return this;
    }

    emit(event: string, ...args: any[]) {
        if (!this.events[event]) return false;
        this.events[event].forEach(({ listener, context }) => {
            listener.apply(context || null, args);
        });
        return true;
    }
}

export const EventBus = new EventEmitter();
