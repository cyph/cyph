import {BehaviorSubject} from 'rxjs';

/** Indicates whether data can be shared with each recipient of a meeting invite. */
export class AppointmentSharing {
	/** Whether to share the current user's time zone. */
	public readonly inviterTimeZone = new BehaviorSubject<boolean>(true);

	/** Whether to share the list of recipients. */
	public readonly memberContactInfo = new BehaviorSubject<boolean>(true);

	/** Whether to share contact information for other recipients. */
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
