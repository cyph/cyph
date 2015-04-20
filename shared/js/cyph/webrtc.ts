/// <reference path="util.ts" />
/// <reference path="../global/base.ts" />


module Cyph {
	export class WebRTC {
		public static getUserMedia: any;

		public static IceCandidate: any;

		public static MediaStream: any;

		public static PeerConnection: any;

		public static SessionDescription: any;

		public static isSupported: boolean;


		private static _	= requireModules(
			() => !!Util,
			() => {
				WebRTC.getUserMedia			= Util.getValue(navigator, [
					'getUserMedia',
					'mozGetUserMedia',
					'webkitGetUserMedia'
				]);

				WebRTC.IceCandidate			= Util.getValue(self, [
					'RTCIceCandidate',
					'mozRTCIceCandidate'
				]);

				WebRTC.MediaStream			= Util.getValue(self, [
					'MediaStream',
					'webkitMediaStream'
				]);

				WebRTC.PeerConnection		= Util.getValue(self, [
					'RTCPeerConnection',
					'mozRTCPeerConnection',
					'webkitRTCPeerConnection'
				]);

				WebRTC.SessionDescription	= Util.getValue(self, [
					'RTCSessionDescription',
					'mozRTCSessionDescription'
				]);

				WebRTC.isSupported			= !!WebRTC.PeerConnection;
			}
		);
	}
}
