package com.ibm.cf.samples.MQServiceSample.worker;
import javax.jms.Connection;
import javax.jms.Message;
import javax.jms.MessageProducer;
import javax.jms.Session;
import javax.jms.TextMessage;

import com.ibm.mq.jms.MQTopic;
import com.ibm.mq.jms.MQTopicConnectionFactory;
import com.ibm.msg.client.wmq.WMQConstants;


public class TestSend {

	public static void main(String[] args) throws Exception {
		MQTopicConnectionFactory abc = new MQTopicConnectionFactory();
		abc.setIntProperty(WMQConstants.WMQ_CONNECTION_MODE, WMQConstants.WMQ_CM_BINDINGS);
		abc.setQueueManager("DEFAULT");
		Connection c = abc.createConnection();
		Session s = c.createSession(false, Session.AUTO_ACKNOWLEDGE);
		c.start();
		MessageProducer p = s.createProducer(new MQTopic("processedData"));
		p.setTimeToLive(30000);
//		BytesMessage m = s.createBytesMessage(); //s.createTextMessage("hello from JMS");
		TextMessage m = s.createTextMessage("hello from JMS");
//		m.writeByte((byte)1);
		//m.writeByte((byte)2);
		System.out.println("sending reply message :"+m);
		p.send(m);
		c.close();
	}
}