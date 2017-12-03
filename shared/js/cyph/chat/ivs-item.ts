import {Observable} from 'rxjs/Observable';
import {ChatMessage} from './chat-message';


/** One item in the message list virtual scrolling UI. */
export interface IVsItem {
	/** @see ChatMessageListComponent.accounts */
	accounts: boolean;

	/** Indicates whether this is the last message. */
	isEnd: boolean;

	/** @see IChatData.isFriendTyping */
	isFriendTyping: Observable<boolean>;

	/** Indicates whether this is the first message. */
	isStart: boolean;

	/** @see ChatMessage */
	message: ChatMessage;

	/** @see ChatMessageListComponent.mobile */
	mobile: boolean;

	/** @see ChatMessageListComponent.showDisconnectMessage */
	showDisconnectMessage: boolean;

	/** @see IChatData.unconfirmedMessages */
	unconfirmedMessages: Observable<{[id: string]: boolean|undefined}>;
};
