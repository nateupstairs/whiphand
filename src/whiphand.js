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
    assert(
      config.getUserFunc,
      'Whiphand: must provide config.getUserFunc (function)'
    )
    assert(
      config.getUserScopesFunc,
      'Whiphand: must provide config.getUserScopesFunc (function)'
    )
    this.config = Object.assign({
      accessTokenLife: config.accessTokenLife || defaultAccessTokenLife,
      refreshTokenLife: config.refreshTokenLife || defaultRefreshTokenLife,
      resetTokenLife: config.resetTokenLife || defaultResetTokenLife,
    }, config)
  }

  async getUser(id) {
    return this.config.getUserFunc(id)
  }

  async getUserScopes(user) {
    return this.config.getUserScopesFunc(user)
  }

  getExpiration() {
    return parseInt(Date.now() / 1000 + this.config.accessTokenLife)
  }

  async validateToken(bearer) {
    let user
    let scope
    let session = await this.config.redis.get(`tokens:${bearer}`)

    if (!session) {
      let customError = Boom.unauthorized('Token Invalid')

      customError.output.payload.statusCode = 1111
      throw (customError)
    }
    session = JSON.parse(session)
    if (session.expires < Date.now() / 1000) {
      let refreshError = Boom.unauthorized('Token Expired')

      refreshError.output.payload.statusCode = 2222
      throw refreshError
    }
    user = await this.getUser(session.user)
    scope = await this.getUserScopes(user)
    return {
      user: user,
      scope: scope
    }
  }

  async saveSession(userKey, temporary = false) {
    let expires = this.getExpiration()
    let accessToken = this.randomToken(userKey)
    let refreshToken = this.randomToken(userKey)
    let user = await this.getUser(userKey)
    let scope = await this.getUserScopes(user)
    let data = {}

    if (temporary) {
      data = {
        user: userKey
      }
      await this.config.redis.set(
        `tokens:${accessToken}`,
        JSON.stringify(data),
        'EX', this.config.accessTokenLife
      )
    }
    else {
      data = {
        user: userKey,
        refresh: refreshToken,
        expires: expires
      }
      await this.config.redis.set(
        `tokens:${accessToken}`,
        JSON.stringify(data),
        'EX', this.config.refreshTokenLife
      )
    }
    return {
      user: user,
      scope: scope,
      token: Object.assign(
        {
          access: accessToken
        },
        _.omit(data, 'user')
      )
    }
  }

  async destroySession(access) {
    let ttl = await this.config.redis.ttl(`tokens:${access}`)

    if (ttl > 10) {
      return this.config.redis.expire(`tokens:${access}`, 10)
    }
  }

  async refreshSession(access, refresh) {
    let session = await this.config.redis.get(`tokens:${access}`)

    if (!session) {
      throw Boom.forbidden()
    }
    session = JSON.parse(session)
    if (!session.refresh) {
      throw Boom.forbidden()
    }
    if (session.refresh !== refresh) {
      throw Boom.forbidden()
    }

    let expires = this.getExpiration()
    let newAccessToken = this.randomToken(session.user)
    let newRefreshToken = this.randomToken(session.user)
    let count = 0
    let completedData
    let user = await this.getUser(session.user)
    let scope = await this.getUserScopes(user)
    let data = {
      user: session.user,
      refresh: newRefreshToken,
      expires: expires
    }
    let success = await this.config.redis.setnx(
      `refreshing:${access}`,
      JSON.stringify(Object.assign({
        access: newAccessToken
      }, data))
    )

    if (success > 0) {
      await this.config.redis.set(
       `tokens:${newAccessToken}`,
       JSON.stringify(data),
       'EX', this.config.refreshTokenLife
      )
      await this.config.redis.expire(
        `refreshing:${access}`,
        10
      )
      completedData = data
      completedData.access = newAccessToken
      await this.destroySession(access)
    }
    else {
      completedData = await this.config.redis.get(
        `refreshing:${access}`
      )
      completedData = JSON.parse(completedData)
    }
    delete completedData.user
    return {
      user: user,
      scope: scope,
      token: completedData
    }
  }

  async saveResetToken(userKey) {
    let resetToken = this.randomToken(userKey)

    await this.config.redis.set(
      `reset:${resetToken}`,
      userKey,
      'EX', this.config.resetTokenLife
    )
    return resetToken
  }

  async validateResetToken(token) {
    let resetToken = await this.config.redis.get(`reset:${token}`)

    if (!resetToken) {
      return false
    }
    return resetToken
  }

  async claimResetToken(token) {
    return this.config.redis.del(`reset:${token}`)
  }

  randomToken(prefix) {
    let randToken = `${prefix}-${uuid.v4()}-${uuid.v4()}`
    let buffer = new Buffer(randToken, 'ascii')

    return base64.encode(buffer)
  }

}
