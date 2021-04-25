import {request} from '../request';
import {sendEmailInternal} from './internal';

/** Sends an email to the Cyph team. "@cyph.com" may be omitted from to. */
export const sendEmail = sendEmailInternal(request);
