function Init () {
	let CHANNEL_DATA_PREFIX		= 'CHANNEL DATA: ';
	let CHANNEL_RATCHET_PREFIX	= 'CHANNEL RATCHET: ';
	let WEBRTC_DATA_PREFIX		= 'WEBRTC: ';
	let MUTEX_PREFIX			= 'MUTEX: ';

	let channelDataMisc	= {
		connect: '1',
		ping: '2',
		pong: '3',
		imtypingyo: '4',
		donetyping: '5'
	};


	processUrlState	= () => {
		if (Env.isWebSignObsolete) {
			return;
		}

		let urlState	= Util.getUrlState();

		/* 404 */
		if (urlState == '404') {
			changeState(states.error);
		}
		else {
			Util.pushNotFound();
			return;
		}

		history.replaceState({}, '', '/' + Util.getUrlState());
	};


	if (
		typeof webSign != 'undefined' &&
		webSign.detectChange &&
		webSign.detectChange() &&
		!Config.validWebSignHashes[localStorage.webSignBootHash]
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
		let session: Session.ISession	= new Session.ThreadedSession(Util.getUrlState(), new Session.P2P);
		history.pushState({}, '', location.pathname);
	}
}
