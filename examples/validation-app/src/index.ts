// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-validation-app
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {ValidationApplication} from './application';
import {ApplicationConfig} from '@loopback/core';

export {ValidationApplication};

export async function main(options: ApplicationConfig = {}) {
  const app = new ValidationApplication(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);

  return app;
}
