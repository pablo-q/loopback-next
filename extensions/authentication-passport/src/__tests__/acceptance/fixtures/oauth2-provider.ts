// Copyright IBM Corp. 2018,2019. All Rights Reserved.
// Node module: @loopback/cli
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import express from 'express';
import {Server} from 'http';
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const _ = require('lodash');
import {MyUser} from './user-repository';

const app = express();
let server: Server;

// to support json payload in body
app.use('parse', bodyParser.json());
// to support html form bodies
app.use(bodyParser.text({ type: 'text/html' }))
// create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false })

interface JWT {
    payload: {
        jti: string,
        client_id: string
    }
}

interface App {
    [key: string]: any,
    client_secret: string,
    tokens: {
        [key: string]: any
    }
}

interface AppRegistry {
    [client_id: string]: App
}

/**
 * apps registered with this provider
 * format:
 *   { client_id: {client_secret, list_of_tokens} }
 */
const registeredApps: AppRegistry = {
    "1111": {"client_secret":"app1_secret", tokens:{}},
    "2222": {"client_secret":"app2_secret", tokens:{}}
};

/**
 * user registry
 */
const users = [
    {id: 1001, username: "user1", password: "abc", email: "usr1@lb.com", signingKey: "AZeb=="},
    {id: 1002, username: "user2", password: "xyz", email: "usr2@lb2.com", signingKey: "BuIx=+"}
];

/**
 * find a user by a name and password
 * @param {*} username 
 * @param {*} password 
 */
function findUser(username: string, password: string) {
    const usr = _.filter(users, (user: MyUser) => (user.username === username && user.password === password));
    if (usr.length > 0) return usr[0];
    return null;
}

/**
 * create a jwt token
 * @param {*} user 
 * @param {*} scopes 
 * @param {*} signingKey 
 */
async function createJwt(user: MyUser, scopes: string, signingKey: string, client_id: string) {
    const jti = Math.floor(Math.random() * Math.floor(1000));
    const token = await jwt.sign({
        jti: jti,
        sub: user.id,
        name: user.username,
        email: user.email,
        iss: 'sample oauth provider',
        exp: Math.floor(Date.now() / 1000) + (5 * 1000),
        iat: Math.floor(Date.now() / 1000),
        grant_type: 'auth code',
        scopes: scopes,
        client_id: client_id
    }, signingKey);
    return {token: token, id: jti}
}

/**
 * verify token
 * 
 * check with given client id and token if token is valid
 * 
 * @param {*} req 
 * @param {*} token 
 */
async function verifyToken(token: string) {
    const unwrappedJwt: JWT = jwt.decode(token, {json: true, complete: true});
    const tokenId: string = unwrappedJwt.payload.jti;
    const app: App = registeredApps[unwrappedJwt.payload.client_id];
    if (app?.[tokenId]) {
        try {
            const result = await jwt.verify(token, app[tokenId].signingKey);
            if (result) {
                return result;
            } else {
                throw new Error('invalid token');
            }
        } catch (err) {
            throw err;
        }
    } else {
        throw new Error('invalid app');
    }
}

/**
 * Authorization call: this is an endpoint to authorize registered apps
 * 
 * 1. redirects to login page if the client_id is registered
 * 2. returns error if client_id is not registered
 */
app.get("/oauth/dialog", function (req, res) {
    if (!req.query.redirect_uri) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({error:  "redirect_uri not sent in query"}));
    }
    if (registeredApps[req.query.client_id]) {
        let params = '?client_id=' + req.query.client_id + '&&redirect_uri=' + req.query.redirect_uri;
        params = params + '&&scope=' + req.query.scope;
        res.redirect('/login' + params);
    } else {
        res.send("invalid app");
    }
});

/**
 * login page
 * 
 * handles login part of the authorization call
 */
app.get('/login', function(req, response) {
    response.setHeader('Content-Type', 'text/html');
    response.write('<html><body>');
    response.write('<form action=\'login_submit\' method=post >');
    // client_id and redirect_uri are stored as hidden variables
    // for the provider to redirect on successful login
    response.write('<input type=\"hidden\" name=redirect_uri value="' + req.query.redirect_uri + '" />')
    response.write('<input type=\"hidden\" name=client_id value="' + req.query.client_id + '" />');
    response.write('<input type=text name=scope value="' + req.query.scope + '" />');
    response.write('<input type=text name=username />');
    response.write('<input type=text name=password />');
    response.write('<button type="submit">Login</button>');
    response.write('</body></html>');
    response.end();
});

/**
 * login form submit
 * handles callback part of the authorization call
 *
 * 1. creates access code
 * 2. generates token
 * 3. stores token
 * 4. redirects to callback url with access code
 */
app.post('/login_submit', urlencodedParser, async function(req, res){
    const user = findUser(req.body.username || 'user1', req.body.password || 'abc');
    if (user) {
        // get registered app
        const app = registeredApps[req.body.client_id || '1111'];
        // generate access code
        const authCode = Math.floor(Math.random() * Math.floor(1000));
        // create a token for the access code
        const result = await createJwt(user, req.body.scope, user.signingKey, req.body.client_id);
        // store generated token
        app.tokens[authCode] = {token: result.token};
        app[result.id] = {signingKey: user.signingKey, code: authCode};
        // redirect to call back url with the access code
        let params = '?client_id=' + (req.body.client_id || '1111');
        params = params + '&&code=' + authCode;
        res.redirect((req.body.redirect_uri || 'http://localhost:8080/auth/thirdparty/callback') + params);
    } else {
        res.sendStatus(401);
    }
});

/**
 * Get access token
 * 
 * handles token exchange for access code
 */
app.post("/oauth/token", urlencodedParser, function (req, res) {
    if (registeredApps[req.body.client_id]) {
        //&& apps[req.query.client_id].client_secret === req.query.client_secret
        const oauthstates = registeredApps[req.body.client_id].tokens;
        if (oauthstates[req.body.code]) {
            res.setHeader('Content-Type', 'application/json');
            res.send({access_token: oauthstates[req.body.code].token});
        } else {
            res.sendStatus(401);
        }
    } else {
      res.sendStatus(401);
    }
});

app.get("/oauth/token", function (req, res) {
    if (registeredApps[req.query.client_id]) {
        //&& apps[req.query.client_id].client_secret === req.query.client_secret
        const oauthstates = registeredApps[req.query.client_id].tokens;
        if (oauthstates[req.query.code]) {
            res.setHeader('Content-Type', 'application/json');
            res.send({access_token: oauthstates[req.query.code].token});
        } else {
            res.sendStatus(401);
        }
    } else {
      res.sendStatus(401);
    }
});

/**
 * endpoint for token verification
 */
app.get("/verify", async function (req, res) {
    try {
        const token = req.query.access_token || req.header('Authorization');
        const result = await verifyToken(token);
        const expirationTime = result.exp;
        res.setHeader('Content-Type', 'application/json');
        res.send({...result, expirationTime: expirationTime});
    } catch(err) {
        res.setHeader('Content-Type', 'application/json');
        res.status(401).send(JSON.stringify({error:  err}));
    }
});


export function startApp() {
    server = app.listen(9000);
}

export function stopApp() {
    server.close();
}
