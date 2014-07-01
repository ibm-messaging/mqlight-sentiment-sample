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

var mqlight = require('mqlight');
var uuid=require('node-uuid');
var opts;
var id='WRKR_' + uuid.v4().substring(0, 7);

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
    }
    else
    {
	console.log( 'Error - Check that app is bound to service');
    }

    console.log("Host is "+host);
    console.log("User is "+username);
    console.log("Password is "+password);
    console.log("ConnectionLookupURI is "+connectionLookupURI);
opts = {  user: username , password: password, service: connectionLookupURI , id:id};
} else {
    opts = {  service:'amqp://localhost:5672',id:id};
}

console.log ('connecting to mq light as follows' ,opts);
var client = mqlight.createClient(opts);

//Make the connection
client.connect(function(err) {
	if (err) {
		console.log(err);
	}
});

client.on('connected', function() {
	console.log('Connected to ' + opts.service + ' using client-id ' + client.getId());

	// Subscribe to the topic 'tweets' to recieve tweets sent by web-tier
	var destination = client.subscribe('tweets', function(err, address) {
		if (err) {
			console.error('Problem with subscribe  request: ' + err.message);
			process.exit(0);
		}
		if (address) {
			console.log("Subscribing to " + address);
		}
	});

	function sendMessage(topic, body) {
		client.send(topic, body, function(err, msg) {
			if (err) {
				console.error('Problem with send request: ' + err.message);
				process.exit(0);
			}
		});
	}

	// When we recieve a message, process it and send it to web-tier
	destination.on('message', function(msg) {
		processTweet(msg);
	});

	/*
	 * This function processes all tweets to find instances of the products we are intested in.
	 * If a tweet is not interestign it is discarded and we move to the next.
	 * If a tweet is interesting we analyse it to determine whether the dentiment is positive.
	 * In this example the sentiment analysis is simply a random function as we are demonstrating messaging not analytics.
	 * Interesting tweets are sent back to the webapp together with the retults of the sentiment analysis
	 */


	function processTweet(tweetData) {
		var replyMessage = {};
		var productNames=tweetData.products;
		var tweetText=tweetData.tweet;
		productNames.forEach(function (product) {
			if (tweetText.toUpperCase().indexOf(product.toUpperCase())>0) {
				replyMessage['tweetText'] =tweetText;
				replyMessage['productName']=product;
				replyMessage['happy']=(Math.random()>0.5); //simulate sentiment analysis
				console.log('Replying ' +  product + tweetText);
				sendMessage('processedData', replyMessage);
			}
		}); 

		sleep(1000)//This blocks the node worker thread for 1 second
		//you would normally never do this. We are doing it to _simulate_
		//a complex algorithm that takes a long time to run. 

		function sleep(time) {
    	var end = new Date().getTime();
    	while(new Date().getTime() < end + time) {;}
		}

	} 
});
setInterval (function (){},300000); // prevent program from exiting. 
