import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {env} from '../env';
import {IResolvable} from '../iresolvable';
import {ISessionService} from '../service-interfaces/isession.service';
import {resolvable} from '../util/wait';
import {SessionInitService} from './session-init.service';


/**
 * SessionInitService implementation that gets ID from URL.
 */
@Injectable()
export class UrlSessionInitService implements SessionInitService {
	/** @inheritDoc */
	public readonly callType?: 'audio'|'video';

	/** @inheritDoc */
	public readonly ephemeral: boolean	= true;

	/** @inheritDoc */
	public readonly id: string;

	/** @inheritDoc */
	public readonly sessionService: IResolvable<ISessionService>	= resolvable();

	constructor (router: Router) {
		const urlSegmentPaths	=
			router.routerState.snapshot.root.firstChild ?
				router.routerState.snapshot.root.firstChild.url.map(o => o.path) :
				[]
		;

		this.callType	=
			urlSegmentPaths[0] === 'audio' ?
				'audio' :
				urlSegmentPaths[0] === 'video' ?
					'video' :
					undefined
		;

		this.id	= urlSegmentPaths[this.callType ? 1 : 0] || '';

		if (!this.callType) {
			this.callType	= env.callType;
		}
	}
}
