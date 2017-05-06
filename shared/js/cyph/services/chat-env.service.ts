import {Injectable} from '@angular/core';
import {env} from '../env';
import {ConfigService} from './config.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {SessionInitService} from './session-init.service';
import {SessionService} from './session.service';


/**
 * Replaces a subset of the env service for the chat UI in certain cases.
 */
@Injectable()
export class ChatEnvService extends EnvService {
	/** @ignore */
	private newCyphUrlHelper (base: boolean) : string {
		if (!this.configService) {
			return base ? env.newCyphBaseUrl : env.newCyphUrl;
		}

		const flags		=
			this.configService.apiFlags.map(flag =>
				customBuildApiFlags && customBuildApiFlags.indexOf(flag.character) > -1 ?
					'' :
					flag.get(this.sessionService)
			).join('')
		;

		const baseUrl	=
			(
				customBuildCallType === this.sessionInitService.callType ?
					undefined :
					this.sessionInitService.callType === 'audio' ?
						(base ? env.cyphAudioBaseUrl : env.cyphAudioUrl) :
						this.sessionInitService.callType === 'video' ?
							(base ? env.cyphVideoBaseUrl : env.cyphVideoUrl) :
							undefined
			) ||
				(base ? env.newCyphBaseUrl : env.newCyphUrl)
		;

		const divider	= baseUrl.indexOf('#') < 0 ? '#' : '';

		return flags.length > 0 ? `${baseUrl}${divider}${flags}` : baseUrl;
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

	/** @inheritDoc */
	public get newCyphUrlRedirect () : string {
		const newCyphUrl	= this.newCyphUrlHelper(false);
		return newCyphUrl.indexOf(`${locationData.host}/#`) > -1 ? `${newCyphUrl}/` : newCyphUrl;
	}

	/** @ignore */
	public set newCyphUrlRedirect (_: string) {}

	constructor (
		localStorageService: LocalStorageService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService
	) {
		super(localStorageService);
	}
}
