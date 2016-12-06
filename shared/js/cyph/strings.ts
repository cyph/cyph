import {Util} from './util';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
export class Strings {
	/** @see Strings */
	public static readonly accept: string		= Util.translate(`accept`);

	/** @see Strings */
	public static readonly audioCall: string	= Util.translate(`call`);

	/** @see Strings */
	public static readonly cancel: string		= Util.translate(`cancel`);

	/** @see Strings */
	public static readonly connectedNotification: string	= Util.translate(`Connected!`);

	/** @see Strings */
	public static readonly contactCyph: string				= Util.translate(`Contact Cyph`);

	/** @see Strings */
	public static readonly continueDialogAction: string		= Util.translate(`continue`);

	/** @see Strings */
	public static readonly cypherToast1: string	= Util.translate(
		`Prepare to witness the amazing nuts and bolts of Cyph.`
	);

	/** @see Strings */
	public static readonly cypherToast2: string	= Util.translate(
		`This cyphertext is what outsiders spying on your traffic will see (nothing of value).`
	);

	/** @see Strings */
	public static readonly cypherToast3: string	= Util.translate(`Thou art amazed.`);

	/** @see Strings */
	public static readonly decline: string	= Util.translate(`decline`);

	/** @see Strings */
	public static readonly discard: string	= Util.translate(`discard`);

	/** @see Strings */
	public static readonly disconnect: string				= Util.translate(`Disconnect`);

	/** @see Strings */
	public static readonly disconnectConfirm: string		= Util.translate(
		`Are you sure that you wish to disconnect?`
	);

	/** @see Strings */
	public static readonly disconnectNotification: string	= Util.translate(
		`This cyph has been disconnected.`
	);

	/** @see Strings */
	public static readonly disconnectTitle: string		= Util.translate(`Disconnect`);

	/** @see Strings */
	public static readonly disconnectWarning: string	= Util.translate(
		`After closing Cyph, your messages will no longer be retrievable.`
	);

	/** @see Strings */
	public static readonly fileCall: string		= Util.translate(`file transfer`);

	/** @see Strings */
	public static readonly fileTooLarge: string	= Util.translate(
		`The file that you are trying to send exceeds the 250 MB attachment limit.`
	);

	/** @see Strings */
	public static readonly fileTransferInitFriend: string	= Util.translate(
		`Your friend is sending the file:`
	);

	/** @see Strings */
	public static readonly fileTransferInitMe: string		= Util.translate(
		`You are sending the file:`
	);

	/** @see Strings */
	public static readonly formattingHelp: string	= Util.translate(`Formatting Help`);

	/** @see Strings */
	public static readonly friend: string	= Util.translate(`friend`);

	/** @see Strings */
	public static readonly help: string		= Util.translate(`Help`);

	/** @see Strings */
	public static readonly incomingFile: string	= Util.translate(`Incoming File:`);

	/** @see Strings */
	public static readonly incomingFileDownload: string	= Util.translate(
		`Your friend would like to send you a file. Accept the file transfer?`
	);

	/** @see Strings */
	public static readonly incomingFileRejected: string	= Util.translate(
		`You have rejected the following file transfer:`
	);

	/** @see Strings */
	public static readonly incomingFileSave: string		= Util.translate(
		`Your friend has sent you a file. It has not been scanned for malware; ` +
		`you may choose to accept it AT YOUR OWN RISK. Save this file?`
	);

	/** @see Strings */
	public static readonly introductoryMessage: string	= Util.translate(
		`You may now speak.`
	);

	/** @see Strings */
	public static readonly linkCopied: string		= Util.translate(`Cyph link copied.`);

	/** @see Strings */
	public static readonly linkExpiresAt: string	= Util.translate(`Link expires at`);

	/** @see Strings */
	public static readonly me: string	= Util.translate(`me`);

	/** @see Strings */
	public static readonly newMessageNotification: string	= Util.translate(`New message!`);

	/** @see Strings */
	public static readonly no: string	= Util.translate(`no`);

	/** @see Strings */
	public static readonly ok: string	= Util.translate(`ok`);

	/** @see Strings */
	public static readonly oopsTitle: string	= Util.translate(`Oops!`);

	/** @see Strings */
	public static readonly outgoingFileRejected: string	= Util.translate(
		`Your "friend" has rejected the following file transfer:`
	);

	/** @see Strings */
	public static readonly outgoingFileSaved: string	= Util.translate(
		`File transfer complete! Your friend has saved the following file:`
	);

	/** @see Strings */
	public static readonly p2pConnect: string	= Util.translate(`Call has started.`);

	/** @see Strings */
	public static readonly p2pDeny: string		= Util.translate(
		`Your "friend" has rejected your call.`
	);

	/** @see Strings */
	public static readonly p2pDisabled: string	= Util.translate(
		`Your or your friend's browser may lack support for video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see Strings */
	public static readonly p2pDisabledLocal: string	= Util.translate(
		`Your browser does not support voice or video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see Strings */
	public static readonly p2pDisconnect: string	= Util.translate(
		`Call has been disconnected.`
	);

	/** @see Strings */
	public static readonly p2pInit: string		= Util.translate(
		`You are about to initiate an encrypted`
	);

	/** @see Strings */
	public static readonly p2pRequest: string	= Util.translate(
		`Your friend has requested an encrypted`
	);

	/** @see Strings */
	public static readonly p2pRequestConfirmation: string	= Util.translate(
		`Your request has been sent.`
	);

	/** @see Strings */
	public static readonly p2pTitle: string		= Util.translate(`Cyph Call`);

	/** @see Strings */
	public static readonly p2pWarning: string	= Util.translate(
		`This will involve sharing your IP address with your friend (which isn't a problem ` +
		`unless you're actively hiding your current location from them). Continue?`
	);

	/** @see Strings */
	public static readonly p2pWarningAudioPassive: string	= Util.translate(
		`Starting voice call and P2P connection. ` +
		`If you don't want to continue with the call, close this window now.`
	);

	/** @see Strings */
	public static readonly p2pWarningVideoPassive: string	= Util.translate(
		`Starting video call and P2P connection. ` +
		`If you don't want to be seen on camera, close this window now.`
	);

	/** @see Strings */
	public static readonly queuedMessageSaved: string	= Util.translate(`Queued message saved.`);

	/** @see Strings */
	public static readonly reject: string	= Util.translate(`reject`);

	/** @see Strings */
	public static readonly save: string		= Util.translate(`save`);

	/** @see Strings */
	public static readonly selfDestructActivated: string	= Util.translate(
		`Cyph set to self-destruct.`
	);

	/** @see Strings */
	public static readonly selfDestructDeactivated: string	= Util.translate(
		`Self-destruct deactivated.`
	);

	/** @see Strings */
	public static readonly signupMessage1: string	= Util.translate(
		`Enjoying the service? Join our waitlist for Cyph v2!`
	);

	/** @see Strings */
	public static readonly signupMessage2: string	= Util.translate(
		`More details are on the way, but the next version of Cyph will include ` +
		`group messaging, user accounts, and encrypted chat history.`
	);

	/** @see Strings */
	public static readonly suregoahead: string	= Util.translate(`sure, go ahead`);

	/** @see Strings */
	public static readonly timeExtended: string	= Util.translate(`Added time to countdown.`);

	/** @see Strings */
	public static readonly videoCall: string	= Util.translate(`video call`);

	/** @see Strings */
	public static readonly warningTitle: string	= Util.translate(`Warning`);
}
