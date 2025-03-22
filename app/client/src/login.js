import { mount, el } from '../node_modules/redom/dist/redom.es';
import LoginForm from './widget/loginForm'

const langId = 'ru'; // 'ru', 'en'

mount(
    document.getElementById('main'),
    <LoginForm langId={langId}/>
);