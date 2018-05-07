import {MaybePromise} from '../maybe-promise-type';
import {IAccountFileRecord} from '../proto';
import {AccountFile} from './account-file-type';


/** A file to be shared. */
export type AccountFileShare	= MaybePromise<
	IAccountFileRecord|
	{data: AccountFile; name: string}|
	undefined|
	((username: string) => MaybePromise<
		IAccountFileRecord|
		{data: AccountFile; name: string}|
		undefined
	>)
>;
