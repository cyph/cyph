import {Util} from '../util';
import {Users} from './enums';
import {IMessageData} from './imessagedata';


/**
 * Contains an RPC call for a specific method.
 */
export class Command implements IMessageData {
	constructor (
		/** Method identifier. */
		public readonly method: string = '',

		/** Argument to pass to method. */
		public readonly argument: any = '',

		/** @inheritDoc */
		public readonly author: string = Users.me,

		/** @inheritDoc */
		public readonly timestamp: number = Util.timestamp()
	) {}
}
