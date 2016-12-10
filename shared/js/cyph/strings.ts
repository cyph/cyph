import {util} from './util';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
export class Strings {
	/** @see Strings */
	public readonly accept: string			= util.translate(`accept`);

	/** @see Strings */
	public readonly audioCall: string		= util.translate(`call`);

	/** @see Strings */
	public readonly cameraDisable: string	= util.translate(`Disable Camera`);

	/** @see Strings */
	public readonly cameraEnable: string	= util.translate(`Enable Camera`);

	/** @see Strings */
	public readonly cancel: string			= util.translate(`cancel`);

	/** @see Strings */
	public readonly connectedNotification: string	= util.translate(`Connected!`);

	/** @see Strings */
	public readonly contactCyph: string				= util.translate(`Contact Cyph`);

	/** @see Strings */
	public readonly continueDialogAction: string	= util.translate(`continue`);

	/** @see Strings */
	public readonly cypherToast1: string	= util.translate(
		`Prepare to witness the amazing nuts and bolts of Cyph.`
	);

	/** @see Strings */
	public readonly cypherToast2: string	= util.translate(
		`This cyphertext is what outsiders spying on your traffic will see (nothing of value).`
	);

	/** @see Strings */
	public readonly cypherToast3: string	= util.translate(`Thou art amazed.`);

	/** @see Strings */
	public readonly decline: string	= util.translate(`decline`);

	/** @see Strings */
	public readonly discard: string	= util.translate(`discard`);

	/** @see Strings */
	public readonly disconnect: string				= util.translate(`Disconnect`);

	/** @see Strings */
	public readonly disconnectConfirm: string		= util.translate(
		`Are you sure that you wish to disconnect?`
	);

	/** @see Strings */
	public readonly disconnectNotification: string	= util.translate(
		`This cyph has been disconnected.`
	);

	/** @see Strings */
	public readonly disconnectTitle: string		= util.translate(`Disconnect`);

	/** @see Strings */
	public readonly disconnectWarning: string	= util.translate(
		`After closing Cyph, your messages will no longer be retrievable.`
	);

	/** @see Strings */
	public readonly fileCall: string		= util.translate(`file transfer`);

	/** @see Strings */
	public readonly fileTooLarge: string	= util.translate(
		`The file that you are trying to send exceeds the 250 MB attachment limit.`
	);

	/** @see Strings */
	public readonly fileTransferInitFriend: string	= util.translate(
		`Your friend is sending the file:`
	);

	/** @see Strings */
	public readonly fileTransferInitMe: string		= util.translate(
		`You are sending the file:`
	);

	/** @see Strings */
	public readonly formattingHelp: string	= util.translate(`Formatting Help`);

	/** @see Strings */
	public readonly friend: string	= util.translate(`friend`);

	/** @see Strings */
	public readonly help: string	= util.translate(`Help`);

	/** @see Strings */
	public readonly incomingFile: string	= util.translate(`Incoming File:`);

	/** @see Strings */
	public readonly incomingFileDownload: string	= util.translate(
		`Your friend would like to send you a file. Accept the file transfer?`
	);

	/** @see Strings */
	public readonly incomingFileRejected: string	= util.translate(
		`You have rejected the following file transfer:`
	);

	/** @see Strings */
	public readonly incomingFileSave: string		= util.translate(
		`Your friend has sent you a file. It has not been scanned for malware; ` +
		`you may choose to accept it AT YOUR OWN RISK. Save this file?`
	);

	/** @see Strings */
	public readonly introductoryMessage: string	= util.translate(
		`You may now speak.`
	);

	/** @see Strings */
	public readonly invalidCredentials: string	= util.translate(
		`Invalid username or password.`
	);

	/** @see Strings */
	public readonly linkCopied: string		= util.translate(`Cyph link copied.`);

	/** @see Strings */
	public readonly linkExpiresAt: string	= util.translate(`Link expires at`);

	/** @see Strings */
	public readonly me: string	= util.translate(`me`);

	/** @see Strings */
	public readonly message: string		= util.translate(`message`);

