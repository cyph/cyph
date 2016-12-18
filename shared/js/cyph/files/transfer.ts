import {users} from '../session/enums';
import {util} from '../util';
import {ITransfer} from './itransfer';


/** @inheritDoc */
export class Transfer implements ITransfer {
	constructor (
		/** @inheritDoc */
		public readonly name: string = '',

		/** @inheritDoc */
		public readonly fileType: string = '',

		/** @inheritDoc */
		public readonly image: boolean = false,

		/** @inheritDoc */
		public readonly imageSelfDestructTimeout: number = 0,

		/** @inheritDoc */
		public readonly size: number = 0,

		/** @inheritDoc */
		public readonly key: Uint8Array = new Uint8Array(0),

		/** @inheritDoc */
		public readonly isOutgoing: boolean = true,

		/** @inheritDoc */
		public readonly url: string = '',

		/** @inheritDoc */
		public readonly percentComplete: number = 0,

		/** @inheritDoc */
		public readonly id: string = util.generateGuid(),

		/** @inheritDoc */
		public readonly answer: boolean = undefined,

		/** @inheritDoc */
		public readonly author: string = users.me,

		/** @inheritDoc */
		public readonly timestamp: number = util.timestamp()
	) {}
}
