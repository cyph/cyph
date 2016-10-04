import {Util} from './util';


/**
 * User-facing strings referenced throughout the codes
 * (translated to user's language where possible).
 */
export const Strings = {
	accept: `accept`,
	audioCall: `call`,
	cancel: `cancel`,
	connectedNotification: `Connected!`,
	continueDialogAction: `continue`,
	cypherToast1: `Prepare to witness the amazing nuts and bolts of Cyph.`,
	cypherToast2: `This cyphertext is what outsiders spying on your traffic will see (nothing of value).`,
	cypherToast3: `Thou art amazed.`,
	decline: `decline`,
	discard: `discard`,
	disconnectConfirm: `Are you sure that you wish to disconnect?`,
	disconnectTitle: `Disconnect`,
	disconnectWarning: `After closing Cyph, your messages will no longer be retrievable.`,
	disconnectedNotification: `This cyph has been disconnected.`,
	fileCall: `file transfer`,
	fileTooLarge: `The file that you are trying to send exceeds the 250 MB attachment limit.`,
	fileTransferInitMe: `You are sending the file:`,
	fileTransferInitFriend: `Your friend is sending the file:`,
	friend: `friend`,
	incomingFile: `Incoming File:`,
	introductoryMessage: `You may now speak.`,
	linkExpiresAt: `Link expires at`,
	me: `me`,
	newMessageNotification: `New message!`,
	no: `no`,
	ok: `ok`,
	oopsTitle: `Oops!`,
	p2pConnect: `Call has started.`,
	p2pDeny: `Your "friend" has rejected your call.`,
	p2pDisconnect: `Call has been disconnected.`,
	p2pInit: `You are about to initiate an encrypted`,
	p2pRequest: `Your friend has requested an encrypted`,
	p2pRequestConfirmation: `Your request has been sent.`,
	p2pTitle: `Cyph Call`,
	pingPongTimeoutTitle: `Connection timeout`,
	reject: `reject`,
	save: `save`,
	suregoahead: `sure, go ahead`,
	videoCall: `video call`,
	warningTitle: `Warning`,

	IEWarning:
		`We won't stop you from using Internet Explorer, but it is a *very* poor life choice.\n\n` +
		`IE doesn't work very well with Cyph (or in general).\n\n` +
		`You have been warned.`
	,

	incomingFileDownload:
		`Your friend would like to send you a file. Accept the file transfer?`
	,

	incomingFileRejected:
		`You have rejected the following file transfer:`
	,

	incomingFileSave:
		`Your friend has sent you a file. It has not been scanned for malware; ` +
		`you may choose to accept it AT YOUR OWN RISK. Save this file?`
	,

	outgoingFileRejected: `Your "friend" has rejected the following file transfer:`,

	outgoingFileSaved: `File transfer complete! Your friend has saved the following file:`,

	p2pDisabled:
		`Your or your friend's browser may lack support for video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	,

	p2pWarning:
		`This will involve sharing your IP address with your friend (which isn't a problem ` +
		`unless you're actively hiding your current location from them). Continue?`
	,

	p2pWarningVideoPassive:
		`Starting video call and P2P connection. ` +
		`If you don't want to be seen on camera, close this window now.`
	,

	p2pWarningAudioPassive:
		`Starting voice call and P2P connection. ` +
		`If you don't want to continue with the call, close this window now.`
	,

	p2pDisabledLocal:
		`Your browser does not support voice or video calling. ` +
		`Try again with the latest Chrome or Firefox.`
	,

	pingPongTimeout:
		`Unable to ping your friend...\n\n` +
		`They might have gone offline, or one of you could be experiencing network connectivity issues.\n\n` +
		`If you weren’t expecting your friend to leave the cyph, you may want to wait around a little longer.`
	,

	signupMessage1:
		`Enjoying the service? Join our waitlist for Cyph v2!`
	,

	signupMessage2:
		`More details are on the way, but the next version of Cyph will include ` +
		`group messaging, user accounts, and encrypted chat history.`
};

(() => {
	for (let k of Object.keys(Strings)) {
		Strings[k]	= Util.translate(Strings[k]);
	}
})();
