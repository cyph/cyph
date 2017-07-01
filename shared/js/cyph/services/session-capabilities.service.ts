import {Injectable} from '@angular/core';
import {events, ICapabilities, Message, rpcEvents} from '../session';
import {PotassiumService} from './crypto/potassium.service';
import {SessionService} from './session.service';


/**
 * Establishes mutually shared capabilities between all parties of a session.
 */
@Injectable()
export class SessionCapabilitiesService {
	/** @ignore */
	private readonly remoteCapabilities: Promise<ICapabilities>	=
		this.sessionService.one<ICapabilities>(rpcEvents.capabilities)
	;

	/** @ignore */
	private resolveCapabilities: (capabilities: ICapabilities) => void;

	/** Mutual capabilities available for this session. */
	public readonly capabilities: Promise<ICapabilities>		=
		new Promise<ICapabilities>(resolve => {
			this.resolveCapabilities	= resolve;
		})
	;

	/** Locally supported capabilities. */
	public readonly localCapabilities: Promise<ICapabilities>	= (async () => {
		const p2p	= new Promise<boolean>(resolve => {
			this.resolveP2PSupport	= resolve;
		});

		return {
			nativeCrypto: await this.potassiumService.isNativeCryptoSupported(),
			p2p: await p2p
		};
	})();

	/** Set localCapabilities.p2p. */
	public resolveP2PSupport: (isSupported: boolean) => void;

	constructor (
		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly sessionService: SessionService
	) {
		this.sessionService.one(events.beginChat).then(async () => {
			const localCapabilities		= await this.localCapabilities;

			this.sessionService.send(new Message(rpcEvents.capabilities, localCapabilities));

			const remoteCapabilities	= await this.remoteCapabilities;

			this.resolveCapabilities({
				nativeCrypto: localCapabilities.nativeCrypto && remoteCapabilities.nativeCrypto,
				p2p: localCapabilities.p2p && remoteCapabilities.p2p
			});
		});
	}
}
