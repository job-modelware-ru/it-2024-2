import { mount, el } from '../../node_modules/redom/dist/redom.es';
import LoginAndPassForm from '../widget/loginAndPassForm';
import Button from '../atom/button';
import t9n from '../utils/t9n/index';
import { commonEventManager } from '../utils/eventManager';
import fetcher from '../utils/fetcher.js';


export default class LoginForm {
    constructor(settings = {}) {
        const {
            langId = 'ru',
        } = settings;

        this._prop = {
            langId,
        };

        this._state = {
            errorData: {}
        }

        this.el = this._ui_render();

        commonEventManager.subscribe(this, 'changeLang', this._eventChangeLang)
    }

    _eventChangeLang = (lang) => {
        const {errorData} = this._state;
        this._prop.langId = lang;

        this._el_login_btn.setTitle(t9n(lang, 'TO_LOGIN'));
        this._showError(errorData);
    }

    _onBtnClick = async () => {
        const login = this._el_form.getLogin();
        const password = this._el_form.getPassword();

        const { hasError, data } = this._check(login, password);

        if (hasError) {
            this._showError(data);
            return;
        }

        try {
            const resp = await fetcher('login', { login, password });

            if (resp.status === 'ok') {
                console.log('OK');
            }

            if (resp.status === 'fail') {
                this._showError(resp.data);
            }

        } catch (e) {
            console.log(e);
            debugger;
        }
    }

    _check = (login, password) => {
        const data = {};
        let hasError = false;

        if (login.length === 0) {
            data['login'] = { code: 'ERR_FIELD_REQUERED', args: [] }
            hasError = true;
        }

        if (password.length === 0) {
            data['password'] = { code: 'ERR_FIELD_REQUERED', args: [] }
            hasError = true;
        }

        return { hasError, data }
    }

    _showError = (data) => {
        this._state.errorData = data;
        this._el_form.showError(data)
    }

    _ui_render = () => {
        const { langId } = this._prop;
        return (
            <div className='d-flex flex-column'>
                <LoginAndPassForm this='_el_form' langId={langId} />
                <Button this='_el_login_btn' title={t9n(langId, 'TO_LOGIN')} className='btn btn-primary' onClick={this._onBtnClick} />
            </div>
        )
    }
}
