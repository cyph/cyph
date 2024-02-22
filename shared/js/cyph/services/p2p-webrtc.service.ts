/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import hark from 'hark';
import * as RecordRTC from 'recordrtc';
import {BehaviorSubject, firstValueFrom, Observable, Subject} from 'rxjs';
import {map} from 'rxjs/operators';
import SimplePeer from 'simple-peer';
import {BaseProvider} from '../base-provider';
import {env} from '../env';
import {IResolvable} from '../iresolvable';
import {IP2PHandlers} from '../p2p/ip2p-handlers';
import {IP2PWebRTCService} from '../service-interfaces/ip2p-webrtc.service';
import {RpcEvents} from '../session';
import {Timer} from '../timer';
import {filterUndefined, filterUndefinedOperator} from '../util/filter';
import {lockFunction} from '../util/lock';
import {debugLog, debugLogError} from '../util/log';
import {requestPermissions} from '../util/permissions';
import {request} from '../util/request';
import {
	dynamicDeserialize,
	dynamicSerializeBytes,
	parse
} from '../util/serialization';
import {uuid} from '../util/uuid';
import {resolvable, retryUntilSuccessful} from '../util/wait';
import {AnalyticsService} from './analytics.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';

/* eslint-disable-next-line @typescript-eslint/naming-convention */
const _SimplePeer: typeof SimplePeer = SimplePeer;

