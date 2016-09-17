'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Whiphand Class
 */

var _ = require('lodash');
var assert = require('assert');
var Boom = require('boom');
var uuid = require('uuid');
var base64 = require('urlsafe-base64');
var defaultAccessTokenLife = 7 * 24 * 60 * 60;
var defaultRefreshTokenLife = 365 / 2 * 24 * 60 * 60;
var defaultResetTokenLife = 1 * 24 * 60 * 60;

var Whiphand = exports.Whiphand = function () {
  function Whiphand(config) {
    _classCallCheck(this, Whiphand);

    assert(config.redis, 'Whiphand: must provide config.redis (promise-redis)');
    assert(config.getUserFunc, 'Whiphand: must provide config.getUserFunc (function)');
    assert(config.getUserScopesFunc, 'Whiphand: must provide config.getUserScopesFunc (function)');
    this.config = Object.assign({
      accessTokenLife: config.accessTokenLife || defaultAccessTokenLife,
      refreshTokenLife: config.refreshTokenLife || defaultRefreshTokenLife,
      resetTokenLife: config.resetTokenLife || defaultResetTokenLife
    }, config);
  }

  _createClass(Whiphand, [{
    key: 'getUser',
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(id) {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt('return', this.config.getUserFunc(id));

              case 1:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function getUser(_x) {
        return _ref.apply(this, arguments);
      }

      return getUser;
    }()
  }, {
    key: 'getUserScopes',
    value: function () {
      var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(user) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt('return', this.config.getUserScopesFunc(user));

              case 1:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getUserScopes(_x2) {
        return _ref2.apply(this, arguments);
      }

      return getUserScopes;
    }()
  }, {
    key: 'validateToken',
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(bearer, callback) {
        var user, scope, session, refreshError, customError;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.prev = 0;
                user = void 0;
                scope = void 0;
                _context3.next = 5;
                return this.config.redis.hgetall('tokens:' + bearer);

              case 5:
                session = _context3.sent;

                if (session) {
                  _context3.next = 8;
                  break;
                }

                throw Boom.notFound();

              case 8:
                if (!(parseInt(session.expires) < Date.now() / 1000)) {
                  _context3.next = 12;
                  break;
                }

                refreshError = Boom.unauthorized('Token Expired');


                refreshError.output.payload.statusCode = 2222;
                return _context3.abrupt('return', callback(refreshError, false));

              case 12:
                _context3.next = 14;
                return this.getUser(session.user);

              case 14:
                user = _context3.sent;
                _context3.next = 17;
                return this.getUserScopes(user);

              case 17:
                scope = _context3.sent;
                return _context3.abrupt('return', callback(null, true, {
                  user: user,
                  scope: scope
                }));

              case 21:
                _context3.prev = 21;
                _context3.t0 = _context3['catch'](0);
                customError = Boom.unauthorized('Token Invalid');


                customError.output.payload.statusCode = 1111;
                return _context3.abrupt('return', callback(customError, false));

              case 26:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[0, 21]]);
      }));

      function validateToken(_x3, _x4) {
        return _ref3.apply(this, arguments);
      }

      return validateToken;
    }()
  }, {
    key: 'saveSession',
    value: function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(userKey) {
        var temporary = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
        var expires, accessToken, refreshToken;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                expires = parseInt(Date.now() / 1000 + this.config.accessTokenLife);
                accessToken = this.randomToken(userKey);
                refreshToken = this.randomToken(userKey);

                if (!temporary) {
                  _context4.next = 11;
                  break;
                }

                _context4.next = 6;
                return this.config.redis.hmset('tokens:' + accessToken, 'user', userKey);

              case 6:
                _context4.next = 8;
                return this.config.redis.expire('tokens:' + accessToken, this.config.accessTokenLife);

              case 8:
                return _context4.abrupt('return', {
                  access: accessToken,
                  expires: expires
                });

              case 11:
                _context4.next = 13;
                return this.config.redis.hmset('tokens:' + accessToken, 'user', userKey, 'refresh', refreshToken, 'expires', expires);

              case 13:
                _context4.next = 15;
                return this.config.redis.expire('tokens:' + accessToken, this.config.refreshTokenLife);

              case 15:
                return _context4.abrupt('return', {
                  access: accessToken,
                  refresh: refreshToken,
                  expires: expires
                });

              case 16:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function saveSession(_x5, _x6) {
        return _ref4.apply(this, arguments);
      }

      return saveSession;
    }()
  }, {
    key: 'destroySession',
    value: function () {
      var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(access) {
        var ttl;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.config.redis.ttl('tokens:' + access);

              case 2:
                ttl = _context5.sent;

                if (!(ttl > 10)) {
                  _context5.next = 5;
                  break;
                }

                return _context5.abrupt('return', this.config.redis.expire('tokens:' + access, 10));

              case 5:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function destroySession(_x8) {
        return _ref5.apply(this, arguments);
      }

      return destroySession;
    }()
  }, {
    key: 'refreshSession',
    value: function () {
      var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(access, refresh) {
        var session, token, user;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.config.redis.hgetall('tokens:' + access);

              case 2:
                session = _context6.sent;
                token = void 0;
                user = void 0;

                if (session) {
                  _context6.next = 7;
                  break;
                }

                throw Boom.forbidden();

              case 7:
                if (session.refresh) {
                  _context6.next = 9;
                  break;
                }

                throw Boom.forbidden();

              case 9:
                if (!(session.refresh !== refresh)) {
                  _context6.next = 11;
                  break;
                }

                throw Boom.forbidden();

              case 11:
                _context6.next = 13;
                return this.destroySession(access);

              case 13:
                _context6.next = 15;
                return this.saveSession(session.user);

              case 15:
                token = _context6.sent;
                _context6.next = 18;
                return this.getUser(session.user);

              case 18:
                user = _context6.sent;
                return _context6.abrupt('return', {
                  user: user,
                  token: token
                });

              case 20:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function refreshSession(_x9, _x10) {
        return _ref6.apply(this, arguments);
      }

      return refreshSession;
    }()
  }, {
    key: 'saveResetToken',
    value: function () {
      var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(userKey) {
        var resetToken;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                resetToken = this.randomToken(userKey);
                _context7.next = 3;
                return this.config.redis.set('reset:' + resetToken, userKey, 'EX', this.config.resetTokenLife);

              case 3:
                return _context7.abrupt('return', resetToken);

              case 4:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function saveResetToken(_x11) {
        return _ref7.apply(this, arguments);
      }

      return saveResetToken;
    }()
  }, {
    key: 'validateResetToken',
    value: function () {
      var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(token) {
        var resetToken;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this.config.redis.get('reset:' + token);

              case 2:
                resetToken = _context8.sent;

                if (resetToken) {
                  _context8.next = 5;
                  break;
                }

                return _context8.abrupt('return', false);

              case 5:
                return _context8.abrupt('return', resetToken);

              case 6:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function validateResetToken(_x12) {
        return _ref8.apply(this, arguments);
      }

      return validateResetToken;
    }()
  }, {
    key: 'claimResetToken',
    value: function () {
      var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(token) {
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                return _context9.abrupt('return', this.config.redis.del('reset:' + token));

              case 1:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function claimResetToken(_x13) {
        return _ref9.apply(this, arguments);
      }

      return claimResetToken;
    }()
  }, {
    key: 'randomToken',
    value: function randomToken(prefix) {
      var randToken = prefix + '-' + uuid.v4() + '-' + uuid.v4();
      var buffer = new Buffer(randToken, 'ascii');

      return base64.encode(buffer);
    }
  }]);

  return Whiphand;
}();