<?php
//phpinfo();
echo "including proton messenger  ";
include ("proton.php");
$rawservices = getenv ( 'VCAP_SERVICES' );
echo "got rawservices: ";
if ($rawservices) {
	$services = json_decode ( $rawservices,true );
	var_dump ($rawservices);
	var_dump ($services);
	if ($services['mqlight'] != null) {
		$credentials = $services['mqlight'] [0] ['credentials'];
	}
	//now we must get the actual connection details for the service
	$connDetails=file_get_contents($credentials['connectionLookupURI']);
	var_dump ($connDetails);
	$connJSON=json_decode ($connDetails,true);
	var_dump ($connJSON);
        $connURI=$connJSON['service'][0];
	$parse=parse_url($connURI);
	
	$mqLightURI = "{$parse['scheme']}://{$credentials['username']}:{$credentials['password']}@{$parse['host']}:{$parse['port']}" ;
	
} else {
    $url="amqp://localhost";
}
echo "MQ Light connection URI is: $mqLightURI \n";

$id = 'PHP_' . rand ( 0, 10000 );
echo "\ncreating messenger with ID: $id\n ";
flush();
$mess = new Messenger ( $id );
echo "\nstarting messenger  ";
flush();
//$mess->start ();
echo "\nsubscribing to $mqLightURI/share:tweetshare:tweets ";
flush();
flush();
flush();
$mess->subscribe ( "$mqLightURI/share:tweetshare:tweets" );
echo "\n returned from subscribe $mqLightURI/share:tweetshare:tweets ";
flush();

echo "\n returned from subscribe $mqLightURI/share:tweetshare:tweets ";
echo "\n returned from subscribe $mqLightURI/share:tweetshare:tweets ";
echo "\n returned from subscribe $mqLightURI/share:tweetshare:tweets ";
echo "\n returned from subscribe $mqLightURI/share:tweetshare:tweets ";
echo "\n returned from subscribe $mqLightURI/share:tweetshare:tweets ";
echo "\n returned from subscribe $mqLightURI/share:tweetshare:tweets ";
flush();
flush();
flush();
flush();
flush();

$msg = new Message ();
while ( true ) {
	$mess->recv ( 10 );
	while ( $mess->incoming ) {
		try {
			$mess->get ( $msg );
		} catch ( Exception $e ) {
			print "$e\n";
			continue;
		}
		$tweetData = json_decode ( $msg->body );
		echo "received tweet";
		processTweet ( $tweetData );
	}
}
function sendMessage($topic, $body) {
	global $mess;
	global $mqLightURI;
	$msg = new Message ();
	$msg->address = "$mqLightURI/$topic";
	
	$msg->body = json_encode ( $body );
	$mess->put ( $msg );
	$mess->send ();
	print "sent: $msg->body\n";
}

/*
 * This function processes all tweets to find instances of the products we are intested in. If a tweet is not interestign it is discarded and we move to the next. If a tweet is interesting we analyse it to determine whether the dentiment is positive. In this example the sentiment analysis is simply a random function as we are demonstrating messaging not analytics. Interesting tweets are sent back to the webapp together with the retults of the sentiment analysis
 */
function processTweet($tweetData) {
	$replyMessage = [ ];
	$productNames = $tweetData->products;
	$tweetText = $tweetData->tweet;
	foreach ( $productNames as $product ) {
		if (stripos ( $tweetText, $product )) {
			$replyMessage ['tweetText'] = $tweetText;
			
			$replyMessage ['productName'] = $product;
			$replyMessage ['happy'] = (rand ( 0, 1 ) == 1); // simulate sentiment analysis
			sendMessage ( 'processedData', $replyMessage );
			sleep ( 1 ); // This blocks the node worker thread for 1 second //you would normally never do this. We are doing it to _simulate_ //a complex algorithm that takes a long time to run.
		}
	}
}
