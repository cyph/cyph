import {User} from './user';


/** A contact list item. */
export interface IContactListItem {
	/** @see User */
	user: Promise<User|undefined>;

	/** @see User.username */
	username: string;
}
