// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/typeorm
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Application} from '@loopback/core';
import {expect} from '@loopback/testlab';
import path from 'path';
import {Column, Connection, Entity, PrimaryGeneratedColumn} from 'typeorm';
import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import {typeorm, TypeOrmBindings, TypeOrmComponent, TypeOrmConfig} from '../..';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  isActive: boolean;
}

describe('TypeOrm (acceptance)', () => {
  const sqlite: SqliteConnectionOptions = {
    type: 'sqlite',
    database: path.join(__dirname, 'sqlite-test-db'),
    entities: [User],
    synchronize: true,
  };
  let app: Application;

  after(async () => {
    if (app) await app.stop();
    (app as unknown) = undefined;
  });

  before(async () => {
    app = await givenAppWithCustomConfig(sqlite);
  });

  it('starts TypeOrmComponent', () => {
    const component = app.getSync(TypeOrmBindings.COMPONENT);
    expect(component.typeOrmConfig).to.eql(sqlite);
    expect(component.connectionManager.connections.length).to.eql(1);
  });

  it('allows injection of connection', async () => {
    app.bind('dbHelper').toClass(DBHelper);
    const dbHelper: DBHelper = await app.get('dbHelper');
    await dbHelper.writeAndRead();
  });

  class DBHelper {
    @typeorm.connection() private connection: Connection;

    async writeAndRead() {
      const repo = this.connection.getRepository(User);
      await repo.clear();
      const result = await repo.insert({
        firstName: 'John',
        lastName: 'Smith',
        isActive: true,
      });
      const users = await repo.find();
      expect(users.length).to.equal(1);

      const user = repo.create({
        id: result.identifiers[0].id,
        firstName: 'John',
        lastName: 'Smith',
        isActive: true,
      });
      expect(users[0]).to.eql(user);
    }
  }

  async function givenAppWithCustomConfig(config: TypeOrmConfig) {
    app = new Application();
    app.configure(TypeOrmBindings.COMPONENT).to(config);
    app.component(TypeOrmComponent);
    await app.start();
    return app;
  }
});
