import {Injectable} from '@angular/core';
import {RedoxAppointment, RedoxPatient, RedoxTypes} from '../proto';
import {deserialize, serialize} from '../util/serialization';
import {EHRIntegrationService} from './ehr-integration.service';

/**
 * Angular service for EHR/EMR system usage.
 */
@Injectable()
export class EHRService {
	/** @ignore */
	private throwErrors (response: any) : void {
		if (
			typeof response === 'object' &&
			response.Errors instanceof Array
		) {
			throw response.Errors;
		}
	}

	/** Adds new patient. */
	public async addPatient (apiKey: string, patient: RedoxPatient) : Promise<void> {
		const response	= await this.ehrIntegrationService.runCommand(apiKey, {
			Meta: {
				DataModel: 'PatientAdmin',
				EventType: 'NewPatient'
			},
			Patient: patient
		});

		this.throwErrors(response);
	}

	/** Adds or updates patient. */
	public async addOrUpdatePatient (apiKey: string, patient: RedoxPatient) : Promise<void> {
		try {
			await this.updatePatient(apiKey, patient);
		}
		catch {
			await this.addPatient(apiKey, patient);
		}
	}

	/** Gets patient based on SSN or other identifier(s). */
	public async getPatient (
		apiKey: string,
		id: string|RedoxTypes.IIdentifier|RedoxTypes.IIdentifier[]
	) : Promise<RedoxPatient> {
		const response	= await this.ehrIntegrationService.runCommand(apiKey, {
			Meta: {
				DataModel: 'PatientSearch',
				EventType: 'Query'
			},
			Patient: typeof id === 'string' ?
				{Demographics: {SSN: id}} :
				{Identifiers: id instanceof Array ? id : [id]}
		});

		this.throwErrors(response);

		if (
			typeof response !== 'object' ||
			typeof response.Patient !== 'object' ||
			!(response.Patient.Identifiers instanceof Array) ||
			response.Patient.Identifiers.length < 1
		) {
			throw new Error('Patient not found.');
		}

		return deserialize(RedoxPatient, await serialize(RedoxPatient, response.Patient));
	}

	/** Schedules a new appointment. */
	public async scheduleAppointment (
		apiKey: string,
		appointment: RedoxAppointment
	) : Promise<void> {
		const response	= await this.ehrIntegrationService.runCommand(apiKey, {
			...appointment,
			Meta: {
				DataModel: 'Scheduling',
				EventType: 'New'
			}
		});

		this.throwErrors(response);
	}

	/** Updates existing patient. */
	public async updatePatient (apiKey: string, patient: RedoxPatient) : Promise<void> {
		const response	= await this.ehrIntegrationService.runCommand(apiKey, {
			Meta: {
				DataModel: 'PatientAdmin',
				EventType: 'PatientUpdate'
			},
			Patient: patient
		});

		this.throwErrors(response);
	}

	constructor (
		/** @ignore */
		private readonly ehrIntegrationService: EHRIntegrationService
	) {}
}
