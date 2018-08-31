/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {take} from 'rxjs/operators';
import * as SimpleWebRTC from 'simplewebrtc';
import {BaseProvider} from '../base-provider';
import {env} from '../env';
import {eventManager} from '../event-manager';
import {LockFunction} from '../lock-function-type';
import {IP2PHandlers} from '../p2p/ip2p-handlers';
import {ISessionCommand} from '../proto';
import {IP2PWebRTCService} from '../service-interfaces/ip2p-webrtc.service';
import {events, ISessionMessageData, rpcEvents} from '../session';
import {filterUndefinedOperator} from '../util/filter';
import {lockFunction} from '../util/lock';
import {debugLog} from '../util/log';
import {requestPermissions} from '../util/permissions';
import {request} from '../util/request';
import {parse} from '../util/serialization';
import {uuid} from '../util/uuid';
import {resolvable, sleep, waitForIterable} from '../util/wait';
import {AnalyticsService} from './analytics.service';
import {ChatService} from './chat.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionService} from './session.service';


/** @inheritDoc */
@Injectable()
export class P2PWebRTCService extends BaseProvider implements IP2PWebRTCService {
	/** @ignore */
	private readonly _CHAT_SERVICE	= resolvable<ChatService>();

	/** @ignore */
	private readonly _HANDLERS		= resolvable<IP2PHandlers>();

	/** @ignore */
	private readonly _LOCAL_VIDEO	= resolvable<() => JQuery>();

	/** @ignore */
	private readonly _READY			= resolvable(true);

	/** @ignore */
	private readonly _REMOTE_VIDEO	= resolvable<() => JQuery>();

	/** Constant values used by P2P. */
	public static readonly constants	= {
		accept: 'accept',
		decline: 'decline',
		kill: 'kill',
		requestCall: 'requestCall',
		webRTC: 'webRTC'
	};

	/** Indicates whether WebRTC is supported in the current environment. */
	public static readonly isSupported: boolean	=
		/* Temporarily blocking Edge until issue resolved in simplewebrtc/webrtc-adapter */
		!(env.environment.production && env.isEdge) &&
		/* Temporarily blocking Safari until it works */
		!(env.environment.production && env.isSafari) &&
		(() => {
			try {
				return new SimpleWebRTC({connection: {on: () => {}}}).capabilities.support;
			}
			catch {
				return false;
			}
		})()
	;


	/** @ignore */
	private readonly chatService: Promise<ChatService>	= this._CHAT_SERVICE.promise;

	/** @ignore */
	private readonly commands	= {
		accept: async () : Promise<void> =>
			this.join()
		,

		decline: async () : Promise<void> => {
			this.isAccepted		= false;
			this.p2pSessionData	= undefined;

			(await this.handlers).requestRejection();
		},

		kill: async () : Promise<void> => {
			const wasAccepted			= this.isAccepted;
			const wasInitialCallPending	= this.initialCallPending.value;
			this.isAccepted				= false;
			this.isActive.next(false);
			this.initialCallPending.next(false);
			this.p2pSessionData			= undefined;

			await sleep(500);

			this.incomingStream.next({audio: false, video: false});
			this.outgoingStream.next({audio: false, video: false});

			if (this.webRTC.value) {
				this.webRTC.value.mute();
				this.webRTC.value.pauseVideo();
				this.webRTC.value.stopLocalVideo();
				this.webRTC.value.leaveRoom();
				this.webRTC.value.disconnect();

				this.webRTC.next(undefined);
				this.disconnectInternal.next();
			}

			const handlers	= await this.handlers;

			if (wasInitialCallPending) {
				await handlers.canceled();
			}
			else if (wasAccepted) {
				await handlers.connected(false);
			}
		},

		webRTC: async (
			data: {args: any[]; event: string},
			waitForWebRTC: boolean = true
		) : Promise<void> => {
			if (waitForWebRTC) {
				await this.getWebRTC();
			}

			await eventManager.trigger(P2PWebRTCService.constants.webRTC + data.event, data.args);
		}
	};

	/** @ignore */
	private readonly confirmLocalVideoAccess			= false;

	/** @ignore */
	private readonly disconnectInternal: Subject<void>	= new Subject();

	/** @ignore */
	private readonly handlers: Promise<IP2PHandlers>	= this._HANDLERS.promise;

	/** @ignore */
	private isAccepted: boolean							= false;

