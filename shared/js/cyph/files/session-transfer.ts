import {Observable} from 'rxjs';
import {uuid} from '../util/uuid';
import {ISessionTransfer} from './isession-transfer';
import {SessionTransferAnswers} from './session-transfer-answers';


/** @inheritDoc */
export class SessionTransfer implements ISessionTransfer {
	constructor (
		/** @inheritDoc */
		public author: Observable<string>,

		/** @inheritDoc */
		public readonly name: string = '',

		/** @inheritDoc */
		public readonly mediaType: string = '',

		/** @inheritDoc */
		public readonly image: boolean = false,

		/** @inheritDoc */
		public readonly imageSelfDestructTimeout: number = 0,

		/** @inheritDoc */
		public readonly size: number = 0,

		/** @inheritDoc */
		public readonly key: Uint8Array = new Uint8Array(0),

		/** @inheritDoc */
		public isOutgoing: boolean = true,

		/** @inheritDoc */
		public readonly url: string = '',

		/** @inheritDoc */
		public readonly id: string = uuid(),

		/** @inheritDoc */
		public answer: SessionTransferAnswers = SessionTransferAnswers.Empty,

		/** @inheritDoc */
		public receiptTimestamp?: number
	) {}
}
