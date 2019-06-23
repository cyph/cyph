/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {translate} from '../util/translate';
import {EnvService} from './env.service';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
@Injectable()
export class StringsService extends BaseProvider {
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
	private readonly internalCompany: string					=
		this.customBuildStrings.internalCompany ||
		`Cyph`
	;

	/** @ignore */
	private readonly internalFriend: string						=
		this.customBuildStrings.internalFriend ||
		`friend`
	;

	/** @ignore */
	private readonly internalLogoText: string					=
		this.customBuildStrings.internalLogoText ||
		this.customBuildStrings.internalProduct ||
		`cyph`
	;

	/** @ignore */
	private readonly internalProduct: string					=
		this.customBuildStrings.internalProduct ||
		`Cyph`
	;

	/** @ignore */
	private readonly internalProductShort: string				=
		this.customBuildStrings.internalProductShort ||
		`Cyph`
	;

	/** @ignore */
	private readonly internalProductTelehealth: string			=
		this.customBuildStrings.internalProductTelehealth ||
		this.customBuildStrings.internalProduct ||
		`Cyph Telehealth`
	;

	/** @ignore */
	private readonly internalSession: string					=
		this.customBuildStrings.internalSession ||
		`cyph`
	;

	/** @see StringsService */
	public readonly accept: string						= `accept`;

	/** @see StringsService */
	public readonly access: string						= `Access`;

	/** @see StringsService */
	public readonly addContactButtonExternal: string	= `External Contact`;

	/** @see StringsService */
	public readonly addContactButtonInternal: string	= `${this.internalProductShort} User`;

	/** @see StringsService */
	public readonly addContactButtonInvite: string		= `Invite to ${this.internalProductShort}`;

	/** @see StringsService */
	public readonly addContactTitle: string				= `Add Contact`;

	/** @see StringsService */
	public readonly addContactTooltipExternal: string	=
		`Add someone using their email address`
	;

	/** @see StringsService */
	public readonly addContactTooltipInternal: string	=
		`Add someone using their ${this.internalProductShort} username`
	;

	/** @see StringsService */
	public readonly addContactTooltipInvite: string		=
		`Invite a friend to make their own ${this.internalProductShort} account`
	;

	/** @see StringsService */
	public readonly affAlt: string						= `Non-targeted banner ad`;

	/** @see StringsService */
	public readonly affTooltip: string					= `Opens in new tab`;

	/** @see StringsService */
	public readonly allow: string						= `Allow`;

	/** @see StringsService */
	public readonly anonymous: string					= `Anonymous`;

	/** @see StringsService */
	public readonly answer: string						= `Answer`;

	/** @see StringsService */
	public readonly appointmentCalendar: string			= `Appointment Calendar`;

	/** @see StringsService */
	public readonly appointmentDuration: string			= `Appointment Duration`;

	/** @see StringsService */
	public readonly appointmentNotes: string			= `Notes about this appointment:`;

	/** @see StringsService */
	public readonly audioCall: string					= `call`;

	/** @see StringsService */
	public readonly bannerText: string					= `Help Defend Internet Privacy: `;

	/** @see StringsService */
	public readonly bannerTextAlt: string				=
		`Help Defend Internet Privacy: Donate to ${this.internalCompany}`
	;

	/** @see StringsService */
	public readonly bitcoinAmountLabel: string			= `Amount (BTC)`;

	/** @see StringsService */
	public readonly bitcoinErrorText: string			= `Failed to send`;

	/** @see StringsService */
	public readonly bitcoinErrorTitle: string			= `Send Error`;

	/** @see StringsService */
	public readonly bitcoinRecipientLabel: string		= `Recipient Address`;

	/** @see StringsService */
	public readonly bitcoinSendTitle: string			= `Send Bitcoin`;

	/** @see StringsService */
	public readonly bitcoinShort: string				= `BTC`;

	/** @see StringsService */
	public readonly bitcoinSuccessText: string			= `Sent`;

	/** @see StringsService */
	public readonly bitcoinSuccessTitle: string			= `Send Success`;

	/** @see StringsService */
	public readonly callType: string					= `Call Type`;

	/** @see StringsService */
	public readonly camera: string						= `camera`;

