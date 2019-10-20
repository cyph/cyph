/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {BehaviorSubject, Observable, Subject, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import SimplePeer from 'simple-peer';
import {BaseProvider} from '../base-provider';
import {env} from '../env';
import {IP2PHandlers} from '../p2p/ip2p-handlers';
import {ISessionCommand} from '../proto';
import {IP2PWebRTCService} from '../service-interfaces/ip2p-webrtc.service';
import {events, ISessionMessageData, rpcEvents} from '../session';
import {filterUndefinedOperator} from '../util/filter';
import {lockFunction} from '../util/lock';
import {debugLog, debugLogError} from '../util/log';
import {requestPermissions} from '../util/permissions';
import {request} from '../util/request';
import {parse} from '../util/serialization';
import {uuid} from '../util/uuid';
import {resolvable, sleep, waitForIterable} from '../util/wait';
import {AnalyticsService} from './analytics.service';
import {ChatService} from './chat.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';

/** @inheritDoc */
@Injectable()
export class P2PWebRTCService extends BaseProvider
	implements IP2PWebRTCService {
	/** Constant values used by P2P. */
	public static readonly constants = {
		accept: 'accept',
		decline: 'decline',
		kill: 'kill',
		requestCall: 'requestCall',
		webRTC: 'webRTC'
	};

	/** Indicates whether WebRTC is supported in the current environment. */
	public static readonly isSupported: boolean =
		SimplePeer.WEBRTC_SUPPORT && !env.isIOS;

	/** @ignore */
	private readonly _CHAT_SERVICE = resolvable<ChatService>();

	/** @ignore */
	private readonly _HANDLERS = resolvable<IP2PHandlers>();

	/** @ignore */
	private readonly _LOCAL_VIDEO = resolvable<() => JQuery>();

	/** @ignore */
	private readonly _READY = resolvable(true);

	/** @ignore */
	private readonly _REMOTE_VIDEO = resolvable<() => JQuery>();

	/** @ignore */
	private readonly chatService: Promise<ChatService> = this._CHAT_SERVICE
		.promise;

	/** @ignore */
	private readonly commands = {
		accept: async () : Promise<void> => this.join(),
		decline: async () : Promise<void> => {
			this.isAccepted = false;
			this.p2pSessionData = undefined;

			(await this.handlers).requestRejection();
		},

		kill: async () : Promise<void> => {
			this.disconnectInternal.next();

			const wasAccepted = this.isAccepted;
			const wasInitialCallPending = this.initialCallPending.value;
			this.isAccepted = false;
			this.isActive.next(false);
			this.initialCallPending.next(false);
			this.p2pSessionData = undefined;

			this.incomingStream.next({audio: false, video: false});
			this.outgoingStream.next({audio: false, video: false});

			if (this.webRTC.value) {
				for (const track of [
					...this.webRTC.value.localStream.getAudioTracks(),
					...this.webRTC.value.localStream.getVideoTracks()
				]) {
					track.enabled = false;
					track.stop();
				}

				this.webRTC.value.peer.destroy();
				this.webRTC.next(undefined);
			}

			const handlers = await this.handlers;

			if (wasInitialCallPending) {
				await handlers.canceled();
			}
			else if (wasAccepted) {
				await handlers.connected(false);
			}
		},

		webRTC: async (data: SimplePeer.SignalData) : Promise<void> => {
			(await this.getWebRTC()).peer.signal(data);
		}
	};

	/** @ignore */
	private readonly confirmLocalVideoAccess = false;

	/** @ignore */
	private readonly disconnectInternal: Subject<void> = new Subject();

	/** @ignore */
	private readonly handlers: Promise<IP2PHandlers> = this._HANDLERS.promise;

	/** @ignore */
	private isAccepted: boolean = false;

	/** @ignore */
	private readonly joinLock = lockFunction();

	/** @ignore */
	private readonly lastDeviceIDs: {
		camera?: string;
		mic?: string;
		speaker?: string;
	} = {
		camera: undefined,
		mic: undefined,
		speaker: undefined
	};

	/** @ignore */
	private readonly loadingEvents = {
		connectionReady: {
			name: 'connectionReady',
			occurred: false
		},
		createdPeer: {
			name: 'createdPeer',
			occurred: false
		},
		finished: {
			name: 'channelOpen',
			occurred: false
		},
		joinedRoom: {
			name: 'joinedRoom',
			occurred: false
		},
		localStream: {
			name: 'localStream',
			occurred: false
		},
		readyToCall: {
			name: 'readyToCall',
			occurred: false
		},
		started: {
			name: 'localStreamRequested',
			occurred: false
		}
	};

	/** @ignore */
	private readonly localVideo: Promise<() => JQuery> = this._LOCAL_VIDEO
		.promise;

	/** @ignore */
	private p2pSessionData?: {iceServers: string; id: string; isAlice: boolean};

	/** @ignore */
	private readonly progressUpdateLock = lockFunction();

	/** @ignore */
	private readonly remoteVideo: Promise<() => JQuery> = this._REMOTE_VIDEO
		.promise;

	/** @ignore */
	private readonly resolveChatService: (chat: ChatService) => void = this
		._CHAT_SERVICE.resolve;

	/** @ignore */
	private readonly resolveHandlers: (handlers: IP2PHandlers) => void = this
		._HANDLERS.resolve;

	/** @ignore */
	private readonly resolveLocalVideo: (
		localVideo: () => JQuery
	) => void = this._LOCAL_VIDEO.resolve;

	/** @ignore */
	private readonly resolveRemoteVideo: (
		remoteVideo: () => JQuery
	) => void = this._REMOTE_VIDEO.resolve;

	/** @ignore */
	private readonly toggleLock = lockFunction();

	/** @ignore */
	private readonly webRTC = new BehaviorSubject<
		| undefined
		| {
				localStream: MediaStream;
				peer: SimplePeer.Instance;
		  }
	>(undefined);

	/** @inheritDoc */
	public readonly disconnect: Observable<void> = this.disconnectInternal;

	/** @inheritDoc */
	public readonly incomingStream = new BehaviorSubject<
		MediaStreamConstraints
	>({
		audio: false,
		video: false
	});

	/** @inheritDoc */
	public readonly initialCallPending = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly isActive = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly loading = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly localMediaError = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly outgoingStream = new BehaviorSubject<
		MediaStreamConstraints
	>({
		audio: false,
		video: false
	});

	/** @inheritDoc */
	public readonly ready: Promise<boolean> = this._READY.promise;

	/** @inheritDoc */
	public readonly resolveReady: () => void = this._READY.resolve;

	/** @inheritDoc */
	public readonly videoEnabled = new BehaviorSubject<boolean>(false);

	/** @ignore */
	private async getWebRTC () : Promise<{
		localStream: MediaStream;
		peer: SimplePeer.Instance;
	}> {
		return this.webRTC
			.pipe(
				filterUndefinedOperator(),
				take(1)
			)
			.toPromise();
	}

	/** @ignore */
	private async progressUpdate (
		event: {occurred: boolean},
		value: number
	) : Promise<void> {
		if (event.occurred) {
			return;
		}

		event.occurred = true;

		await this.progressUpdateLock(async () => {
			for (
				let i = (await this.chatService).chat.initProgress.value;
				i < value;
				++i
			) {
				(await this.chatService).chat.initProgress.next(i);
				await sleep(25);
			}
		});
	}

	/** @ignore */
	private async receiveCommand (command: ISessionCommand) : Promise<void> {
		if (!P2PWebRTCService.isSupported) {
			return;
		}

		await this.ready;

		const method: Function | undefined = (<any> this.commands)[
			command.method
		];

		if (this.isAccepted && method) {
			if (
				this.p2pSessionData &&
				command.additionalData === this.p2pSessionData.id
			) {
				await method(
					command.argument && command.argument.length > 0 ?
						msgpack.decode(command.argument) :
						undefined
				);
			}
		}
		else if (command.method === 'audio' || command.method === 'video') {
			const ok = await (await this.handlers).acceptConfirm(
				command.method,
				500000,
				this.isAccepted
			);

			const p2pSessionData = !command.additionalData ?
				undefined :
				(() => {
					const splitIndex = command.additionalData.indexOf('\n');
					return {
						iceServers: command.additionalData.slice(
							splitIndex + 1
						),
						id: command.additionalData.slice(0, splitIndex),
						isAlice: false
					};
				})();

			if (p2pSessionData) {
				this.sessionService.send([
					rpcEvents.p2p,
					{
						command: {
							additionalData: p2pSessionData.id,
							method: ok ?
								P2PWebRTCService.constants.accept :
								P2PWebRTCService.constants.decline
						}
					}
				]);
			}

			if (!ok) {
				return;
			}

			if (
				p2pSessionData &&
				(!this.p2pSessionData ||
					!this.sessionService.state.isAlice.value)
			) {
				this.p2pSessionData = p2pSessionData;
			}

			this.accept(
				command.method === 'audio' ?
					'audio' :
				command.method === 'video' ?
					'video' :
					undefined
			);

			this.join();

			this.analyticsService.sendEvent({
				eventAction: 'start',
				eventCategory: 'call',
				eventLabel: command.method,
				eventValue: 1,
				hitType: 'event'
			});
		}
	}

	/** @inheritDoc */
	public accept (
		callType?: 'audio' | 'video',
		isPassive: boolean = false
	) : void {
		this.isAccepted = true;
		this.loading.next(true);
		this.outgoingStream.next({audio: true, video: callType === 'video'});

		if (isPassive) {
			this.isActive.next(true);
		}
	}

	/** @inheritDoc */
	public async close () : Promise<void> {
		this.initialCallPending.next(false);

		await Promise.all([
			this.sessionService.send([
				rpcEvents.p2p,
				{
					command: {
						additionalData:
							this.p2pSessionData && this.p2pSessionData.id,
						method: P2PWebRTCService.constants.kill
					}
				}
			]),
			this.commands.kill()
		]);
	}

	/** @inheritDoc */
	public async getDevices () : Promise<{
		cameras: {label: string; switchTo: () => Promise<void>}[];
		mics: {label: string; switchTo: () => Promise<void>}[];
		speakers: {label: string; switchTo: () => Promise<void>}[];
	}> {
		const allDevices = await navigator.mediaDevices.enumerateDevices();

		const filterDevices = (
			kind: string,
			kindName: string,
			lastDeviceID: string | undefined,
			switchToFactory: (o: MediaDeviceInfo) => () => Promise<void>
		) => {
			const devices = allDevices.filter(o => o.kind === kind);

			const lastDevice = devices.find(
				o => o.deviceId === (lastDeviceID || 'default')
			);

			return (!lastDevice ?
				devices :
				[lastDevice, ...devices.filter(o => o !== lastDevice)]
			).map((o, i) => ({
				label: o.label || `${kindName} ${i + 1}`,
				switchTo: switchToFactory(o)
			}));
		};

		return {
			cameras: filterDevices(
				'videoinput',
				this.stringsService.cameraTitle,
				this.lastDeviceIDs.camera,
				(o: MediaDeviceInfo) => async () =>
					this.toggle('video', {newDeviceID: o.deviceId})
			),
			mics: filterDevices(
				'audioinput',
				this.stringsService.micTitle,
				this.lastDeviceIDs.mic,
				(o: MediaDeviceInfo) => async () =>
					this.toggle('audio', {newDeviceID: o.deviceId})
			),
			speakers: !('sinkId' in HTMLMediaElement.prototype) ?
				[] :
				filterDevices(
					'audiooutput',
					this.stringsService.speakerTitle,
					this.lastDeviceIDs.speaker,
					(o: MediaDeviceInfo) => async () => {
						const remoteVideo = (await this.remoteVideo)().find(
							'video'
						)[0];
						if (!remoteVideo) {
							debugLogError(
								() =>
									'Remote video not found (switching speaker).'
							);
							return;
						}
						if (!('setSinkId' in remoteVideo)) {
							debugLogError(
								() => 'Switching speakers unsupported.'
							);
							return;
						}
						(<any> remoteVideo).setSinkId(o.deviceId);
						this.lastDeviceIDs.speaker = o.deviceId;
					}
				)
		};
	}

	/** @inheritDoc */
	public init (
		chatService: ChatService,
		handlers: IP2PHandlers,
		localVideo: () => JQuery,
		remoteVideo: () => JQuery
	) : void {
		this.resolveChatService(chatService);
		this.resolveHandlers(handlers);
		this.resolveLocalVideo(localVideo);
		this.resolveRemoteVideo(remoteVideo);
	}

	/** @inheritDoc */
	public async join () : Promise<void> {
		return this.joinLock(async () => {
			if (this.webRTC.value || !this.p2pSessionData) {
				return;
			}

			this.webRTC.next(undefined);

			this.loading.next(true);
			this.incomingStream.next({...this.outgoingStream.value});
			this.videoEnabled.next(!!this.outgoingStream.value.video);
			this.isActive.next(true);

			const p2pSessionData = this.p2pSessionData;
			const webRTCSubscriptions: Subscription[] = [];

			const $localVideo = await waitForIterable<JQuery>(
				await this.localVideo
			);
			const $remoteVideo = await waitForIterable<JQuery>(
				await this.remoteVideo
			);

			const iceServers = parse<RTCIceServer[]>(p2pSessionData.iceServers)
				.map(o => {
					if ((<any> o).url !== undefined) {
						o.urls = (<any> o).url;
						delete (<any> o).url;
					}

					if (this.sessionService.apiFlags.disableP2P) {
						o.urls =
							typeof o.urls === 'string' &&
							o.urls.indexOf('stun:') !== 0 ?
								o.urls :
							o.urls instanceof Array ?
								o.urls.filter(
									(url: string) => url.indexOf('stun:') !== 0
								) :
								[];
					}

					if (
						o.urls ===
						'turn:global.turn.twilio.com:443?transport=tcp'
					) {
						o.urls =
							'turns:global.turn.twilio.com:443?transport=tcp';
					}

					return o;
				})
				.filter(o => o.urls && o.urls.length > 0)
				.concat(
					!this.sessionService.apiFlags.disableP2P ?
						{urls: 'stun:stun.l.google.com:19302'} :
						[]
				)
				.slice(0, 4);

			debugLog(() => ({p2pWebRTCJoin: {iceServers, p2pSessionData}}));

			const handlers = await this.handlers;

			if (
				(this.confirmLocalVideoAccess &&
					!(await handlers.localVideoConfirm(
						!!this.outgoingStream.value.video
					))) ||
				!(await requestPermissions(
					...[
						'RECORD_AUDIO',
						...(this.outgoingStream.value.video ? ['CAMERA'] : [])
					]
				))
			) {
				debugLog(() => 'p2pWebRTCJoinCancel');
				return this.close();
			}

			const localStream = await navigator.mediaDevices.getUserMedia(
				this.outgoingStream.value
			);

			const localVideo = <HTMLVideoElement> $localVideo[0];
			localVideo.srcObject = localStream;
			localVideo.play();
			localVideo.muted = true;

			const peer = new SimplePeer({
				channelName: p2pSessionData.id,
				config: !this.sessionService.apiFlags.disableP2P ?
					{iceServers} :
					{iceServers, iceTransportPolicy: 'relay'},
				initiator: p2pSessionData.isAlice,
				sdpTransform: (sdp: any) : any =>
					/* http://www.kapejod.org/en/2014/05/28 */
					typeof sdp === 'string' ?
						sdp
							.split('\n')
							.filter(s => s.indexOf('ssrc-audio-level') < 0)
							.join('\n') :
						sdp,
				stream: localStream
			});

			peer.on('close', () => {
				for (const subscription of webRTCSubscriptions) {
					subscription.unsubscribe();
				}
				this.close();
			});

			peer.on('connect', () => {
				this.progressUpdate(this.loadingEvents.connectionReady, 40);
			});

			peer.on('data', data => {
				try {
					const o = msgpack.decode(data);
					this.incomingStream.next({
						audio: !!o.audio,
						video: !!o.video
					});
				}
				catch {}
			});

			peer.on('error', () => {
				this.localMediaError.next(true);
			});

			peer.on('signal', (data: SimplePeer.SignalData) => {
				this.sessionService.send([
					rpcEvents.p2p,
					{
						command: {
							additionalData: p2pSessionData.id,
							argument: msgpack.encode(data),
							method: P2PWebRTCService.constants.webRTC
						}
					}
				]);
			});

			peer.on('stream', async (remoteStream: MediaStream) => {
				this.incomingStream.next({
					audio: remoteStream.getAudioTracks().length > 0,
					video: remoteStream.getVideoTracks().length > 0
				});

				const remoteVideo = document.createElement('video');
				remoteVideo.srcObject = remoteStream;
				$remoteVideo.empty();
				$remoteVideo[0].appendChild(remoteVideo);
				remoteVideo.play();

				await handlers.loaded();
				this.progressUpdate(this.loadingEvents.finished, 100);
				this.loading.next(false);
			});

			handlers.connected(true);
			this.webRTC.next({localStream, peer});

			this.initialCallPending.next(false);
		});
	}

	/** @inheritDoc */
	public async request (
		callType: 'audio' | 'video',
		isPassive: boolean = false
	) : Promise<void> {
		const handlers = await this.handlers;

		if (isPassive && !this.isAccepted) {
			return;
		}

		const ok = await handlers.requestConfirm(callType, this.isAccepted);

		if (!ok || this.p2pSessionData) {
			return;
		}

		this.accept(callType);

		this.p2pSessionData =
			isPassive && !this.sessionService.state.isAlice.value ?
				undefined :
				{
					iceServers: await request({
						retries: 5,
						url: env.baseUrl + 'iceservers'
					}).catch(() => '[]'),
					id: uuid(),
					isAlice: true
				};

		this.sessionService.send([
			rpcEvents.p2p,
			{
				command: {
					additionalData: this.p2pSessionData ?
						this.p2pSessionData.id +
						'\n' +
						this.p2pSessionData.iceServers :
						undefined,
					method: callType
				}
			}
		]);

		await sleep();
		handlers.requestConfirmation();

		/* Time out if request hasn't been accepted within 10 minutes */

		for (let seconds = 0; seconds < 600; ++seconds) {
			if (this.isActive.value) {
				return;
			}

			await sleep(1000);
		}

		this.isAccepted = false;
	}

	/** @inheritDoc */
	public async toggle (
		medium?: 'audio' | 'video',
		shouldPause?: boolean | {newDeviceID: string}
	) : Promise<void> {
		return this.toggleLock(async () => {
			const webRTC = await this.getWebRTC();

			let deviceIdChanged = false;

			if (medium === 'audio' || medium === undefined) {
				if (
					typeof shouldPause === 'object' &&
					shouldPause.newDeviceID
				) {
					deviceIdChanged =
						deviceIdChanged ||
						this.lastDeviceIDs.mic !== shouldPause.newDeviceID;
					this.lastDeviceIDs.mic = shouldPause.newDeviceID;
				}

				const audio =
					typeof shouldPause === 'object' ||
					shouldPause === false ||
					(shouldPause === undefined &&
						!this.outgoingStream.value.audio);

				if (
					!!this.outgoingStream.value.audio !== audio ||
					(typeof this.outgoingStream.value.audio === 'boolean' &&
						this.lastDeviceIDs.mic) ||
					(typeof this.outgoingStream.value.audio === 'object' &&
						this.outgoingStream.value.audio.deviceId !==
							this.lastDeviceIDs.mic)
				) {
					this.outgoingStream.next({
						...this.outgoingStream.value,
						audio:
							!audio || !this.lastDeviceIDs.mic ?
								audio :
								{deviceId: this.lastDeviceIDs.mic}
					});
					for (const track of webRTC.localStream.getAudioTracks()) {
						track.enabled = audio;
					}
				}
			}

			if (medium === 'video' || medium === undefined) {
				if (
					typeof shouldPause === 'object' &&
					shouldPause.newDeviceID
				) {
					deviceIdChanged =
						deviceIdChanged ||
						this.lastDeviceIDs.camera !== shouldPause.newDeviceID;
					this.lastDeviceIDs.camera = shouldPause.newDeviceID;
				}

				const video =
					typeof shouldPause === 'object' ||
					shouldPause === false ||
					(shouldPause === undefined &&
						!this.outgoingStream.value.video);

				if (
					!!this.outgoingStream.value.video !== video ||
					(typeof this.outgoingStream.value.video === 'boolean' &&
						this.lastDeviceIDs.camera) ||
					(typeof this.outgoingStream.value.video === 'object' &&
						this.outgoingStream.value.video.deviceId !==
							this.lastDeviceIDs.camera)
				) {
					this.outgoingStream.next({
						...this.outgoingStream.value,
						video:
							!video || !this.lastDeviceIDs.camera ?
								video :
								{deviceId: this.lastDeviceIDs.camera}
					});
					for (const track of webRTC.localStream.getVideoTracks()) {
						track.enabled = video;
					}
				}
			}

			if (deviceIdChanged) {
				const newStream = await navigator.mediaDevices.getUserMedia(
					this.outgoingStream.value
				);

				const addTracks = new Set(
					medium === 'audio' ?
						newStream.getAudioTracks() :
					medium === 'video' ?
						newStream.getVideoTracks() :
						newStream.getTracks()
				);

				const removeTracks = (medium === 'audio' ?
					webRTC.localStream.getAudioTracks() :
				medium === 'video' ?
					webRTC.localStream.getVideoTracks() :
					webRTC.localStream.getTracks()
				).filter(track => !addTracks.has(track));

				for (const track of Array.from(addTracks)) {
					webRTC.localStream.addTrack(track);
					(<any> webRTC.peer).addTrack(track, webRTC.localStream);
				}
				for (const track of removeTracks) {
					webRTC.localStream.removeTrack(track);
					(<any> webRTC.peer).removeTrack(track, webRTC.localStream);
				}
			}

			webRTC.peer.send(
				msgpack.encode({
					audio: !!this.outgoingStream.value.audio,
					video: !!this.outgoingStream.value.video
				})
			);
		});
	}

	constructor (
		sessionCapabilitiesService: SessionCapabilitiesService,

		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();

		this.sessionService.on(events.closeChat, () => {
			this.close();
		});

		this.sessionService.on(
			rpcEvents.p2p,
			(newEvents: ISessionMessageData[]) => {
				for (const o of newEvents) {
					if (o.command && o.command.method) {
						this.receiveCommand(o.command);
					}
				}
			}
		);

		sessionCapabilitiesService.resolveP2PSupport(
			P2PWebRTCService.isSupported
		);
	}
}
