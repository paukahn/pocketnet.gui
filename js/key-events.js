class KeyEvents {
    layers = {};
    activeKeys = {};

    constructor() {
        document.addEventListener('keydown', (e) => {
            this.activeKeys[e.code] = e;

            const fromSmallerToBigger = (a, b) => {
                const key1 = this.activeKeys[a].keyCode;
                const key2 = this.activeKeys[b].keyCode;

                if (key1 < key2) return 1;
                if (key2 > key1) return -1;
            };

            const allActiveKeys = Object.keys(this.activeKeys)
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

        this.createListener(keyCode, listener, layer);
    }

    once(keyCode, listener, layer) {
        this.createLayerIfNotExist(keyCode);

        this.createListener(keyCode, listener, layer, true);
    }

    off(keyCode, listener) {
        this.findListenerInLayers(keyCode, listener, (layerId, listenerId) => {
            if (this.layers[keyCode][layerId].length <= 1) {
                delete this.layers[keyCode][layerId];
                return;
            }

            delete this.layers[keyCode][layerId][listenerId];
        });
    }

    freeze(keyCode, listener) {
        this.findListenerInLayers(keyCode, listener, (layerId, listenerId) => {
            this.layers[keyCode][layerId][listenerId].frozen = true;
        });
    }

    unfreeze(keyCode, listener) {
        this.findListenerInLayers(keyCode, listener, (layerId, listenerId) => {
            this.layers[keyCode][layerId][listenerId].frozen = false;
        });
    }

    createListener(keyCode, listener, layer, once) {
        if (Array.isArray(layer)) {
            this.layers[layer[0]][layer[1]].push({ listener, once });
            return [layer[0], layer[1]];
        }

        let newElemNum = this.layers[keyCode].length;

        if (layer === true || newElemNum === 0) {
            this.layers[keyCode][newElemNum] = [{ listener, once }];
            return [keyCode, newElemNum];
        }

        this.layers[keyCode][newElemNum - 1].push({ listener, once });

        return [keyCode, newElemNum];
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
            const key1 = this.activeKeys[a].keyCode;
            const key2 = this.activeKeys[b].keyCode;

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
        }, every * 60 * 1000);
    }
}

if (typeof module != 'undefined') {
    module.exports = KeyEvents;
} else {
    window.KeyEvents = KeyEvents;
}
