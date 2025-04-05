import { el } from '../../../node_modules/redom/dist/redom.es';

export default {
    'LOGIN': (...args) => 'Логин',
    'PASSWORD': (...args) => 'Пароль',
    'TO_LOGIN': (...args) => 'Войти',
    'ERR_FIELD_REQUERED': (...args) => 'Поле должно быть заполнено',
    'ERR_LOGIN_EXISTS': (...args) => `Такой логин уже существует ${args[0]}`
}