	/** @ignore */
	private readonly joinLock: LockFunction				= lockFunction();

	/** @ignore */
	private readonly loadingEvents						= {
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
	private readonly localVideo: Promise<() => JQuery>	= this._LOCAL_VIDEO.promise;

	/** @ignore */
	private p2pSessionData?: {iceServers: string; id: string; isAlice: boolean};

	/** @ignore */
	private readonly progressUpdateLock: LockFunction							= lockFunction();

	/** @ignore */
	private readonly remoteVideo: Promise<() => JQuery>	= this._REMOTE_VIDEO.promise;

	/** @ignore */
	private readonly resolveChatService: (chat: ChatService) => void			=
		this._CHAT_SERVICE.resolve
	;

	/** @ignore */
	private readonly resolveHandlers: (handlers: IP2PHandlers) => void			=
		this._HANDLERS.resolve
	;

	/** @ignore */
	private readonly resolveLocalVideo: (localVideo: () => JQuery) => void		=
		this._LOCAL_VIDEO.resolve
	;

	/** @ignore */
	private readonly resolveRemoteVideo: (remoteVideo: () => JQuery) => void	=
		this._REMOTE_VIDEO.resolve
	;

	/** @ignore */
	private readonly toggleLock: LockFunction		= lockFunction();

	/** @ignore */
	private readonly webRTC: BehaviorSubject<any>	= new BehaviorSubject(undefined);

	/** @inheritDoc */
	public readonly disconnect: Observable<void>	= this.disconnectInternal;

	/** @inheritDoc */
	public readonly incomingStream					= new BehaviorSubject(
		{audio: false, video: false}
	);

	/** @inheritDoc */
	public readonly initialCallPending				= new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly isActive						= new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly loading							= new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly localMediaError					= new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public readonly outgoingStream					= new BehaviorSubject(
		{audio: false, video: false}
	);

	/** @inheritDoc */
	public readonly ready: Promise<boolean>			= this._READY.promise;

	/** @inheritDoc */
	public readonly resolveReady: () => void		= this._READY.resolve;

	/** @inheritDoc */
	public readonly videoEnabled					= new BehaviorSubject<boolean>(false);

	/** @ignore */
	private async getWebRTC () : Promise<any> {
		return this.webRTC.pipe(filterUndefinedOperator(), take(1)).toPromise();
	}

	/** @ignore */
	private async handleLoadingEvent (
		webRTC: {on: (event: string, f: () => void) => void},
		event: {name: string; occurred: boolean},
		value: number|(() => void)
	) : Promise<void> {
		event.occurred	= false;
		webRTC.on(event.name, typeof value === 'function' ? value : async () =>
			this.progressUpdate(event, value)
		);
	}

	/** @ignore */
	private async progressUpdate (event: {occurred: boolean}, value: number) : Promise<void> {
		if (event.occurred) {
			return;
		}

		event.occurred	= true;

		await this.progressUpdateLock(async () => {
			for (let i = (await this.chatService).chat.initProgress.value; i < value; ++i) {
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

		const method: Function|undefined	= (<any> this.commands)[command.method];

		if (this.isAccepted && method) {
			if (this.p2pSessionData && command.additionalData === this.p2pSessionData.id) {
				await method(
					command.argument && command.argument.length > 0 ?
						msgpack.decode(command.argument) :
						undefined
				);
			}
		}
		else if (command.method === 'audio' || command.method === 'video') {
			const ok	= await (await this.handlers).acceptConfirm(
				command.method,
				500000,
				this.isAccepted
			);

			const p2pSessionData	= !command.additionalData ? undefined : (() => {
				const splitIndex	= command.additionalData.indexOf('\n');
				return {
					iceServers: command.additionalData.slice(splitIndex + 1),
					id: command.additionalData.slice(0, splitIndex),
					isAlice: false
				};
			})();

			if (p2pSessionData) {
				this.sessionService.send([rpcEvents.p2p, {command: {
					additionalData: p2pSessionData.id,
					method: ok ?
						P2PWebRTCService.constants.accept :
						P2PWebRTCService.constants.decline
				}}]);
			}

			if (!ok) {
				return;
			}

			if (
				p2pSessionData &&
				(!this.p2pSessionData || !this.sessionService.state.isAlice.value)
			) {
				this.p2pSessionData	= p2pSessionData;
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
	public accept (callType?: 'audio'|'video', isPassive: boolean = false) : void {
		this.isAccepted	= true;
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
			this.sessionService.send([rpcEvents.p2p, {command: {
				additionalData: this.p2pSessionData && this.p2pSessionData.id,
				method: P2PWebRTCService.constants.kill
			}}]),
			this.commands.kill()
		]);
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
			this.videoEnabled.next(this.outgoingStream.value.video);
			this.isActive.next(true);

			const p2pSessionData			= this.p2pSessionData;
			const webRTCEvents: string[]	= [];

			const $localVideo	= await waitForIterable<JQuery>(await this.localVideo);
			const $remoteVideo	= await waitForIterable<JQuery>(await this.remoteVideo);

			const iceServers	= parse<RTCIceServer[]>(p2pSessionData.iceServers).
				map(o => {
					if ((<any> o).url !== undefined) {
						o.urls	= (<any> o).url;
						delete (<any> o).url;
					}

					if (this.sessionService.apiFlags.disableP2P) {
						o.urls	= typeof o.urls === 'string' && o.urls.indexOf('stun:') !== 0 ?
							o.urls :
							o.urls instanceof Array ?
								o.urls.filter((url: string) => url.indexOf('stun:') !== 0) :
								[]
						;
					}

					if (o.urls === 'turn:global.turn.twilio.com:443?transport=tcp') {
						o.urls	= 'turns:global.turn.twilio.com:443?transport=tcp';
					}

					return o;
				}).
				filter(o => o.urls && o.urls.length > 0).
				concat(
					!this.sessionService.apiFlags.disableP2P ?
						{urls: 'stun:stun.l.google.com:19302'} :
						[]
				).
				slice(0, 4)
			;

			debugLog(() => ({p2pWebRTCJoin: {iceServers, p2pSessionData}}));

			const handlers	= await this.handlers;

			if (
				(
					this.confirmLocalVideoAccess &&
					!(await handlers.localVideoConfirm(this.outgoingStream.value.video))
				) ||
				!(await requestPermissions(...[
					'RECORD_AUDIO',
					...(this.outgoingStream.value.video ? ['CAMERA'] : [])
				]))
			) {
				debugLog(() => 'p2pWebRTCJoinCancel');
				return this.close();
			}

			const webRTC	= new SimpleWebRTC({
				adjustPeerVolume: false,
				autoRemoveVideos: true,
				autoRequestMedia: false,
				connection: {
					disconnect: () => {
						for (const event of webRTCEvents) {
							eventManager.off(event);
						}
					},
					emit: (event: string, ...args: any[]) => {
						const lastArg: any	= args.slice(-1)[0];

						if (event === 'join' && typeof lastArg === 'function') {
							lastArg(undefined, {clients: {friend: {video: true}}});
						}
						else if (
							event === 'message' &&
							typeof lastArg === 'object' &&
							lastArg.type === 'connectivityError'
						) {
							this.close();
						}
						else {
							this.sessionService.send([rpcEvents.p2p, {command: {
								additionalData: p2pSessionData.id,
								argument: msgpack.encode({args, event}),
								method: P2PWebRTCService.constants.webRTC
							}}]);
						}
					},
					getSessionid: () => p2pSessionData.id,
					on: (event: string, callback: Function) => {
						const fullEvent: string	= P2PWebRTCService.constants.webRTC + event;
						webRTCEvents.push(fullEvent);

						eventManager.on(
							fullEvent,
							(args: any) => {
								/* http://www.kapejod.org/en/2014/05/28/ */
								if (event === 'message' && args[0].type === 'offer') {
									args[0].payload.sdp	= (<string> args[0].payload.sdp).
										split('\n').
										filter(s => s.indexOf('ssrc-audio-level') < 0).
										join('\n')
									;
								}

								callback.apply(webRTC, args);
							}
						);
					}
				},
				debug: env.debugLog,
				localVideoEl: $localVideo[0],
				media: this.outgoingStream.value,
				peerConnectionConfig:
					!this.sessionService.apiFlags.disableP2P ?
						{iceServers} :
						{iceServers, iceTransportPolicy: 'relay'}
				,
				remoteVideosEl: $remoteVideo[0]
			});

			webRTC.connection.on(
				'streamUpdate',
				(incomingStream: {audio: boolean; video: boolean}) => {
					this.incomingStream.next({
						audio: !!incomingStream.audio,
						video: !!incomingStream.video
					});
				}
			);

			webRTC.on('localMediaError', () => {
				this.localMediaError.next(true);
			});

			this.handleLoadingEvent(webRTC, this.loadingEvents.readyToCall, () => {
				webRTC.joinRoom(P2PWebRTCService.constants.webRTC);
			});

			this.handleLoadingEvent(webRTC, this.loadingEvents.started, 10);
			this.handleLoadingEvent(webRTC, this.loadingEvents.localStream, 20);
			this.handleLoadingEvent(webRTC, this.loadingEvents.connectionReady, 40);
			this.handleLoadingEvent(webRTC, this.loadingEvents.createdPeer, 60);
			this.handleLoadingEvent(webRTC, this.loadingEvents.joinedRoom, 75);

			this.handleLoadingEvent(webRTC, this.loadingEvents.finished, async () => {
				await handlers.loaded();
				this.loading.next(false);
				await this.progressUpdate(this.loadingEvents.finished, 100);
				this.toggle('audio', !handlers.audioDefaultEnabled());
			});

			webRTC.startLocalVideo();

			if (!p2pSessionData.isAlice) {
				await this.commands.webRTC({args: [p2pSessionData.id], event: 'connect'}, false);
			}

			handlers.connected(true);
			this.webRTC.next(webRTC);

			this.initialCallPending.next(false);
		});
	}

	/** @inheritDoc */
	public async request (callType: 'audio'|'video', isPassive: boolean = false) : Promise<void> {
		const handlers	= await this.handlers;

		if (isPassive && !this.isAccepted) {
			return;
		}

		const ok	= await handlers.requestConfirm(callType, this.isAccepted);

		if (!ok || this.p2pSessionData) {
			return;
		}

		this.accept(callType);

		this.p2pSessionData	= isPassive && !this.sessionService.state.isAlice.value ?
			undefined :
			{
				iceServers: await request({retries: 5, url: env.baseUrl + 'iceservers'}).catch(
					() => '[]'
				),
				id: uuid(),
				isAlice: true
			}
		;

		this.sessionService.send([rpcEvents.p2p, {command: {
			additionalData: this.p2pSessionData ?
				this.p2pSessionData.id + '\n' + this.p2pSessionData.iceServers :
				undefined
			,
			method: callType
		}}]);

		await sleep();
		handlers.requestConfirmation();

		/* Time out if request hasn't been accepted within 10 minutes */

		for (let seconds = 0 ; seconds < 600 ; ++seconds) {
			if (this.isActive.value) {
				return;
			}

			await sleep(1000);
		}

		this.isAccepted	= false;
	}

	/** @inheritDoc */
	public async toggle (medium?: 'audio'|'video', shouldPause?: boolean) : Promise<void> {
		return this.toggleLock(async () => {
			const webRTC	= await this.getWebRTC();

			if (medium === 'audio' || medium === undefined) {
				const audio	=
					shouldPause === false ||
					(shouldPause === undefined && !this.outgoingStream.value.audio)
				;

				if (this.outgoingStream.value.audio !== audio) {
					this.outgoingStream.next({...this.outgoingStream.value, audio});

					if (audio) {
						webRTC.unmute();
					}
					else {
						webRTC.mute();
					}
				}
			}

			if (medium === 'video' || medium === undefined) {
				const video	=
					shouldPause === false ||
					(shouldPause === undefined && !this.outgoingStream.value.video)
				;

				if (this.outgoingStream.value.video !== video) {
					this.outgoingStream.next({...this.outgoingStream.value, video});

					if (video) {
						webRTC.resumeVideo();
					}
					else {
						webRTC.pauseVideo();
					}
				}
			}

			webRTC.connection.emit('streamUpdate', this.outgoingStream.value);
		});
	}

	constructor (
		sessionCapabilitiesService: SessionCapabilitiesService,

		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly sessionService: SessionService
	) {
		super();

		this.sessionService.on(events.closeChat, () => { this.close(); });

		this.sessionService.on(rpcEvents.p2p, (newEvents: ISessionMessageData[]) => {
			for (const o of newEvents) {
				if (o.command && o.command.method) {
					this.receiveCommand(o.command);
				}
			}
		});

		sessionCapabilitiesService.resolveP2PSupport(P2PWebRTCService.isSupported);
	}
}
