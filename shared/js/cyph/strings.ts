module Cyph {
	export let Strings	= {
		cancel: `cancel`,
		connectedNotification: `Connected!`,
		continueDialogAction: `continue`,
		cypherToast1: `Prepare to witness the amazing nuts and bolts of Cyph.`,
		cypherToast2: `This cyphertext is what outsiders spying on your traffic will see (nothing of value).`,
		cypherToast3: `Thou art amazed.`,
		decline: `decline`,
		disconnectTitle: `Disconnect`,
		disconnectedNotification: `This cyph has been disconnected.`,
		disconnectWarning: `After closing Cyph, your messages will no longer be retrievable.`,
		disconnectConfirm: `Are you sure that you wish to disconnect?`,
		fileCall: `file transfer`,
		fileTooLarge: `The file that you are trying to send exceeds the 1 GB attachment limit.`,
		fileTransferInitMe: `You are sending the file:`,
		fileTransferInitFriend: `Your friend is sending the file:`,
		incomingFile: `Incoming File:`,
		incomingFileReject: `File rejected.`,
		introductoryMessage: `You may now speak.`,
		newMessageNotification: `New message!`,
		no: `no`,
		ok: `ok`,
		oopsTitle: `Oops!`,
		pingPongTimeoutTitle: `Connection timeout`,
		reject: `reject`,
		save: `save`,
		suregoahead: `sure, go ahead`,
		videoCallingTitle: `Cyph P2P`,
		videoCall: `video call`,
		voiceCall: `call`,
		warningTitle: `Warning`,
		webRTCInit: `You are about to initiate an encrypted`,
		webRTCRequest: `Your friend has requested an encrypted`,
		webRTCRequestConfirmation: `Your request has been sent.`,
		webRTCDeny: `Your "friend" has rejected your call.`,
		webRTCDisconnect: `P2P session has been disconnected.`,
		webRTCConnect: `P2P session has started.`,

		IEWarning:
			`We won't stop you from using Internet Explorer, but it is a *very* poor life choice.\n\n` +
			`IE doesn't work very well with Cyph (or in general).\n\n` +
			`You have been warned.`
		,

		incomingFileWarning:
			`Your friend has sent you a file. It has not been scanned for malware; ` +
			`you may choose to accept it AT YOUR OWN RISK. Save this file?`
		,

		pingPongTimeout:
			`Unable to ping your friend...\n\n` +
			`They might have gone offline, or one of you could be experiencing network connectivity issues.\n\n` +
			`If you weren’t expecting your friend to leave the cyph, you may want to wait around a little longer.`
		,

		webRTCDisabled:
			`Your or your friend's browser may lack support for video calling. ` +
			`Try again with the latest Chrome or Firefox.`
		,

		webRTCWarning:
			`This will involve sharing your IP address with your friend (which isn't a problem ` +
			`unless you're actively hiding your current location from them). Continue?`
	};

	(() => {
		for (let k of Object.keys(Strings)) {
			Strings[k]	= Util.translate(Strings[k]);
		}
	})();
}
