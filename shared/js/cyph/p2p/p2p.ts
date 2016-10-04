import {UIEvents} from './enums';
import {IP2P} from './ip2p';
import {Analytics} from '../analytics';
import {Env} from '../env';
import {EventManager} from '../eventmanager';
import {IController} from '../icontroller';
import {Util} from '../util';
import * as Session from '../session/session';


export {
	IP2P,
	UIEvents
};


export class P2P implements IP2P {
	public static constants	= {
		accept: 'accept',
		audio: 'audio',
		decline: 'decline',
		kill: 'kill',
		requestCall: 'requestCall',
		video: 'video',
		webRTC: 'webRTC'
	};

	public static isSupported: boolean	= new self['SimpleWebRTC'](
		{connection: {on: () => {}}}
	).capabilities.supportMediaStream;


	private isAccepted: boolean;
	private mutex: Session.IMutex;
	private webRTC: any;

	private commands	= {
		accept: () : void => {
			this.join();
		},

		decline: () : void => {
			this.isAccepted	= false;

			this.triggerUIEvent(
				UIEvents.Categories.request,
				UIEvents.Events.requestRejection
			);
		},

		kill: () : void => {
			const wasAccepted: boolean	= this.isAccepted;
			this.isAccepted				= false;
			this.isActive				= false;

			setTimeout(() => {
				for (let o of [this.outgoingStream, this.incomingStream]) {
					for (let k of Object.keys(o)) {
						o[k]	= false;
					}
				}

				if (this.webRTC) {
					this.webRTC.mute();
					this.webRTC.pauseVideo();
					this.webRTC.stopLocalVideo();
					this.webRTC.leaveRoom();
					this.webRTC.disconnect();
					this.webRTC	= null;
				}

				if (wasAccepted) {
					this.triggerUIEvent(
						UIEvents.Categories.base,
						UIEvents.Events.connected,
						false
					);
				}
			}, 500);
		},

		webRTC: (data: {event: string; args: any[];}) : void => {
			EventManager.trigger(
				P2P.constants.webRTC + data.event,
				data.args
			);
		}
	};

	public incomingStream	= {audio: false, video: false};
	public outgoingStream	= {audio: false, video: false};

	public isActive: boolean;
	public loading: boolean;

	private receiveCommand (command: Session.Command) : void {
		if (!P2P.isSupported) {
			return;
		}

		if (this.isAccepted && command.method in this.commands) {
			this.commands[command.method](command.argument);
		}
		else if (
			command.method === P2P.constants.video ||
			command.method === P2P.constants.audio
		) {
			this.triggerUIEvent(
				UIEvents.Categories.request,
				UIEvents.Events.acceptConfirm,
				command.method,
				500000,
				this.isAccepted,
				(ok: boolean) => {
					this.session.send(
						new Session.Message(
							Session.RPCEvents.p2p,
							new Session.Command(ok ?
								P2P.constants.accept :
								P2P.constants.decline
							)
						)
					);

					if (ok) {
						this.accept(command.method);
						this.join();

						Analytics.send({
							hitType: 'event',
							eventCategory: 'call',
							eventAction: 'start',
							eventLabel: command.method,
							eventValue: 1
						});
					}
				}
			);
		}
	}

	private refresh (webRTC: any = this.webRTC) : void {
		this.loading	=
			this.incomingStream.audio ||
			this.incomingStream.video
		;

		this.controller.update();

		if (!webRTC) {
			return;
		}

		webRTC.leaveRoom();
		webRTC.stopLocalVideo();
		webRTC.startLocalVideo();
	}

	private triggerUIEvent(
		category: UIEvents.Categories,
		event: UIEvents.Events,
		...args: any[]
	) : void {
		this.session.trigger(Session.Events.p2pUI, {category, event, args});
	}

	public accept (callType?: string) {
		this.isAccepted				= true;
		this.outgoingStream.video	= callType === P2P.constants.video;
		this.outgoingStream.audio	= true;
	}

	public close () : void {
		this.session.send(
			new Session.Message(
				Session.RPCEvents.p2p,
				new Session.Command(P2P.constants.kill)
			)
		);

		this.commands.kill();
	}

