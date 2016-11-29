import {Util} from '../util';
import {Users} from './enums';
import {IMessage} from './imessage';
import {IMessageData} from './imessagedata';


/** @inheritDoc */
export class Message implements IMessage {
	/** @inheritDoc */
	public readonly data: IMessageData;

	constructor (
		/** @inheritDoc */
		public readonly event: string = '',

		data?: any,

		/** @inheritDoc */
		public readonly id: string = Util.generateGuid()
	) {
		this.data			= typeof data === 'object' ? data : {};

		if (!this.data.author) {
			this.data.author	= Users.me;
		}

		if (isNaN(this.data.timestamp)) {
			this.data.timestamp	= Util.timestamp();
		}
	}
}
