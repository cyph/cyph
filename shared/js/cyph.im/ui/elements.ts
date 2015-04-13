/// <reference path="../../global/base.ts" />
/// <reference path="../../../lib/typings/jquery/jquery.d.ts" />


module Cyph.im {
	export module UI {
		export let Elements = {
			window: $(window),
			html: $('html'),
			everything: $('*'),
			messageBox: $('#message-box'),
			messageList: $('#message-list, #message-list > md-content'),
			timer: $('#timer'),
			buttons: $('.md-button:not(#templates *)'),
			copyUrlInput: $('#copy-url-input input'),
			copyUrlLink: $('#copy-url-link'),
			cyphertext: $('#cyphertext.curtain, #cyphertext.curtain > md-content'),
			sendButton: $('#send-button'),
			insertPhotoMobile: $('#insert-photo-mobile'),
			p2pFriendPlaceholder: $('#video-call .friend:not(.stream)'),
			p2pFriendStream: $('#video-call .friend.stream'),
			p2pMeStream: $('#video-call .me'),
			p2pFiles: $('.send-file-button input[type="file"]')
		};

		export let reloadElements: () => void	= () => {
			Object.keys(Elements).forEach((k: string) =>
				Elements[k]	= $(Elements[k].selector)
			);
		};
	}
}
