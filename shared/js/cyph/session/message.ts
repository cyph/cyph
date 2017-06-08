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
		this.data	= {
			author: users.me,
			id: util.uuid()
		};

		if (!data) {
			return;
		}

		for (const k of Object.keys(data)) {
			if (k === 'author' || k === 'id' || k === 'timestamp') {
				continue;
			}

			(<any> this.data)[k]	= data[k];
		}
	}
}
