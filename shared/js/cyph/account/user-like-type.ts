import {Observable} from 'rxjs';
import {User} from './user';


/** Type representing either a User object or something similar. */
export type UserLike	=
	{
		anonymous: true;
		contactID: undefined;
		name: undefined;
		pseudoAccount: false;
		username: undefined;
	}|
	{
		anonymous: false;
		contactID: Promise<string>;
		name: Observable<string>;
		pseudoAccount: true;
		username: string;
	}|
	User
;
