import {Observable} from 'rxjs';
import {User} from './user';


/** A contact list item. */
export interface IContactListItem {
	/** @see User.unreadMessageCount */
	unreadMessageCount: Observable<number>;

	/** @see User */
	user: Promise<User|undefined>;

	/** @see User.username */
	username: string;
}
