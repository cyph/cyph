var ui	= ui || {};

ui.elements	= {
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
	insertPhotoMobile: $('#insert-photo-mobile')
};