	/** @see Strings */
	public readonly messages: string	= util.translate(`messages`);

	/** @see Strings */
	public readonly micDisable: string	= util.translate(`Disable Mic`);

	/** @see Strings */
	public readonly micEnable: string	= util.translate(`Enable Mic`);

	/** @see Strings */
	public readonly new: string		= util.translate(`new`);

	/** @see Strings */
	public readonly newMessageNotification: string	= util.translate(`New message!`);

	/** @see Strings */
	public readonly no: string	= util.translate(`no`);

	/** @see Strings */
	public readonly ok: string	= util.translate(`ok`);

	/** @see Strings */
	public readonly oopsTitle: string	= util.translate(`Oops!`);

	/** @see Strings */
	public readonly outgoingFileRejected: string	= util.translate(
		`Your "friend" has rejected the following file transfer:`
	);

	/** @see Strings */
	public readonly outgoingFileSaved: string	= util.translate(
		`File transfer complete! Your friend has saved the following file:`
	);

	/** @see Strings */
	public readonly p2pConnect: string	= util.translate(`Call has started.`);

	/** @see Strings */
	public readonly p2pDeny: string		= util.translate(
		`Your "friend" has rejected your call.`
	);

	/** @see Strings */
	public readonly p2pDisabled: string	= util.translate(
		`Your or your friend's browser may lack support for video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see Strings */
	public readonly p2pDisabledLocal: string	= util.translate(
		`Your browser does not support voice or video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see Strings */
	public readonly p2pDisconnect: string	= util.translate(
		`Call has been disconnected.`
	);

	/** @see Strings */
	public readonly p2pInit: string		= util.translate(
		`You are about to initiate an encrypted`
	);

	/** @see Strings */
	public readonly p2pRequest: string	= util.translate(
		`Your friend has requested an encrypted`
	);

	/** @see Strings */
	public readonly p2pRequestConfirmation: string	= util.translate(
		`Your request has been sent.`
	);

	/** @see Strings */
	public readonly p2pTitle: string	= util.translate(`Cyph Call`);

	/** @see Strings */
	public readonly p2pWarning: string	= util.translate(
		`This will involve sharing your IP address with your friend (which isn't a problem ` +
		`unless you're actively hiding your current location from them). Continue?`
	);

	/** @see Strings */
	public readonly p2pWarningAudioPassive: string	= util.translate(
		`Starting voice call and P2P connection. ` +
		`If you don't want to continue with the call, close this window now.`
	);

	/** @see Strings */
	public readonly p2pWarningVideoPassive: string	= util.translate(
		`Starting video call and P2P connection. ` +
		`If you don't want to be seen on camera, close this window now.`
	);

	/** @see Strings */
	public readonly queuedMessageSaved: string	= util.translate(`Queued message saved.`);

	/** @see Strings */
	public readonly reject: string	= util.translate(`reject`);

	/** @see Strings */
	public readonly save: string	= util.translate(`save`);

	/** @see Strings */
	public readonly selfDestructActivated: string	= util.translate(
		`Cyph set to self-destruct.`
	);

	/** @see Strings */
	public readonly selfDestructDeactivated: string	= util.translate(
		`Self-destruct deactivated.`
	);

	/** @see Strings */
	public readonly signupMessage1: string	= util.translate(
		`Enjoying the service? Join our waitlist for Cyph v2!`
	);

	/** @see Strings */
	public readonly signupMessage2: string	= util.translate(
		`More details are on the way, but the next version of Cyph will include ` +
		`group messaging, user accounts, and encrypted chat history.`
	);

	/** @see Strings */
	public readonly suregoahead: string		= util.translate(`sure, go ahead`);

	/** @see Strings */
	public readonly timeExtended: string	= util.translate(`Added time to countdown.`);

	/** @see Strings */
	public readonly videoCall: string		= util.translate(`video call`);

	/** @see Strings */
	public readonly warningTitle: string	= util.translate(`Warning`);

	constructor () {}
}

/** @see Strings */
export const strings	= new Strings();
