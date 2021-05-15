import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {UserLike} from '../account';
import {BaseProvider} from '../base-provider';
import {env} from '../env';
import {IResolvable} from '../iresolvable';
import {IBurnerGroupMemberInitiator} from '../proto';
import {resolvable} from '../util/wait/resolvable';
import {SessionInitService} from './session-init.service';

/**
 * SessionInitService implementation that gets ID from URL.
 */
@Injectable()
export class UrlSessionInitService
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
	public readonly callType?: 'audio' | 'video';

	/** @inheritDoc */
	public child: boolean = false;

	/** @inheritDoc */
	public readonly ephemeral: boolean = true;

	/** @inheritDoc */
	public readonly ephemeralGroupMembers: IResolvable<
		IBurnerGroupMemberInitiator[]
	> = resolvable();

	/** @inheritDoc */
	public ephemeralGroupsAllowed: boolean = true;

	/** @inheritDoc */
	public readonly headless: Promise<boolean> = Promise.resolve(false);

	/** @inheritDoc */
	public readonly id: Promise<string>;

	/** @inheritDoc */
	public readonly joinConfirmation: Promise<boolean> = Promise.resolve(true);

	/** @inheritDoc */
	public parentID?: string;

	/** @inheritDoc */
	public readonly salt: Promise<string | undefined> =
		Promise.resolve(undefined);

	/** @inheritDoc */
	public readonly timeString?: string;

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

		const [id, timeString] = urlSegmentPaths
			.slice(this.callType ? 1 : 0)
			.join('/')
			.split('.');

		if (timeString) {
			this.timeString = timeString;
		}

		this.id = Promise.resolve(id);

		if (!this.callType) {
			this.callType = env.callType;
		}
	}
}
