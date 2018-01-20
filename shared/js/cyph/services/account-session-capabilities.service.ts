import {Injectable} from '@angular/core';
import {ISessionCapabilities} from '../proto';
import {ISessionCapabilitiesService} from '../service-interfaces/isession-capabilities.service';


/** Accounts implementation of ISessionCapabilitiesService. */
@Injectable()
export class AccountSessionCapabilitiesService implements ISessionCapabilitiesService {
	/** @inheritDoc */
	public readonly capabilities: Promise<ISessionCapabilities>			= (async () => {
		const p2p	= new Promise<boolean>(resolve => {
			this.resolveP2PSupport	= resolve;
		});

		return {
			nativeCrypto: false,
			p2p: await p2p
		};
	})();

	/** @inheritDoc */
	public readonly localCapabilities: Promise<ISessionCapabilities>	= this.capabilities;

	/** @inheritDoc */
	public resolveP2PSupport: (isSupported: boolean) => void			= () => {};

	constructor () {}
}
