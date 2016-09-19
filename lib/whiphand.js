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
    key: 'getExpiration',
    value: function getExpiration() {
      return parseInt(Date.now() / 1000 + this.config.accessTokenLife);
    }
  }, {
    key: 'validateToken',
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(bearer) {
        var user, scope, session, customError, refreshError;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                user = void 0;
                scope = void 0;
                _context3.next = 4;
                return this.config.redis.get('tokens:' + bearer);

              case 4:
                session = _context3.sent;

                if (session) {
                  _context3.next = 9;
                  break;
                }

                customError = Boom.unauthorized('Token Invalid');


                customError.output.payload.statusCode = 1111;
                throw customError;

              case 9:
                session = JSON.parse(session);

                if (!(session.expires < Date.now() / 1000)) {
                  _context3.next = 14;
                  break;
                }

                refreshError = Boom.unauthorized('Token Expired');


                refreshError.output.payload.statusCode = 2222;
                throw refreshError;

              case 14:
                _context3.next = 16;
                return this.getUser(session.user);

              case 16:
                user = _context3.sent;
                _context3.next = 19;
                return this.getUserScopes(user);

              case 19:
                scope = _context3.sent;
                return _context3.abrupt('return', {
                  user: user,
                  scope: scope
                });

              case 21:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function validateToken(_x3) {
        return _ref3.apply(this, arguments);
      }

      return validateToken;
    }()
  }, {
    key: 'saveSession',
    value: function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(userKey) {
        var temporary = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
        var expires, accessToken, refreshToken, user, scope, data;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                expires = this.getExpiration();
                accessToken = this.randomToken(userKey);
                refreshToken = this.randomToken(userKey);
                _context4.next = 5;
                return this.getUser(userKey);

              case 5:
                user = _context4.sent;
                _context4.next = 8;
                return this.getUserScopes(user);

              case 8:
                scope = _context4.sent;
                data = {};

                if (!temporary) {
                  _context4.next = 16;
                  break;
                }

                data = {
                  user: userKey
                };
                _context4.next = 14;
                return this.config.redis.set('tokens:' + accessToken, JSON.stringify(data), 'EX', this.config.accessTokenLife);

              case 14:
                _context4.next = 19;
                break;

              case 16:
                data = {
                  user: userKey,
                  refresh: refreshToken,
                  expires: expires
                };
                _context4.next = 19;
                return this.config.redis.set('tokens:' + accessToken, JSON.stringify(data), 'EX', this.config.refreshTokenLife);

              case 19:
                return _context4.abrupt('return', {
                  user: user,
                  scope: scope,
                  token: Object.assign({
                    access: accessToken
                  }, _.omit(data, 'user'))
                });

              case 20:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function saveSession(_x4, _x5) {
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

      function destroySession(_x7) {
        return _ref5.apply(this, arguments);
      }

      return destroySession;
    }()
  }, {
    key: 'refreshSession',
    value: function () {
      var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(access, refresh) {
        var session, expires, newAccessToken, newRefreshToken, count, completedData, user, scope, data, success;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this.config.redis.get('tokens:' + access);

              case 2:
                session = _context6.sent;

                if (session) {
                  _context6.next = 5;
                  break;
                }

                throw Boom.forbidden();

              case 5:
                session = JSON.parse(session);

                if (session.refresh) {
                  _context6.next = 8;
                  break;
                }

                throw Boom.forbidden();

              case 8:
                if (!(session.refresh !== refresh)) {
                  _context6.next = 10;
                  break;
                }

                throw Boom.forbidden();

              case 10:
                expires = this.getExpiration();
                newAccessToken = this.randomToken(session.user);
                newRefreshToken = this.randomToken(session.user);
                count = 0;
                completedData = void 0;
                _context6.next = 17;
                return this.getUser(session.user);

              case 17:
                user = _context6.sent;
                _context6.next = 20;
                return this.getUserScopes(user);

              case 20:
                scope = _context6.sent;
                data = {
                  user: session.user,
                  refresh: newRefreshToken,
                  expires: expires
                };
                _context6.next = 24;
                return this.config.redis.setnx('refreshing:' + access, JSON.stringify(Object.assign({
                  access: newAccessToken
                }, data)));

              case 24:
                success = _context6.sent;

                if (!(success > 0)) {
                  _context6.next = 36;
                  break;
                }

                _context6.next = 28;
                return this.config.redis.set('tokens:' + newAccessToken, JSON.stringify(data), 'EX', this.config.refreshTokenLife);

              case 28:
                _context6.next = 30;
                return this.config.redis.expire('refreshing:' + access, 10);

              case 30:
                completedData = data;
                completedData.access = newAccessToken;
                _context6.next = 34;
                return this.destroySession(access);

              case 34:
                _context6.next = 40;
                break;

              case 36:
                _context6.next = 38;
                return this.config.redis.get('refreshing:' + access);

              case 38:
                completedData = _context6.sent;

                completedData = JSON.parse(completedData);

              case 40:
                delete completedData.user;
                return _context6.abrupt('return', {
                  user: user,
                  scope: scope,
                  token: completedData
                });

              case 42:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function refreshSession(_x8, _x9) {
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

      function saveResetToken(_x10) {
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

      function validateResetToken(_x11) {
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

      function claimResetToken(_x12) {
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