/** @inheritDoc */
@Injectable()
export class P2PWebRTCService
	extends BaseProvider
	implements IP2PWebRTCService
{
	/** Constant values used by P2P. */
	public static readonly constants = {
		accept: 'accept',
		decline: 'decline',
		kill: 'kill',
		requestCall: 'requestCall',
		webRTC: 'webRTC'
	};

	/** Indicates whether screen sharing is supported in the current environment. */
	public static readonly isScreenSharingSupported: boolean =
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		typeof navigator !== 'undefined' &&
		typeof (<any> navigator)?.mediaDevices?.getDisplayMedia === 'function';

	/** Indicates whether WebRTC is supported in the current environment. */
	public static readonly isSupported: boolean = _SimplePeer.WEBRTC_SUPPORT;

	/** @ignore */
	private readonly _HANDLERS = resolvable<IP2PHandlers>();

	/** @ignore */
	private readonly _READY = resolvable(true);

	/** @ignore */
	private readonly _REMOTE_VIDEOS = resolvable<() => JQuery>();

	/** @ignore */
	private readonly confirmLocalVideoAccess = false;

	/** @ignore */
	private readonly disconnectInternal: Subject<void> = new Subject();

	/** @ignore */
	private readonly harkers = new Map<MediaStream, hark.Harker>();

	/** @ignore */
	private isAccepted: boolean = false;

	/** @ignore */
	private readonly joinAndToggleLock = lockFunction();

	/** @ignore */
	private readonly lastDeviceIDs: {
		camera?: string;
		mic?: string;
		screenShare: boolean;
		speaker?: string;
	} = {
		camera: undefined,
		mic: undefined,
		screenShare: false,
		speaker: undefined
	};

	/** @ignore */
	private readonly remoteVideos: Promise<() => JQuery> = this._REMOTE_VIDEOS;

	/** @ignore */
	private readonly sessionServices = new BehaviorSubject<
		SessionService[] | undefined
	>(undefined);

	/** @inheritDoc */
	public readonly cameraActivated = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly disconnect: Observable<void> = this.disconnectInternal;

	/** @inheritDoc */
	public readonly handlers: Promise<IP2PHandlers> = this._HANDLERS;

	/** @inheritDoc */
	public readonly incomingStreams = new BehaviorSubject<
		{
			activeVideo: boolean;
			constraints: MediaStreamConstraints;
			isOutgoing: boolean;
			stream?: MediaStream;
			user: {
				name?: string;
				username?: string;
			};
		}[]
	>([]);

	/** @inheritDoc */
	public readonly incomingStreamsFiltered = this.incomingStreams.pipe(
		map(
			incomingStreams => <
					{
						activeVideo: boolean;
						constraints: MediaStreamConstraints;
						isOutgoing: boolean;
						stream: MediaStream;
						user: {
							name?: string;
							username?: string;
						};
					}[]
				> incomingStreams.filter(o => !!o.stream)
		)
	);

	/** @inheritDoc */
	public readonly incomingStreamUsers = this.incomingStreams.pipe(
		map(incomingStreams =>
			filterUndefined(
				incomingStreams
					.filter(o => o.stream !== undefined)
					.map(o => o.user)
			)
		)
	);

	/** @inheritDoc */
	public readonly incomingVideoStreams = this.incomingStreams.pipe(
		map(
			incomingStreams => <
					{
						activeVideo: boolean;
						constraints: MediaStreamConstraints;
						isOutgoing: boolean;
						stream: MediaStream;
						user: {
							name?: string;
							username?: string;
						};
					}[]
				> incomingStreams.filter(o => !!o.constraints.video && !!o.stream)
		)
	);

	/** @inheritDoc */
	public readonly initialCallPending = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly isActive = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly loading = new BehaviorSubject<boolean>(true);

	/** @inheritDoc */
	public readonly localMediaError = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly outgoingStream = new BehaviorSubject<{
		constraints: MediaStreamConstraints;
		isOutgoing: boolean;
		stream?: MediaStream;
	}>({
		constraints: {
			audio: false,
			video: false
		},
		isOutgoing: true
	});

	/** @inheritDoc */
	public readonly ready: Promise<boolean> = this._READY;

	/** @inheritDoc */
	public readonly recorder = (() => {
		const recordRTC = new RecordRTC.MRecordRTC();
		recordRTC.mediaType = {video: true};

		let isRecording = false;

		const recorder = {
			addStream: (stream: MediaStream) => {
				recordRTC.addStream(stream);
			},
			getBlob: async () =>
				new Promise<Blob>((resolve, reject) => {
					recordRTC.getBlob((recording: any) => {
						if (recording?.video instanceof Blob) {
							resolve(recording.video);
						}
						else {
							reject();
						}
					});
				}),
			pause: () => {
				recordRTC.pauseRecording();
			},
			resume: () => {
				recordRTC.resumeRecording();
			},
			start: () => {
				isRecording = true;
				recordRTC.startRecording();
			},
			stop: async () => {
				/* Workaround for recordRTC.stopRecording callback not firing */
				if (!isRecording) {
					return;
				}

				isRecording = false;

				recordRTC.stopRecording();
				await retryUntilSuccessful(async () =>
					recorder.getBlob()
				).catch(() => {});
			}
		};

		return recorder;
	})();

	/** @inheritDoc */
	public readonly resolveHandlers: (handlers: IP2PHandlers) => void =
		this._HANDLERS.resolve;

	/** @inheritDoc */
	public readonly resolveReady: () => void = this._READY.resolve;

	/** @inheritDoc */
	public readonly resolveRemoteVideos: (remoteVideo: () => JQuery) => void =
		this._REMOTE_VIDEOS.resolve;

	/** @inheritDoc */
	public readonly screenSharingEnabled = new BehaviorSubject<boolean>(
		P2PWebRTCService.isScreenSharingSupported
	);

	/** @inheritDoc */
	public readonly videoEnabled = new BehaviorSubject<boolean>(true);

	/** @inheritDoc */
	public readonly webRTC = new BehaviorSubject<
		| undefined
		| {
				peers: {
					connected: Promise<void>;
					peerResolvers:
						| IResolvable<SimplePeer.Instance>[]
						| undefined;
				}[];
				timer: Timer;
		  }
	>(undefined);

	/** @ignore */
	private addHarker (
		remoteStream: MediaStream,
		incomingStreamIndex: number
	) : void {
		if (
			!this.sessionService.group.value ||
			this.harkers.has(remoteStream) ||
			remoteStream.getAudioTracks().length < 1
		) {
			return;
		}

		const harker = hark(remoteStream);
		this.harkers.set(remoteStream, harker);

		harker.on('speaking', () => {
			if (
				!this.incomingStreams.value[incomingStreamIndex].constraints
					.video
			) {
				return;
			}

			this.incomingStreams.next(
				this.incomingStreams.value.map((o, i) => ({
					...o,
					activeVideo: incomingStreamIndex === i
				}))
			);
		});
	}

	/** @ignore */
	private async getUserMedia () : Promise<MediaStream | undefined> {
		const {constraints} = this.outgoingStream.value;

		constraints.audio = constraints.audio ?
			{
				...(constraints.audio === true ? {} : constraints.audio),
				echoCancellation: true
			} :
			false;

		constraints.video = constraints.video ?
			{
				...(constraints.video === true ? {} : constraints.video),
				echoCancellation: true
			} :
			false;

		if (
			(this.confirmLocalVideoAccess &&
				!(await (
					await this.handlers
				).localVideoConfirm(!!constraints.video))) ||
			!(await requestPermissions(
				...['RECORD_AUDIO', ...(constraints.video ? ['CAMERA'] : [])]
			))
		) {
			debugLog(() => 'p2pWebRTCGetUserMediaCancel');
			return undefined;
		}

		try {
			return await (this.lastDeviceIDs.screenShare ?
				(<any> navigator).mediaDevices.getDisplayMedia() :
				navigator.mediaDevices.getUserMedia(constraints));
		}
		catch (err) {
			debugLogError(() => ({
				webRTC: {navigatorMediaDevicesGetUserMedia: err}
			}));
		}

		if (this.lastDeviceIDs.screenShare) {
			return undefined;
		}

		try {
			return await new Promise<MediaStream>((resolve, reject) => {
				(<any> navigator).getUserMedia(constraints, resolve, reject);
			});
		}
		catch (err) {
			debugLogError(() => ({
				webRTC: {navigatorGetUserMedia: err}
			}));
		}

		return undefined;
	}

	/** @ignore */
	private async getWebRTC () : Promise<{
		peers: {
			connected: Promise<void>;
			peerResolvers: IResolvable<SimplePeer.Instance>[] | undefined;
		}[];
		timer: Timer;
	}> {
		return firstValueFrom(this.webRTC.pipe(filterUndefinedOperator()));
	}

	/** @ignore */
	private async setOutgoingStreamConstraints (
		constraints: MediaStreamConstraints
	) : Promise<void> {
		const {cameras, mics} = await this.getDevices();

		this.outgoingStream.next({
			...this.outgoingStream.value,
			constraints: {
				...constraints,
				...(mics.length < 1 ? {audio: false} : {}),
				...(cameras.length < 1 ? {video: false} : {})
			}
		});
	}

	/** @ignore */
	private stopIncomingStream (incomingStream: {stream?: MediaStream}) : void {
		const {stream} = incomingStream;

		if (!stream) {
			return;
		}

		this.harkers.get(stream)?.stop();
		this.harkers.delete(stream);

		for (const track of stream.getTracks()) {
			track.enabled = false;
			track.stop();
			stream.removeTrack(track);
		}
	}

	/** @inheritDoc */
	public async accept (
		callType?: 'audio' | 'video',
		isPassive: boolean = false
	) : Promise<void> {
		this.isAccepted = true;
		await this.setOutgoingStreamConstraints({
			audio: true,
			video: callType === 'video'
		});

		if (isPassive) {
			this.isActive.next(true);
		}
	}

	/** @inheritDoc */
	public async close (incomingP2PKill: boolean = false) : Promise<void> {
		const p2pKillPromise = Promise.all([
			incomingP2PKill || this.sessionService.group.value ?
				Promise.resolve() :
				this.sessionService
					.send([RpcEvents.p2pKill, {}])
					.then(() => {}),
			this.recorder.stop()
		]);

		this.initialCallPending.next(false);

		this.disconnectInternal.next();

		const wasAccepted = this.isAccepted;
		const wasInitialCallPending = this.initialCallPending.value;
		this.isAccepted = false;
		this.isActive.next(false);
		this.loading.next(true);
		this.initialCallPending.next(false);

		if (this.outgoingStream.value.stream) {
			for (const track of this.outgoingStream.value.stream.getTracks()) {
				track.enabled = false;
				track.stop();
				this.outgoingStream.value.stream.removeTrack(track);
			}
		}

		if (this.webRTC.value) {
			this.webRTC.value.timer.stop();
			for (const {peerResolvers} of this.webRTC.value.peers) {
				if (!peerResolvers) {
					continue;
				}
				for (const {value: peer} of peerResolvers) {
					peer?.destroy();
				}
			}
		}

		this.incomingStreams.next([]);
		this.outgoingStream.next({
			constraints: {audio: false, video: false},
			isOutgoing: true
		});
		this.webRTC.next(undefined);

		const handlers = await this.handlers;

		if (wasInitialCallPending) {
			await handlers.canceled();
		}
		else if (wasAccepted) {
			await handlers.connected(false);
		}

		await p2pKillPromise;
	}

	/** @inheritDoc */
	public async getDevices () : Promise<{
		cameras: {label: string; switchTo: () => Promise<void>}[];
		mics: {label: string; switchTo: () => Promise<void>}[];
		screen: {switchTo: () => Promise<void>};
		speakers: {label: string; switchTo: () => Promise<void>}[];
	}> {
		const allDevices = await (async () =>
			navigator.mediaDevices.enumerateDevices())().catch(() => []);

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
				[lastDevice, ...devices.filter(o => o !== lastDevice)]).map(
				(o, i) => ({
					label: o.label || `${kindName} ${i + 1}`,
					switchTo: switchToFactory(o)
				})
			);
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
			screen: {
				switchTo: async () =>
					this.toggle('video', {
						newDeviceID:
							'screen-share-456ea64bc2811705460fd1296bc54e96',
						screenShare: true
					})
			},
			speakers: !('sinkId' in HTMLMediaElement.prototype) ?
				[] :
				filterDevices(
					'audiooutput',
					this.stringsService.speakerTitle,
					this.lastDeviceIDs.speaker,
					(o: MediaDeviceInfo) => async () => {
							const remoteVideos = (await this.remoteVideos)()
									.find('video')
									.toArray();
							if (remoteVideos.length < 1) {
								debugLogError(
									() =>
										'Remote video not found (switching speaker).'
								);
								return;
							}
							if (!('setSinkId' in remoteVideos[0])) {
								debugLogError(
									() => 'Switching speakers unsupported.'
								);
								return;
							}
							for (const remoteVideo of remoteVideos) {
								(<any> remoteVideo).setSinkId(o.deviceId);
							}
							this.lastDeviceIDs.speaker = o.deviceId;
						}
				)
		};
	}

	/** @inheritDoc */
	public async initUserMedia (
		callType?: 'audio' | 'video'
	) : Promise<MediaStream | undefined> {
		if (this.outgoingStream.value.stream) {
			return this.outgoingStream.value.stream;
		}

		if (callType) {
			await this.setOutgoingStreamConstraints({
				audio: true,
				video: callType === 'video'
			});
		}

		const localStream = await this.getUserMedia();

		if (localStream === undefined) {
			return;
		}

		this.lastDeviceIDs.camera = localStream
			.getVideoTracks()[0]
			?.getSettings().deviceId;
		this.lastDeviceIDs.mic = localStream.getAudioTracks()[0]?.getSettings()
			.deviceId;

		this.recorder.addStream(localStream);

		this.outgoingStream.next({
			...this.outgoingStream.value,
			stream: localStream
		});

		return localStream;
	}

	/** @inheritDoc */
	public async join (p2pSessionData: {
		callType: 'audio' | 'video';
		iceServers: string;
		id: string;
	}) : Promise<void> {
		if (!P2PWebRTCService.isSupported) {
			await this.close();
			await (await this.handlers).failed();
			return;
		}

		await this.joinAndToggleLock(async () => {
			if (this.webRTC.value) {
				return;
			}

			this.webRTC.next(undefined);
			this.isActive.next(true);

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

			const [handlers] = await Promise.all([
				this.handlers,
				this.accept(p2pSessionData.callType)
			]);

			this.cameraActivated.next(
				!!this.outgoingStream.value.constraints.video
			);

			const localStream = await this.initUserMedia();

			if (localStream === undefined) {
				await this.close();
				await handlers.failed();
				return;
			}

			const timer = new Timer(undefined, false, undefined, true);

			const peers: {
				connected: Promise<void>;
				peerResolvers: IResolvable<SimplePeer.Instance>[] | undefined;
			}[] = [];

			const getPeer = (
				options: {
					connected: IResolvable<void>;
					i: number;
					peerResolvers: IResolvable<SimplePeer.Instance>[];
					sessionService: SessionService;
				},
				generation: number = 0
			) => {
				const {connected, i, peerResolvers, sessionService} = options;

				const peer = new SimplePeer({
					channelName: p2pSessionData.id,
					config: !this.sessionService.apiFlags.disableP2P ?
						{iceServers} :
						{iceServers, iceTransportPolicy: 'relay'},
					initiator: !sessionService.state.isAlice.value,
					sdpTransform: (sdp: any) : any =>
						/* http://www.kapejod.org/en/2014/05/28 */
						typeof sdp === 'string' ?
							sdp
								.split('\n')
								.filter(s => s.indexOf('ssrc-audio-level') < 0)
								.join('\n') :
							sdp,
					stream: localStream,
					trickle: false
				});

				peer.on('close', async () => {
					if (this.isActive.value) {
						debugLog(() => ({
							webRTC: {close: 'retrying', peerIndex: i}
						}));

						this.incomingStreams.next([
							...this.incomingStreams.value.slice(0, i),
							{
								...this.incomingStreams.value[i],
								activeVideo: false
							},
							...this.incomingStreams.value.slice(i + 1)
						]);

						peerResolvers.push(resolvable());
						peerResolvers
							.slice(-2)[0]
							.resolve(getPeer(options, generation + 1));
						return;
					}

					debugLog(() => ({
						webRTC: {close: 'closing', peerIndex: i}
					}));

					peers[i].peerResolvers = undefined;
					connected.reject();

					if (!this.sessionService.group.value) {
						await this.close();
						return;
					}

					const newIncomingStreams = [
						...this.incomingStreams.value.slice(0, i),
						{
							...this.incomingStreams.value[i],
							activeVideo: false,
							constraints: {
								audio: false,
								video: false
							},
							stream: undefined
						},
						...this.incomingStreams.value.slice(i + 1)
					];

					if (this.incomingStreams.value[i].activeVideo) {
						const newActiveVideoStream = newIncomingStreams.find(
							o => o.constraints.video
						);

						if (newActiveVideoStream) {
							newActiveVideoStream.activeVideo = true;
						}
					}

					this.stopIncomingStream(this.incomingStreams.value[i]);
					this.incomingStreams.next(newIncomingStreams);
				});

				peer.on('connect', () => {
					debugLog(() => ({
						webRTC: {connect: true, peerIndex: i}
					}));

					if (generation !== 0) {
						return;
					}

					connected.resolve();
				});

				peer.on('data', data => {
					try {
						const o = dynamicDeserialize(data);

						debugLog(() => ({webRTC: {data: o, peerIndex: i}}));

						this.incomingStreams.next([
							...this.incomingStreams.value.slice(0, i),
							{
								...this.incomingStreams.value[i],
								constraints: {
									audio: !!o.audio,
									video: !!o.video
								}
							},
							...this.incomingStreams.value.slice(i + 1)
						]);
					}
					catch (err) {
						debugLogError(() => ({
							webRTC: {dataFail: {data, err, peerIndex: i}}
						}));
					}
				});

				peer.on('error', err => {
					debugLogError(() => ({
						webRTC: {error: err, peerIndex: i}
					}));

					if (!this.sessionService.group.value && generation === 0) {
						connected.reject();
						this.localMediaError.next(true);
					}
				});

				peer.on('signal', (data: SimplePeer.SignalData) => {
					const message = {
						data,
						generation
					};

					debugLog(() => ({
						webRTC: {outgoingSignal: message, peerIndex: i}
					}));

					sessionService.send([
						RpcEvents.p2p,
						{
							bytes: dynamicSerializeBytes(message)
						}
					]);
				});

				peer.on('stream', async (remoteStream: MediaStream) => {
					debugLog(() => ({
						webRTC: {
							peerIndex: i,
							remoteStream: {
								audio: remoteStream.getAudioTracks().length > 0,
								stream: remoteStream,
								video: remoteStream.getVideoTracks().length > 0
							}
						}
					}));

					this.stopIncomingStream(this.incomingStreams.value[i]);

					this.recorder.addStream(remoteStream);

					this.incomingStreams.next([
						...this.incomingStreams.value.slice(0, i),
						{
							...this.incomingStreams.value[i],
							activeVideo:
								!!this.incomingStreams.value[i].constraints
									.video &&
								(this.incomingStreams.value[i].activeVideo ||
									!this.incomingStreams.value.find(
										o => o.activeVideo
									)),
							stream: remoteStream
						},
						...this.incomingStreams.value.slice(i + 1)
					]);

					this.addHarker(remoteStream, i);

					if (!this.sessionService.group.value && generation === 0) {
						this.loading.next(false);
						timer.start();
					}
				});

				peer.on(
					'track',
					async (
						remoteTrack: MediaStreamTrack,
						remoteStream: MediaStream
					) => {
						debugLog(() => ({
							webRTC: {
								peerIndex: i,
								track: {
									remoteStream: {
										audio:
											remoteStream.getAudioTracks()
												.length > 0,
										stream: remoteStream,
										video:
											remoteStream.getVideoTracks()
												.length > 0
									},
									remoteTrack: {
										kind: remoteTrack.kind,
										track: remoteTrack
									}
								}
							}
						}));

						this.addHarker(remoteStream, i);
					}
				);

				return peer;
			};

			let lastSessionProcessed = 0;

			const sub = this.sessionServices
				.pipe(filterUndefinedOperator())
				.subscribe(sessionServices => {
					if (
						lastSessionProcessed > 0 &&
						this.webRTC.value?.peers !== peers
					) {
						sub.unsubscribe();
						return;
					}

					const newSessionServices =
						sessionServices.slice(lastSessionProcessed);

					this.incomingStreams.next(
						this.incomingStreams.value.concat(
							newSessionServices.map(sessionService => ({
								activeVideo: false,
								constraints:
									this.outgoingStream.value.constraints,
								isOutgoing: false,
								user: sessionService.pairwiseSessionData
									?.remoteUsername ?
									{
										username:
											sessionService.pairwiseSessionData
												.remoteUsername
									} :
									{
										name: sessionService.remoteUserString
											.value
									}
							}))
						)
					);

					peers.push(
						...newSessionServices.map((sessionService, i) => {
							i += lastSessionProcessed;

							const connected = resolvable();

							const peerResolvers = [
								resolvable<SimplePeer.Instance>(),
								resolvable<SimplePeer.Instance>()
							];

							peerResolvers[0].resolve(
								getPeer({
									connected,
									i,
									peerResolvers,
									sessionService
								})
							);

							return {connected, peerResolvers};
						})
					);

					lastSessionProcessed = sessionServices.length;

					this.webRTC.next({
						peers,
						timer
					});
				});

			this.subscriptions.push(sub);

			await firstValueFrom(this.webRTC.pipe(filterUndefinedOperator()));

			if (this.sessionService.group.value) {
				this.loading.next(false);
				timer.start();
			}

			handlers.loaded();
			handlers.connected(true);
			this.initialCallPending.next(false);
		});

		debugLog(() => 'p2pWebRTCJoinComplete');
	}

	/** @inheritDoc */
	public async request (
		callType: 'audio' | 'video',
		isPassive: boolean = false
	) : Promise<void> {
		if (!P2PWebRTCService.isSupported || (isPassive && !this.isAccepted)) {
			return;
		}

		const [ok, iceServers] = await Promise.all([
			this.handlers.then(async handlers =>
				handlers.requestConfirm(callType, this.isAccepted)
			),
			request({
				retries: 5,
				url: env.baseUrl + 'iceservers'
			}).catch(() => '[]')
		]);

		if (!ok) {
			return;
		}

		const p2pSessionData = {
			callType,
			iceServers,
			id: uuid()
		};

		await Promise.all([
			this.sessionService.send([
				RpcEvents.p2pRequest,
				{
					bytes: dynamicSerializeBytes(p2pSessionData)
				}
			]),
			this.join(p2pSessionData)
		]);

		this.analyticsService.sendEvent(
			'call',
			'start',
			p2pSessionData.callType,
			1
		);
	}

	/** @inheritDoc */
	public async toggle (
		medium?: 'audio' | 'video',
		shouldPause?: boolean | {newDeviceID: string; screenShare?: boolean}
	) : Promise<void> {
		const webRTC = await this.getWebRTC();

		/* eslint-disable-next-line complexity */
		await this.joinAndToggleLock(async () => {
			let deviceIdChanged = false;

			const oldAudioTracks =
				this.outgoingStream.value.stream?.getAudioTracks() || [];
			const oldVideoTracks =
				this.outgoingStream.value.stream?.getVideoTracks() || [];
			const oldTracks = [...oldAudioTracks, ...oldVideoTracks];
			const oldDeviceIDs = {...this.lastDeviceIDs};

			if (medium === 'audio' || medium === undefined) {
				if (
					typeof shouldPause === 'object' &&
					shouldPause.newDeviceID
				) {
					deviceIdChanged =
						deviceIdChanged ||
						this.lastDeviceIDs.mic !== shouldPause.newDeviceID ||
						!!shouldPause.screenShare;

					this.lastDeviceIDs.mic = shouldPause.newDeviceID;
				}

				const audio =
					typeof shouldPause === 'object' ||
					shouldPause === false ||
					(shouldPause === undefined &&
						!this.outgoingStream.value.constraints.audio);

				if (
					!!this.outgoingStream.value.constraints.audio !== audio ||
					(typeof this.outgoingStream.value.constraints.audio ===
						'boolean' &&
						this.lastDeviceIDs.mic) ||
					(typeof this.outgoingStream.value.constraints.audio ===
						'object' &&
						this.outgoingStream.value.constraints.audio.deviceId !==
							this.lastDeviceIDs.mic)
				) {
					for (const track of oldAudioTracks) {
						track.enabled = audio;
					}

					await this.setOutgoingStreamConstraints({
						...this.outgoingStream.value.constraints,
						audio:
							!audio || !this.lastDeviceIDs.mic ?
								audio :
								{deviceId: this.lastDeviceIDs.mic}
					});
				}
			}

			if (medium === 'video' || medium === undefined) {
				if (
					typeof shouldPause === 'object' &&
					shouldPause.newDeviceID
				) {
					deviceIdChanged =
						deviceIdChanged ||
						this.lastDeviceIDs.camera !== shouldPause.newDeviceID ||
						!!shouldPause.screenShare;

					this.lastDeviceIDs.camera = shouldPause.newDeviceID;
					this.lastDeviceIDs.screenShare = !!shouldPause.screenShare;
				}

				const video =
					typeof shouldPause === 'object' ||
					shouldPause === false ||
					(shouldPause === undefined &&
						!this.outgoingStream.value.constraints.video);

				if (
					!!this.outgoingStream.value.constraints.video !== video ||
					(typeof this.outgoingStream.value.constraints.video ===
						'boolean' &&
						this.lastDeviceIDs.camera) ||
					(typeof this.outgoingStream.value.constraints.video ===
						'object' &&
						this.outgoingStream.value.constraints.video.deviceId !==
							this.lastDeviceIDs.camera)
				) {
					for (const track of oldVideoTracks) {
						track.enabled = video;
					}

					await this.setOutgoingStreamConstraints({
						...this.outgoingStream.value.constraints,
						video:
							!video ||
							!this.lastDeviceIDs.camera ||
							this.lastDeviceIDs.screenShare ?
								video :
								{deviceId: this.lastDeviceIDs.camera}
					});
				}
			}

			if (!deviceIdChanged) {
				return;
			}

			const stream = this.outgoingStream.value.stream;
			const newStream = await this.getUserMedia();

			if (newStream === undefined) {
				this.lastDeviceIDs.camera = oldDeviceIDs.camera;
				this.lastDeviceIDs.mic = oldDeviceIDs.mic;
				this.lastDeviceIDs.screenShare = oldDeviceIDs.screenShare;
				this.lastDeviceIDs.speaker = oldDeviceIDs.speaker;
				return;
			}

			const newAudioTracks = newStream.getAudioTracks();
			const newVideoTracks = newStream.getVideoTracks();
			const newTracks = [...newAudioTracks, ...newVideoTracks];

			if (
				!stream ||
				oldAudioTracks.length !== newAudioTracks.length ||
				oldVideoTracks.length !== newVideoTracks.length ||
				!('replaceTrack' in RTCRtpSender.prototype)
			) {
				for (const peer of webRTC.peers.map(
					o => o.peerResolvers?.slice(-2)[0].value
				)) {
					if (stream) {
						peer?.removeStream(stream);
					}

					peer?.addStream(newStream);
				}

				this.recorder.addStream(newStream);

				this.outgoingStream.next({
					...this.outgoingStream.value,
					stream: newStream
				});
			}
			else {
				for (const peer of webRTC.peers.map(
					o => o.peerResolvers?.slice(-2)[0].value
				)) {
					for (let i = 0; i < oldTracks.length; ++i) {
						peer?.replaceTrack(oldTracks[i], newTracks[i], stream);
					}
				}

				for (let i = 0; i < oldTracks.length; ++i) {
					const oldTrack = oldTracks[i];
					const newTrack = newTracks[i];

					oldTrack.enabled = false;
					oldTrack.stop();
					stream.removeTrack(oldTrack);
					stream.addTrack(newTrack);
				}
			}
		});

		await Promise.all(
			webRTC.peers.map(async ({connected, peerResolvers}, i) => {
				try {
					await connected;
					const peer = peerResolvers?.slice(-2)[0].value;
					await Promise.resolve(
						peer?.send(
							dynamicSerializeBytes({
								audio: !!this.outgoingStream.value.constraints
									.audio,
								video: !!this.outgoingStream.value.constraints
									.video
							})
						)
					);
				}
				catch (err) {
					debugLogError(() => ({
						webRTC: {peerIndex: i, peerSendError: err}
					}));
				}
			})
		);
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();

		const updateSessionServices = async (
			sessionServices: SessionService[]
		) => {
			const internalSessionServices = sessionServices.map(
				o => o.internalSessionService || o
			);

			await Promise.all(
				internalSessionServices.map(
					async sessionService => sessionService.opened
				)
			);

			this.sessionServices.next(internalSessionServices);
		};

		this.ready.then(async () => {
			if (!this.sessionService.group.value) {
				return updateSessionServices([this.sessionService]);
			}

			this.subscriptions.push(
				this.sessionService.group.subscribe(async sessionServices =>
					updateSessionServices(
						sessionServices || [this.sessionService]
					)
				)
			);
		});

		firstValueFrom(
			this.sessionServices.pipe(filterUndefinedOperator())
		).then(() => {
			if (!this.sessionService.group.value) {
				this.sessionService.on(RpcEvents.p2pKill, async () =>
					this.close(true)
				);
			}

			this.sessionService.on(RpcEvents.p2pRequest, async newEvents => {
				const p2pSessionData =
					newEvents[0]?.bytes &&
					dynamicDeserialize(newEvents[0]?.bytes);

				if (
					!(
						typeof p2pSessionData === 'object' &&
						p2pSessionData &&
						(p2pSessionData.callType === 'audio' ||
							p2pSessionData.callType === 'video') &&
						typeof p2pSessionData.iceServers === 'string' &&
						typeof p2pSessionData.id === 'string'
					)
				) {
					return;
				}

				const ok = await (
					await this.handlers
				).acceptConfirm(
					p2pSessionData.callType,
					500000,
					this.isAccepted
				);

				if (!ok) {
					if (!this.sessionService.group.value) {
						await this.sessionService.send([RpcEvents.p2pKill, {}]);
					}

					return;
				}

				await this.join(p2pSessionData);
			});
		});

		let lastSessionProcessed = 0;

		this.subscriptions.push(
			this.sessionServices
				.pipe(filterUndefinedOperator())
				.subscribe(sessionServices => {
					for (
						let i = lastSessionProcessed;
						i < sessionServices.length;
						++i
					) {
						const incomingSignalLock = lockFunction();

						sessionServices[i].on(RpcEvents.p2p, async newEvents =>
							incomingSignalLock(async () => {
								const webRTC = await this.getWebRTC();

								for (const o of newEvents) {
									const message =
										o?.bytes && dynamicDeserialize(o.bytes);

									if (!message) {
										continue;
									}

									debugLog(() => ({
										webRTC: {
											incomingSignal: message,
											peerIndex: i
										}
									}));

									const {peerResolvers} = webRTC.peers[i];
									const peerResolver =
										peerResolvers &&
										typeof message.generation === 'number' ?
											peerResolvers[message.generation] :
											undefined;
									const peer = await peerResolver;

									peer?.signal(message.data);
								}
							})
						);
					}

					lastSessionProcessed = sessionServices.length;
				})
		);

		this.sessionService.p2pWebRTCService.resolve(this);
	}
}
