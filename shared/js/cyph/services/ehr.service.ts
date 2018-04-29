import {Injectable} from '@angular/core';
import {RedoxAppointment, RedoxPatient, RedoxTypes} from '../proto';
import {deserialize, serialize} from '../util/serialization';
import {EHRIntegrationService} from './ehr-integration.service';

/**
 * Angular service for EHR/EMR system usage.
 */
@Injectable()
export class EHRService {
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
		await this.ehrIntegrationService.runCommand(apiKey, {
			Meta: {
				DataModel: 'Scheduling',
				EventType: 'New'
			},
			...appointment
		});
	}

	constructor (
		/** @ignore */
		private readonly ehrIntegrationService: EHRIntegrationService
	) {}
}
