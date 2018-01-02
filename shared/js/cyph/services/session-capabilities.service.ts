import {Injectable} from '@angular/core';
import {ISessionCapabilities} from '../proto';
import {ISessionCapabilitiesService} from '../service-interfaces/isession-capabilities.service';
import {events, ISessionMessageData, rpcEvents} from '../session';
import {PotassiumService} from './crypto/potassium.service';
import {SessionService} from './session.service';


/** @inheritDoc */
@Injectable()
export class SessionCapabilitiesService implements ISessionCapabilitiesService {
	/** @ignore */
	private readonly remoteCapabilities: Promise<ISessionCapabilities>	=
		this.sessionService.one<ISessionMessageData>(rpcEvents.capabilities).then(o =>
			o.capabilities || {nativeCrypto: false, p2p: false}
		)
	;

	/** @ignore */
	private resolveCapabilities: (capabilities: ISessionCapabilities) => void;

	/** @inheritDoc */
	public readonly capabilities: Promise<ISessionCapabilities>			=
		new Promise<ISessionCapabilities>(resolve => {
			this.resolveCapabilities	= resolve;
		})
	;

	/** @inheritDoc */
	public readonly localCapabilities: Promise<ISessionCapabilities>	= (async () => {
		const p2p	= new Promise<boolean>(resolve => {
			this.resolveP2PSupport	= resolve;
		});

		return {
			nativeCrypto: await this.potassiumService.isNativeCryptoSupported(),
			p2p: await p2p
		};
	})();

	/** @inheritDoc */
	public resolveP2PSupport: (isSupported: boolean) => void;

	constructor (
		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly sessionService: SessionService
	) {
		this.sessionService.one(events.beginChat).then(async () => {
			const localCapabilities		= await this.localCapabilities;

			this.sessionService.send([rpcEvents.capabilities, {capabilities: localCapabilities}]);

			const remoteCapabilities	= await this.remoteCapabilities;

			this.resolveCapabilities({
				nativeCrypto: localCapabilities.nativeCrypto && remoteCapabilities.nativeCrypto,
				p2p: localCapabilities.p2p && remoteCapabilities.p2p
			});
		});
	}
}
