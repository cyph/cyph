import {UserPresence} from './user-presence';
import {userPresenceSorted} from './user-presence-sorted';


/** String representations of UserPresence values in sorting order for UI. */
export const userPresenceSortedStrings: string[]	=
	userPresenceSorted.map(up => UserPresence[up])
;
