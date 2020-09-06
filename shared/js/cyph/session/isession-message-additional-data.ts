import {
	ISessionChatState,
	ISessionCommand,
	ISessionText,
	ISessionTextConfirmation
} from '../proto/types';

/** Optional properties of ISessionMessageData. */
export interface ISessionMessageAdditionalData {
	/** @see ISessionMessageData.bytes */
	bytes?: Uint8Array;

	/** @see ISessionMessageData.chatState */
	chatState?: ISessionChatState;

	/** @see ISessionMessageData.command */
	command?: ISessionCommand;

	/** @see ISessionMessageData.id */
	id?: string;

	/** @see ISessionMessageData.text */
	text?: ISessionText;

	/** @see ISessionMessageData.textConfirmation */
	textConfirmation?: ISessionTextConfirmation;
}
