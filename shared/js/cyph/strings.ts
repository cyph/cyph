/// <reference path="util.ts" />
/// <reference path="../global/base.ts" />


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

		incomingFileWarning:
			`Your friend has sent you a file. It has not been scanned for malware; ` +
			`you may choose to accept it AT YOUR OWN RISK. Save this file?`
		,

		webRTCDisabled:
			`Your or your friend's browser may lack support for video calling. ` +
			`Try again with the latest Chrome or Firefox.`
		,

		webRTCWarning:
			`This will involve sharing your IP address with your friend (which isn't a problem ` +
			`unless you're actively hiding your current location from them). Continue?`
	};

	export let _	= (() => {
		Object.keys(Strings).forEach((k: string) =>
			Strings[k]	= Util.translate(Strings[k])
		);
	})();
}
