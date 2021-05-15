import {Injectable} from '@angular/core';
import {UserLike} from '../account';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {IBurnerGroupMemberInitiator} from '../proto';
import {resolvable} from '../util/wait/resolvable';
import {SessionInitService} from './session-init.service';

/**
 * SessionInitService implementation for accounts.
 */
@Injectable()
export class AccountSessionInitService
	extends BaseProvider
	implements SessionInitService
{
	/** @inheritDoc */
	public accountsBurnerAliceData?: {
		passive: boolean;
		remoteUser?: UserLike;
		username: string;
	};

	/** @inheritDoc */
	public callType?: 'audio' | 'video';

	/** @inheritDoc */
	public child: boolean = false;

	/** @inheritDoc */
	public ephemeral: boolean = false;

	/** @inheritDoc */
	public readonly ephemeralGroupMembers: IResolvable<
		IBurnerGroupMemberInitiator[]
	> = resolvable();

	/** @inheritDoc */
	public ephemeralGroupsAllowed: boolean = true;

	/** @inheritDoc */
	public readonly headless: Promise<boolean> = Promise.resolve(false);

	/** @inheritDoc */
	public readonly id: Promise<string> = Promise.resolve('');

	/** @inheritDoc */
	public readonly joinConfirmation: Promise<boolean> = Promise.resolve(true);

	/** @inheritDoc */
	public readonly salt: Promise<string | undefined> =
		Promise.resolve(undefined);

	/** @inheritDoc */
	public timeString?: string;

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
