import {Observable} from 'rxjs';
import {IAccountMessagingGroup} from '../proto';
import {User} from './user';


/** A contact list item. */
export interface IContactListItem {
	/** Group messaging session data. */
	groupData?: {
		group: IAccountMessagingGroup;
		id: string;
		incoming: boolean;
	};

	/** @see User.unreadMessageCount */
	unreadMessageCount: Observable<number>;

	/** @see User */
	user: Promise<User|undefined>;

	/** @see User.username */
	username: string;
}
