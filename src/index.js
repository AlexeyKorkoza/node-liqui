const rp = require('request-promise');
const crypto = require('crypto');
const querystring = require('querystring');
const util = require('util');

const getTimestamp = time => {
    if (util.isDate(time)) {
        return Math.round(time.getTime() / 1000);
    }
    if (typeof time === 'string') {
        return new Date(time).getTime();
    }
    if (typeof time === 'number') {
        return (time >= 0x100000000) ? Math.round(time / 1000) : time;
    }
    return 0;
};

class Liqui {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.urlPost = 'https://api.liqui.io/tapi';
        this.urlGet = 'https://api.liqui.io/api/3/';

        this.nonce = getTimestamp(Date.now());
    };

    /*************************
     / Private Methods
     *************************/
    _getHTTPS (url) {
        const options = {
            method: 'GET',
            url: url,
            json: true,
        };
        return rp(options);
    };

    _query(method, params) {

        if (!this.apiKey || !this.apiSecret) {
            return Promise.reject('API Key and Secret are required for this call');
        }
        let content = {
            'method': method,
            'nonce': ++this.nonce,
        };

        if (!!params && typeof(params) === 'object') {
            Object.keys(params).forEach(key => {
                let value;
                if (key === 'since' || key === 'end') {
                    value = getTimestamp(params[key]);
                }
                value = params[key];

                content[key] = value;
            });
        }

        content = querystring.stringify(content);

        const sign = crypto
            .createHmac('sha512', new Buffer(this.apiSecret, 'utf8'))
            .update(new Buffer(content, 'utf8'))
            .digest('hex');

        const options = {
            headers: {
                'Key': this.apiKey,
                'Sign': sign,
                'content-type': 'application/x-www-form-urlencoded',
                'content-length': content.length,
            },
            body: content,
            json: true,
            url: this.urlPost,
            method: 'POST',
        };

        return rp(options).then(data => {
            if (data.success === 1) {
                return Promise.resolve(data.return);
            }
            return Promise.reject(data);
        });
    }

    /*************************
     / Public API
     *************************/
    info() {
        const url = this.urlGet + 'info';
        return this._getHTTPS(url);
    };

    ticker(pair) {
        if (!pair) {
            return Promise.reject('Liqui ticker requires a pair such as btc_usd');
        }
        const url = this.urlGet + 'ticker/' + pair.toLowerCase();
        return this._getHTTPS(url);
    };

    depth(pair, limit) {
        if (!pair) {
            return Promise.reject('Liqui depth requires a pair such as btc_usd');
        }
        let url = this.urlGet + 'depth/' + pair.toLowerCase();
        url += limit ? `?limit=${limit}` : '';
        return this._getHTTPS(url);
    };

    trades(pair) {
        if (!pair) {
            return Promise.reject('Liqui trades requires a pair such as btc_usd');
        }
        const url = this.urlGet + 'trades/' + pair.toLowerCase();
        return this._getHTTPS(url);
    };

    /*************************
     / Trades API
     *************************/
    getInfo() {
        return this._query('getInfo');
    };

    buy(params){
        if (!params || !params.pair || !params.rate || !params.amount) {
            return Promise.reject('Pair, rate, and amount are required');
        }
        params.type = 'buy';
        return this._query('Trade', params);
    };

    sell(params) {
        if (!params || !params.pair || !params.rate || !params.amount) {
            return Promise.reject('Pair, rate, and amount are required');
        }
        params.type = 'sell';
        return this._query('Trade', params);
    };

    activeOrders(pair){
        let params = {};
        if (pair) {
            params.pair = pair;
        }
        return this._query('ActiveOrders', params).catch(result => {
            if (!result.success && result.error === 'no orders'){
                return Promise.resolve({
                    success: 1,
                    return: {}
                });
            }
        });
    };

    orderInfo(orderId) {
        if (typeof orderId === 'undefined') {
            return Promise.reject('Order ID is required');
        }
        let params = {
            order_id: orderId
        };
        return this._query('OrderInfo', params).catch(data => {
            if (data.success === 0 && data.error === 'invalid order') {
                return Promise.reject('invalid order');
            }
            return data;
        });
    };

    cancelOrder(orderId){
        if (typeof orderId === 'undefined') {
            return Promise.reject('Order ID is required');
        }
        let params = {
            order_id: orderId,
        };
        return this._query('CancelOrder', params).catch(data => {
            if (data.success === 0) {
                return Promise.reject(data.error);
            }
            return data;
        });
    };

    /*
    from - trade ID, from which the display starts,
    count	- the number of trades for display,
    from_id	- trade ID, from which the display starts,
    end_id	trade ID on which the display ends,
    order	- Sorting	- ASC or DESC
    since	- the time to start the display	UTC time
    end	- the time to end the display	UTC time
    pair	- pair to be displayed	eth_btc (example)
    */
    tradeHistory(params) {
        return this._query('TradeHistory', params);
    }
}

module.exports = Liqui;
