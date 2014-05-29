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

//when deployed to bluemix, VCAP_APPLICATION contains useful information about a deployed application.
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}" );
//process connection information - local or cloud
var credentials, opts;
var id='WRKR_' + uuid.v4().substring(0, 7);
if (process.env.VCAP_SERVICES) {
	var services = JSON.parse(process.env.VCAP_SERVICES);
	if (services[ 'ElasticMQ-0.1' ] != null) { credentials=(services [ 'ElasticMQ-0.1' ][0].credentials)} 
	else if (services[ 'MQLight for Koa-0.1' ] != null) { credentials=(services [ 'MQLight for Koa-0.1' ][0].credentials)}
	opts = {  user: credentials.username , password: credentials.password, service:'amqp://' + credentials.host + ':' + credentials.msgport};
} else {
	opts = {  service:'amqp://localhost:5672', id:id };
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
