import {Injectable} from '@angular/core';
import {util} from '../util';
import {ThreadedPotassiumService} from './crypto/threaded-potassium.service';
import {SessionService} from './session.service';


/**
 * Overrides ThreadedPotassiumService.native() based on sessionService.apiFlags.nativeCrypto.
 * Not used at the moment because it resulted in a redundant thread being spawned.
 * TODO: Find better solution to re-enable native crypto API.
 */
@Injectable()
export class ChatPotassiumService extends ThreadedPotassiumService {
	/** @inheritDoc */
	public async native () : Promise<boolean> {
		return (await util.waitForValue(() => this.sessionService)).apiFlags.nativeCrypto;
	}

	constructor (
		/** @ignore */
		private readonly sessionService: SessionService
	) {
		super();
		this.sessionService.init(this);
	}
}
