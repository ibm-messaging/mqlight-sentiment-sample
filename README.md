MQ Light sentiment worker sample
================================

This sample demonstrates how MQ Light can make apps more responsive using
worker threads. 

The sample contains three directories each of which is a node.js project. 

webapp-noworker.nodejs is a stand alone node.js application which fetches
tweets from twitter and analyses them in a single threaded application. 

webapp-offload.nodejs and worker.nodejs are the worker thread enabled version
of the application.  webapp-offload.nodejs is the web backend and this hands
off work to one or more instances of worker.nodejs. 


Follow the instructions in our [Getting started](https://www.ibmdw.net/messaging/mq-light/getting-started-mq-light/)
page to install and start MQ Light. Then download and extract this sample and
add Twitter OAuth keys (follow [these instructions](https://dev.twitter.com/docs/auth/tokens-devtwittercom)
to get them) to `twitterkey.json`. found in webapp-noworker.nodejs and
webapp-offload.nodejs.

Next, cd into each directory in turn and run

```
npm install
```

to install the required modules.

To run the single threaded version run 

```
node webapp-noworker.nodejs/app.js
```
The app can be viewed at [http://localhost:3000/](http://localhost:3000/).
Note that the analytics processing causes the tweet stream to be slow. 

Once you have observed the single threaded application, stop it and then run 

```
node worker.nodejs/worker.js
```

to start the worker thread and

```
node webapp-offload.nodejs/app.js
```

to start the web backend app. The app can be viewed at
[http://localhost:3000/](http://localhost:3000/). The tweet stream should be
much more responsive than the [single threaded example](https://github.com/ibm-messaging/mqlight-worker-thread/tree/serial)
because the cpu heavy work is being handled by a separate worker thread.
