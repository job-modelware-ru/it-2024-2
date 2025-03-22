import { mount, el } from '../../node_modules/redom/dist/redom.es';
import LoginAndPassForm from '../widget/loginAndPassForm';
import Button from '../atom/button';
import t9n from '../utils/t9n/index';
import { commonEventManager } from '../utils/eventManager';

export default class LoginForm {
    constructor(settings = {}) {
        const {
            langId = 'ru',
        } = settings;

        this._prop = {
            langId,
        };

        this.el = this._ui_render();
    }

    // Пример
    _onBtnClick = () => {
        const { langId } = this._prop;
        const newLangId = langId === 'ru' ? 'en' : 'ru';
        commonEventManager.dispatch('changeLang', newLangId);
        this._prop.langId = newLangId;
    }

    _ui_render = () => {
        const { langId } = this._prop;
        return (
            <div className='d-flex flex-column'>
                <LoginAndPassForm langId={langId} />
                <Button title={t9n(langId, 'TO_LOGIN')} className='btn btn-primary' onClick={this._onBtnClick} />
            </div>
        )
    }
}
