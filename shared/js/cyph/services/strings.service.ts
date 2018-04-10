/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import {translate} from '../util/translate';
import {EnvService} from './env.service';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
@Injectable()
export class StringsService {
	/** @ignore */
	private readonly customBuildStrings: {[k: string]: string}	=
		(
			this.envService.environment.customBuild &&
			this.envService.environment.customBuild.strings
		) ?
			this.envService.environment.customBuild.strings :
			{}
	;

	/** @ignore */
	private readonly internalCompany: string			=
		this.customBuildStrings.internalCompany ||
		`Cyph`
	;

	/** @ignore */
	private readonly internalFriend: string				=
		this.customBuildStrings.internalFriend ||
		`friend`
	;

	/** @ignore */
	private readonly internalProduct: string			=
		this.customBuildStrings.internalProduct ||
		`Cyph`
	;

	/** @ignore */
	private readonly internalProductShort: string		=
		this.customBuildStrings.internalProductShort ||
		`Cyph`
	;

	/** @ignore */
	private readonly internalSession: string			=
		this.customBuildStrings.internalSession ||
		`cyph`
	;

	/** @see StringsService */
	public readonly accept: string						= `accept`;

	/** @see StringsService */
	public readonly appointmentCalendar: string			= `Appointment Calendar`;

	/** @see StringsService */
	public readonly appointmentDuration: string			= `Appointment Duration`;

	/** @see StringsService */
	public readonly audioCall: string					= `call`;

	/** @see StringsService */
	public readonly callType: string					= `Call Type`;

	/** @see StringsService */
	public readonly cameraDisable: string				= `Disable Camera`;

	/** @see StringsService */
	public readonly cameraEnable: string				= `Enable Camera`;

	/** @see StringsService */
	public readonly cancel: string						= `cancel`;

	/** @see StringsService */
	public readonly clickHere: string					= `Click here`;

	/** @see StringsService */
	public readonly company: string						= `${this.internalCompany}`;

	/** @see StringsService */
	public readonly connectedNotification: string		= `Connected!`;

	/** @see StringsService */
	public readonly connecting: string					= `Now Connecting...`;

	/** @see StringsService */
	public readonly contactCyph: string					= `Contact ${this.internalCompany}`;

	/** @see StringsService */
	public readonly continueDialogAction: string		= `continue`;

	/** @see StringsService */
	public readonly currentAppointment: string			= `Current Appointment`;

	/** @see StringsService */
	public readonly currentAppointments: string			= `Current Appointments`;

	/** @see StringsService */
	public readonly cypherToast1: string				=
		`Prepare to witness the amazing nuts and bolts of ${this.internalProductShort}.`
	;

	/** @see StringsService */
	public readonly cypherToast2: string				=
		`This cyphertext is what outsiders spying on your traffic will see (nothing of value).`
	;

	/** @see StringsService */
	public readonly cypherToast3: string				= `Thou art amazed.`;

	/** @see StringsService */
	public readonly decline: string						= `decline`;

	/** @see StringsService */
	public readonly deleteConfirm: string				= `Confirm Deletion`;

	/** @see StringsService */
	public readonly deleteMessage: string				= `Delete`;

	/** @see StringsService */
	public readonly disabled: string					= `Disabled`;

	/** @see StringsService */
	public readonly discard: string						= `discard`;

	/** @see StringsService */
	public readonly disconnect: string					= `Disconnect`;

	/** @see StringsService */
	public readonly disconnectConfirm: string			=
		`Are you sure that you wish to disconnect?`
	;

	/** @see StringsService */
	public readonly disconnectNotification: string		=
		`This ${this.internalSession} has been disconnected.`
	;

	/** @see StringsService */
	public readonly disconnectTitle: string				= `Disconnect`;

	/** @see StringsService */
	public readonly disconnectWarning: string			=
		`After closing ${this.internalProduct}, your messages will no longer be retrievable.`
	;

	/** @see StringsService */
	public readonly doctor: string						= `doctor`;

	/** @see StringsService */
	public readonly dr: string							= `Dr.`;

	/** @see StringsService */
	public readonly email: string						= `Email`;

	/** @see StringsService */
	public readonly emailOptional: string				= `Email (Optional)`;

	/** @see StringsService */
	public readonly emptyContactList: string			= `You have no friends.`;

	/** @see StringsService */
	public readonly enabled: string						= `Enabled`;

	/** @see StringsService */
	public readonly endDate: string						= `End Date`;

	/** @see StringsService */
	public readonly endTime: string						= `End Time`;

	/** @see StringsService */
	public readonly fileCall: string					= `file transfer`;

	/** @see StringsService */
	public readonly fileTooLarge: string				=
		`The file that you are trying to send exceeds the 250 MB attachment limit.`
	;

