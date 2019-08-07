import {MaybePromise} from '../maybe-promise-type';
import {IAccountFileRecord} from '../proto';
import {AccountFile} from './account-file-type';

type AccountFileShareInternal =
	| IAccountFileRecord
	| {data: AccountFile; metadata?: string; name: string}
	| undefined;

/** A file to be shared. */
export type AccountFileShare = MaybePromise<
	| AccountFileShareInternal
	| ((username: string) => MaybePromise<AccountFileShareInternal>)
>;
