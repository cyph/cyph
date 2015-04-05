var env	= {
	isLocalhost: document.location.hostname == 'localhost',
	isOnion: document.location.host.split('.').slice(-1)[0] == 'onion',

	baseUrl:
		env.isLocalhost ?
			'http://localhost:8080/' :
			env.isOnion ?
				'/api/' :
				config.prodBaseUrl
	,


	userAgent: navigator.userAgent.toLowerCase(),

	isIE: /msie |trident\//.test(env.userAgent),

	isAndroid: /android/.test(env.userAgent),
	isIOS: /ipad|iphone|ipod/.test(env.userAgent),
	isWP: /iemobile/.test(env.userAgent),
	isWebOS: /webos/.test(env.userAgent),
	isBB: /blackberry/.test(env.userAgent),
	isOperaMini: /opera mini/.test(env.userAgent),

	isFFMobile: 
		/fennec/.test(env.userAgent) ||
		(
			/firefox/.test(env.userAgent) &&
			(
				env.isAndroid ||
				/mobile/.test(env.userAgent) ||
				/tablet/.test(env.userAgent)
			)
		)
	,

	isMobile:
		env.isAndroid ||
		env.isIOS ||
		env.isWP ||
		env.isWebOS ||
		env.isBB ||
		env.isOperaMini ||
		env.isFFMobile
	,

	isTablet: env.isMobile && window.outerWidth > 767,

	isTouch: (function () {
		try {
			document.createEvent('TouchEvent');
			return true;
		}
		catch (e) {
			return false;
		}
	}()),

	platformString: env.isMobile ? 'mobile' : 'desktop',


	isWebSignObsolete: false,
	webSignHashes: encodeURIComponent(
		'Hello Ryan and Josh,\n\n\n\n\n\n---\n\n' +
			(typeof webSign == 'undefined' ? '' : webSign.toString())
	),


	smsRecipient: env.isIOS ? '+1' : ''
};
