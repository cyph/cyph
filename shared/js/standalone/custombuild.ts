/**
 * @file Handle custom builds.
 */


import * as $ from 'jquery';


customBuild				= $('meta[name="custom-build"]').attr('content');
customBuildApiFlags		= $('meta[name="custom-build-api-flags"]').attr('content');
customBuildAudioImage	= $('meta[name="custom-build-audio-image"]').attr('content');
customBuildErrorImage	= $('meta[name="custom-build-error-image"]').attr('content');
customBuildFavicon		= $('meta[name="custom-build-favicon"]').attr('content');
customBuildStrings		= $('meta[name="custom-build-strings"]').attr('content');

const callType	= $('meta[name="custom-build-call-type"]').attr('content');
if (callType === 'audio' || callType === 'video') {
	customBuildCallType	= callType;
}

$('head .custom-build-favicon').each((_, elem) => {
	if (elem instanceof HTMLLinkElement) {
		elem.href		= customBuildFavicon || '';
	}
	else if (elem instanceof HTMLMetaElement) {
		elem.content	= customBuildFavicon || '';
	}
});

const $password	= $('meta[name="custom-build-password"]');
if ($password.length > 0) {
	customBuildPassword	= $password.attr('content');
	$password.remove();
}
