var CHANNEL_DATA_PREFIX		= 'CHANNEL DATA: ';
var CHANNEL_RATCHET_PREFIX	= 'CHANNEL RATCHET: ';
var WEBRTC_DATA_PREFIX		= 'WEBRTC: ';
var MUTEX_PREFIX			= 'MUTEX: ';

var channelDataMisc	= {
	connect: '1',
	ping: '2',
	pong: '3',
	imtypingyo: '4',
	donetyping: '5'
};

var shouldStartNewCyph;


if (
	typeof webSign != 'undefined' &&
	webSign.detectChange &&
	webSign.detectChange() &&
	!WEBSIGN_HASHES[localStorage.webSignBootHash]
) {
	function warnWebSignObsoleteWrapper () {
		if (typeof warnWebSignObsolete == 'undefined') {
			setTimeout(warnWebSignObsoleteWrapper, 1000);
		}
		else {
			warnWebSignObsolete();
		}
	}

	warnWebSignObsoleteWrapper();
}
else {
	/* TODO: Init session */
}


/* Set Analytics information */

anal.set({
	appName: 'cyph.im',
	appVersion: 'Web'
});
