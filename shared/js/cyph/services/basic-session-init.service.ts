import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {resolvable} from '../util/wait';
import {SessionInitService} from './session-init.service';

/**
 * Simplest possible SessionInitService implementation.
 */
@Injectable()
export class BasicSessionInitService extends BaseProvider
	implements SessionInitService {
	/** @ignore */
	private readonly _HEADLESS = resolvable<boolean>();

	/** @ignore */
	private readonly _ID = resolvable<string>();

	/** @ignore */
	private readonly _SALT = resolvable<string>();

	/** @inheritDoc */
	public callType?: 'audio' | 'video';

	/** @inheritDoc */
	public child: boolean = false;

	/** @inheritDoc */
	public readonly ephemeral: boolean = true;

	/** @inheritDoc */
	public readonly headless: Promise<boolean> = this._HEADLESS;

	/** @inheritDoc */
	public readonly id: Promise<string> = this._ID;

	/** @inheritDoc */
	public readonly salt: Promise<string | undefined> = this._SALT;

	/** Sets ID. */
	public setID (id: string, salt?: string, headless: boolean = false) : void {
		this._HEADLESS.resolve(headless);
		this._ID.resolve(id);
		this._SALT.resolve(salt);
	}

	/** @inheritDoc */
	public spawn (child: boolean = true) : BasicSessionInitService {
		const sessionInitService = new BasicSessionInitService();
		sessionInitService.child = child;
		return sessionInitService;
	}

	constructor () {
		super();
	}
}
