/*******************************************************************************
 * Copyright (c) 2014 IBM Corporation and other Contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html 
 *
 * Contributors:
 * IBM - Initial Contribution
 *******************************************************************************/
var app = require('http').createServer(handler);
var uuid = require ('node-uuid');
var io = require('socket.io').listen(app);
var fs = require('fs');
var twitter = require('ntwitter');
var mqlight = require('mqlight');
var twitterkey = require('./twitterkey.json');
var id='WEB_' + uuid.v4().substring(0, 7);
var products=['france','china','USA','UK','germany'];
var productFrequency=[], productSentiment=[];
products.forEach(function (product) {productFrequency[product]=0;productSentiment[product]=0;});
var twit = new twitter( twitterkey );

/*
 * when deployed to bluemix.
 * VCAP_SERVICES contains all the credentials of services bound to this application. 
 * the app should listen on VCAP_APP_HOST:VCAP_APP_PORT
 */
var  opts;
if (process.env.VCAP_SERVICES) {
    var services = JSON.parse(process.env.VCAP_SERVICES);

    console.log( 'Running BlueMix');

    if (services[ 'mqlight' ] != null)
    {    
	console.log('Using mqlight');
	// Use the Bluemix version 2 style lookup
	username  = services [ 'mqlight' ][0].credentials.username;
	password  = services [ 'mqlight' ][0].credentials.password;
	connectionLookupURI  = services [ 'mqlight' ][0].credentials.connectionLookupURI;
	host      = services [ 'mqlight' ][0].credentials.host;
	MQXR_Port = services [ 'mqlight' ][0].credentials.msgport;
    }
    else
    {
	console.log( 'Error - Check that app is bound to service');
    }

    console.log("Host is "+host);
    console.log("AMQP listener port is "+MQXR_Port);
    console.log("User is "+username);
    console.log("Password is "+password);
    console.log("ConnectionLookupURI is "+connectionLookupURI);
opts = {  user: username , password: password, service: connectionLookupURI , id:id};
} else {
    opts = {  service:'amqp://localhost:5672',id:id};
}
var host = (process.env.VCAP_APP_HOST || '0.0.0.0');
var port = (process.env.VCAP_APP_PORT || 3000);

//Start server
app.listen(port, host);
console.log('App started on port ' + port);

function handler(req, res) {
    var url = req.url.substr(1);
    if (url == '') { url = __dirname + '/index.html';};
    fs.readFile(url,
		function (err, data) {
		    if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		    }
		    res.writeHead(200);
		    return res.end(data);
		});
}

io.set('log level', 1);

io.sockets.on('connection', function(socket) {

    console.log ('connecting to mq light as follows: ',  opts);
    var client = mqlight.createClient(opts);
    //	Make the connection
    client.connect(function(err) {
	if (err) {
	    console.log(err);
	}
    });

    client.on('connected', function() {
	console.log('Connected to ' + opts.service + ' using client-id ' + client.getId());

	var callback = function(err, address) {
	    if (err) {
		console.error('Problem with subscribe request: ' + err.message);
		process.exit(0);
	    }
	    if (address) {
		console.log("Subscribing to: " ,address); // Once we're subscribed and ready for the worker...
		twit.stream('statuses/filter', { track: ['data'] }, function(stream) {
		    // Start streaming tweets...
		    stream.on('data', function(data) {
			if (data && data.text) {
			    // When we recieve a tweet, emit the tweet to the screen...
			    socket.emit('tweet', {"text": data.text});
			    // ...and send the tweet text to the worker for processing
			    sendMessage('tweets', ({'products':products,'tweet': data.text}));
			}
		    });
		});
	    }
	};

	// Subscribe to the processedData topic to get messages from the worker
	var destination = client.subscribe('processedData', callback);

	// When we receive processed data from the worker, emit it to the browser
	destination.on('message', function(msg) {
	    console.log("received graphdata " , msg);
	    if (typeof (msg)=="string") {
		// required to workaround a temporary limitation in JMS interopability.
		// where JSON is not automatically co-erced to an object. 
		msg=JSON.parse(msg);
	    }
	    var product=msg.productName;
	    productFrequency[product]++;
	    if (msg.happy) {productSentiment[product]++};
	    var freq=[];
	    var happy=[];
	    products.forEach(function (product) {freq.push(productFrequency[product]);happy.push(productSentiment[product]);});
	    socket.emit('analysedTweet', {'products':products,'frequency':freq,'happy':happy,'tweetText':msg.tweetText});
	});

	function sendMessage(topic, body) {
	    client.send(topic, body, function(err, msg) {
		if (err) {
		    console.error('Problem with send request: ' + err.message);
		    process.exit(0);
		}
		if (msg) {
		    console.log("Sent message", msg);
		}
	    });
	}

    });

});
