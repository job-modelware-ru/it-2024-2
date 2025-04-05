class EventManager {
    _eventList = {};

    // {
    //     'event1': [
    //         f1,
    //         f2
    //     ],
    //     'event2': [
    //         f3
    //     ]
    // }

    subscribe = (ref, name, listener) => {
        if (typeof this._eventList[name] === 'undefined') {
            this._eventList[name] = [];
        }
        this._eventList[name].push({ listener, ref });
    }

    dispatch = (ref, name, args = {}) => {
        if (this._eventList.hasOwnProperty(name)) {
            this._eventList[name].forEach((item) => {
                if (item.ref !== ref)
                    item.listener.call(item.ref, args);
            });
        }
    }
}

export let commonEventManager = new EventManager(); // singleton
export { EventManager }; // class