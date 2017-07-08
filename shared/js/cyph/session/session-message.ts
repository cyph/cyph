import {
	ISessionCapabilities,
	ISessionChatState,
	ISessionCommand,
	ISessionMessage,
	ISessionMessageData,
	ISessionText,
	ISessionTextConfirmation,
	ISessionTransfer
} from '../../proto';
import {util} from '../util';
import {users} from './enums';


/** @inheritDoc */
export class SessionMessage implements ISessionMessage {
	/** @inheritDoc */
	public readonly data: ISessionMessageData	= {
		author: users.me,
		id: util.uuid(),
		timestamp: NaN
	};

	constructor (
		/** @inheritDoc */
		public readonly event: string = '',

		additionalData?: {
			bytes?: Uint8Array,
			capabilities?: ISessionCapabilities,
			chatState?: ISessionChatState,
			command?: ISessionCommand,
			text?: ISessionText,
			textConfirmation?: ISessionTextConfirmation,
			transfer?: ISessionTransfer
		}
	) {
		if (!additionalData) {
			return;
		}

		this.data.bytes				= additionalData.bytes;
		this.data.capabilities		= additionalData.capabilities;
		this.data.chatState			= additionalData.chatState;
		this.data.command			= additionalData.command;
		this.data.text				= additionalData.text;
		this.data.textConfirmation	= additionalData.textConfirmation;
		this.data.transfer			= additionalData.transfer;
	}
}
