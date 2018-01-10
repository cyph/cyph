/**
 * @file Handle custom builds.
 */


import * as $ from 'jquery';


customBuild					= $('meta[name="custom-build"]').attr('content');
customBuildApiFlags			= $('meta[name="custom-build-api-flags"]').attr('content');
customBuildAudioImage		= $('meta[name="custom-build-audio-image"]').attr('content');
customBuildErrorImage		= $('meta[name="custom-build-error-image"]').attr('content');
customBuildFavicon			= $('meta[name="custom-build-favicon"]').attr('content');
customBuildLogoHorizontal	= $('meta[name="custom-build-logo-horizontal"]').attr('content');
customBuildLogoVertical		= $('meta[name="custom-build-logo-vertical"]').attr('content');
customBuildStrings			= $('meta[name="custom-build-strings"]').attr('content');

accountRoot	=
	$('meta[name="custom-build-accounts-only"]').attr('content') === 'true' ? '' : 'account'
;

const callType	= $('meta[name="custom-build-call-type"]').attr('content');
if (callType === 'audio' || callType === 'video') {
	customBuildCallType	= callType;
}

const faviconURI	= customBuildFavicon ? `data:image/png;base64,${customBuildFavicon}` : '';

$('head .custom-build-favicon').each((_, elem) => {
	if (elem instanceof HTMLLinkElement) {
		elem.href		= faviconURI;
	}
	else if (elem instanceof HTMLMetaElement) {
		elem.content	= faviconURI;
	}
});

const $password	= $('meta[name="custom-build-password"]');
if ($password.length > 0) {
	customBuildPassword	= $password.attr('content');
	$password.remove();
}
