import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {IRedoxAppointment, IRedoxPatient, RedoxPatient} from '../proto';
import {deserialize, serialize} from '../util/serialization';
import {EHRIntegrationService} from './ehr-integration.service';

/**
 * Angular service for EHR/EMR system usage.
 */
@Injectable()
export class EHRService extends BaseProvider {
	/** @ignore */
	private throwErrors (response: any) : void {
		if (typeof response === 'object' && response.Errors instanceof Array) {
			throw response.Errors;
		}
	}

	/** Adds new patient. */
	public async addPatient (
		apiKey: string,
		patient: IRedoxPatient
	) : Promise<void> {
		const response = await this.ehrIntegrationService.runCommand(apiKey, {
			/* eslint-disable-next-line @typescript-eslint/naming-convention */
			Meta: {
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				DataModel: 'PatientAdmin',
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				EventType: 'NewPatient'
			},
			/* eslint-disable-next-line @typescript-eslint/naming-convention */
			Patient: patient
		});

		this.throwErrors(response);
	}

	/** Adds or updates patient. */
	public async addOrUpdatePatient (
		apiKey: string,
		patient: IRedoxPatient
	) : Promise<void> {
		try {
			await this.updatePatient(apiKey, patient);
		}
		catch {
			await this.addPatient(apiKey, patient);
		}
	}

	/**
	 * Searches for patient.
	 * TODO: Provide some way to choose between potential matches.
	 */
	public async getPatient (
		apiKey: string,
		patient: IRedoxPatient
	) : Promise<IRedoxPatient> {
		const response = await this.ehrIntegrationService.runCommand(apiKey, {
			/* eslint-disable-next-line @typescript-eslint/naming-convention */
			Meta: {
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				DataModel: 'PatientSearch',
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				EventType: 'Query'
			},
			/* eslint-disable-next-line @typescript-eslint/naming-convention */
			Patient: patient
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

		return deserialize(
			RedoxPatient,
			await serialize(RedoxPatient, response.Patient)
		);
	}

	/** Schedules a new appointment. */
	public async scheduleAppointment (
		apiKey: string,
		appointment: IRedoxAppointment
	) : Promise<void> {
		const response = await this.ehrIntegrationService.runCommand(apiKey, {
			...appointment,
			/* eslint-disable-next-line @typescript-eslint/naming-convention */
			Meta: {
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				DataModel: 'Scheduling',
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				EventType: 'New'
			}
		});

		this.throwErrors(response);
	}

	/** Updates existing patient. */
	public async updatePatient (
		apiKey: string,
		patient: IRedoxPatient
	) : Promise<void> {
		const response = await this.ehrIntegrationService.runCommand(apiKey, {
			/* eslint-disable-next-line @typescript-eslint/naming-convention */
			Meta: {
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				DataModel: 'PatientAdmin',
				/* eslint-disable-next-line @typescript-eslint/naming-convention */
				EventType: 'PatientUpdate'
			},
			/* eslint-disable-next-line @typescript-eslint/naming-convention */
			Patient: patient
		});

		this.throwErrors(response);
	}

	constructor (
		/** @ignore */
		private readonly ehrIntegrationService: EHRIntegrationService
	) {
		super();
	}
}
