import { mount, el } from '../../node_modules/redom/dist/redom.es';
import Input from '../atom/input';
import t9n from '../utils/t9n/index';
import { commonEventManager } from '../utils/eventManager';

export default class LoginAndPassForm {

    constructor(settings = {}) {
        const {
            langId = 'ru',
        } = settings;

        this._prop = {
            langId,
        };

        this.el = this._ui_render();

        commonEventManager.subscribe(this, 'changeLang', this._eventChangeLang)
    }

    getLogin = () => {
        return this._el_login.getValue();
    }

    getPassword = () => {
        return this._el_password.getValue();
    }

    showError = (data) => {
        const {langId} = this._prop;

        if ('login' in data) {
            this._el_login.showError(t9n(langId, data['login'].code, data['login'].args))
        } else {
            this._el_login.resetError()
        }

        if ('password' in data) {
            this._el_password.showError(t9n(langId, data['password'].code, data['password'].args))
        } else {
            this._el_password.resetError()
        }

    }

    _eventChangeLang = (lang) => {
        this._el_login.setLabel(t9n(lang, 'LOGIN'));
        this._el_password.setLabel(t9n(lang, 'PASSWORD'));
    }

    _ui_render = () => {
        const { langId } = this._prop;

        return (
            <div className='d-flex flex-column'>
                <Input this='_el_login' label={t9n(langId, 'LOGIN')} />
                <Input this='_el_password'label={t9n(langId, 'PASSWORD')} />
            </div>
        )
    }
}
