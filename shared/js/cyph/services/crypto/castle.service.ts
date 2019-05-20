import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {take} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {IPairwiseSession} from '../../crypto/castle/ipairwise-session';
import {ICastle} from '../../crypto/icastle';
import {filterUndefinedOperator} from '../../util/filter';
import {lockFunction} from '../../util/lock';
import {SessionService} from '../session.service';


/**
 * @see ICastle
 */
@Injectable()
export class CastleService extends BaseProvider implements ICastle {
	/** @ignore */
	protected readonly pairwiseSession		=
		new BehaviorSubject<IPairwiseSession|undefined>(undefined)
	;

	/** @ignore */
	protected readonly pairwiseSessionLock	= lockFunction();

	/** @ignore */
	protected async getPairwiseSession () : Promise<IPairwiseSession> {
		if (this.pairwiseSession.value) {
			return this.pairwiseSession.value;
		}

		return this.pairwiseSessionLock(async () =>
			this.pairwiseSession.pipe(filterUndefinedOperator(), take(1)).toPromise()
		);
	}

	/** Initializes service. */
	public async init (_SESSION_SERVICE: SessionService) : Promise<void> {
		throw new Error('Must provide an implementation of CastleService.init.');
	}

	/** @see PairwiseSession.initialMessagesDecrypted */
	public async initialMessagesDecrypted () : Promise<void> {
		return (await this.getPairwiseSession()).initialMessagesDecrypted.promise;
	}

	/** @inheritDoc */
	public async receive (cyphertext: Uint8Array) : Promise<void> {
		return (await this.getPairwiseSession()).receive(cyphertext);
	}

	/** @inheritDoc */
	public async send (plaintext: string|ArrayBufferView, timestamp: number) : Promise<void> {
		return (await this.getPairwiseSession()).send(plaintext, timestamp);
	}

	/** Creates and returns a new instance. */
	public spawn () : CastleService {
		return new CastleService();
	}

	constructor () {
		super();
	}
}
