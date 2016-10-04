import {ITransfer} from './itransfer';
import {Util} from '../util';


export class Transfer implements ITransfer {
	public constructor (
		public name: string = '',
		public size: number = 0,
		public key: Uint8Array = new Uint8Array(0),
		public isOutgoing: boolean = true,
		public url: string = '',
		public percentComplete: number = 0,
		public id: string = Util.generateGuid(),
		public answer: boolean = null
	) {}
}