	/** @see StringsService */
	public readonly fileTransferInitFriend: string		=
		`Your ${this.internalFriend} is sending the file:`
	;

	/** @see StringsService */
	public readonly fileTransferInitMe: string			=
		`You are sending the file:`
	;

	/** @see StringsService */
	public readonly followUpAdjective: string			= `Follow-Up`;

	/** @see StringsService */
	public readonly followUpNoun: string				= `Follow Up`;

	/** @see StringsService */
	public readonly footerMessageAPI: string			= `${this.internalProduct} API`;

	/** @see StringsService */
	public readonly footerMessageDefault: string		= `Individual Use Only`;

	/** @see StringsService */
	public readonly footerMessagePro: string			= `${this.internalProduct} Pro`;

	/** @see StringsService */
	public readonly form: string						= `Form`;

	/** @see StringsService */
	public readonly formattingHelp: string				= `Formatting Help`;

	/** @see StringsService */
	public readonly friend: string						= `${this.internalFriend}`;

	/** @see StringsService */
	public readonly friendIsTyping: string				=
		`${this.capitalize(this.internalFriend)} is typing...`
	;

	/** @see StringsService */
	public readonly futureAppointments: string			= `Future Appointments`;

	/** @see StringsService */
	public readonly hasInvitedYouToA: string			= `has invited you to a`;

	/** @see StringsService */
	public readonly help: string						= `Help`;

	/** @see StringsService */
	public readonly here: string						= `here`;

	/** @see StringsService */
	public readonly incomingAppointments: string		= `Incoming Appointment Requests`;

	/** @see StringsService */
	public readonly incomingFile: string				= `Incoming File:`;

	/** @see StringsService */
	public readonly incomingFileDownload: string		=
		`Your ${this.internalFriend} would like to send you a file. Accept the file transfer?`
	;

	/** @see StringsService */
	public readonly incomingFileRejected: string		=
		`You have rejected the following file transfer:`
	;

	/** @see StringsService */
	public readonly incomingFileSave: string			=
		`Your ${this.internalFriend} has sent you a file. It has not been scanned for malware; ` +
		`you may choose to accept it AT YOUR OWN RISK. Save this file?`
	;

	/** @see StringsService */
	public readonly incomingFileSaveError: string		=
		`Failed to save the following file:`
	;

	/** @see StringsService */
	public readonly introductoryMessage: string			=
		`You may now speak.`
	;

	/** @see StringsService */
	public readonly invalidCredentials: string			=
		`Invalid username or master key.`
	;

	/** @see StringsService */
	public readonly invalidInviteCode: string			=
		`Invalid invite code.`
	;

	/** @see StringsService */
	public readonly invalidPassword: string				=
		`Invalid password.`
	;

	/** @see StringsService */
	public readonly invalidPIN: string					=
		`Invalid PIN.`
	;

	/** @see StringsService */
	public readonly linkCopied: string					=
		`${this.capitalize(this.internalSession)} link copied.`
	;

	/** @see StringsService */
	public readonly linkCopyFail: string				=
		`Automated clipboard copy unsupported in this browser.`
	;

	/** @see StringsService */
	public readonly linkExpiresAt: string				= `Link expires at`;

	/** @see StringsService */
	public readonly linkTooltip: string					=
		`${this.capitalize(this.internalSession)} Link`
	;

	/** @see StringsService */
	public readonly localMediaError: string				= `Error loading webcam and/or microphone`;

	/** @see StringsService */
	public readonly logIn: string						= `Log In`;

	/** @see StringsService */
	public readonly logInTitle: string					= `Log in to ${this.internalProduct}`;

	/** @see StringsService */
	public readonly logo: string						= `Logo`;

	/** @see StringsService */
	public readonly masterKey: string					= `Master Key`;

	/** @see StringsService */
	public readonly me: string							= `me`;

	/** @see StringsService */
	public readonly message: string						= `message`;

	/** @see StringsService */
	public readonly messageConfirmed: string			=
		`Message delivery confirmed`
	;

	/** @see StringsService */
	public readonly messages: string					= `messages`;

	/** @see StringsService */
	public readonly messageUnconfirmed: string			=
		`Message delivery unconfirmed`
	;

	/** @see StringsService */
	public readonly micDisable: string					= `Disable Mic`;

	/** @see StringsService */
	public readonly micEnable: string					= `Enable Mic`;

	/** @see StringsService */
	public readonly name: string						= `Name`;

	/** @see StringsService */
	public readonly nameOrPseudonym: string				= `Name or Pseudonym`;

	/** @see StringsService */
	public readonly newDoc: string						= `New Doc`;

	/** @see StringsService */
	public readonly newMessageNotification: string		= `New message!`;

	/** @see StringsService */
	public readonly newNote: string						= `New Note`;

	/** @see StringsService */
	public readonly newString: string					= `new`;