	/** @see StringsService */
	public readonly cameraDisable: string				= `Disable Camera`;

	/** @see StringsService */
	public readonly cameraEnable: string				= `Enable Camera`;

	/** @see StringsService */
	public readonly cancel: string						= `cancel`;

	/** @see StringsService */
	public readonly changeMasterKeyContent: string		=
		`You are about to change your **master key**. This is not reversible. ` +
		`If you lose the new master key, **your account cannot be recovered**.\n\n` +
		`You will be required to log in again from scratch next time you open ` +
		`${this.internalProduct}. Continue?`
	;

	/** @see StringsService */
	public readonly changeMasterKeyFailure: string		=
		`Changing the master key failed. Please try again later.`
	;

	/** @see StringsService */
	public readonly changeMasterKeyTitle: string		= `Change Master Key`;

	/** @see StringsService */
	public readonly changePinContent: string			=
		`You are about to change your **lock screen password**. This is a simple passcode used ` +
		`to lock your account while you're away.\n\n` +
		`You will be required to log in again from scratch next time you open ` +
		`${this.internalProduct}. Continue?`
	;

	/** @see StringsService */
	public readonly changePinFailure: string			=
		`Changing the lock screen password failed. Please try again later.`
	;

	/** @see StringsService */
	public readonly changePinTitle: string				= `Change Lock Screen Password`;

	/** @see StringsService */
	public readonly checkoutBraintreeError: string		= `Braintree failed to initialize.`;

	/** @see StringsService */
	public readonly checkoutErrorEnd: string			=
		`Please check your payment credentials and try again.`
	;

	/** @see StringsService */
	public readonly checkoutErrorStart: string			=
		`Processing payment failed`
	;

	/** @see StringsService */
	public readonly checkoutErrorTitle: string			= `Payment Failed`;

	/** @see StringsService */
	public readonly clickHere: string					= `Click here`;

	/** @see StringsService */
	public readonly company: string						= `${this.internalCompany}`;

	/** @see StringsService */
	public readonly composeMessage: string				= `Compose Message`;

	/** @see StringsService */
	public readonly connectedNotification: string		= `Connected!`;

	/** @see StringsService */
	public readonly connecting: string					= `Now Connecting...`;

	/** @see StringsService */
	public readonly contactCyph: string					= `Contact ${this.internalCompany}`;

	/** @see StringsService */
	public readonly contactSupport: string				= `Contact Support`;

	/** @see StringsService */
	public readonly continueButton: string				= `Continue`;

	/** @see StringsService */
	public readonly continueDialogAction: string		= `continue`;

	/** @see StringsService */
	public readonly continuePrompt: string				= `Continue?`;

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
	public readonly decline: string						= `Decline`;

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
		`After closing this ${this.internalSession}, your messages will no longer be retrievable.`
	;

	/** @see StringsService */
	public readonly doctor: string						= `doctor`;

	/** @see StringsService */
	public readonly dr: string							= `Dr.`;

	/** @see StringsService */
	public readonly email: string						= `Email`;

	/** @see StringsService */
	public readonly emailOptional: string				= `Email (optional)`;

	/** @see StringsService */
	public readonly emptyContactList: string			= `You have no friends.`;

	/** @see StringsService */
	public readonly enabled: string						= `Enabled`;

	/** @see StringsService */
	public readonly endDate: string						= `End Date`;

	/** @see StringsService */
	public readonly endTime: string						= `End Time`;

	/** @see StringsService */
	public readonly feedback: string					= `Send Feedback`;

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
	public readonly futureAppointments: string			= `Appointments`;

	/** @see StringsService */
	public readonly getMessageValueFailure: string		=
		`\`[Failed to fetch the contents of this message]\``
	;

	/** @see StringsService */
	public readonly group: string						= `Group`;

	/** @see StringsService */
	public readonly hasInvitedYouToA: string			= `has invited you to a`;

	/** @see StringsService */
	public readonly help: string						= `Help`;

	/** @see StringsService */
	public readonly here: string						= `here`;

	/** @see StringsService */
	public readonly gdprContactForm: string				=
		`I understand that this form is email-based (NOT ${this.internalProduct} encryption) ` +
		`and provide consent for ${this.internalCompany} to store any information submitted herein.`
	;

