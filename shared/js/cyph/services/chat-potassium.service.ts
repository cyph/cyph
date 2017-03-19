import {Injectable} from '@angular/core';
import {util} from '../util';
import {AnonymousCastleService} from './crypto/anonymous-castle.service';
import {ThreadedPotassiumService} from './crypto/threaded-potassium.service';
import {SessionService} from './session.service';


/**
 * Overrides ThreadedPotassiumService.native() based on sessionService.apiFlags.nativeCrypto.
 */
@Injectable()
export class ChatPotassiumService extends ThreadedPotassiumService {
	/** @inheritDoc */
	public async native () : Promise<boolean> {
		return (await util.waitForValue(() => this.sessionService)).apiFlags.nativeCrypto;
	}

	constructor (
		anonymousCastleService: AnonymousCastleService,

		/** @ignore */
		private readonly sessionService: SessionService
	) {
		super();
		anonymousCastleService.init(this, this.sessionService);
	}
}
