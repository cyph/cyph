import {Util} from '../util';
import {IMessage} from './imessage';


/** @inheritDoc */
export class Message implements IMessage {
	constructor (
		/** @inheritDoc */
		public readonly event: string = '',

		/** @inheritDoc */
		public readonly data?: any,

		/** @inheritDoc */
		public readonly id: string = Util.generateGuid()
	) {}
}
