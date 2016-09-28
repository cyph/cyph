import {IMessage} from 'imessage';
import {Util} from 'cyph/util';


export class Message implements IMessage {
	/**
	 * @param event
	 * @param data
	 * @param id
	 * @param selfDestruct
	 */
	public constructor(
		public event: string = '',
		public data?: any,
		public selfDestruct?: boolean,
		public id: string = Util.generateGuid()

	) {}
}
