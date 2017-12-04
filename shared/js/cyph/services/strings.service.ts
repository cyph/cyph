import {Injectable} from '@angular/core';
import {translate} from '../util/translate';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
@Injectable()
export class StringsService {
	/** @see StringsService */
	public readonly accept: string					= `accept`;

	/** @see StringsService */
	public readonly audioCall: string				= `call`;

	/** @see StringsService */
	public readonly cameraDisable: string			= `Disable Camera`;

	/** @see StringsService */
	public readonly cameraEnable: string			= `Enable Camera`;

	/** @see StringsService */
	public readonly cancel: string					= `cancel`;

	/** @see StringsService */
	public readonly connectedNotification: string	= `Connected!`;

	/** @see StringsService */
	public readonly contactCyph: string				= `Contact Cyph`;

	/** @see StringsService */
	public readonly continueDialogAction: string	= `continue`;

	/** @see StringsService */
	public readonly cypherToast1: string			=
		`Prepare to witness the amazing nuts and bolts of Cyph.`
	;

	/** @see StringsService */
	public readonly cypherToast2: string			=
		`This cyphertext is what outsiders spying on your traffic will see (nothing of value).`
	;

	/** @see StringsService */
	public readonly cypherToast3: string			= `Thou art amazed.`;

	/** @see StringsService */
	public readonly decline: string					= `decline`;

	/** @see StringsService */
	public readonly defaultDescription: string		=
		`Check out my lit new video ;). https://youtu.be/oHg5SJYRHA0`
	;

	/** @see StringsService */
	public readonly deleteConfirm: string			= `Confirm Deletion`;

	/** @see StringsService */
	public readonly deleteMessage: string			= `Delete`;

	/** @see StringsService */
	public readonly discard: string					= `discard`;

	/** @see StringsService */
	public readonly disconnect: string				= `Disconnect`;

	/** @see StringsService */
	public readonly disconnectConfirm: string		=
		`Are you sure that you wish to disconnect?`
	;

	/** @see StringsService */
	public readonly disconnectNotification: string	=
		`This cyph has been disconnected.`
	;

	/** @see StringsService */
	public readonly disconnectTitle: string			= `Disconnect`;

	/** @see StringsService */
	public readonly disconnectWarning: string		=
		`After closing Cyph, your messages will no longer be retrievable.`
	;

	/** @see StringsService */
	public readonly doctor: string					= `doctor`;

	/** @see StringsService */
	public readonly fileCall: string				= `file transfer`;

	/** @see StringsService */
	public readonly fileTooLarge: string			=
		`The file that you are trying to send exceeds the 250 MB attachment limit.`
	;

	/** @see StringsService */
	public readonly fileTransferInitFriend: string	=
		`Your friend is sending the file:`
	;

	/** @see StringsService */
	public readonly fileTransferInitMe: string		=
		`You are sending the file:`
	;

	/** @see StringsService */
	public readonly formattingHelp: string			= `Formatting Help`;

	/** @see StringsService */
	public readonly friend: string					= `friend`;

	/** @see StringsService */
	public readonly help: string					= `Help`;

	/** @see StringsService */
	public readonly incomingFile: string			= `Incoming File:`;

	/** @see StringsService */
	public readonly incomingFileDownload: string	=
		`Your friend would like to send you a file. Accept the file transfer?`
	;

	/** @see StringsService */
	public readonly incomingFileRejected: string	=
		`You have rejected the following file transfer:`
	;

	/** @see StringsService */
	public readonly incomingFileSave: string		=
		`Your friend has sent you a file. It has not been scanned for malware; ` +
		`you may choose to accept it AT YOUR OWN RISK. Save this file?`
	;

	/** @see StringsService */
	public readonly incomingFileSaveError: string	=
		`Failed to save the following file:`
	;

	/** @see StringsService */
	public readonly introductoryMessage: string		=
		`You may now speak.`
	;

	/** @see StringsService */
	public readonly invalidCredentials: string		=
		`Invalid username or master key.`
	;

	/** @see StringsService */
	public readonly invalidPassword: string			=
		`Invalid password.`
	;

	/** @see StringsService */
	public readonly invalidPIN: string				=
		`Invalid PIN.`
	;

	/** @see StringsService */
	public readonly linkCopied: string				= `Cyph link copied.`;

	/** @see StringsService */
	public readonly linkCopyFail: string			=
		`Automated clipboard copy unsupported in this browser.`
	;

	/** @see StringsService */
	public readonly linkExpiresAt: string			= `Link expires at`;

	/** @see StringsService */
	public readonly logIn: string					= `Log In`;

	/** @see StringsService */
	public readonly masterKey: string				= `Master Key`;

	/** @see StringsService */
	public readonly me: string						= `me`;

	/** @see StringsService */
	public readonly message: string					= `message`;

