import {Injectable} from '@angular/core';
import {request, requestMaybeJSON} from '../util/request';
import {stringify} from '../util/serialization';
import {EnvService} from './env.service';


/**
 * Angular service for EHR/EMR system integration.
 */
@Injectable()
export class EHRService {
	/** Deletes an API key issued with this master API key. */
	public async deleteApiKey (apiKey: string, masterApiKey: string) : Promise<void> {
		await request({
			data: {
				apiKey,
				masterAPIKey: masterApiKey
			},
			method: 'POST',
			url: this.envService.baseUrl + 'redox/deleteapikey'
		});
	}

	/** Generates a new API key for the specified user using a master API key. */
	public async generateApiKey (username: string, masterApiKey: string) : Promise<string> {
		return request({
			data: {
				masterAPIKey: masterApiKey,
				username
			},
			method: 'POST',
			url: this.envService.baseUrl + 'redox/newapikey'
		});
	}

	/** Runs a command against the EHR system integration. */
	public async runCommand (apiKey: string, command: any) : Promise<any> {
		return requestMaybeJSON({
			data: {
				apiKeyOrMasterAPIKey: apiKey,
				redoxCommand: stringify(command)
			},
			method: 'POST',
			url: this.envService.baseUrl + 'redox/execute'
		});
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {}
}
