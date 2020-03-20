// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/authentication-passport
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  UserProfileFactory, authenticate,
} from '@loopback/authentication';
import {Strategy as Oauth2Strategy, StrategyOptions, VerifyFunction, VerifyCallback} from 'passport-oauth2';
import {MyUser, userRepository} from './fixtures/user-repository';
import {simpleRestApplication, configureApplication} from './fixtures/simple-rest-app';
import {securityId, UserProfile, SecurityBindings} from '@loopback/security';
import {StrategyAdapter} from '../../strategy-adapter';
import {get, param} from '@loopback/openapi-v3';
import {
  Client,
  createClientForHandler,
  expect,
  supertest
} from '@loopback/testlab';
import {RestApplication, RedirectRoute} from '@loopback/rest';
import {startApp as startMockProvider, stopApp as stopMockProvider} from './fixtures/oauth2-provider';
import * as url from 'url';
import { inject } from '@loopback/core';

/**
 * options to pass to the Passport Strategy
 */
const oauth2Options: StrategyOptions = {
  clientID: '1111',
  clientSecret: '1917e2b73a87fd0c9a92afab64f6c8d4',
  callbackURL: 'http://localhost:8080/auth/thirdparty/callback',
  authorizationURL: 'http://localhost:9000/oauth/dialog',
  tokenURL: 'http://localhost:9000/oauth/token',
}

/**
 * verify function for the oauth2 strategy
 * This function mocks a lookup against a user profile datastore
 * 
 * @param accessToken 
 * @param refreshToken 
 * @param profile 
 * @param done 
 */
const verify: VerifyFunction = function (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
  const userProfile: MyUser = profile as MyUser;
  let user: UserProfile = userRepository.findUser(userProfile.id);
  console.log('verify', profile, user);
  if (!user) {
    return done(new Error('user not found'));
  }
  user.token = accessToken;
  return done(null, user);
}

/**
 * convert user info to user profile
 * @param user 
 */
const myUserProfileFactory: UserProfileFactory<MyUser> = function(
  user: MyUser,
): UserProfile {
  const userProfile = {[securityId]: user.id};
  return userProfile;
};

/**
 * Login controller for third party oauth provider
 * 
 * This creates an authentication endpoint for the third party oauth provider
 * 
 * Two methods are expected
 * 
 * 1. loginToThirdParty 
 *           i. an endpoint for api clients to login via a third party app
 *          ii. the passport strategy identifies this call as a redirection to third party
 *         iii. this endpoint redirects to the third party authorization url
 * 
 * 2. thirdPartyCallBack
 *           i. this is the callback for the thirdparty app
 *          ii. on successful user login the third party calls this endpoint with an access code
 *         iii. the passport oauth2 strategy exchanges the code for an access token
 *          iv. the passport oauth2 strategy then calls the provided `verify()` function with the access token
 */
export class Oauth2Controller {
  constructor() {}

  // this configures the oauth2 strategy
  @authenticate('oauth2')
  // we have modeled this as a GET endpoint
  @get('/auth/thirdparty')
  // loginToThirdParty() is the handler for '/auth/thirdparty'
  // this method is injected with 'x-loopback-authentication-redirect-url'
  // the value for 'x-loopback-authentication-redirect-url' is set by the passport strategy adapter
  loginToThirdParty(@param.query.string('x-loopback-authentication-redirect-url') redirectUrl: string,
  @param.query.number('x-loopback-authentication-redirect-status') status: number) {
    return new RedirectRoute('/', redirectUrl, status);
  }

  // we configure the callback url also with the same oauth2 strategy
  @authenticate('oauth2')
  // this SHOULD be a GET call so that the third party can redirect
  @get('/auth/thirdparty/callback')
  // thirdPartyCallBack() is the handler for '/auth/thirdparty/callback'
  // the oauth2 strategy identifies this as a callback with the request.query.code sent by the third party app
  // the oauth2 strategy exchanges the access code for a access token and then calls the provided verify() function
  // the verify function creates a user profile after verifying the access token
  thirdPartyCallBack(@inject(SecurityBindings.USER) user: UserProfile) {
    console.log('thirdPartyCallBack', user);
    return user.token;
  }
}

describe.only('Oauth2 authorization flow', () => {
  let app: RestApplication;
  let oauth2Strategy: StrategyAdapter<MyUser>;
  let client: Client;

  before(startMockProvider);
  after(stopMockProvider);

  before(givenLoopBackApp);
  before(givenOauth2Strategy);
  before(setupAuthentication);
  before(givenControllerInApp);
  before(givenClient);

  let oauthProviderUrl: string;
  let providerLoginUrl: string;
  let callbackToLbApp: string;

  context('when client invokes oauth flow', () => {

    it('call is redirected to third party authorization url', async () => {
      const response = await client.get('/auth/thirdparty').expect(303);
      oauthProviderUrl = response.get('Location');
      expect(url.parse(response.get('Location')).pathname).to.equal(url.parse(oauth2Options.authorizationURL).pathname);
    });

    it('call to authorization url is redirected to oauth providers login page', async () => {
      const response = await supertest('').get(oauthProviderUrl).expect(302);
      providerLoginUrl = response.get('Location');
      expect(url.parse(response.get('Location')).pathname).to.equal('/login');
    });
  });

  context('when user logs into provider login page', () => {
    it('login page redirects to authorization app callback endpoint', async () => {
      let params = url.parse(providerLoginUrl).query;
      params = params + '&&username=user1&&password=abc';
      const response = await supertest('').post('http://localhost:9000/login_submit?' + params).expect(302);
      callbackToLbApp = response.get('Location');
      expect(url.parse(response.get('Location')).pathname).to.equal('/auth/thirdparty/callback');
    });

    it('callback url contains access code', async () => {
      expect(url.parse(callbackToLbApp).query).to.containEql('code');
    });
  });

  context('Invoking call back url returns access token', () => {
    it('access code can be exchanged for token', async () => {
      const path: string = url.parse(callbackToLbApp).path || '/auth/thirdparty/callback';
      const response = await client.get(path).expect(200);
      expect(response.body).property('access_token');
    });
  });

  function givenLoopBackApp() {
    app = simpleRestApplication();
  }

  function givenOauth2Strategy() {
    const passport = new Oauth2Strategy(oauth2Options, verify);
    oauth2Strategy = new StrategyAdapter(
      passport,
      'oauth2',
      myUserProfileFactory,
    );
  }

  function setupAuthentication() {
    configureApplication(oauth2Strategy, 'oauth2');
  }

  function givenControllerInApp() {
    return app.controller(Oauth2Controller);
  }

  function givenClient() {
    client = createClientForHandler(app.requestHandler);
  }
});
