import {Observable} from 'rxjs';
import {ListHoleError} from '../list-hole-error';
import {IChatMessage} from '../proto';
import {UiStyles} from './enums';

/** One item in the message list UI. */
export interface IMessageListItem {
	/** @see ChatMessageListComponent.accounts */
	accounts: boolean;

	/** Human-readable change in date. */
	dateChange: Observable<string | undefined>;

	/** Indicates whether this is the last message. */
	isEnd: boolean;

	/** @see IChatData.isFriendTyping */
	isFriendTyping: Observable<boolean>;

	/** Indicates whether this is the first message. */
	isStart: boolean;

	/** @see IChatMessage */
	message?: IChatMessage | ListHoleError | string;

	/** @see ChatMessageListComponent.mobile */
	mobile: boolean;

	/** @see ChatMessageListComponent.persistentEndMessage */
	persistentEndMessage: boolean;

	/** Indicates whether message should be scrolled into view and used to end spinner. */
	scrollIntoView: boolean;

	/** @see ChatMessageListComponent.showDisconnectMessage */
	showDisconnectMessage: boolean;

	/** @see ChatMainComponent.uiStyle */
	uiStyle: UiStyles;

	/** @see IChatData.unconfirmedMessages */
	unconfirmedMessages: Observable<
		{[id: string]: boolean | undefined} | undefined
	>;
}
