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
var io = require('socket.io').listen(app);
var fs = require('fs');
var twitter = require('ntwitter');
var twitterkey;
var twit;
fs.readFile('./twitterkey.json', 'utf8', function (err, data) {
	if (err) {
		 console.log('Error: ' + err);
	}else {
		twitterkey=JSON.parse(data);
                twit = new twitter( twitterkey );
	}
});

var products=['france','china','USA','UK','germany'];
var productFrequency=[];
var productSentiment=[];
products.forEach(function (product) {productFrequency[product]=0;productSentiment[product]=0;});

//VCAP_APPLICATION contains useful information about a deployed application.
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");


var host = (process.env.VCAP_APP_HOST || '0.0.0.0');
//The port on the DEA for communication with the application:
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

	twit.stream('statuses/filter', { track: ['data'] }, function(stream) {
		// Start streaming tweets...
		stream.on('data', function(data) {
			if (data && data.text) {
				// When we recieve a tweet, emit the tweet to the screen...
				socket.emit('tweet', {"text": data.text});
				// ...and send the tweet text to the worker for processing
				processTweet ({'products':products,'tweet':data.text});
			}
		});
	});



//	When we receive processed data from the worker, emit it to the browser
	function ProcessAnalytics (msg) {
		var product=msg.productName;
		productFrequency[product]++;
		if (msg.happy) {productSentiment[product]++;};
		var freq=[];
		var happy=[];
		products.forEach(function (product) {freq.push(productFrequency[product]);happy.push(productSentiment[product]);});
		socket.emit('analysedTweet', {'products':products,'frequency':freq,'happy':happy,'tweetText':msg.tweetText});
	}

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
				ProcessAnalytics( replyMessage);
			}
		}); 

		var sleep = require('sleep');
		sleep.sleep(1);//This blocks the node worker thread for 1 second
		//you would normally never do this. We are doing it to _simulate_
		//a complex algorithm that takes a long time to run. 


	} 
});

