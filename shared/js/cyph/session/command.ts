import {users} from './enums';
import {IMessageData} from './imessage-data';


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
		public readonly author: string = users.me,

		/** @inheritDoc */
		public readonly timestamp?: number
	) {}
}
