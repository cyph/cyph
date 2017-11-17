import {
	ISessionCapabilities,
	ISessionChatState,
	ISessionCommand,
	ISessionText,
	ISessionTextConfirmation,
	ISessionTransfer
} from '../proto';


/** Optional properties of ISessionMessageData. */
export interface ISessionMessageAdditionalData {
	/** @see ISessionMessageData.bytes */
	bytes?: Uint8Array;

	/** @see ISessionMessageData.capabilities */
	capabilities?: ISessionCapabilities;

	/** @see ISessionMessageData.chatState */
	chatState?: ISessionChatState;

	/** @see ISessionMessageData.command */
	command?: ISessionCommand;

	/** @see ISessionMessageData.text */
	text?: ISessionText;

	/** @see ISessionMessageData.textConfirmation */
	textConfirmation?: ISessionTextConfirmation;

	/** @see ISessionMessageData.transfer */
	transfer?: ISessionTransfer;
}
