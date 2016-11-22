import {Util} from '../util';
import {ITransfer} from './itransfer';


/** @inheritDoc */
export class Transfer implements ITransfer {
	constructor (
		/** @inheritDoc */
		public name: string = '',

		/** @inheritDoc */
		public size: number = 0,

		/** @inheritDoc */
		public key: Uint8Array = new Uint8Array(0),

		/** @inheritDoc */
		public isOutgoing: boolean = true,

		/** @inheritDoc */
		public url: string = '',

		/** @inheritDoc */
		public percentComplete: number = 0,

		/** @inheritDoc */
		public id: string = Util.generateGuid(),

		/** @inheritDoc */
		public answer: boolean = null
	) {}
}
