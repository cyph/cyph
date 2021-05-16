import {envDeploy} from '../../env-deploy';
import {MaybePromise} from '../../maybe-promise-type';
import {toQueryString} from '../serialization/query-string';

/** @see sendEmail */
export const sendEmailInternal =
	(
		request: (o: {
			data?: any;
			method?: string;
			url: string;
		}) => Promise<any>,
		openWindow: (url: string) => MaybePromise<void>
	) =>
	async (
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
			`${message}\n\n\n---\n\n${envDeploy.userAgent}\n\n` +
			`${envDeploy.language}\n\n${locationData.href}`
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
						headers: {
							/* eslint-disable-next-line @typescript-eslint/naming-convention */
							...(fromEmail ? {'Reply-To': fromEmail} : {})
						},
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
