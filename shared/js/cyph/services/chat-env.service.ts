import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {env} from '../env';
import {ISessionService} from '../service-interfaces/isession.service';
import {ConfigService} from './config.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {SessionInitService} from './session-init.service';


/**
 * Replaces a subset of the env service for the chat UI in certain cases.
 */
@Injectable()
export class ChatEnvService extends EnvService {
	/** @ignore */
	private readonly newCyphUrlHelperInternal	= memoize(
		(base: boolean, sessionService: ISessionService) : string => {
			const flags		=
				this.configService.apiFlags.map(flag =>
					flag.get(sessionService) ? flag.character : ''
				).join('')
			;

			const baseURL	= (
				this.callType === this.sessionInitService.callType ?
					undefined :
					this.sessionInitService.callType === 'audio' ?
						(base ? env.cyphAudioBaseUrl : env.cyphAudioUrl) :
						this.sessionInitService.callType === 'video' ?
							(base ? env.cyphVideoBaseUrl : env.cyphVideoUrl) :
							undefined
			) || (
				base ? env.newCyphBaseUrl : env.newCyphUrl
			);

			const divider	= baseURL.indexOf('#') < 0 ? '#' : '';

			return flags.length > 0 ? `${baseURL}${divider}${flags}` : baseURL;
		}
	);

	/** @ignore */
	private sessionService?: ISessionService;

	/** @ignore */
	private newCyphUrlHelper (base: boolean) : string {
		if (!this.configService || !this.sessionService) {
			return base ? env.newCyphBaseUrl : env.newCyphUrl;
		}
		else {
			return this.newCyphUrlHelperInternal(base, this.sessionService);
		}
	}

	/** EnvService.newCyphBaseUrl adjusted for session API flags and initial call type. */
	public get newCyphBaseUrl () : string {
		return this.newCyphUrlHelper(true);
	}

	/** @ignore */
	public set newCyphBaseUrl (_: string) {}

	/** EnvService.newCyphUrl adjusted for session API flags and initial call type. */
	public get newCyphUrl () : string {
		return this.newCyphUrlHelper(this.isOnion);
	}

	/** @ignore */
	public set newCyphUrl (_: string) {}

	constructor (
		localStorageService: LocalStorageService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService
	) {
		super(localStorageService);

		this.sessionInitService.sessionService.promise.then(sessionService => {
			this.sessionService	= sessionService;
		});
	}
}
