import {Injectable} from '@angular/core';
import {UserLike} from '../account';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {IBurnerGroupMemberInitiator} from '../proto';
import {resolvable} from '../util/wait/resolvable';

/**
 * Provides ID for initiating new Session.
 */
@Injectable()
export class SessionInitService extends BaseProvider {
	/** Data used if this is the registered user's end of an Accounts-Burner session. */
	public accountsBurnerAliceData?: {
		passive: boolean;
		remoteUser?: UserLike;
		username: string;
	};

	/** If set, indicates an initial call type for the session. */
	public readonly callType?: 'audio' | 'video';

	/** Indicates whether or not this is a child of another session (i.e. a group member). */
	public child: boolean = false;

	/** Indicates whether or not this is an ephemeral session. */
	public readonly ephemeral: boolean = false;

	/** Names of all members of the ephemeral group (if applicable). */
	public readonly ephemeralGroupMembers: IResolvable<
		IBurnerGroupMemberInitiator[]
	> = resolvable();

	/** Indicates whether or not ephemeral groups are allowed. */
	public ephemeralGroupsAllowed: boolean = true;

	/** Indicates whether or not this is a headless/automated session. */
	public readonly headless: Promise<boolean> = Promise.resolve(false);

	/** ID for initiating new Session. */
	public readonly id: Promise<string> = Promise.resolve('');

	/** Indicates whether or not a confirmation dialog should be displayed before joining. */
	public readonly joinConfirmation: Promise<boolean> = Promise.resolve(false);

	/** ID of parent session (if applicable). */
	public parentID?: string;

	/** Appended to ID as part of the shared secret. */
	public readonly salt: Promise<string | undefined> = Promise.resolve(
		undefined
	);

	/** @see IBurnerSession.timeString */
	public readonly timeString?: string;

	/** Creates and returns a new instance. */
	public spawn (child: boolean = false) : SessionInitService {
		const sessionInitService = new SessionInitService();
		sessionInitService.child = child;
		return sessionInitService;
	}

	constructor () {
		super();
	}
}
