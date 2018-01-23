import {Injectable} from '@angular/core';
import {ISessionCapabilities} from '../proto';
import {ISessionCapabilitiesService} from '../service-interfaces/isession-capabilities.service';
import {resolvable} from '../util/wait';
import {PotassiumService} from './crypto/potassium.service';


/** Accounts implementation of ISessionCapabilitiesService. */
@Injectable()
export class AccountSessionCapabilitiesService implements ISessionCapabilitiesService {
	/** @ignore */
	private readonly _P2P_SUPPORT	= resolvable<boolean>();

	/** @inheritDoc */
	public readonly capabilities: Promise<ISessionCapabilities>			= (async () => ({
		/* Note that for accounts we're checking whether the current Cyph environment *requires*
			native crypto, not simple whether the local browser supports it. */
		nativeCrypto: await this.potassiumService.native(),
		p2p: await this._P2P_SUPPORT.promise
	}))();

	/** @inheritDoc */
	public readonly localCapabilities: Promise<ISessionCapabilities>	= this.capabilities;

	/** @inheritDoc */
	public readonly resolveP2PSupport: (isSupported: boolean) => void	=
		this._P2P_SUPPORT.resolve
	;

	constructor (
		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
