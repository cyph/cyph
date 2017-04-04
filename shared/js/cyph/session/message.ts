import {util} from '../util';
import {users} from './enums';
import {IMessage} from './imessage';
import {IMessageData} from './imessage-data';


/** @inheritDoc */
export class Message implements IMessage {
	/** @inheritDoc */
	public readonly data: IMessageData;

	constructor (
		/** @inheritDoc */
		public readonly event: string = '',

		data?: any
	) {
		this.data		= typeof data === 'object' ? data : {};
		this.data.id	= util.generateGuid();

		if (!this.data.author) {
			this.data.author	= users.me;
		}
	}
}
