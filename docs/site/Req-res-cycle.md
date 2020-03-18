---
lang: en
title: 'Request-response cycle'
keywords: LoopBack 4.0, LoopBack 4
sidebar: lb4_sidebar
permalink: /doc/en/lb4/Application.html
---

## The LoopBack 4 request-response cycle

To understand the LoopBack 4 request-response cycle, let's start by enumerating
the APIs that create the endpoints on the server. We will then follow the path
taken by a request, to see how it makes its way through the various parts of the
framework to return a result.

### Setting up the request-responses infrastruture

The endpoints on a LoopBack app can be categorized into controller endpoints and
non-controller endpoints. Controller endpoints are those that are created by
LoopBack controller methods, non-controller endpoints are those that are created by
other APIs.

#### Controller endpoints

Controller methods decorated with operation decorators like `@get()`, `@post()`,
`@put` etc., create enpoints on the app for the corresponding HTTP verbs. The behavior
of these endpoints are entirely dependent on the implementation of the controller method.

{% include tip.html content="Apart from controller files in the `controllers` directory,
controllers may be added to the app by [components](https://loopback.io/doc/en/lb4/Components.html)." %}

In the request-response cycle section we will see how implemenation details determine
the course of a request these endpoints - they may or may not actually interact with a model.

#### Non-controller endpoints

The following APIs can create non-controller endpoints.

[TODO: elaborate these]

1. app.static()
2. app.redirect()
3. app.mountExpressRouter() //express routes
4. non-controller endpoints added by components
5. app.handler() <-- include this?
6. app.route() <-- include this?

### The request-response cycle

The request handling process starts with the app's [sequence](https://loopback.io/doc/en/lb4/Sequence.html);
it is the gatekeeper of all requests to the app. Every request, whether to controller
endpoints or non-controller endpoints, must pass through the sequence.

The sequence identifies the responsible handlers for the requested endpoint and passes
on the request to the handlers. The handlers then take care of sending the response back to
the client.

#### The sequence

The sequence is a simple class with five injected helper methods. These five methods
come together in the sequence class to make the request-response cycle possible in
LoopBack.

[TODO: elaborate these]

1. FindRoute
2. ParseParams
3. InvokeMethod
4. Send
5. Reject

#### Request to a controller endpoint

[TODO: explain]

- How controller methods work with various types of services
- How controller methods work with repositories (and datasource) to get/set model data
- What are interceptors and how they can affect the req-res cycle

#### Request to a non-controller endpoint

[TODO: explain]

- How requests to non-controller endpoints are handled
  - static files
  - redirection
  - custom Express routes
  - non-controller endpoints added by components