	/** @see StringsService */
	public readonly gdprContactFormShort: string		=
		`Data Collection Consent`
	;

	/** @see StringsService */
	public readonly gdprSignupForm: string				=
		`By submitting your email address and/or name to the waitlist, you consent ` +
		`for ${this.internalCompany} to view and store this data.`
	;

	/** @see StringsService */
	public readonly incoming: string					= `Incoming`;

	/** @see StringsService */
	public readonly incomingAppointments: string		= `Incoming Appointment Requests`;

	/** @see StringsService */
	public readonly incomingCallAudio: string			= `Incoming Call`;

	/** @see StringsService */
	public readonly incomingCallVideo: string			= `Incoming Video Call`;

	/** @see StringsService */
	public readonly incomingFile: string				= `Download File`;

	/** @see StringsService */
	public readonly incomingFileSave: string			=
		`This file has not been scanned for malware; ` +
		`you may download it _at your own risk_. Save this file?`
	;

	/** @see StringsService */
	public readonly incomingFileSaveError: string		=
		`Failed to save the following file:`
	;

	/** @see StringsService */
	public readonly incomingFileSaveMediaError: string	=
		`Failed to download.`
	;

	/** @see StringsService */
	public readonly incomingFileUploadError: string		=
		`Failed to upload the following file:`
	;

	/** @see StringsService */
	public readonly incomingPatientInfo: string			=
		`Your doctor has shared this medical data to be saved in your account to auto-fill ` +
		`forms on your behalf in the future. Would you like to accept it?`
	;

	/** @see StringsService */
	public readonly incomingPatientInfoTitle: string	=
		`Saving Incoming Patient Info`
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
		`Invalid lock screen password.`
	;

	/** @see StringsService */
	public readonly inviteContactTitle: string			= `Invite Contact`;

	/** @see StringsService */
	public readonly linkCopied: string					=
		`${this.capitalize(this.internalSession)} link copied.`
	;

	/** @see StringsService */
	public readonly linkCopyFail: string				=
		`Automated clipboard copy unsupported in this browser.`
	;

	/** @see StringsService */
	public readonly linkEmailSubject: string			=
		`${this.internalProductShort} Chat Invite`
	;

	/** @see StringsService */
	public readonly linkEmailSubjectTelehealth: string	=
		`Your Telehealth Appointment`
	;

	/** @see StringsService */
	public readonly linkEmailText: string				=
		`I'm inviting you to chat with me securely via ${this.internalProductShort}!\n\n` +
		`I'll be waiting here: \${LINK}`
	;

	/** @see StringsService */
	public readonly linkEmailTextTelehealth: string		=
		`Your telehealth appointment is starting now.\n\n` +
		`Your doctor is waiting here: \${LINK} (click to join)`
	;

	/** @see StringsService */
	public readonly linkExpiresAt: string				= `Link expires at`;

	/** @see StringsService */
	public readonly linkGet: string						=
		`Get new ${this.internalProduct} link`
	;

	/** @see StringsService */
	public readonly linkTooltip: string					=
		`${this.capitalize(this.internalSession)} Link`
	;

	/** @see StringsService */
	public readonly lockScreen: string					= `Lock Screen Password`;

	/** @see StringsService */
	public readonly lockScreenPassword: string			= `Custom Password`;

	/** @see StringsService */
	public readonly lockScreenPasswordMismatch: string	= `Passwords don't match`;

	/** @see StringsService */
	public readonly lockScreenPIN: string				= `Four-Digit PIN`;

	/** @see StringsService */
	public readonly localMediaError: string				= `Error loading webcam and/or microphone`;

	/** @see StringsService */
	public readonly logIn: string						= `Log In`;

	/** @see StringsService */
	public readonly logInTitle: string					= `Log in to ${this.internalProduct}`;

	/** @see StringsService */
	public readonly logo: string						= `Logo`;

	/** @see StringsService */
	public readonly logoText: string					= this.internalLogoText;

	/** @see StringsService */
	public readonly masterKey: string					= `Master Key`;

	/** @see StringsService */
	public readonly masterKeyMismatch: string			= `Master Keys don't match`;

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
	public readonly messagesHeader: string				= `Messages`;

