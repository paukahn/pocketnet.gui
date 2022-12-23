class KeyEvent {
    constructor(handler, keyCode, layerId, eventId) {
        this.handler = handler;
        this.keyCode = keyCode;
        this.layerId = layerId;
        this.eventId = eventId;
    }

    off() {
        const keyCode = this.keyCode;
        const layerId = this.layerId;
        const eventId = this.eventId;

        delete this.handler.layers[keyCode][layerId][eventId];
    }

    freeze() {
        const keyCode = this.keyCode;
        const layerId = this.layerId;
        const eventId = this.eventId;

        this.handler.layers[keyCode][layerId][eventId].frozen = true;
    }

    unfreeze() {
        const keyCode = this.keyCode;
        const layerId = this.layerId;
        const eventId = this.eventId;

        this.handler.layers[keyCode][layerId][eventId].frozen = false;
    }
}

class KeyEvents {
    layers = {};
    activeKeys = {};

    constructor() {
        document.addEventListener('keydown', (e) => {
            this.activeKeys[e.code] = {
                event: e,
                timeoutAfter: Date.now() + 5000,
            };

            const timedOut = (key) => {
                const isTimeout = (this.activeKeys[key].timeoutAfter < Date.now());

                if (isTimeout) {
                    delete this.activeKeys[key];
                    return false;
                }

                return true;
            };

            const fromSmallerToBigger = (a, b) => {
                const key1 = this.activeKeys[a].event.keyCode;
                const key2 = this.activeKeys[b].event.keyCode;

                if (key1 < key2) return 1;
                if (key2 > key1) return -1;
            };

            const allActiveKeys = Object.keys(this.activeKeys)
                .filter(timedOut)
                .sort(fromSmallerToBigger);

            const combo = allActiveKeys.join('+');

            const targetListeners = this.layers[combo];

            if (!targetListeners) {
                return;
            }

            const targetLayer = targetListeners.at(-1);

            if (!targetLayer) {
                return;
            }

            targetLayer.forEach((listenerData, i) => {
                const { listener, once, frozen } = listenerData;

                if (frozen) {
                    return;
                }

                listener(e);

                if (once) {
                    if (targetLayer.flat().length <= 1) {
                        targetListeners.pop();
                        return;
                    }

                    delete targetLayer[i];
                }
            });
        });

        document.addEventListener('keyup', (e) => {
            delete this.activeKeys[e.code];
        });
    }

    on(keyCode, listener, layer) {
        this.createLayerIfNotExist(keyCode);

        return this.createListener(keyCode, listener, layer);
    }

    once(keyCode, listener, layer) {
        this.createLayerIfNotExist(keyCode);

        return this.createListener(keyCode, listener, layer, true);
    }

    off(keyCode, listener) {
        if (listener instanceof KeyEvent) {
            const listenerId = listener.eventId;
            delete this.layers[keyCode][listenerId];
            return;
        }

        this.findListenerInLayers(keyCode, listener, (layerId, listenerId) => {
            if (this.layers[keyCode][layerId].length <= 1) {
                delete this.layers[keyCode][layerId];
                return;
            }

            delete this.layers[keyCode][layerId][listenerId];
        });
    }

    freeze(keyCode, listener) {
        if (listener instanceof KeyEvent) {
            const listenerId = listener.eventId;
            this.layers[keyCode][listenerId].frozen = true;
            return;
        }

        this.findListenerInLayers(keyCode, listener, (layerId, listenerId) => {
            this.layers[keyCode][layerId][listenerId].frozen = true;
        });
    }

    unfreeze(keyCode, listener) {
        if (listener instanceof KeyEvent) {
            const listenerId = listener.eventId;
            this.layers[keyCode][listenerId].frozen = false;
            return;
        }

        this.findListenerInLayers(keyCode, listener, (layerId, listenerId) => {
            this.layers[keyCode][layerId][listenerId].frozen = false;
        });
    }

    createListener(keyCode, listener, layer, once) {
        if (Number.isInteger(layer)) {
            this.layers[keyCode][layer].push({ listener, once });
            return new KeyEvent(this, keyCode, layer, this.layers[keyCode][layer].length - 1);
        }

        let newLayerNum = this.layers[keyCode].length;

        if (layer === true || newLayerNum === 0) {
            this.layers[keyCode][newLayerNum] = [{ listener, once }];
            return new KeyEvent(this, keyCode, newLayerNum, 0);
        }

        this.layers[keyCode][newLayerNum - 1].push({ listener, once });

        return new KeyEvent(this, keyCode, this.layers[keyCode][newLayerNum - 1].length - 1);
    }

    createLayerIfNotExist(keyCode) {
        if (!this.layers[keyCode]) {
            this.layers[keyCode] = [];
        }
    }

    findListenerInLayers(keyCode, listener, callback) {
        const targetListeners = this.layers[keyCode];

        if (!targetListeners) {
            return;
        }

        targetListeners.forEach((layer, i) => {
            const targetListenerId = layer.findIndex(l => l.listener === listener);

            if (targetListenerId === -1) {
                return;
            }

            callback(i, targetListenerId);
        });
    }

    logCombos(every = 3) {
        let lastCombo;

        const fromSmallerToBigger = (a, b) => {
            const key1 = this.activeKeys[a].event.keyCode;
            const key2 = this.activeKeys[b].event.keyCode;

            if (key1 < key2) return 1;
            if (key2 > key1) return -1;
        };

        setInterval(() => {
            const allActiveKeys = Object.keys(this.activeKeys)
                .sort(fromSmallerToBigger);

            const combo = allActiveKeys.join('+');

            if (lastCombo === combo || !combo) {
                return;
            }

            console.log('KeyEvents: Next key combination is active', combo);

            lastCombo = combo;
        }, every * 1000);
    }
}

if (typeof module != 'undefined') {
    module.exports = KeyEvents;
} else {
    window.KeyEvents = KeyEvents;
}
