# quave:definitions

`quave:definitions` is a Meteor package that provides a way for you to declare your models and enums.

## Why

It is desired to have a centralized way to declare schemas for your MongoDB collection and also your GraphQL schema.

We believe we are not reinventing the wheel in this package but what we are doing is like putting together the wheels in the vehicle :).

## Installation

```sh
meteor add quave:definitions
```

## Usage

The idea is to be as close as possible to a [SimpleSchema](https://github.com/aldeed/simple-schema-js) schema definition but also supporting additional properties when necessary for GraphQL and other necessities.

### createModelDefinition

You provide a name for your model and fields, the fields is your schema definition.

See that you can use custom types from `meteor/quave:custom-type-*` like `DateTime` and also in combination with `createEnumDefinition` (see more below).

We have also special properties:
- in the root
  - pluralName: if your model has an irregular name
- in the fields
  - graphQLType: if you need to specify a type (scalar or special type) that has a different name in GraphQL than in MongoDB
  - graphQLOptionalInput: if the input in GraphQL has a different optional value

```javascript
import { createModelDefinition } from 'meteor/quave:definitions';
import { DateTimeType } from 'meteor/quave:custom-type-date-time/DateTimeType';
import { PlayerPositionDefinition } from './PlayerPositionEnum';

export const PlayerDefinition = createModelDefinition({
  name: 'Player',
  fields: {
    name: {
      type: String,
    },
    birthday: {
      type: DateTimeType,
      optional: true,
    },
    position: {
      ...PlayerPositionDefinition.toSimpleSchemaField(),
      optional: true,
    },
  },
});

export const PlayerSchema = PlayerDefinition.toSimpleSchema();
```

### createEnumDefinition

You provide a name for your enum and options, the options are your static definitions in a limited domain.

Functions:
- toSimpleSchemaField: transforms the enum definition into field properties, like allowedValues, type, etc
- toEnum: returns the options adding the option key as a field called value to each item.

```javascript
import { createEnumDefinition } from 'meteor/quave:definitions';

export const PlayerPositionDefinition = createEnumDefinition({
  name: 'PlayerPosition',
  options: {
    GOLEIRO: {
      name: 'Goleiro',
    },
    LATERAL_DIREITO: {
      name: 'Lateral Direito',
    },
    LATERAL_ESQUERDO: {
      name: 'Lateral Esquerdo',
    },
    ZAGUEIRO: {
      name: 'Zagueiro',
    },
    VOLANTE: {
      name: 'Volante',
    },
    MEIA: {
      name: 'Meia',
    },
    ATACANTE: {
      name: 'Atacante',
    },
    PONTA_DIREITA: {
      name: 'Ponta Direita',
    },
    PONTA_ESQUERDA: {
      name: 'Ponta Esquerda',
    },
  },
});

export const PlayerPosition = PlayerPositionDefinition.toEnum();

```

### License

MIT

