module Cyph {
	export class WebRTC {
		public static IceCandidate: any;
		public static MediaStream: any;
		public static PeerConnection: any;
		public static SessionDescription: any;
		public static isSupported: boolean;

		public static getUserMedia (...args: any[]) : void {
			Util.getValue(
				navigator,
				[
					'getUserMedia',
					'mozGetUserMedia',
					'webkitGetUserMedia'
				],
				() => {}
			).apply(navigator, args);
		}


		private static _	= requireModules(
			() => Util,
			() => {
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
