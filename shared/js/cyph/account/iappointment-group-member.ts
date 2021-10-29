import {User} from './user';

/** An appointment group member. */
export interface IAppointmentGroupMember {
	/** Anonymous guest member data. */
	anonymousGuest?: {
		email?: string;
		name: string;
		phoneNumber?: string;
	};

	/** @see User */
	user?: User;
}
