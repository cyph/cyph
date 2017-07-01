import {users} from '../session/enums';
import {IMessageData} from '../session/imessage-data';
import {util} from '../util';


/**
 * Represents an active file transfer.
 */
export class Transfer implements IMessageData {
	constructor (
		/** File name. */
		public readonly name: string = '',

		/** MIME type. */
		public readonly mediaType: string = '',

		/** Indicates whether file should be handled as an image. */
		public readonly image: boolean = false,

		/** If image is true, this will be used as a self-destruct timeout for the message. */
		public readonly imageSelfDestructTimeout: number = 0,

		/** File size in bytes (e.g. 3293860). */
		public readonly size: number = 0,

		/** Symmetric key used for encrypting file over the wire. */
		public readonly key: Uint8Array = new Uint8Array(0),

		/** Indicates whether file is being sent from this Cyph instance. */
		public isOutgoing: boolean = true,

		/** File URL. */
		public url: string = '',

		/** Unique ID to represent this file transfer. */
		public readonly transferId: string = util.uuid(),

		/** If defined, indicates an acceptance or rejection of a file transfer. */
		/* tslint:disable-next-line:no-unnecessary-initializer */
		public answer: boolean|undefined = undefined,

		/** Indicates the time at which the file was received. */
		public receiptTimestamp?: number,

		/** @inheritDoc */
		public author: string = users.me,

		/** @inheritDoc */
		public id?: string,

		/** @inheritDoc */
		public timestamp?: number
	) {}
}
