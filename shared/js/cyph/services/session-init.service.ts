import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {ISessionService} from '../service-interfaces/isession.service';
import {resolvable} from '../util/wait';

/**
 * Provides ID for initiating new Session.
 */
@Injectable()
export class SessionInitService extends BaseProvider {
	/** If set, indicates an initial call type for the session. */
	public readonly callType?: 'audio' | 'video';

	/** Indicates whether or not this is an ephemeral session. */
	public readonly ephemeral: boolean = true;

	/** ID for initiating new Session. */
	public readonly id: Promise<string> = Promise.resolve('');

	/** Appended to ID as part of the shared secret. */
	public readonly salt: Promise<string | undefined> = Promise.resolve(
		undefined
	);

	/** @see ISessionService */
	public readonly sessionService: IResolvable<ISessionService> = resolvable();

	/** Creates and returns a new instance. */
	public spawn () : SessionInitService {
		return new SessionInitService();
	}

	constructor () {
		super();
	}
}
