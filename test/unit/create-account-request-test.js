'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
chai.use(sinonChai)
chai.should()
const HttpMocks = require('node-mocks-http')

const LDP = require('../../lib/ldp')
const AccountManager = require('../../lib/models/account-manager')
const SolidHost = require('../../lib/models/solid-host')
const defaults = require('../../config/defaults')
const { CreateAccountRequest } = require('../../lib/requests/create-account-request')

describe('CreateAccountRequest', () => {
  let host, store, accountManager
  let session, res

  beforeEach(() => {
    host = SolidHost.from({ serverUri: 'https://example.com' })
    store = new LDP()
    accountManager = AccountManager.from({ host, store })

    session = {}
    res = HttpMocks.createResponse()
  })

  describe('constructor()', () => {
    it('should create an instance with the given config', () => {
      let aliceData = { username: 'alice' }
      let userAccount = accountManager.userAccountFrom(aliceData)

      let options = { accountManager, userAccount, session, response: res }
      let request = new CreateAccountRequest(options)

      expect(request.accountManager).to.equal(accountManager)
      expect(request.userAccount).to.equal(userAccount)
      expect(request.session).to.equal(session)
      expect(request.response).to.equal(res)
    })
  })

  describe('fromParams()', () => {
    it('should create subclass depending on authMethod', () => {
      let request, aliceData, req

      aliceData = { username: 'alice', password: '12345' }
      req = HttpMocks.createRequest({
        app: { locals: { accountManager, oidc: {} } }, body: aliceData, session
      })
      req.app.locals.authMethod = 'oidc'
      request = CreateAccountRequest.fromParams(req, res, accountManager)
      expect(request).to.exist()
    })
  })

  describe('createAccount()', () => {
    it('should return a 400 error if account already exists', done => {
      let accountManager = AccountManager.from({ host })
      let locals = { authMethod: defaults.auth, accountManager, oidc: { users: {} } }
      let aliceData = {
        username: 'alice', password: '1234'
      }
      let req = HttpMocks.createRequest({ app: { locals }, body: aliceData })

      let request = CreateAccountRequest.fromParams(req, res)

      accountManager.accountExists = sinon.stub().returns(Promise.resolve(true))

      request.createAccount()
        .catch(err => {
          expect(err.status).to.equal(400)
          done()
        })
    })

    it('should return a 400 error if a username is invalid', () => {
      let accountManager = AccountManager.from({ host })
      let locals = { authMethod: defaults.auth, accountManager, oidc: { users: {} } }

      accountManager.accountExists = sinon.stub().returns(Promise.resolve(false))

      const invalidUsernames = [
        '-',
        '-a',
        'a-',
        '9-',
        'alice--bob',
        'alice bob'
      ]

      let invalidUsernamesCount = 0

      const requests = invalidUsernames.map((username) => {
        let aliceData = {
          username: username, password: '1234'
        }

        let req = HttpMocks.createRequest({ app: { locals }, body: aliceData })
        let request = CreateAccountRequest.fromParams(req, res)

        return request.createAccount()
          .then(() => {
            throw new Error('should not happen')
          })
          .catch(err => {
            invalidUsernamesCount++
            expect(err.message).to.match(/Invalid username/)
            expect(err.status).to.equal(400)
          })
      })

      return Promise.all(requests)
        .then(() => {
          expect(invalidUsernamesCount).to.eq(invalidUsernames.length)
        })
    })
  })
})

describe('CreateOidcAccountRequest', () => {
  let authMethod = 'oidc'
  let host, store
  let session, res

  beforeEach(() => {
    host = SolidHost.from({ serverUri: 'https://example.com' })
    store = new LDP()
    session = {}
    res = HttpMocks.createResponse()
  })

  describe('fromParams()', () => {
    it('should create an instance with the given config', () => {
      let accountManager = AccountManager.from({ host, store })
      let aliceData = { username: 'alice', password: '123' }

      let userStore = {}
      let req = HttpMocks.createRequest({
        app: {
          locals: { authMethod, oidc: { users: userStore }, accountManager }
        },
        body: aliceData,
        session
      })

      let request = CreateAccountRequest.fromParams(req, res)

      expect(request.accountManager).to.equal(accountManager)
      expect(request.userAccount.username).to.equal('alice')
      expect(request.session).to.equal(session)
      expect(request.response).to.equal(res)
      expect(request.password).to.equal(aliceData.password)
      expect(request.userStore).to.equal(userStore)
    })
  })

  describe('saveCredentialsFor()', () => {
    it('should create a new user in the user store', () => {
      let accountManager = AccountManager.from({ host, store })
      let password = '12345'
      let aliceData = { username: 'alice', password }
      let userStore = {
        createUser: (userAccount, password) => { return Promise.resolve() }
      }
      let createUserSpy = sinon.spy(userStore, 'createUser')
      let req = HttpMocks.createRequest({
        app: { locals: { authMethod, oidc: { users: userStore }, accountManager } },
        body: aliceData,
        session
      })

      let request = CreateAccountRequest.fromParams(req, res)
      let userAccount = request.userAccount

      return request.saveCredentialsFor(userAccount)
        .then(() => {
          expect(createUserSpy).to.have.been.calledWith(userAccount, password)
        })
    })
  })

  describe('sendResponse()', () => {
    it('should respond with a 302 Redirect', () => {
      let accountManager = AccountManager.from({ host, store })
      let aliceData = { username: 'alice', password: '12345' }
      let req = HttpMocks.createRequest({
        app: { locals: { authMethod, oidc: {}, accountManager } },
        body: aliceData,
        session
      })
      let alice = accountManager.userAccountFrom(aliceData)

      let request = CreateAccountRequest.fromParams(req, res)

      let result = request.sendResponse(alice)
      expect(request.response.statusCode).to.equal(302)
      expect(result.username).to.equal('alice')
    })
  })
})
