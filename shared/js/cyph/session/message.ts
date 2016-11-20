import {Util} from '../util';
import {IMessage} from './imessage';


/** @inheritDoc */
export class Message implements IMessage {
	constructor (
		/** @inheritDoc */
		public event: string = '',

		/** @inheritDoc */
		public data?: any,

		/** @inheritDoc */
		public id: string = Util.generateGuid()
	) {}
}
