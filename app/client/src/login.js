import { mount, el } from '../node_modules/redom/dist/redom.es';
import LangSwitcher from './component/langSwitcher'
import LoginForm from './widget/loginForm'

const langId = 'ru'; // 'ru', 'en'

mount(
    document.getElementById('main'),
    <LoginForm langId={langId} />
);

mount(
    document.getElementById('lang-switcher'),
    <span>
        <LangSwitcher langId={langId} />
        <LangSwitcher langId={langId} />
        <LangSwitcher langId={langId} />
    </span>
);

