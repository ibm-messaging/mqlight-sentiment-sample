/********************************************************************/
/*                                                                  */
/* Program name: WebSphereMQServiceSampleWorker                     */
/*                                                                  */
/* Description: A java program that demonstrates the use of the     */
/*              MQLight Service                                     */
/*                                                                  */
/*   (C) Copyright IBM Corp. 2013 All Rights Reserved.              */
/*                                                                  */
/*   US Government Users Restricted Rights - Use, duplication or    */
/*   disclosure restricted by GSA ADP Schedule Contract with        */
/*   IBM Corp.                                                      */
/********************************************************************/
package com.ibm.cf.samples.MQServiceSample.worker;

import java.util.Random;
import javax.jms.Connection;
import javax.jms.ConnectionFactory;
import javax.jms.Destination;
import javax.jms.JMSException;
import javax.jms.Message;
import javax.jms.MessageListener;
import javax.jms.MessageProducer;
import javax.jms.Topic;
import javax.jms.Session;
import javax.jms.TextMessage;
import javax.jms.TopicSubscriber;

import com.ibm.json.java.JSON;
import com.ibm.json.java.JSONArray;
import com.ibm.cf.samples.utility.MQLightConnectionHelper;
import com.ibm.json.java.JSONObject;
import com.ibm.mq.jms.MQConnectionFactory;
import com.ibm.msg.client.jms.JmsConnectionFactory;
import com.ibm.mq.jms.MQTopic;

/**
  * 
 */

public class Worker implements MessageListener{
	static Worker worker;
	static int errorCount = 0;
	static String ID = getID();
	static Session sess;
	static Object done=new Object();
	Random random = new Random();
	
	

	public static void main(String[] args) throws Exception {
		worker = new Worker();
		MQLightConnectionHelper connHelper;
			connHelper= MQLightConnectionHelper
					.getMQLightConnectionHelper();	
		
		MQConnectionFactory cf= (MQConnectionFactory) connHelper.getJmsConnectionFactory();
		cf.setCloneSupport(1);

		Connection conn =cf.createConnection(connHelper.getUsername(),		connHelper.getPassword());
		//Connection conn =cf.createConnection(); // stand alone.
		conn.setClientID("worker");
		sess = conn.createSession(false, Session.AUTO_ACKNOWLEDGE);
		conn.start();

		Topic topic = sess.createTopic("tweets");
		TopicSubscriber subscriber = sess.createDurableSubscriber(topic, "requests");
		subscriber.setMessageListener(worker);
		System.out.println("main thread waiting");
		synchronized (done) {
			done.wait();
		}
		System.out.println("main thread - exiting this worker instance");
		sess.close();
		conn.close();
	}

	public void onMessage (Message message) {
		
		// Keep running until the worker throws ten errors, then drop
		if (errorCount > 10) {	
			System.out.println("10 errors found - exiting this worker instance");
			done.notify();
		}
		System.out.println("message arrived");
		try {
			String msg = ((TextMessage) message).getText();
			JSONObject obj = (JSONObject)JSON.parse(msg);
			JSONArray products = (JSONArray)obj.get("products");
			String tweet=(String)obj.get("tweet");
			//System.out.println("tweet is :"+tweet);
			for (Object product : products) {
				if (tweet.toUpperCase().contains(((String)product).toUpperCase())){
					//product found in tweet
					JSONObject reply=new JSONObject();
					reply.put("tweetText",tweet);
					reply.put("productName",(String)product);
					reply.put("happy",random.nextBoolean());
					TextMessage replyMessage = sess.createTextMessage(reply.serialize());
					// Send the reply
					System.out.println("sending reply message :"+replyMessage);
					MessageProducer replyProducer;
					replyProducer= sess.createProducer(new MQTopic("processedData"));
					replyProducer.setTimeToLive(30000);
					replyProducer.send(replyMessage);
 
				}
			}
		} catch (Exception e) {
			// Error encountered
			e.printStackTrace();
			errorCount++;
		}
	}

	/**
	 * Parse the environment variables to get the ID string of this worker
	 * instance
	 */
	private static String getID() {
		String envVCAPApplication = System.getenv("VCAP_APPLICATION");
		if (envVCAPApplication == null) {
			System.err
			.println("Worker:getID() --- ERROR the VCAP_APPLICATION environment variable has not been set");
			return null;
		}

		// Parse the env string into a JSONObject
		try {
			JSONObject jVCAP = JSONObject.parse(envVCAPApplication);

			// Get the array associated with the service.
			String instanceID = (String) jVCAP.get("instance_id");
			if (instanceID != null) {
				return instanceID;
			}
			return null;
		} catch (Exception e) {
			e.printStackTrace();
			System.err
			.println("Worker:getID() --- ERROR VCAP_APPLICATION cannot be parsed");
			return null;
		} 
	}
}
