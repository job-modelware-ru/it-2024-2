import { mount, el } from '../../node_modules/redom/dist/redom.es';

export default class Input {
    constructor(settings = {}) {
        const {
            label = '',
            value = '',
            error = '',
            hasError = false,
        } = settings;

        this._prop = {
            label,
            value,
            error,
            hasError,
        }

        this._state = {
            value,
        }
        this.el = this._ui_render();
    }

    setLabel = (label, force = false) => {
        this._updateProp('label', label, force);
    }

    getValue = () => {
        return this._state['value'];
    }

    showError = (error, force = false) => {
        this._updateProp('error', error, force);
        this._updateProp('hasError', true, force);
    }

    resetError = (force = false) => {
        this._updateProp('hasError', false, force);
    }

    _updateProp = (name, value, force = false) => {
        if (this._prop[name] === value && !force) return value;

        switch (name) {
            case 'enabled':
                if (value)
                    this.el.removeAttribute('disabled');
                else
                    this.el.setAttribute('disabled', '');
                break;
            case 'label':
                if (typeof value === 'string') {
                    this._el_label.innerText = value;
                } else {
                    this._el_label = mount(this.el, value, this._el_label, true);
                }
                break;
            case 'error':
                if (typeof value === 'string') {
                    this._el_error_text.innerText = value;
                } else {
                    this._el_error_text = mount(this._el_error_wrapper, value, this._el_error_text, true);
                }
                break;
            case 'hasError':
                if (value)
                    this._el_input.classList.add('is-invalid');
                else
                    this._el_input.classList.remove('is-invalid');
                break;
        }

        this._prop[name] = value;
    }

    _updateState = (name, value, force = false) => {
        if (this._state[name] === value && !force) return value;

        switch (name) {
            case 'value':
                this._el_input.value = value;
                break;
        }

        this._state[name] = value;
    }

    _onInput = (e) => {
        const { value: oldValue } = this._state;
        const value = e.target.value;

        if (false) {
            this._updateState('value', oldValue, true);
        } else {
            this._updateState('value', value);
        }
    }

    _ui_render = () => {
        const { label } = this._prop;
        return (
            <label className="form-label">
                <span this='_el_label'>{label}</span>
                <input this="_el_input" type="text" className="form-control" oninput={this._onInput} />
                <div this='_el_error_wrapper' className='invalid-feedback'>
                    <span this='_el_error_text'></span>
                </div>
            </label>
        )
    }
}
