import {Util} from '../util';
import {ITransfer} from './itransfer';


/** @inheritDoc */
export class Transfer implements ITransfer {
	constructor (
		/** @inheritDoc */
		public readonly name: string = '',

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
		public readonly id: string = Util.generateGuid(),

		/** @inheritDoc */
		public readonly answer: boolean = null
	) {}
}
