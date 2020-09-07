import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {resolvable} from '../util/wait';

/**
 * Provides ID for initiating new Session.
 */
@Injectable()
export class SessionInitService extends BaseProvider {
	/** If set, indicates an initial call type for the session. */
	public readonly callType?: 'audio' | 'video';

	/** Indicates whether or not this is a child of another session (i.e. a group member). */
	public child: boolean = false;

	/** Indicates whether or not this is an ephemeral session. */
	public readonly ephemeral: boolean = false;

	/** Names of all members of the ephemeral group (if applicable). */
	public readonly ephemeralGroupMemberNames: IResolvable<
		string[]
	> = resolvable();

	/** Indicates whether or not ephemeral groups are allowed. */
	public ephemeralGroupsAllowed: boolean = true;

	/** Indicates whether or not this is a headless/automated session. */
	public readonly headless: Promise<boolean> = Promise.resolve(false);

	/** ID for initiating new Session. */
	public readonly id: Promise<string> = Promise.resolve('');

	/** Appended to ID as part of the shared secret. */
	public readonly salt: Promise<string | undefined> = Promise.resolve(
		undefined
	);

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
