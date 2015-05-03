module Cyph {
	export let Strings	= {
		cancel: `cancel`,
		connectedNotification: `Connected!`,
		continueDialogAction: `continue`,
		cypherToast1: `Prepare to witness the amazing nuts and bolts of Cyph.`,
		cypherToast2: `This cyphertext is what outsiders spying on your traffic will see (nothing of value).`,
		cypherToast3: `Thou art amazed.`,
		decline: `decline`,
		disconnectConfirm: `Are you sure that you wish to disconnect?`,
		disconnectTitle: `Disconnect`,
		disconnectWarning: `After closing Cyph, your messages will no longer be retrievable.`,
		disconnectedNotification: `This cyph has been disconnected.`,
		fileCall: `file transfer`,
		fileTooLarge: `The file that you are trying to send exceeds the 1 GB attachment limit.`,
		fileTransferInitMe: `You are sending the file:`,
		fileTransferInitFriend: `Your friend is sending the file:`,
		incomingFile: `Incoming File:`,
		incomingFileReject: `File rejected.`,
		introductoryMessage: `You may now speak.`,
		linkExpiresAt: `Link expires at`,
		newMessageNotification: `New message!`,
		no: `no`,
		ok: `ok`,
		oopsTitle: `Oops!`,
		p2pConnect: `P2P session has started.`,
		p2pDeny: `Your "friend" has rejected your call.`,
		p2pDisconnect: `P2P session has been disconnected.`,
		p2pInit: `You are about to initiate an encrypted`,
		p2pRequest: `Your friend has requested an encrypted`,
		p2pRequestConfirmation: `Your request has been sent.`,
		p2pTitle: `Cyph P2P`,
		pingPongTimeoutTitle: `Connection timeout`,
		reject: `reject`,
		save: `save`,
		suregoahead: `sure, go ahead`,
		videoCall: `video call`,
		voiceCall: `call`,
		warningTitle: `Warning`,

		IEWarning:
			`We won't stop you from using Internet Explorer, but it is a *very* poor life choice.\n\n` +
			`IE doesn't work very well with Cyph (or in general).\n\n` +
			`You have been warned.`
		,

		incomingFileWarning:
			`Your friend has sent you a file. It has not been scanned for malware; ` +
			`you may choose to accept it AT YOUR OWN RISK. Save this file?`
		,

		p2pDisabled:
			`Your or your friend's browser may lack support for video calling. ` +
			`Try again with the latest Chrome or Firefox.`
		,

		p2pWarning:
			`This will involve sharing your IP address with your friend (which isn't a problem ` +
			`unless you're actively hiding your current location from them). Continue?`
		,

		pingPongTimeout:
			`Unable to ping your friend...\n\n` +
			`They might have gone offline, or one of you could be experiencing network connectivity issues.\n\n` +
			`If you weren’t expecting your friend to leave the cyph, you may want to wait around a little longer.`
	};

	(() => {
		for (let k of Object.keys(Strings)) {
			Strings[k]	= Util.translate(Strings[k]);
		}
	})();
}
