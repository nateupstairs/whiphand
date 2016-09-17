/**
 * Whiphand Class
 */

var _ = require('lodash')
var assert = require('assert')
var Boom = require('boom')
var uuid = require('uuid')
var base64 = require('urlsafe-base64')
var defaultAccessTokenLife = 7 * 24*60*60
var defaultRefreshTokenLife = 365/2 * 24*60*60
var defaultResetTokenLife = 1 * 24*60*60

export class Whiphand {

  constructor(config) {
    assert(config.redis, 'Whiphand: must provide config.redis (promise-redis)')
    this.config = Object.assign({
      accessTokenLife: config.accessTokenLife || defaultAccessTokenLife,
      refreshTokenLife: config.refreshTokenLife || defaultRefreshTokenLife,
      resetTokenLife: config.resetTokenLife || defaultResetTokenLife,
    }, config)
  }

  async getUser(id) {
    return this.getUserFunc(id)
  }

  async getUserScopes(user) {
    return this.getUserScopes(user)
  }

  async validateToken(bearer, callback) {
    try {
      let user
      let scope
      let session = await this.redis.hgetall(`tokens:${bearer}`)

      if (!session) {
        throw Boom.notFound()
      }
      if (parseInt(session.expires) < Date.now() / 1000) {
        let refreshError = Boom.unauthorized('Token Expired')

        refreshError.output.payload.statusCode = 2222
        return callback(refreshError, false)
      }
      user = await this.getUser(session.user)
      scope = this.getUserScopes(user)
      return callback(null, true, {
        user: user,
        scope: scope
      })
    }
    catch (err) {
      let customError = Boom.unauthorized('Token Invalid')

      customError.output.payload.statusCode = 1111
      return callback(customError, false)
    }
  }

  async saveSession(userKey, temporary = false) {
    let expires = parseInt(Date.now() / 1000 + this.config.accessTokenLife)
    let accessToken = this.randomToken(userKey)
    let refreshToken = this.randomToken(userKey)

    if (temporary) {
      await this.redis.hmset(
        `tokens:${accessToken}`,
        'user', userKey
      )
      await this.redis.expire(
        `tokens:${accessToken}`,
        this.config.accessTokenLife
      )
      return {
        access: accessToken,
        expires: expires
      }
    }
    else {
      await this.redis.hmset(
        `tokens:${accessToken}`,
        'user', userKey,
        'refresh', refreshToken,
        'expires', expires
      )
      await this.redis.expire(
        `tokens:${accessToken}`,
        this.config.refreshTokenLife
      )
      return {
        access: accessToken,
        refresh: refreshToken,
        expires: expires
      }
    }
  }

  async destroySession(access) {
    let ttl = await this.redis.ttl(`tokens:${access}`)

    if (ttl > 10) {
      return this.redis.expire(`tokens:${access}`, 10)
    }
  }

  async refreshSession(access, refresh) {
    let session = await this.redis.hgetall(`tokens:${access}`)
    let token
    let user

    if (!session) {
      throw Boom.forbidden()
    }
    if (!session.refresh) {
      throw Boom.forbidden()
    }
    if (session.refresh !== refresh) {
      throw Boom.forbidden()
    }
    await this.destroySession(access)
    token = await this.saveSession(session.user)
    user = await this.getUser(session.user)
    return {
      user: user,
      token: token
    }
  }

  async saveResetToken(userKey) {
    let resetToken = this.randomToken(userKey)

    await this.redis.set(
      `reset:${resetToken}`,
      userKey,
      'EX', this.config.resetTokenLife
    )
    return resetToken
  }

  async validateResetToken(token) {
    let resetToken = await this.redis.get(`reset:${token}`)

    if (!resetToken) {
      return false
    }
    return resetToken
  }

  async claimResetToken(token) {
    return this.redis.del(`reset:${token}`)
  }

  randomToken(prefix) {
    let randToken = `${prefix}-${uuid.v4()}-${uuid.v4()}`
    let buffer = new Buffer(randToken, 'ascii')

    return base64.encode(buffer)
  }

}
