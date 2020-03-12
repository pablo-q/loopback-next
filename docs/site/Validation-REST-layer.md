---
lang: en
title: 'Validation in REST Layer'
keywords: LoopBack 4.0, LoopBack 4
sidebar: lb4_sidebar
permalink: /doc/en/lb4/Validation-REST-layer.html
---

At the REST layer, there are 2 types of validation:

1. [Type validation](#type-validation)
2. [Validation against OpenAPI schema specification](#validation-against-openapi-schema-specification)

## Type Validation

The type validation in the REST layer comes out of the box in LoopBack.

> Validations are applied on the parameters and the request body data. They also
> use OpenAPI specification as the reference to infer the validation rules.

Take the `capacity` property in the `CoffeeShop` model as an example, it is a
number. When creating a `CoffeeShop` by calling /POST, if a string is specified
for the `capacity` property as below:

```json
{
  "city": "Toronto",
  "phoneNum": "416-111-1111",
  "capacity": "100"
}
```

a "request body is invalid" error is expected:

```json
{
  "error": {
    "statusCode": 422,
    "name": "UnprocessableEntityError",
    "message": "The request body is invalid. See error object `details` property for more info.",
    "code": "VALIDATION_FAILED",
    "details": [
      {
        "path": ".capacity",
        "code": "type",
        "message": "should be number",
        "info": {
          "type": "number"
        }
      }
    ]
  }
}
```

## Validation against OpenAPI Schema Specification

For validation against an OpenAPI schema specification, the
[AJV module](https://github.com/epoberezkin/ajv) can be used to validate data
with a JSON schema generated from the OpenAPI schema specification.

More details can be found about
[validation keywords](https://github.com/epoberezkin/ajv#validation-keywords)
and
[annotation keywords](https://github.com/epoberezkin/ajv#annotation-keywords)
available in AJV.

Below are a few examples on the usage.

### Example#1: Length limit

A typical validation example is to have a length limit on a string using the
keywords `maxLength` and `minLength`. For example:

```ts
  @property({
    type: 'string',
    required: true,
    // --- add jsonSchema -----
    jsonSchema: {
      maxLength: 10,
      minLength: 1,
    },
    // ------------------------
  })
  city: string;
```

If the `city` property in the request body does not satisfy the requirement as
follows:

```json
{
  "city": "a long city name 123123123",
  "phoneNum": "416-111-1111",
  "capacity": 10
}
```

an error will occur with details on what has been violated:

```json
{
  "error": {
    "statusCode": 422,
    "name": "UnprocessableEntityError",
    "message": "The request body is invalid. See error object `details` property for more info.",
    "code": "VALIDATION_FAILED",
    "details": [
      {
        "path": ".city",
        "code": "maxLength",
        "message": "should NOT be longer than 10 characters",
        "info": {
          "limit": 10
        }
      }
    ]
  }
}
```

### Example#2: Value range for a number

For numbers, the validation rules can be used to specify the range of the value.
For example, any coffee shop would not be able to have more than 100 people, it
can be specified as follows:

```ts
  @property({
    type: 'number',
    required: true,
    // --- add jsonSchema -----
    jsonSchema: {
      maximum: 100,
      minimum: 1,
    },
    // ------------------------
  })
  capacity: number;
```

### Example#3: Pattern in a string

Model properties, such as phone number and postal/zip code, usually have certain
patterns. In this case, the `pattern` keyword can be used to specify the
restrictions.

Below shows an example of the expected pattern of phone numbers, i.e. a sequence
of 10 digits separated by `-` after the 3rd and 6th digits.

```ts
  @property({
    type: 'string',
    required: true,
    // --- add jsonSchema -----
    jsonSchema: {
      pattern: '\\d{3}-\\d{3}-\\d{4}',
    },
    // ------------------------
  })
  phoneNum: string;
```
