import { mount, el } from '../../node_modules/redom/dist/redom.es';
import { clsx } from '../../node_modules/clsx/dist/clsx.mjs';

export default class Button {
    constructor(settings = {}) {
        const {
            title = '',
            icon = null,
            type = 'primary', // 'primary', 'secondary', 'link'
            className = 'btn',
            enabled = true,
            onClick = () => { },
        } = settings;

        this._prop = {
            title,
            icon,
            type,
            className,
            enabled
        };

        this._callback = {
            onClick,
        }

        this.el = this._ui_render();
    }

    enabled = (enabled = true, force = false) => {
        this._updateProp('enabled', enabled, force);
    }

    setTitle = (label, force = false) => {
        this._updateProp('title', label, force);
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
            case 'title':
                if (typeof value === 'string') {
                    this._el_title.innerText = value;
                } else {
                    this._el_title = mount(this.el, value, this._el_title, true);
                }
                break;
        }

        this._prop[name] = value;
    }

    _onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const { onClick } = this._callback;
        onClick && onClick();
    }

    _ui_icon = (icon) => {
        return icon ? <i className={clsx('bi', `bi-${icon}`)}></i> : null;
    }

    _ui_render = () => {
        const { title, icon, type, className } = this._prop;

        return (
            <button className={`btn btn-${type} ${className}`} onclick={this._onClick}>
                {this._ui_icon(icon)}
                <span this='_el_title'>{title}</span>
            </button>
        );
    }

}
