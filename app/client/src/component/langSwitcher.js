import { mount, el } from '../../node_modules/redom/dist/redom.es';
import Button from '../atom/button';
import { commonEventManager } from '../utils/eventManager';

export default class LangSwitcher {

    constructor(settings = {}) {
        const {
            langId = 'ru',
        } = settings;

        this._prop = {
            langId,
        };

        this._state = {
            activeLang: langId,
        };

        this.el = this._ui_render();

        this._updateState('activeLang', langId)

        commonEventManager.subscribe(this, 'changeLang', this._eventChangeLang)
    }

    _eventChangeLang = (lang) => {
        this._updateState('activeLang', lang);
        console.log('event changeLang');
    }

    _updateState = (name, value) => {
        switch (name) {
            case 'activeLang':
                if (value === 'ru') {
                    this._el_rus.enabled(false);
                    this._el_eng.enabled();
                } else {
                    this._el_rus.enabled();
                    this._el_eng.enabled(false);
                }
                break;
        }
        this._state[name] = value;
    }

    _onClick = (lang) => {
        return () => {
            commonEventManager.dispatch(this, 'changeLang', lang);
            this._updateState('activeLang', lang);
        }
    }

    _ui_render = () => {
        return (
            <div className='d-flex flex-row align-items-center'>
                <Button this='_el_rus' type='link' title='Рус' onClick={this._onClick('ru')} />
                |
                <Button this='_el_eng' type='link' title='Eng' onClick={this._onClick('en')} />
            </div>
        )
    }
}