	/** @see StringsService */
	public readonly no: string							= `no`;

	/** @see StringsService */
	public readonly noAppointments: string				= `You have no appointments`;

	/** @see StringsService */
	public readonly noCall: string						= `No Call`;

	/** @see StringsService */
	public readonly noIncomingAppointments: string		=
		`You have no incoming appointment requests`;

	/** @see StringsService */
	public readonly notes: string						= `Notes`;

	/** @see StringsService */
	public readonly noteSaved: string					= `Note saved!`;

	/** @see StringsService */
	public readonly notFound: string					= `404 page not found`;

	/** @see StringsService */
	public readonly ok: string							= `ok`;

	/** @see StringsService */
	public readonly omitted: string						= `(omitted)`;

	/** @see StringsService */
	public readonly oopsTitle: string					= `Oops!`;

	/** @see StringsService */
	public readonly open: string						= `Open`;

	/** @see StringsService */
	public readonly openProfile: string					= `Open Profile`;

	/** @see StringsService */
	public readonly outgoingFileError: string			=
		`Failed to send the following file:`
	;

	/** @see StringsService */
	public readonly outgoingFileRejected: string		=
		`Your "${this.internalFriend}" has rejected the following file transfer:`
	;

	/** @see StringsService */
	public readonly outgoingFileSaved: string			=
		`File transfer complete! Your ${this.internalFriend} has saved the following file:`
	;

	/** @see StringsService */
	public readonly p2pCanceled: string					= `Call canceled.`;

	/** @see StringsService */
	public readonly p2pConnect: string					= `Call has started.`;

	/** @see StringsService */
	public readonly p2pDeny: string						=
		`Your "${this.internalFriend}" has rejected your call.`
	;

	/** @see StringsService */
	public readonly p2pDisabled: string					=
		`Your or your ${this.internalFriend}'s browser may lack support for video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	;

	/** @see StringsService */
	public readonly p2pDisabledLocal: string			=
		`Your browser does not support voice or video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	;

	/** @see StringsService */
	public readonly p2pDisabledLocalIOS: string			=
		`Voice/video calling is currently unsupported on iOS.`
	;

	/** @see StringsService */
	public readonly p2pDisconnect: string				=
		`Call has been disconnected.`
	;

	/** @see StringsService */
	public readonly p2pInit: string						=
		`You are about to initiate an encrypted`
	;

	/** @see StringsService */
	public readonly p2pRequest: string					=
		`Your ${this.internalFriend} has requested an encrypted`
	;

	/** @see StringsService */
	public readonly p2pRequestConfirmation: string		=
		`Your request has been sent.`
	;

	/** @see StringsService */
	public readonly p2pTitle: string					= `${this.internalProduct} Call`;

	/** @see StringsService */
	public readonly p2pWarning: string					=
		`This will involve sharing your IP address with your ${this.internalFriend} ` +
		`(which isn't a problem unless you're actively hiding ` +
		`your current location from them). Continue?`
	;

	/** @see StringsService */
	public readonly p2pWarningAudioPassive: string		= `Starting voice call (P2P).`;

	/** @see StringsService */
	public readonly p2pWarningVideoPassive: string		= `Starting video call (P2P).`;

	/** @see StringsService */
	public readonly pastAppointments: string			= `Past Appointments`;

	/** @see StringsService */
	public readonly patents: string						=
		`(US Patents   9,794,070  9,906,369)`
	;

	/** @see StringsService */
	public readonly patient: string						= `patient`;

	/** @see StringsService */
	public readonly patientForm: string					= `Patient Form`;

	/** @see StringsService */
	public readonly patientForms: string				= `Patient Forms`;

	/** @see StringsService */
	public readonly patientFormsMissing: string			= `Patient forms not submitted.`;

	/** @see StringsService */
	public readonly pin: string							= `PIN`;

	/** @see StringsService */
	public readonly product: string						= `${this.internalProduct}`;

	/** @see StringsService */
	public readonly productShort: string				= `${this.internalProductShort}`;

	/** @see StringsService */
	public readonly profile: string						= `profile`;

	/** @see StringsService */
	public readonly queuedMessageSaved: string			= `Queued message saved.`;

	/** @see StringsService */
	public readonly reasonForAppointment: string		= `Reason for Appointment`;

	/** @see StringsService */
	public readonly registerTitle: string				= `Register for ${this.internalProduct}`;

	/** @see StringsService */
	public readonly reject: string						= `reject`;

	/** @see StringsService */
	public readonly requestAppointment: string			= `Request Appointment`;

	/** @see StringsService */
	public readonly requestFollowUpAppointment: string	= `Request Follow-Up Appointment`;

	/** @see StringsService */
	public readonly review: string						= `review`;

	/** @see StringsService */
	public readonly reviews: string						= `reviews`;

