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

		data?: any,

		/** @inheritDoc */
		public readonly id: string = util.generateGuid()
	) {
		this.data	= typeof data === 'object' ? data : {};

		if (!this.data.author) {
			this.data.author	= users.me;
		}
	}
}
