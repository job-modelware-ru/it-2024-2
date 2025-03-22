import RU from './t9n.ru';
import EN from './t9n.en';

export default (landId, code, args = []) => {
    if (code == null || code.length === 0) return '';

    if (!['ru', 'en'].includes(landId)) {
        landId = 'ru';
    }

    if (landId === 'ru' && RU[code]) return RU[code](...args);
    if (landId === 'en' && EN[code]) return EN[code](...args);

    return code;
}
