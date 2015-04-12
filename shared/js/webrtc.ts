/// <reference path="globals.ts" />


class WebRTC {
	public static getUserMedia	=
		navigator['getUserMedia'] ||
		navigator['mozGetUserMedia'] ||
		navigator['webkitGetUserMedia']
	;

	public static IceCandidate: any	=
		self['RTCIceCandidate'] ||
		self['mozRTCIceCandidate']
	;

	public static MediaStream: any	=
		self['MediaStream'] ||
		self['webkitMediaStream']
	;

	public static PeerConnection: any	=
		self['RTCPeerConnection'] ||
		self['mozRTCPeerConnection'] ||
		self['webkitRTCPeerConnection']
	;

	public static SessionDescription: any	=
		self['RTCSessionDescription'] ||
		self['mozRTCSessionDescription']
	;

	public static isSupported: boolean	= !!WebRTC.PeerConnection;
}
