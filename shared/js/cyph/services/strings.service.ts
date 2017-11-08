import {Injectable} from '@angular/core';
import {translate} from '../util/translate';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
@Injectable()
export class StringsService {
	/** @see StringsService */
	public readonly accept: string					= translate(`accept`);

	/** @see StringsService */
	public readonly audioCall: string				= translate(`call`);

	/** @see StringsService */
	public readonly cameraDisable: string			= translate(`Disable Camera`);

	/** @see StringsService */
	public readonly cameraEnable: string			= translate(`Enable Camera`);

	/** @see StringsService */
	public readonly cancel: string					= translate(`cancel`);

	/** @see StringsService */
	public readonly connectedNotification: string	= translate(`Connected!`);

	/** @see StringsService */
	public readonly contactCyph: string				= translate(`Contact Cyph`);

	/** @see StringsService */
	public readonly continueDialogAction: string	= translate(`continue`);

	/** @see StringsService */
	public readonly cypherToast1: string			= translate(
		`Prepare to witness the amazing nuts and bolts of Cyph.`
	);

	/** @see StringsService */
	public readonly cypherToast2: string			= translate(
		`This cyphertext is what outsiders spying on your traffic will see (nothing of value).`
	);

	/** @see StringsService */
	public readonly cypherToast3: string			= translate(`Thou art amazed.`);

	/** @see StringsService */
	public readonly decline: string					= translate(`decline`);

	/** @see StringsService */
	public readonly defaultDescription: string		= translate(
		`Check out my lit new video ;). https://youtu.be/oHg5SJYRHA0`
	);

	/** @see StringsService */
	public readonly deleteConfirm: string			= translate(`Confirm Deletion`);

	/** @see StringsService */
	public readonly deleteMessage: string			= translate(`Delete`);

	/** @see StringsService */
	public readonly discard: string					= translate(`discard`);

	/** @see StringsService */
	public readonly disconnect: string				= translate(`Disconnect`);

	/** @see StringsService */
	public readonly disconnectConfirm: string		= translate(
		`Are you sure that you wish to disconnect?`
	);

	/** @see StringsService */
	public readonly disconnectNotification: string	= translate(
		`This cyph has been disconnected.`
	);

	/** @see StringsService */
	public readonly disconnectTitle: string			= translate(`Disconnect`);

	/** @see StringsService */
	public readonly disconnectWarning: string		= translate(
		`After closing Cyph, your messages will no longer be retrievable.`
	);

	/** @see StringsService */
	public readonly doctor: string					= translate(`doctor`);

	/** @see StringsService */
	public readonly fileCall: string				= translate(`file transfer`);

	/** @see StringsService */
	public readonly fileTooLarge: string			= translate(
		`The file that you are trying to send exceeds the 250 MB attachment limit.`
	);

	/** @see StringsService */
	public readonly fileTransferInitFriend: string	= translate(
		`Your friend is sending the file:`
	);

	/** @see StringsService */
	public readonly fileTransferInitMe: string		= translate(
		`You are sending the file:`
	);

	/** @see StringsService */
	public readonly formattingHelp: string			= translate(`Formatting Help`);

	/** @see StringsService */
	public readonly friend: string					= translate(`friend`);

	/** @see StringsService */
	public readonly help: string					= translate(`Help`);

	/** @see StringsService */
	public readonly incomingFile: string			= translate(`Incoming File:`);

	/** @see StringsService */
	public readonly incomingFileDownload: string	= translate(
		`Your friend would like to send you a file. Accept the file transfer?`
	);

	/** @see StringsService */
	public readonly incomingFileRejected: string	= translate(
		`You have rejected the following file transfer:`
	);

	/** @see StringsService */
	public readonly incomingFileSave: string		= translate(
		`Your friend has sent you a file. It has not been scanned for malware; ` +
		`you may choose to accept it AT YOUR OWN RISK. Save this file?`
	);

	/** @see StringsService */
	public readonly incomingFileSaveError: string	= translate(
		`Failed to save the following file:`
	);

	/** @see StringsService */
	public readonly introductoryMessage: string		= translate(
		`You may now speak.`
	);

	/** @see StringsService */
	public readonly invalidCredentials: string		= translate(
		`Invalid username or password.`
	);

	/** @see StringsService */
	public readonly invalidPassword: string			= translate(
		`Invalid password.`
	);

	/** @see StringsService */
	public readonly linkCopied: string				= translate(`Cyph link copied.`);

	/** @see StringsService */
	public readonly linkCopyFail: string			= translate(
		`Automated clipboard copy unsupported in this browser.`
	);

	/** @see StringsService */
	public readonly linkExpiresAt: string			= translate(`Link expires at`);

	/** @see StringsService */
	public readonly me: string						= translate(`me`);

	/** @see StringsService */
	public readonly message: string					= translate(`message`);

