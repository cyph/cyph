import {ITransfer} from 'itransfer';


export class Transfer implements ITransfer {
	public constructor (
		public name: string,
		public size: number,
		public key: Uint8Array,
		public isOutgoing: boolean = true,
		public url: string = '',
		public percentComplete: number = 0
	) {}
}
