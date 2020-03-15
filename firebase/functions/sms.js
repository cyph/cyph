const {twilioCredentials} = require('./cyph-admin-vars');

const twilio =
	twilioCredentials && twilioCredentials.authToken ?
		require('twilio')(twilioCredentials.sid, twilioCredentials.authToken) :
		undefined;

const sendSMS = async (to, text) =>
	twilio &&
	twilio.messages.create({from: twilioCredentials.from, to, body: text});

module.exports = {sendSMS};
