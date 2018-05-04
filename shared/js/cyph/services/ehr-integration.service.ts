import {Injectable} from '@angular/core';
import {request, requestJSON, requestMaybeJSON} from '../util/request';
import {stringify} from '../util/serialization';
import {EnvService} from './env.service';


/**
 * Angular service for EHR/EMR system integration.
 */
@Injectable()
export class EHRIntegrationService {
	/** Uploads EHR credentials and returns master API key. */
	public async addCredentials (
		cyphAdminKey: string,
		redoxApiKey: string,
		redoxSecret: string,
		username: string
	) : Promise<string> {
		return request({
			data: {
				cyphAdminKey,
				redoxAPIKey: redoxApiKey,
				redoxSecret,
				username
			},
			method: 'PUT',
			url: this.envService.baseUrl + 'redox/credentials'
		});
	}

	/** Deletes an API key issued with this master API key. */
	public async deleteApiKey (apiKey: string, masterApiKey: string) : Promise<void> {
		await request({
			data: {
				apiKey,
				masterAPIKey: masterApiKey
			},
			method: 'POST',
			url: this.envService.baseUrl + 'redox/apikey/delete'
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
			url: this.envService.baseUrl + 'redox/apikey/generate'
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

	/** Verifies an API key. */
	public async verifyApiKey (apiKey: string) : Promise<{isMaster: boolean; isValid: boolean}> {
		const response	= await requestJSON({
			data: {
				apiKeyOrMasterAPIKey: apiKey
			},
			method: 'POST',
			url: this.envService.baseUrl + 'redox/apikey/verify'
		});

		return {
			isMaster: (response && response.isMaster) === true,
			isValid: (response && response.isValid) === true
		};
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {}
}