	/** @see StringsService */
	public readonly messageConfirmed: string		=
		`Message delivery confirmed`
	;

	/** @see StringsService */
	public readonly messages: string				= `messages`;

	/** @see StringsService */
	public readonly messageUnconfirmed: string		=
		`Message delivery unconfirmed`
	;

	/** @see StringsService */
	public readonly micDisable: string				= `Disable Mic`;

	/** @see StringsService */
	public readonly micEnable: string				= `Enable Mic`;

	/** @see StringsService */
	public readonly newMessageNotification: string	= `New message!`;

	/** @see StringsService */
	public readonly newString: string				= `new`;

	/** @see StringsService */
	public readonly no: string						= `no`;

	/** @see StringsService */
	public readonly noteSaved: string				= `Note saved!`;

	/** @see StringsService */
	public readonly ok: string						= `ok`;

	/** @see StringsService */
	public readonly omitted: string					= `(omitted)`;

	/** @see StringsService */
	public readonly oopsTitle: string				= `Oops!`;

	/** @see StringsService */
	public readonly outgoingFileError: string		=
		`Failed to send the following file:`
	;

	/** @see StringsService */
	public readonly outgoingFileRejected: string	=
		`Your "friend" has rejected the following file transfer:`
	;

	/** @see StringsService */
	public readonly outgoingFileSaved: string		=
		`File transfer complete! Your friend has saved the following file:`
	;

	/** @see StringsService */
	public readonly p2pConnect: string				= `Call has started.`;

	/** @see StringsService */
	public readonly p2pDeny: string					=
		`Your "friend" has rejected your call.`
	;

	/** @see StringsService */
	public readonly p2pDisabled: string				=
		`Your or your friend's browser may lack support for video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	;

	/** @see StringsService */
	public readonly p2pDisabledLocal: string		=
		`Your browser does not support voice or video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	;

	/** @see StringsService */
	public readonly p2pDisabledLocalIOS: string		=
		`Voice/video calling is currently unsupported on iOS.`
	;

	/** @see StringsService */
	public readonly p2pDisconnect: string			=
		`Call has been disconnected.`
	;

	/** @see StringsService */
	public readonly p2pInit: string					=
		`You are about to initiate an encrypted`
	;

	/** @see StringsService */
	public readonly p2pRequest: string				=
		`Your friend has requested an encrypted`
	;

	/** @see StringsService */
	public readonly p2pRequestConfirmation: string	=
		`Your request has been sent.`
	;

	/** @see StringsService */
	public readonly p2pTitle: string				= `Cyph Call`;

	/** @see StringsService */
	public readonly p2pWarning: string				=
		`This will involve sharing your IP address with your friend (which isn't a problem ` +
		`unless you're actively hiding your current location from them). Continue?`
	;

	/** @see StringsService */
	public readonly p2pWarningAudioPassive: string	=
		`Starting voice call (P2P). Close this window to abort.`
	;

	/** @see StringsService */
	public readonly p2pWarningVideoPassive: string	=
		`Starting video call (P2P). Close this window to abort.`
	;

	/** @see StringsService */
	public readonly patient: string					= `patient`;

	/** @see StringsService */
	public readonly pin: string						= `PIN`;

	/** @see StringsService */
	public readonly queuedMessageSaved: string		= `Queued message saved.`;

	/** @see StringsService */
	public readonly reject: string					= `reject`;

	/** @see StringsService */
	public readonly save: string					= `save`;

	/** @see StringsService */
	public readonly selfDestructActivated: string	=
		`Cyph set to self-destruct.`
	;

	/** @see StringsService */
	public readonly selfDestructDeactivated: string	=
		`Self-destruct deactivated.`
	;

	/** @see StringsService */
	public readonly signupFailed: string			=
		`Signup failed. Please try again later.`
	;

	/** @see StringsService */
	public readonly signupMessage: string			=
		`Enjoying the service? Join our waitlist for Cyph v2! ` +
		`More details are on the way, but the next version of Cyph will include ` +
		`group messaging, user accounts, and encrypted chat history.`
	;

	/** @see StringsService */
	public readonly suregoahead: string				= `sure, go ahead`;

	/** @see StringsService */
	public readonly timeExtended: string			= `Added time to countdown.`;

	/** @see StringsService */
	public readonly titleRequired: string			= `Title required in order to save.`;

	/** @see StringsService */
	public readonly unlock: string					= `Unlock`;

	/** @see StringsService */
	public readonly videoCall: string				= `video call`;

	/** @see StringsService */
	public readonly warningTitle: string			= `Warning`;

	constructor () {
		/* tslint:disable-next-line:no-this-assignment */
		const strings: {[k: string]: any}	= this;

		for (const k of Object.keys(strings)) {
			const s	= strings[k];
			if (typeof s !== 'string') {
				continue;
			}

			strings[k]	= translate(customBuildStrings[k] || s);
		}
	}
}
