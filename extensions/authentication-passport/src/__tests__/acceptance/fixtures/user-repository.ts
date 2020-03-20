// Copyright IBM Corp. 2018,2019. All Rights Reserved.
// Node module: @loopback/cli
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
const _ = require('lodash');

/**
 * A simple User model
 */
export interface MyUser {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    email?: string;
}

export class UserRepository {
    constructor(
        readonly list: {[key: string]: {profile: MyUser; password: string}},
    ) {}

    /*
    *   Used in 'testing' scenario where authentication strategy does not come from a provider.
    */
    find(username: string, password: string, cb: Function): void {
        const userList = this.list;
        function search(key: string) {
        return userList[key].profile.username === username;
        }
        const found = Object.keys(userList).find(search);
        if (!found) return cb(null, false);
        if (userList[found].password !== password) return cb(null, false);
        cb(null, userList[found].profile);
    }

    findUser(id: string) {
      const usr = _.filter(this.list, (user: MyUser) => (user.id === id));
      if (usr.length > 0) return usr[0];
      return null;
    }
}

const userRepository = new UserRepository({
    Joseph: {
      profile: {
        id: '1001',
        username: 'joesmith71',
        firstName: 'Joseph',
        lastName: 'Smith',
      },
      password: 'abc',
    },
    Simon: {
      profile: {
        id: '1002',
        username: 'simonsmith71',
        firstName: 'Simon',
        lastName: 'Smith',
      },
      password: 'xyz',
    }
  });

export {userRepository};
