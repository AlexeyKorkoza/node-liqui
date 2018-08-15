const nodeLiqui = require('../src');

const liqui = new nodeLiqui();

const pair = 'eth_btc';
liqui.trades(pair)
    .then(result => console.log('result', result))
    .catch(err => console.error('err', err));