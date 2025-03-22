import { mount, el } from '../node_modules/redom/dist/redom.es';
import RegForm from './widget/regForm'

mount(
    document.getElementById('main'),
    <RegForm />
);