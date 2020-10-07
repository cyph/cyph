import {BehaviorSubject} from 'rxjs';

/** @see Appointment.Sharing */
export class AppointmentSharing {
	/** @see Appointment.Sharing.inviterTimeZone */
	public readonly inviterTimeZone = new BehaviorSubject<boolean>(true);

	/** @see Appointment.Sharing.memberContactInfo */
	public readonly memberContactInfo = new BehaviorSubject<boolean>(true);

	/** @see Appointment.Sharing.memberList */
	public readonly memberList = new BehaviorSubject<boolean>(true);

	/** Sets inviterTimeZone. */
	public setInviterTimeZone (inviterTimeZone: boolean) : AppointmentSharing {
		this.inviterTimeZone.next(inviterTimeZone);
		return this;
	}

	/** Sets memberContactInfo. */
	public setMemberContactInfo (
		memberContactInfo: boolean
	) : AppointmentSharing {
		this.memberContactInfo.next(memberContactInfo);
		return this;
	}

	/** Sets memberList. */
	public setMemberList (memberList: boolean) : AppointmentSharing {
		this.memberList.next(memberList);
		return this;
	}

	constructor () {}
}
