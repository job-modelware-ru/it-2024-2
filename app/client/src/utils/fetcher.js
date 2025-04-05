export default async (action, payload) => {
    
    await new Promise(r => setTimeout(r, 1000));

    // return {
    //     status: 'ok'
    // }

    return {
        status: 'fail',
        data: {
            'login': {code: 'ERR_LOGIN_EXISTS', args: ['1']},
            'password': {code: 'ERR_LOGIN_EXISTS', args: ['2']}
        }
    }

};
