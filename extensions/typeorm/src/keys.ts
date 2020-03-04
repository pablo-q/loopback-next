// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/typeorm
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {BindingKey} from '@loopback/core';
import {TypeOrmComponent} from './typeorm.component';

/**
 * Binding keys used by this component.
 */
export namespace TypeOrmBindings {
  export const COMPONENT = BindingKey.create<TypeOrmComponent>(
    'components. TypeOrmComponent',
  );
}
