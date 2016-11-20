import {Util} from '../util';
import {IMessage} from './imessage';


export class Message implements IMessage {
	/**
	 * @param event
	 * @param data
	 * @param id
	 */
	constructor (
		public event: string = '',
		public data?: any,
		public id: string = Util.generateGuid()
	) {}
}
