import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {BaseProvider} from '../base-provider';
import {env} from '../env';
import {SessionInitService} from './session-init.service';

/**
 * SessionInitService implementation that gets ID from URL.
 */
@Injectable()
export class UrlSessionInitService extends BaseProvider
	implements SessionInitService {
	/** @inheritDoc */
	public readonly callType?: 'audio' | 'video';

	/** @inheritDoc */
	public child: boolean = false;

	/** @inheritDoc */
	public readonly ephemeral: boolean = true;

	/** @inheritDoc */
	public readonly headless: Promise<boolean> = Promise.resolve(true);

	/** @inheritDoc */
	public readonly id: Promise<string>;

	/** @inheritDoc */
	public readonly salt: Promise<string | undefined> = Promise.resolve(
		undefined
	);

	/** @inheritDoc */
	public spawn (child: boolean = true) : UrlSessionInitService {
		const sessionInitService = new UrlSessionInitService(this.router);
		sessionInitService.child = child;
		return sessionInitService;
	}

	constructor (
		/** @ignore */
		private readonly router: Router
	) {
		super();

		const urlSegmentPaths = this.router.routerState.snapshot.root
			.firstChild ?
			(
				this.router.routerState.snapshot.root.firstChild.firstChild ||
				this.router.routerState.snapshot.root.firstChild
			).url.map(o => o.path) :
			[];

		this.callType =
			urlSegmentPaths[0] === 'audio' ?
				'audio' :
			urlSegmentPaths[0] === 'video' ?
				'video' :
				undefined;

		this.id = Promise.resolve(
			urlSegmentPaths.slice(this.callType ? 1 : 0).join('/')
		);

		if (!this.callType) {
			this.callType = env.callType;
		}
	}
}
