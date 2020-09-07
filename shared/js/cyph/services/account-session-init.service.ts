import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {resolvable} from '../util/wait';
import {SessionInitService} from './session-init.service';

/**
 * SessionInitService implementation for accounts.
 */
@Injectable()
export class AccountSessionInitService extends BaseProvider
	implements SessionInitService {
	/** @inheritDoc */
	public callType?: 'audio' | 'video';

	/** @inheritDoc */
	public child: boolean = false;

	/** @inheritDoc */
	public ephemeral: boolean = false;

	/** @inheritDoc */
	public readonly ephemeralGroupMemberNames: IResolvable<
		string[]
	> = resolvable();

	/** @inheritDoc */
	public ephemeralGroupsAllowed: boolean = true;

	/** @inheritDoc */
	public readonly headless: Promise<boolean> = Promise.resolve(false);

	/** @inheritDoc */
	public readonly id: Promise<string> = Promise.resolve('');

	/** @inheritDoc */
	public readonly salt: Promise<string | undefined> = Promise.resolve(
		undefined
	);

	/** @inheritDoc */
	public spawn (child: boolean = true) : AccountSessionInitService {
		const sessionInitService = new AccountSessionInitService();
		sessionInitService.child = child;
		return sessionInitService;
	}

	constructor () {
		super();
	}
}
