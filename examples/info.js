const nodeLiqui = require('../src');

const liqui = new nodeLiqui();

liqui.info()
    .then(result => console.log('result', result))
    .catch(err => console.error('err', err));