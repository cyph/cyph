import {env} from '../env';
import {request} from './request';


/** Sends an email to the Cyph team. "@cyph.com" may be omitted from to. */
export const email	= async (
	to: string = 'hello',
	subject: string = 'New Cyph Email',
	message: string = '',
	fromEmail?: string,
	fromName: string = 'Mandrill'
) : Promise<void> => {
	await request({
		data: {
			key: 'HNz4JExN1MtpKz8uP2RD1Q',
			message: {
				from_email: (fromEmail || 'test@mandrillapp.com').
					replace('@cyph.com', '@mandrillapp.com')
				,
				from_name: fromName,
				subject,
				text: (
					`${message}\n\n\n---\n\n${env.userAgent}\n\n` +
					`${env.language}\n\n${locationData.href}`
				).replace(/\/#.*/g, ''),
				to: [{
					email: to.replace('@cyph.com', '') + '@cyph.com',
					type: 'to'
				}]
			}
		},
		method: 'POST',
		url: 'https://mandrillapp.com/api/1.0/messages/send.json'
	}).catch(
		() => {}
	);
};
