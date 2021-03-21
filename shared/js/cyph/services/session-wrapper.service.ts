import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {ISessionService} from '../service-interfaces/isession.service';
import {resolvable} from '../util/wait/resolvable';

/**
 * Wraps SessionService.
 */
@Injectable()
export class SessionWrapperService extends BaseProvider {
	/** @see ISessionService */
	public readonly sessionService: IResolvable<ISessionService> = resolvable();

	/** Creates and returns a new instance. */
	public spawn () : SessionWrapperService {
		return new SessionWrapperService();
	}

	constructor () {
		super();
	}
}
