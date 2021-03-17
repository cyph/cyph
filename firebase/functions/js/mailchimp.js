import MailchimpApiV3 from 'mailchimp-api-v3';
import {mailchimpCredentials} from './cyph-admin-vars.js';
import {initMailchimp} from './init-mailchimp.js';

export const mailchimp =
	mailchimpCredentials && mailchimpCredentials.apiKey ?
		new MailchimpApiV3(mailchimpCredentials.apiKey) :
		undefined;

export const {
	addToMailingList,
	removeFromMailingList,
	splitName
} = initMailchimp(mailchimp, mailchimpCredentials);
