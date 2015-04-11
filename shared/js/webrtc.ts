/// <reference path="globals.ts" />


class WebRTC {
	public static getUserMedia	=
		navigator.getUserMedia ||
		navigator['mozGetUserMedia'] ||
		navigator['webkitGetUserMedia']
	;

	public static IceCandidate: any	=
		window.RTCIceCandidate ||
		window['mozRTCIceCandidate']
	;

	public static MediaStream: any	=
		window['MediaStream'] ||
		window['webkitMediaStream']
	;

	public static PeerConnection: any	=
		window.RTCPeerConnection ||
		window['mozRTCPeerConnection'] ||
		window['webkitRTCPeerConnection']
	;

	public static SessionDescription: any	=
		window.RTCSessionDescription ||
		window['mozRTCSessionDescription']
	;

	public static isSupported: boolean	= !!WebRTC.PeerConnection;
}
