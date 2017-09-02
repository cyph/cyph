import {Injectable} from '@angular/core';
import {util} from '../util';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
@Injectable()
export class StringsService {
	/** @see StringsService */
	public readonly accept: string					= util.translate(`accept`);

	/** @see StringsService */
	public readonly audioCall: string				= util.translate(`call`);

	/** @see StringsService */
	public readonly cameraDisable: string			= util.translate(`Disable Camera`);

	/** @see StringsService */
	public readonly cameraEnable: string			= util.translate(`Enable Camera`);

	/** @see StringsService */
	public readonly cancel: string					= util.translate(`cancel`);

	/** @see StringsService */
	public readonly connectedNotification: string	= util.translate(`Connected!`);

	/** @see StringsService */
	public readonly contactCyph: string				= util.translate(`Contact Cyph`);

	/** @see StringsService */
	public readonly continueDialogAction: string	= util.translate(`continue`);

	/** @see StringsService */
	public readonly cypherToast1: string			= util.translate(
		`Prepare to witness the amazing nuts and bolts of Cyph.`
	);

	/** @see StringsService */
	public readonly cypherToast2: string			= util.translate(
		`This cyphertext is what outsiders spying on your traffic will see (nothing of value).`
	);

	/** @see StringsService */
	public readonly cypherToast3: string			= util.translate(`Thou art amazed.`);

	/** @see StringsService */
	public readonly decline: string					= util.translate(`decline`);

	/** @see StringsService */
	public readonly deleteConfirm: string			= util.translate(`Confirm Deletion`);

	/** @see StringsService */
	public readonly deleteMessage: string			= util.translate(`Delete`);

	/** @see StringsService */
	public readonly discard: string					= util.translate(`discard`);

	/** @see StringsService */
	public readonly disconnect: string				= util.translate(`Disconnect`);

	/** @see StringsService */
	public readonly disconnectConfirm: string		= util.translate(
		`Are you sure that you wish to disconnect?`
	);

	/** @see StringsService */
	public readonly disconnectNotification: string	= util.translate(
		`This cyph has been disconnected.`
	);

	/** @see StringsService */
	public readonly disconnectTitle: string			= util.translate(`Disconnect`);

	/** @see StringsService */
	public readonly disconnectWarning: string		= util.translate(
		`After closing Cyph, your messages will no longer be retrievable.`
	);

	/** @see StringsService */
	public readonly doctor: string					= util.translate(`doctor`);

	/** @see StringsService */
	public readonly fileCall: string				= util.translate(`file transfer`);

	/** @see StringsService */
	public readonly fileTooLarge: string			= util.translate(
		`The file that you are trying to send exceeds the 250 MB attachment limit.`
	);

	/** @see StringsService */
	public readonly fileTransferInitFriend: string	= util.translate(
		`Your friend is sending the file:`
	);

	/** @see StringsService */
	public readonly fileTransferInitMe: string		= util.translate(
		`You are sending the file:`
	);

	/** @see StringsService */
	public readonly formattingHelp: string			= util.translate(`Formatting Help`);

	/** @see StringsService */
	public readonly friend: string					= util.translate(`friend`);

	/** @see StringsService */
	public readonly help: string					= util.translate(`Help`);

	/** @see StringsService */
	public readonly incomingFile: string			= util.translate(`Incoming File:`);

	/** @see StringsService */
	public readonly incomingFileDownload: string	= util.translate(
		`Your friend would like to send you a file. Accept the file transfer?`
	);

	/** @see StringsService */
	public readonly incomingFileRejected: string	= util.translate(
		`You have rejected the following file transfer:`
	);

	/** @see StringsService */
	public readonly incomingFileSave: string		= util.translate(
		`Your friend has sent you a file. It has not been scanned for malware; ` +
		`you may choose to accept it AT YOUR OWN RISK. Save this file?`
	);

	/** @see StringsService */
	public readonly incomingFileSaveError: string	= util.translate(
		`Failed to save the following file:`
	);

	/** @see StringsService */
	public readonly introductoryMessage: string		= util.translate(
		`You may now speak.`
	);

	/** @see StringsService */
	public readonly invalidCredentials: string		= util.translate(
		`Invalid username or password.`
	);

	/** @see StringsService */
	public readonly invalidPassword: string			= util.translate(
		`Invalid password.`
	);

	/** @see StringsService */
	public readonly linkCopied: string				= util.translate(`Cyph link copied.`);

	/** @see StringsService */
	public readonly linkCopyFail: string			= util.translate(
		`Automated clipboard copy unsupported in this browser.`
	);

	/** @see StringsService */
	public readonly linkExpiresAt: string			= util.translate(`Link expires at`);