	/** @see StringsService */
	public readonly s: string							= `'s`;

	/** @see StringsService */
	public readonly save: string						= `save`;

	/** @see StringsService */
	public readonly search: string						= `Search`;

	/** @see StringsService */
	public readonly selfDestructActivated: string		=
		`${this.capitalize(this.internalSession)} set to self-destruct.`
	;

	/** @see StringsService */
	public readonly selfDestructDeactivated: string		=
		`Self-destruct deactivated.`
	;

	/** @see StringsService */
	public readonly session: string						= `${this.internalSession}`;

	/** @see StringsService */
	public readonly signupFailed: string				=
		`Signup failed. Please try again later.`
	;

	/** @see StringsService */
	public readonly signupMessage: string				=
		`Enjoying the service? Join our waitlist for ${this.internalProductShort} v2! ` +
		`More details are on the way, but the next version of ${this.internalProductShort} ` +
		`will include group messaging, user accounts, and encrypted chat history.`
	;

	/** @see StringsService */
	public readonly startDate: string					= `Start Date`;

	/** @see StringsService */
	public readonly startTime: string					= `Start Time`;

	/** @see StringsService */
	public readonly submitPatientForms: string			= `Submit Patient Forms`;

	/** @see StringsService */
	public readonly suregoahead: string					= `sure, go ahead`;

	/** @see StringsService */
	public readonly teamToContact: string				=
		`${this.internalCompany} Team to Contact`
	;

	/** @see StringsService */
	public readonly telehealthCallAbout: string			= `Telehealth Call About`;

	/** @see StringsService */
	public readonly telehealthSearch: string			=
		`Search by Doctor, Insurance, Address, etc.`
	;

	/** @see StringsService */
	public readonly telehealthSessionWith: string		= `Telehealth Session with`;

	/** @see StringsService */
	public readonly timeExtended: string				= `Added time to countdown.`;

	/** @see StringsService */
	public readonly timeZone: string					= `Time Zone`;

	/** @see StringsService */
	public readonly titleRequired: string				= `Title required in order to save.`;

	/** @see StringsService */
	public readonly to: string							= `To`;

	/** @see StringsService */
	public readonly toA: string							= `to a`;

	/** @see StringsService */
	public readonly toJoin: string						= `to join`;

	/** @see StringsService */
	public readonly totalSpace: string					= `Total Space Used:`;

	/** @see StringsService */
	public readonly unknown: string						= `Unknown`;

	/** @see StringsService */
	public readonly unlock: string						= `Unlock`;

	/** @see StringsService */
	public readonly unlockedTitle: string				= `${this.internalProduct} Unlocked`;

	/** @see StringsService */
	public readonly unlockTitle: string					= `Unlock ${this.internalProduct}`;

	/** @see StringsService */
	public readonly untitled: string					= `Untitled`;

	/** @see StringsService */
	public readonly userAvatar: string					= `User Avatar`;

	/** @see StringsService */
	public readonly video: string						= `Video`;

	/** @see StringsService */
	public readonly videoCall: string					= `video call`;

	/** @see StringsService */
	public readonly voice: string						= `Voice`;

	/** @see StringsService */
	public readonly waitingRoomCheckedInDoctor: string	=
		`Waiting for your patient to connect.`
	;

	/** @see StringsService */
	public readonly waitingRoomCheckedInGeneric: string	=
		`Waiting for the other party to join.`
	;

	/** @see StringsService */
	public readonly waitingRoomCheckedInPatient: string	=
		`You're all checked in! Waiting for your doctor to connect. `
	;

	/** @see StringsService */
	public readonly waitingRoomNotReadyForms: string	=
		`Please ensure you've submitted all required patient forms.`
	;

	/** @see StringsService */
	public readonly waitingRoomNotReadyTime: string		=
		`It's not time to check in for your appointment yet. You can check in up to 20 minutes ` +
		`before your scheduled appointment.`
	;

	/** @see StringsService */
	public readonly warningTitle: string				= `Warning`;

	/** @see StringsService */
	public readonly welcomeComma: string				= `Welcome,`;

	/** @see StringsService */
	public readonly welcomeToProduct: string			= `Welcome to ${this.internalProduct}`;

	/** @see StringsService */
	public readonly youInvited: string					= `You invited`;

	/** @see StringsService */
	public readonly your: string						= `Your`;

	/** @ignore */
	private capitalize (s: string) : string {
		return s.length < 1 ? '' : s[0].toUpperCase() + s.slice(1);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		/* tslint:disable-next-line:no-this-assignment */
		const strings: {[k: string]: any}	= this;

		for (const k of Object.keys(strings)) {
			const s	= strings[k];
			if (typeof s !== 'string' || k.startsWith('internal')) {
				continue;
			}

			strings[k]	= translate(this.customBuildStrings[k] || s);
		}
	}
}
