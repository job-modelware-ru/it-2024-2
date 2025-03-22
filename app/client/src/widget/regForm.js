import { mount, el } from '../../node_modules/redom/dist/redom.es';
import Input from '../atom/input';
import LoginAndPassForm from '../widget/loginAndPassForm';

export default class RegForm {
    constructor() {
        this.el = this._ui_render();
    }

    _ui_render = () => {
        return (
            <div className='d-flex flex-column'>
                <LoginAndPassForm />
                <Input label='Repeat password' />
            </div>
        )
    }
}