	/** @see StringsService */
	public readonly me: string						= util.translate(`me`);

	/** @see StringsService */
	public readonly message: string					= util.translate(`message`);

	/** @see StringsService */
	public readonly messages: string				= util.translate(`messages`);

	/** @see StringsService */
	public readonly micDisable: string				= util.translate(`Disable Mic`);

	/** @see StringsService */
	public readonly micEnable: string				= util.translate(`Enable Mic`);

	/** @see StringsService */
	public readonly newMessageNotification: string	= util.translate(`New message!`);

	/** @see StringsService */
	public readonly newString: string				= util.translate(`new`);

	/** @see StringsService */
	public readonly no: string						= util.translate(`no`);

	/** @see StringsService */
	public readonly noteSaved: string				= util.translate(`Note saved!`);

	/** @see StringsService */
	public readonly ok: string						= util.translate(`ok`);

	/** @see StringsService */
	public readonly oopsTitle: string				= util.translate(`Oops!`);

	/** @see StringsService */
	public readonly outgoingFileError: string		= util.translate(
		`Failed to send the following file:`
	);

	/** @see StringsService */
	public readonly outgoingFileRejected: string	= util.translate(
		`Your "friend" has rejected the following file transfer:`
	);

	/** @see StringsService */
	public readonly outgoingFileSaved: string		= util.translate(
		`File transfer complete! Your friend has saved the following file:`
	);

	/** @see StringsService */
	public readonly p2pConnect: string				= util.translate(`Call has started.`);

	/** @see StringsService */
	public readonly p2pDeny: string					= util.translate(
		`Your "friend" has rejected your call.`
	);

	/** @see StringsService */
	public readonly p2pDisabled: string				= util.translate(
		`Your or your friend's browser may lack support for video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see StringsService */
	public readonly p2pDisabledLocal: string		= util.translate(
		`Your browser does not support voice or video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see StringsService */
	public readonly p2pDisabledLocalIOS: string		= util.translate(
		`Voice/video calling is currently unsupported on iOS. ` +
		`However, it will be supported after the upcoming release of iOS 11.`
	);

	/** @see StringsService */
	public readonly p2pDisconnect: string			= util.translate(
		`Call has been disconnected.`
	);

	/** @see StringsService */
	public readonly p2pInit: string					= util.translate(
		`You are about to initiate an encrypted`
	);

	/** @see StringsService */
	public readonly p2pRequest: string				= util.translate(
		`Your friend has requested an encrypted`
	);

	/** @see StringsService */
	public readonly p2pRequestConfirmation: string	= util.translate(
		`Your request has been sent.`
	);

	/** @see StringsService */
	public readonly p2pTitle: string				= util.translate(`Cyph Call`);

	/** @see StringsService */
	public readonly p2pWarning: string				= util.translate(
		`This will involve sharing your IP address with your friend (which isn't a problem ` +
		`unless you're actively hiding your current location from them). Continue?`
	);

	/** @see StringsService */
	public readonly p2pWarningAudioPassive: string	= util.translate(
		`Starting voice call (P2P). Close this window to abort.`
	);

	/** @see StringsService */
	public readonly p2pWarningVideoPassive: string	= util.translate(
		`Starting video call (P2P). Close this window to abort.`
	);

	/** @see StringsService */
	public readonly patient: string					= util.translate(`patient`);

	/** @see StringsService */
	public readonly queuedMessageSaved: string		= util.translate(`Queued message saved.`);

	/** @see StringsService */
	public readonly reject: string					= util.translate(`reject`);

	/** @see StringsService */
	public readonly save: string					= util.translate(`save`);

	/** @see StringsService */
	public readonly selfDestructActivated: string	= util.translate(
		`Cyph set to self-destruct.`
	);

	/** @see StringsService */
	public readonly selfDestructDeactivated: string	= util.translate(
		`Self-destruct deactivated.`
	);

	/** @see StringsService */
	public readonly signupMessage: string			= util.translate(
		`Enjoying the service? Join our waitlist for Cyph v2! ` +
		`More details are on the way, but the next version of Cyph will include ` +
		`group messaging, user accounts, and encrypted chat history.`
	);

	/** @see StringsService */
	public readonly suregoahead: string				= util.translate(`sure, go ahead`);

	/** @see StringsService */
	public readonly timeExtended: string			= util.translate(`Added time to countdown.`);

	/** @see StringsService */
	public readonly titleRequired: string			= util.translate(`Title required in order to save.`);

	/** @see StringsService */
	public readonly videoCall: string				= util.translate(`video call`);

	/** @see StringsService */
	public readonly warningTitle: string			= util.translate(`Warning`);

	constructor () {}
}
