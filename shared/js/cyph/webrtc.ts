module Cyph {
	/**
	 * Cross-browser container of WebRTC classes and functions.
	 */
	export class WebRTC {
		/** http://www.w3.org/TR/webrtc/#rtcicecandidate-type */
		public static IceCandidate: any			= Util.getValue(self, [
			'RTCIceCandidate',
			'mozRTCIceCandidate'
		]);

		/** https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_API */
		public static MediaStream: any			= Util.getValue(self, [
			'MediaStream',
			'webkitMediaStream'
		]);

		/** https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection */
		public static PeerConnection: any		= Util.getValue(self, [
			'RTCPeerConnection',
			'mozRTCPeerConnection',
			'webkitRTCPeerConnection'
		]);

		/** https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription */
		public static SessionDescription: any	= Util.getValue(self, [
			'RTCSessionDescription',
			'mozRTCSessionDescription'
		]);

		/** Indicates whether WebRTC is supported. */
		public static isSupported: boolean		= !!WebRTC.PeerConnection;

		/**
		 * https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getUserMedia
		 * @param args
		 */
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
	}
}
