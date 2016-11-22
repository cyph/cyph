import {Util} from './util';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
export class Strings {
	/** @see Strings */
	public static accept: string	= Util.translate(`accept`);

	/** @see Strings */
	public static audioCall: string	= Util.translate(`call`);

	/** @see Strings */
	public static cancel: string	= Util.translate(`cancel`);

	/** @see Strings */
	public static connectedNotification: string	= Util.translate(`Connected!`);

	/** @see Strings */
	public static continueDialogAction: string	= Util.translate(`continue`);

	/** @see Strings */
	public static cypherToast1: string	= Util.translate(
		`Prepare to witness the amazing nuts and bolts of Cyph.`
	);

	/** @see Strings */
	public static cypherToast2: string	= Util.translate(
		`This cyphertext is what outsiders spying on your traffic will see (nothing of value).`
	);

	/** @see Strings */
	public static cypherToast3: string	= Util.translate(`Thou art amazed.`);

	/** @see Strings */
	public static decline: string	= Util.translate(`decline`);

	/** @see Strings */
	public static discard: string	= Util.translate(`discard`);

	/** @see Strings */
	public static disconnectConfirm: string	= Util.translate(
		`Are you sure that you wish to disconnect?`
	);

	/** @see Strings */
	public static disconnectNotification: string	= Util.translate(
		`This cyph has been disconnected.`
	);

	/** @see Strings */
	public static disconnectTitle: string	= Util.translate(`Disconnect`);

	/** @see Strings */
	public static disconnectWarning: string	= Util.translate(
		`After closing Cyph, your messages will no longer be retrievable.`
	);

	/** @see Strings */
	public static fileCall: string	= Util.translate(`file transfer`);

	/** @see Strings */
	public static fileTooLarge: string	= Util.translate(
		`The file that you are trying to send exceeds the 250 MB attachment limit.`
	);

	/** @see Strings */
	public static fileTransferInitFriend: string	= Util.translate(
		`Your friend is sending the file:`
	);

	/** @see Strings */
	public static fileTransferInitMe: string	= Util.translate(`You are sending the file:`);

	/** @see Strings */
	public static friend: string	= Util.translate(`friend`);

	/** @see Strings */
	public static incomingFile: string	= Util.translate(`Incoming File:`);

	/** @see Strings */
	public static incomingFileDownload: string	= Util.translate(
		`Your friend would like to send you a file. Accept the file transfer?`
	);

	/** @see Strings */
	public static incomingFileRejected: string	= Util.translate(
		`You have rejected the following file transfer:`
	);

	/** @see Strings */
	public static incomingFileSave: string	= Util.translate(
		`Your friend has sent you a file. It has not been scanned for malware; ` +
		`you may choose to accept it AT YOUR OWN RISK. Save this file?`
	);

	/** @see Strings */
	public static introductoryMessage: string	= Util.translate(`You may now speak.`);

	/** @see Strings */
	public static linkCopied: string	= Util.translate(`Cyph link copied.`);

	/** @see Strings */
	public static linkExpiresAt: string	= Util.translate(`Link expires at`);

	/** @see Strings */
	public static me: string	= Util.translate(`me`);

	/** @see Strings */
	public static newMessageNotification: string	= Util.translate(`New message!`);

	/** @see Strings */
	public static no: string	= Util.translate(`no`);

	/** @see Strings */
	public static ok: string	= Util.translate(`ok`);

	/** @see Strings */
	public static oopsTitle: string	= Util.translate(`Oops!`);

	/** @see Strings */
	public static outgoingFileRejected: string	= Util.translate(
		`Your "friend" has rejected the following file transfer:`
	);

	/** @see Strings */
	public static outgoingFileSaved: string	= Util.translate(
		`File transfer complete! Your friend has saved the following file:`
	);

	/** @see Strings */
	public static p2pConnect: string	= Util.translate(`Call has started.`);

	/** @see Strings */
	public static p2pDeny: string	= Util.translate(`Your "friend" has rejected your call.`);

	/** @see Strings */
	public static p2pDisabled: string	= Util.translate(
		`Your or your friend's browser may lack support for video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see Strings */
	public static p2pDisabledLocal: string	= Util.translate(
		`Your browser does not support voice or video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	);

	/** @see Strings */
	public static p2pDisconnect: string	= Util.translate(`Call has been disconnected.`);

	/** @see Strings */
	public static p2pInit: string	= Util.translate(`You are about to initiate an encrypted`);

	/** @see Strings */
	public static p2pRequest: string	= Util.translate(
		`Your friend has requested an encrypted`
	);

	/** @see Strings */
	public static p2pRequestConfirmation: string	= Util.translate(
		`Your request has been sent.`
	);

	/** @see Strings */
	public static p2pTitle: string	= Util.translate(`Cyph Call`);

	/** @see Strings */
	public static p2pWarning: string	= Util.translate(
		`This will involve sharing your IP address with your friend (which isn't a problem ` +
		`unless you're actively hiding your current location from them). Continue?`
	);

	/** @see Strings */
	public static p2pWarningAudioPassive: string	= Util.translate(
		`Starting voice call and P2P connection. ` +
		`If you don't want to continue with the call, close this window now.`
	);

	/** @see Strings */
	public static p2pWarningVideoPassive: string	= Util.translate(
		`Starting video call and P2P connection. ` +
		`If you don't want to be seen on camera, close this window now.`
	);

	/** @see Strings */
	public static queuedMessageSaved: string	= Util.translate(`Queued message saved.`);

	/** @see Strings */
	public static reject: string	= Util.translate(`reject`);

	/** @see Strings */
	public static save: string	= Util.translate(`save`);

	/** @see Strings */
	public static selfDestructActivated: string	= Util.translate(`Cyph set to self-destruct.`);

	/** @see Strings */
	public static selfDestructDeactivated: string	= Util.translate(`Self-destruct deactivated.`);

	/** @see Strings */
	public static signupMessage1: string	= Util.translate(
		`Enjoying the service? Join our waitlist for Cyph v2!`
	);

	/** @see Strings */
	public static signupMessage2: string	= Util.translate(
		`More details are on the way, but the next version of Cyph will include ` +
		`group messaging, user accounts, and encrypted chat history.`
	);

	/** @see Strings */
	public static suregoahead: string	= Util.translate(`sure, go ahead`);

	/** @see Strings */
	public static timeExtended: string	= Util.translate(`Added time to countdown.`);

	/** @see Strings */
	public static videoCall: string	= Util.translate(`video call`);

	/** @see Strings */
	public static warningTitle: string	= Util.translate(`Warning`);
}
