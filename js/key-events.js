class KeyEvents {
    layers = {};

    constructor() {
        document.addEventListener('keydown', (e) => {
            const targetListeners = this.layers[e.code];

            if (!targetListeners) {
                return;
            }

            const targetLayer = targetListeners.at(-1);

            if (!targetLayer) {
                return;
            }

            targetLayer.forEach((listenerData, i) => {
                const { listener, once } = listenerData;

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
    }

    on(keyCode, listener, layer) {
        this.createLayerIfNotExist();

        this.createListener(keyCode, listener, layer);
    }

    once(keyCode, listener, layer) {
        this.createLayerIfNotExist();

        this.createListener(keyCode, listener, layer, true);
    }

    off(keyCode, listener) {
        const targetListeners = this.layers[keyCode];

        if (!targetListeners) {
            return;
        }

        targetListeners.forEach((layer, i) => {
            const targetListenerId = layer.findIndex(l => l === listener);

            if (targetListenerId === -1) {
                return;
            }

            if (layer.flat().length <= 1) {
                targetListeners.pop();
                return;
            }

            delete targetListeners[i][targetListenerId];
        });
    }

    createListener(keyCode, listener, layer, once) {
        if (Array.isArray(layer)) {
            this.layers[layer[0]][layer[1]].push({ listener, once });
            return [layer[0], layer[1]];
        }

        if (!this.layers[keyCode]) {
            this.layers[keyCode] = [];
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
}

if (typeof module != 'undefined') {
    module.exports = KeyEvents;
} else {
    window.KeyEvents = KeyEvents;
}
