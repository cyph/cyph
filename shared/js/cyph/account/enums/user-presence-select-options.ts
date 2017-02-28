import {UserPresence} from './user-presence';
import {userPresenceSorted} from './user-presence-sorted';


/** UserPresence values in sorting order for UI, formatted for a select dropdown. */
export const userPresenceSelectOptions: {text: string; value: UserPresence}[]	=
	userPresenceSorted.map(up => ({
		text: UserPresence[up][0].toUpperCase() + UserPresence[up].slice(1),
		value: up
	}))
;
