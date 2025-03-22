import { mount, el } from '../../node_modules/redom/dist/redom.es';

export default class Input {
    constructor(settings = {}) {
        const {
            label = '',
        } = settings;

        this._prop = {
            label,
        }
        this.el = this._ui_render();
    }

    updateLabel = (label) => {
        if (typeof label === 'string') {
            this._el_label.innerText = label;
        } else {
            this._el_label = mount(this.el, label, this._el_label, true);
        }

    }

    _ui_render = () => {
        const { label } = this._prop;
        return (
            <label className="form-label">
                <span this='_el_label'>{label}</span>
                <input type="text" className="form-control" />
            </label>
        )
    }
}