	/** @see StringsService */
	public readonly messageTitle: string				= `Message`;

	/** @see StringsService */
	public readonly messageUnconfirmed: string			=
		`Message delivery unconfirmed`
	;

	/** @see StringsService */
	public readonly mic: string							= `microphone`;

	/** @see StringsService */
	public readonly micDisable: string					= `Disable Mic`;

	/** @see StringsService */
	public readonly micEnable: string					= `Enable Mic`;

	/** @see StringsService */
	public readonly name: string						= `Name`;

	/** @see StringsService */
	public readonly nameOptional: string				= `Name (optional)`;

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
	public readonly newWalletGenerate: string			= `Generate New Wallet`;

	/** @see StringsService */
	public readonly newWalletGenerateText: string		=
		`This will generate a brand new wallet. Proceed?`
	;

	/** @see StringsService */
	public readonly newWalletImportAddress: string		= `Watch Wallet Address`;

	/** @see StringsService */
	public readonly newWalletImportAddressInput: string	= `Address`;

	/** @see StringsService */
	public readonly newWalletImportAddressText: string	=
		`Add a read-only wallet to track the following public address:`
	;

	/** @see StringsService */
	public readonly newWalletImportKey: string			= `Import Wallet Key`;

	/** @see StringsService */
	public readonly newWalletImportKeyInput: string		= `WIF Key`;

	/** @see StringsService */
	public readonly newWalletImportKeyText: string		=
		`Import existing wallet private key in WIF format:`
	;

	/** @see StringsService */
	public readonly newWalletName: string				= `Wallet Name`;

	/** @see StringsService */
	public readonly newWalletNameInput: string			= `Wallet Name`;

	/** @see StringsService */
	public readonly newWalletNameText: string			=
		`Name of this wallet:`
	;

	/** @see StringsService */
	public readonly next: string						= `Next`;

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
	public readonly noTransactions: string				= `No transaction history`;

	/** @see StringsService */
	public readonly noWallets: string					= `You have no wallets`;

	/** @see StringsService */
	public readonly ok: string							= `ok`;

	/** @see StringsService */
	public readonly omitted: string						= `(omitted)`;

	/** @see StringsService */
	public readonly oopsTitle: string					= `Oops!`;

	/** @see StringsService */
	public readonly open: string						= `Open`;

	/** @see StringsService */
	public readonly openMenu: string					= `Open Menu`;

	/** @see StringsService */
	public readonly openProfile: string					= `Open Profile`;

	/** @see StringsService */
	public readonly outgoing: string					= `Outgoing`;

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
	public readonly p2pAccountChatNotice: string		=
		`This is an ephemeral chat session available during your call. No logs will be saved.`
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
	public readonly p2pTimeoutIncoming: string			= `Missed call.`;

	/** @see StringsService */
	public readonly p2pTimeoutOutgoing: string			= `Your call was missed.`;

	/** @see StringsService */
	public readonly p2pWarning: string					=
		`This may involve sharing your IP address with your ${this.internalFriend}. ` +
		`Proceed if you trust your ${this.internalFriend}.`
	;

	/** @see StringsService */
	public readonly p2pWarningVPN: string				=
		`This may involve sharing your IP address with your ${this.internalFriend}. ` +
		`Proceed if you trust your ${this.internalFriend} or hide your IP by ` +
		`[connecting through a VPN](https://go.nordvpn.net/SH1F4).`
	;

	/** @see StringsService */
	public readonly p2pWarningAudioPassive: string		= `Starting voice call (P2P).`;

	/** @see StringsService */
	public readonly p2pWarningVideoPassive: string		= `Starting video call (P2P).`;

	/** @see StringsService */
	public readonly pastAppointments: string			= `Appointment History`;

	/** @see StringsService */
	public readonly patents: string						=
		`US Patents 9,906,369 et al.`
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
	public readonly productTelehealth: string			= `${this.internalProductTelehealth}`;

	/** @see StringsService */
	public readonly profile: string						= `profile`;

	/** @see StringsService */
	public readonly profileEdit: string					= `Edit Profile`;

	/** @see StringsService */
	public readonly profileHeader: string				= `Profile`;

	/** @see StringsService */
	public readonly profileSave: string					= `Save Profile`;

