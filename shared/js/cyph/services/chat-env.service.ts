import {Injectable} from '@angular/core';
import {env} from '../env';
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
	private newCyphUrlHelper (base: boolean) : string {
		if (!this.configService) {
			return base ? env.newCyphBaseUrl : env.newCyphUrl;
		}

		return (
			this.sessionInitService.callType === 'video' ?
				(
					this.environment.customBuild &&
					this.environment.customBuild.config.callTypeVideo
				) ?
					undefined :
					base ?
						env.cyphVideoBaseUrl :
						env.cyphVideoUrl
				:
				this.sessionInitService.callType === 'audio' ?
					(
						this.environment.customBuild &&
						this.environment.customBuild.config.callTypeAudio
					) ?
						undefined :
						base ?
							env.cyphAudioBaseUrl :
							env.cyphAudioUrl
					:
					undefined
		) || (
			base ? env.newCyphBaseUrl : env.newCyphUrl
		);
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
	}
}
