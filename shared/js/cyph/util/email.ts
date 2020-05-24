import {env} from '../env';
import {request} from './request';
import {toQueryString} from './serialization';
import {openWindow} from './window';

/** Sends an email to the Cyph team. "@cyph.com" may be omitted from to. */
export const email = async (
	to: string = 'hello',
	subject: string = 'New Cyph Email',
	message: string = '',
	fromEmail?: string,
	fromName: string = 'Mandrill',
	automated: boolean = false
) : Promise<void> => {
	fromEmail = (fromEmail || 'test@mandrillapp.com').replace(
		'@cyph.com',
		'@mandrillapp.com'
	);

	message = (
		`${message}\n\n\n---\n\n${env.userAgent}\n\n` +
		`${env.language}\n\n${locationData.href}`
	).replace(/\/#.*/g, '');

	to = to.replace('@cyph.com', '') + '@cyph.com';

	try {
		await request({
			data: {
				key: 'HNz4JExN1MtpKz8uP2RD1Q',
				message: {
					/* eslint-disable-next-line @typescript-eslint/naming-convention */
					from_email: 'incoming@cyph.com',
					/* eslint-disable-next-line @typescript-eslint/naming-convention */
					from_name: fromName,
					/* eslint-disable-next-line @typescript-eslint/naming-convention */
					headers: {...(fromEmail ? {'Reply-To': fromEmail} : {})},
					subject,
					text: message,
					to: [
						{
							email: to,
							type: 'to'
						}
					]
				}
			},
			method: 'POST',
			url: 'https://mandrillapp.com/api/1.0/messages/send.json'
		});
	}
	catch {
		if (automated) {
			return;
		}

		await openWindow(
			`mailto:${to}?${toQueryString({body: message, subject})}`
		);
	}
};
