import memoize from 'lodash-es/memoize.js';
import plivo from 'plivo';
import twilio from 'twilio';
import {twilioCredentials} from './cyph-admin-vars.js';

const getPlivoClient = memoize(
	o => new plivo.Client(o.id, o.authToken),
	o => o.id
);

const getTwilioClient = memoize(
	o => twilio(o.id, o.authToken),
	o => o.id
);

export const sendSMS = async (to, text, credentials) => {
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

		await plivoClient.messages.create(
			credentials.plivo.from,
			to.startsWith('+') ? to : `+1${to}`,
			text
		);
	}
};
