import {Observable} from 'rxjs';
import {AccountContactState, IAccountMessagingGroup} from '../proto/types';
import {IResolvable} from '../iresolvable';
import {User} from './user';

/** A contact list item. */
export interface IContactListItem {
	/** Anonymous user data. */
	anonymousUser?: {
		name: string;
	};

	/** @see IAccountContactState.state */
	contactState: Observable<AccountContactState.States>;

	/** Group messaging session data. */
	groupData?: {
		group: IAccountMessagingGroup;
		id: string;
		incoming: boolean;
	};

	/** @see User.unreadMessageCount */
	unreadMessageCount: Observable<number>;

	/** @see User */
	user: IResolvable<User | undefined>;

	/** @see User.username */
	username: string;
}
