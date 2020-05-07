const memoize = require('lodash/memoize');
const plivo = require('plivo');
const twilio = require('twilio');
const {twilioCredentials} = require('./cyph-admin-vars');

const getPlivoClient = memoize(
	o => new plivo.Client(o.id, o.authToken),
	o => o.id
);

const getTwilioClient = memoize(
	o => twilio(o.id, o.authToken),
	o => o.id
);

const sendSMS = async (to, text, credentials) => {
	if (!credentials) {
		credentials = {twilio: twilioCredentials};
	}

	if (
		credentials.twilio &&
		credentials.twilio.authToken &&
		credentials.twilio.id &&
		credentials.twilio.from
	) {
		const twilioClient = getTwilioClient(credentials.twilio);

		if (!twilioClient) {
			return;
		}

		await twilioClient.messages.create({
			body: text,
			from: credentials.twilio.from,
			to
		});
	}
	else if (
		credentials.plivo &&
		credentials.plivo.authToken &&
		credentials.plivo.id &&
		credentials.plivo.from
	) {
		const plivoClient = getPlivoClient(credentials.plivo);

		if (!plivoClient) {
			return;
		}

		await plivoClient.messages.create(credentials.plivo.from, to, text);
	}
};

module.exports = {sendSMS};