	/** @see StringsService */
	public readonly messageConfirmed: string		= translate(
		`Message delivery confirmed`
	);

	/** @see StringsService */
	public readonly messages: string				= translate(`messages`);

	/** @see StringsService */
	public readonly messageUnconfirmed: string		= translate(
		`Message delivery unconfirmed`
	);

	/** @see StringsService */
	public readonly micDisable: string				= translate(`Disable Mic`);

	/** @see StringsService */
	public readonly micEnable: string				= translate(`Enable Mic`);

	/** @see StringsService */
	public readonly newMessageNotification: string	= translate(`New message!`);

	/** @see StringsService */
	public readonly newString: string				= translate(`new`);

	/** @see StringsService */
	public readonly no: string						= translate(`no`);

	/** @see StringsService */
	public readonly noteSaved: string				= translate(`Note saved!`);

	/** @see StringsService */
	public readonly ok: string						= translate(`ok`);

	/** @see StringsService */
	public readonly omitted: string					= translate(`(omitted)`);

	/** @see StringsService */
	public readonly oopsTitle: string				= translate(`Oops!`);

	/** @see StringsService */
	public readonly outgoingFileError: string		= translate(
		`Failed to send the following file:`
	);

	/** @see StringsService */
	public readonly outgoingFileRejected: string	= translate(
		`Your "friend" has rejected the following file transfer:`
	);

	/** @see StringsService */
	public readonly outgoingFileSaved: string		= translate(
		`File transfer complete! Your friend has saved the following file:`
	);

	/** @see StringsService */
	public readonly p2pConnect: string				= translate(`Call has started.`);

	/** @see StringsService */
	public readonly p2pDeny: string					= translate(
		`Your "friend" has rejected your call.`
	);

	/** @see StringsService */
	public readonly p2pDisabled: string				= translate(
		`Your or your friend's browser may lack support for video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see StringsService */
	public readonly p2pDisabledLocal: string		= translate(
		`Your browser does not support voice or video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see StringsService */
	public readonly p2pDisabledLocalIOS: string		= translate(
		`Voice/video calling is currently unsupported on iOS. ` +
		`However, it will be supported after the upcoming release of iOS 11.`
	);

	/** @see StringsService */
	public readonly p2pDisconnect: string			= translate(
		`Call has been disconnected.`
	);

	/** @see StringsService */
	public readonly p2pInit: string					= translate(
		`You are about to initiate an encrypted`
	);

	/** @see StringsService */
	public readonly p2pRequest: string				= translate(
		`Your friend has requested an encrypted`
	);

	/** @see StringsService */
	public readonly p2pRequestConfirmation: string	= translate(
		`Your request has been sent.`
	);

	/** @see StringsService */
	public readonly p2pTitle: string				= translate(`Cyph Call`);

	/** @see StringsService */
	public readonly p2pWarning: string				= translate(
		`This will involve sharing your IP address with your friend (which isn't a problem ` +
		`unless you're actively hiding your current location from them). Continue?`
	);

	/** @see StringsService */
	public readonly p2pWarningAudioPassive: string	= translate(
		`Starting voice call (P2P). Close this window to abort.`
	);

	/** @see StringsService */
	public readonly p2pWarningVideoPassive: string	= translate(
		`Starting video call (P2P). Close this window to abort.`
	);

	/** @see StringsService */
	public readonly patient: string					= translate(`patient`);

	/** @see StringsService */
	public readonly queuedMessageSaved: string		= translate(`Queued message saved.`);

	/** @see StringsService */
	public readonly reject: string					= translate(`reject`);

	/** @see StringsService */
	public readonly save: string					= translate(`save`);

	/** @see StringsService */
	public readonly selfDestructActivated: string	= translate(
		`Cyph set to self-destruct.`
	);

	/** @see StringsService */
	public readonly selfDestructDeactivated: string	= translate(
		`Self-destruct deactivated.`
	);

	/** @see StringsService */
	public readonly signupFailed: string			= translate(
		`Signup failed. Please try again later.`
	);

	/** @see StringsService */
	public readonly signupMessage: string			= translate(
		`Enjoying the service? Join our waitlist for Cyph v2! ` +
		`More details are on the way, but the next version of Cyph will include ` +
		`group messaging, user accounts, and encrypted chat history.`
	);

	/** @see StringsService */
	public readonly suregoahead: string				= translate(`sure, go ahead`);

	/** @see StringsService */
	public readonly timeExtended: string			= translate(`Added time to countdown.`);

	/** @see StringsService */
	public readonly titleRequired: string			= translate(`Title required in order to save.`);

	/** @see StringsService */
	public readonly videoCall: string				= translate(`video call`);

	/** @see StringsService */
	public readonly warningTitle: string			= translate(`Warning`);

	constructor () {}
}