	/** @see StringsService */
	public readonly profileVisibility: string			=
		`NOT a security feature — any information in your profile ` +
		`should be considered public regardless. This only controls ` +
		`whether the Cyph client will display it.`
	;

	/** @see StringsService */
	public readonly queuedMessageSaved: string			= `Queued message saved.`;

	/** @see StringsService */
	public readonly reasonForAppointment: string		= `Reason for Appointment`;

	/** @see StringsService */
	public readonly registerErrorInitializing: string	= `Registration form not yet initialized`;

	/** @see StringsService */
	public readonly registerErrorInviteCode: string		= `Invalid invite code`;

	/** @see StringsService */
	public readonly registerErrorLockScreen: string		= `Lock screen password not set`;

	/** @see StringsService */
	public readonly registerErrorMasterKey: string		= `Master key not set`;

	/** @see StringsService */
	public readonly registerErrorName: string			= `Name not set`;

	/** @see StringsService */
	public readonly registerErrorUsername: string		= `Username unavailable`;

	/** @see StringsService */
	public readonly registerTitle: string				= `Register for ${this.internalProduct}`;

	/** @see StringsService */
	public readonly reject: string						= `reject`;

	/** @see StringsService */
	public readonly requestAppointment: string			= `Request Appointment`;

	/** @see StringsService */
	public readonly requestFollowUpAppointment: string	= `Request Follow-Up Appointment`;

	/** @see StringsService */
	public readonly response: string					= `Response`;

	/** @see StringsService */
	public readonly review: string						= `review`;

	/** @see StringsService */
	public readonly reviews: string						= `reviews`;

	/** @see StringsService */
	public readonly s: string							= `'s`;

	/** @see StringsService */
	public readonly save: string						= `save`;

	/** @see StringsService */
	public readonly saveUpperCase: string				= `Save`;

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
	public readonly send: string						= `Send`;

	/** @see StringsService */
	public readonly session: string						= `${this.internalSession}`;

	/** @see StringsService */
	public readonly sessionComplete: string				=
		`${this.internalSession[0].toUpperCase()}${this.internalSession.slice(1)} complete.`
	;

	/** @see StringsService */
	public readonly share: string						= `Share`;

	/** @see StringsService */
	public readonly shareEhrData: string				=
		`You are about to request data about this patient from your organization's EHR system ` +
		`and share it with this patient. If accepted, it will be used to auto-fill forms on ` +
		`their behalf. Continue?`
	;

	/** @see StringsService */
	public readonly shareEhrDataFailure: string			=
		`Sharing medical data failed.`
	;

	/** @see StringsService */
	public readonly shareEhrDataSuccess: string			=
		`Medical data has been shared.`
	;

	/** @see StringsService */
	public readonly shareEhrDataTitle: string			= `Share Medical Data from EHR`;

	/** @see StringsService */
	public readonly signupConfirmTitle: string			= `${this.internalProduct} Signup`;

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
	public readonly submit: string						= `Submit`;

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
	public readonly transactionHistory: string			= `Transaction History`;

	/** @see StringsService */
	public readonly unknown: string						= `Unknown`;

	/** @see StringsService */
	public readonly unlock: string						= `Unlock`;

	/** @see StringsService */
	public readonly unlockedTitle: string				= `${this.internalProduct} Unlocked`;

	/** @see StringsService */
	public readonly unlockPassword: string				= `unlock password`;

	/** @see StringsService */
	public readonly unlockTitle: string					= `Unlock ${this.internalProduct}`;

	/** @see StringsService */
	public readonly untitled: string					= `Untitled`;

	/** @see StringsService */
	public readonly upload: string						= `Upload`;

	/** @see StringsService */
	public readonly uploadFile: string					= `Upload File`;

	/** @see StringsService */
	public readonly user: string						= `User`;

	/** @see StringsService */
	public readonly userAvatar: string					= `User Avatar`;

	/** @see StringsService */
	public readonly usernameCapitalizationHelp: string	=
		`You may change the casing of your username. For example, ` +
		`@johntitor could become @JohnTitor or @JOHNTITOR.`
	;

	/** @see StringsService */
	public readonly users: string						= `Users`;

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
		super();

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
