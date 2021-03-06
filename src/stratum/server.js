//
//     hypeengine
//     Copyright (C) 2013 - 2017, Hüseyin Uslu, Int6ware - http://www.int6ware.com
//
'use strict';

const net = require('net');
const events = require('events');
const winston = require('winston');
const utils = require('common/utils.js');
const Client = require('stratum/client');

var stratum = module.exports = function (context) {
  var _this = this;
  _this.clients = {};

  let subscriptionCounter = SubscriptionCounter(); // create a subscri.ption counter for the server that's used for assinging id's to clients.

  // create the tcp server for stratum+tp:// connections
  let server = net.createServer({ allowHalfOpen: false }, function (socket) {
    handleConnection(socket); // handle the new connection
  });

  server.maxConnections = 1000000; // set max connections to as much as possible.

  // start listening for connections
  server.listen(context.config.stratum.port, function () {
    winston.log('info', '[STRATUM] listening on %s:%d', server.address().address, server.address().port);
    _this.emit('server.started');
  })
    .on('error', function (err) {
      if (err.code === 'EADDRINUSE') winston.error("Can not listen on port %d as it's already in use, retrying..", context.config.stratum.port);
      else winston.error('Can not listen for stratum; %s', err);
    });

  // Handles incoming connections
  function handleConnection (socket) {
    winston.debug('[STRATUM] client connected %s:%d', socket.remoteAddress, socket.remotePort);

    socket.setKeepAlive(true); // set keep-alive on as we want a continous connection.

    let client = new Client({
      socket: socket, // assigned socket to client's connection.
      subscriptionId: subscriptionCounter.next() // get a new subscription id for the client.
    })
      .on('subscribe', function (params, callback) {
        // on subscription reques
        // var extraNonce = context.jobManager.extraNonceCounter.next()
        // callback(null, extraNonce, context.extraNonce2.size)
      })
      .on('authorize', function (params, callback) {
        // on authorization request
        // callback(true, null)
        // this.sendJob(context.jobManager.current)
      })
      .on('socket.disconnect', function () {
        // delete _this.clients[client.id]
        // _this.emit('client.disconnected', client)
      });

    _this.clients[client.id] = client;
    _this.emit('client.connected', client);
  }
};

// subscriptions counter for the stratum server.
var SubscriptionCounter = function () {
  var count = 0;
  var padding = 'deadc0de';

  return {
    next: function () {
      count++;
      if (Number.MAX_VALUE === count) count = 0;// once we reach the maximum allowed value, reset back.

      return padding + utils.packInt64LE(count).toString('hex');
    }
  };
};

stratum.prototype.__proto__ = events.EventEmitter.prototype;
