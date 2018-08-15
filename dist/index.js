'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getTimestamp = function getTimestamp(time) {
    if (_util2.default.isDate(time)) {
        return Math.round(time.getTime() / 1000);
    }
    if (typeof time === 'string') {
        return new Date(time).getTime();
    }
    if (typeof time === 'number') {
        return time >= 0x100000000 ? Math.round(time / 1000) : time;
    }
    return 0;
};

var Liqui = function () {
    function Liqui(apiKey, apiSecret) {
        (0, _classCallCheck3.default)(this, Liqui);

        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.urlPost = 'https://api.liqui.io/tapi';
        this.urlGet = 'https://api.liqui.io/api/3/';

        this.nonce = getTimestamp(Date.now());
    }

    (0, _createClass3.default)(Liqui, [{
        key: '_getHTTPS',


        /*************************
         / Private Methods
         *************************/
        value: function _getHTTPS(url) {
            var options = {
                method: 'GET',
                url: url,
                json: true
            };
            return (0, _requestPromise2.default)(options);
        }
    }, {
        key: '_query',
        value: function _query(method, params) {

            if (!this.apiKey || !this.apiSecret) {
                return Promise.reject('API Key and Secret are required for this call');
            }
            var content = {
                'method': method,
                'nonce': ++this.nonce
            };

            if (!!params && (typeof params === 'undefined' ? 'undefined' : (0, _typeof3.default)(params)) === 'object') {
                Object.keys(params).forEach(function (key) {
                    var value = void 0;
                    if (key === 'since' || key === 'end') {
                        value = getTimestamp(params[key]);
                    }
                    value = params[key];

                    content[key] = value;
                });
            }

            content = _querystring2.default.stringify(content);

            var sign = _crypto2.default.createHmac('sha512', new Buffer(this.apiSecret, 'utf8')).update(new Buffer(content, 'utf8')).digest('hex');

            var options = {
                headers: {
                    'Key': this.apiKey,
                    'Sign': sign,
                    'content-type': 'application/x-www-form-urlencoded',
                    'content-length': content.length
                },
                body: content,
                json: true,
                url: this.urlPost,
                method: 'POST'
            };

            return (0, _requestPromise2.default)(options).then(function (data) {
                if (data.success === 1) {
                    return Promise.resolve(data.return);
                }
                return Promise.reject(data);
            });
        }

        /*************************
         / Public API
         *************************/

    }, {
        key: 'info',
        value: function info() {
            var url = this.urlGet + 'info';
            return this._getHTTPS(url);
        }
    }, {
        key: 'ticker',
        value: function ticker(pair) {
            if (!pair) {
                return Promise.reject('Liqui ticker requires a pair such as btc_usd');
            }
            var url = this.urlGet + 'ticker/' + pair.toLowerCase();
            return this._getHTTPS(url);
        }
    }, {
        key: 'depth',
        value: function depth(pair, limit) {
            if (!pair) {
                return Promise.reject('Liqui depth requires a pair such as btc_usd');
            }
            var url = this.urlGet + 'depth/' + pair.toLowerCase();
            url += limit ? '?limit=' + limit : '';
            return this._getHTTPS(url);
        }
    }, {
        key: 'trades',
        value: function trades(pair) {
            if (!pair) {
                return Promise.reject('Liqui trades requires a pair such as btc_usd');
            }
            var url = this.urlGet + 'trades/' + pair.toLowerCase();
            return this._getHTTPS(url);
        }
    }, {
        key: 'getInfo',


        /*************************
         / Trades API
         *************************/
        value: function getInfo() {
            return this._query('getInfo');
        }
    }, {
        key: 'buy',
        value: function buy(params) {
            if (!params || !params.pair || !params.rate || !params.amount) {
                return Promise.reject('Pair, rate, and amount are required');
            }
            params.type = 'buy';
            return this._query('Trade', params);
        }
    }, {
        key: 'sell',
        value: function sell(params) {
            if (!params || !params.pair || !params.rate || !params.amount) {
                return Promise.reject('Pair, rate, and amount are required');
            }
            params.type = 'sell';
            return this._query('Trade', params);
        }
    }, {
        key: 'activeOrders',
        value: function activeOrders(pair) {
            var params = {};
            if (pair) {
                params.pair = pair;
            }
            return this._query('ActiveOrders', params).catch(function (result) {
                if (!result.success && result.error === 'no orders') {
                    return Promise.resolve({
                        success: 1,
                        return: {}
                    });
                }
            });
        }
    }, {
        key: 'orderInfo',
        value: function orderInfo(orderId) {
            if (typeof orderId === 'undefined') {
                return Promise.reject('Order ID is required');
            }
            var params = {
                order_id: orderId
            };
            return this._query('OrderInfo', params).catch(function (data) {
                if (data.success === 0 && data.error === 'invalid order') {
                    return Promise.reject('invalid order');
                }
                return data;
            });
        }
    }, {
        key: 'cancelOrder',
        value: function cancelOrder(orderId) {
            if (typeof orderId === 'undefined') {
                return Promise.reject('Order ID is required');
            }
            var params = {
                order_id: orderId
            };
            return this._query('CancelOrder', params).catch(function (data) {
                if (data.success === 0) {
                    return Promise.reject(data.error);
                }
                return data;
            });
        }
    }, {
        key: 'tradeHistory',


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
        value: function tradeHistory(params) {
            return this._query('TradeHistory', params);
        }
    }]);
    return Liqui;
}();

exports.default = Liqui;