	public async join () : Promise<void> {
		if (this.webRTC) {
			return;
		}

		this.webRTC		= {};

		this.loading	= true;
		this.controller.update();

		for (let k of Object.keys(this.outgoingStream)) {
			this.incomingStream[k]	= this.outgoingStream[k];
		}

		this.isActive	= true;
		this.controller.update();

		const iceServers: string	= await Util.request({
			url: Env.baseUrl + 'iceservers',
			retries: 5
		});

		const events: string[]	= [];

		const webRTC	= new self['SimpleWebRTC']({
			localVideoEl: this.localVideo,
			remoteVideosEl: this.remoteVideo,
			autoRequestMedia: false,
			autoRemoveVideos: false,
			adjustPeerVolume: true,
			media: this.outgoingStream,
			connection: {
				on: (event: string, callback: Function) => {
					const fullEvent: string	= P2P.constants.webRTC + event;
					events.push(fullEvent);

					EventManager.on(
						fullEvent,
						args => {
							/* http://www.kapejod.org/en/2014/05/28/ */
							if (event === 'message' && args[0].type === 'offer') {
								args[0].payload.sdp	= args[0].payload.sdp.
									split('\n').
									filter((line: string) =>
										line.indexOf('b=AS:') < 0 &&
										line.indexOf(
											'urn:ietf:params:rtp-hdrext:ssrc-audio-level'
										) < 0
									).
									join('\n')
								;
							}

							callback.apply(webRTC, args);
						}
					);
				},
				emit: (event: string, ...args: any[]) => {
					const lastArg: any	= args.slice(-1)[0];

					if (event === 'join' && typeof lastArg === 'function') {
						lastArg(null, {clients: {friend: {video: true}}});
					}
					else {
						this.session.send(
							new Session.Message(
								Session.RPCEvents.p2p,
								new Session.Command(
									P2P.constants.webRTC,
									{event, args}
								)
							)
						);
					}
				},
				getSessionid: () => this.session.state.cyphId,
				disconnect: () => events.forEach(event => EventManager.off(event))
			}
		});

		webRTC.webrtc.config.peerConnectionConfig.iceServers	=
			JSON.parse(iceServers).
			filter(o => !this.forceTURN || o['url'].indexOf('stun:') !== 0)
		;

		webRTC.connection.on('streamUpdate', incomingStream => {
			this.incomingStream.audio	= !!incomingStream.audio;
			this.incomingStream.video	= !!incomingStream.video;
			this.refresh(webRTC);
		});

		webRTC.on('videoAdded', () => {
			$(this.remoteVideo).find('video').slice(0, -1).remove();

			this.loading	= false;
			this.controller.update();
		});

		webRTC.on('readyToCall', () => webRTC.joinRoom(P2P.constants.webRTC));
		webRTC.startLocalVideo();
		webRTC.connection.emit('connect');

		this.webRTC	= webRTC;
	}

	public request (callType: string) : void {
		this.triggerUIEvent(
			UIEvents.Categories.request,
			UIEvents.Events.requestConfirm,
			callType,
			this.isAccepted,
			(ok: boolean) => {
				if (ok) {
					this.mutex.lock((wasFirst: boolean, wasFirstOfType: boolean) => {
						try {
							if (wasFirstOfType) {
								this.accept(callType);

								this.session.send(
									new Session.Message(
										Session.RPCEvents.p2p,
										new Session.Command(callType)
									)
								);

								setTimeout(() =>
									this.triggerUIEvent(
										UIEvents.Categories.request,
										UIEvents.Events.requestConfirmation
									)
								, 250);

								/* Time out if request hasn't been
									accepted within 10 minutes */
								setTimeout(() => {
									if (!this.isActive) {
										this.isAccepted	= false;
									}
								}, 600000);
							}
						}
						finally {
							this.mutex.unlock();
						}
					}, P2P.constants.requestCall);
				}
			}
		);
	}

	public toggle (shouldPause?: boolean, medium?: string) : void {
		if (!this.webRTC) {
			return;
		}

		if (shouldPause !== true && shouldPause !== false) {
			if (medium) {
				this.outgoingStream[medium]	= !this.outgoingStream[medium];
			}
			else {
				this.outgoingStream.audio	= !this.outgoingStream.audio;
				this.outgoingStream.video	= !this.outgoingStream.video;
			}
		}
		else if (medium) {
			this.outgoingStream[medium]	= !shouldPause;
		}
		else {
			this.outgoingStream.audio	= !shouldPause;
			this.outgoingStream.video	= !shouldPause;
		}

		this.webRTC.connection.emit('streamUpdate', this.outgoingStream);
		this.refresh();
	}

	/**
	 * @param session
	 * @param controller
	 * @param forceTURN
	 * @param localVideo
	 * @param remoteVideo
	 */
	public constructor (
		private session: Session.ISession,
		private controller: IController,
		private forceTURN: boolean,
		private localVideo: HTMLElement,
		private remoteVideo: HTMLElement
	) {
		this.mutex	= new Session.Mutex(this.session);

		this.session.on(Session.Events.beginChat, () => {
			if (P2P.isSupported) {
				this.session.send(
					new Session.Message(
						Session.RPCEvents.p2p,
						new Session.Command()
					)
				);
			}
		});

		this.session.on(Session.Events.closeChat, () => this.close());

		this.session.on(Session.RPCEvents.p2p, (command: Session.Command) => {
			if (command.method) {
				this.receiveCommand(command);
			}
			else if (P2P.isSupported) {
				this.triggerUIEvent(
					UIEvents.Categories.base,
					UIEvents.Events.enable
				);
			}
		});
	}
}
