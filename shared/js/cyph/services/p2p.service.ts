import {Injectable} from '@angular/core';
import {BehaviorSubject, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {IContactListItem} from '../account';
import {AccountContactsComponent} from '../components/account-contacts';
import {BaseProvider} from '../base-provider';
import {IP2PHandlers} from '../p2p/ip2p-handlers';
import {IAppointment} from '../proto';
import {filterUndefinedOperator} from '../util/filter';
import {observableAll} from '../util/observable-all';
import {prettyPrint} from '../util/serialization';
import {AccountUserLookupService} from './account-user-lookup.service';
import {ChatService} from './chat.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {SessionInitService} from './session-init.service';
import {StringsService} from './strings.service';
import {WindowWatcherService} from './window-watcher.service';

/**
 * Manages P2P sessions.
 */
@Injectable()
export class P2PService extends BaseProvider {
	/** @ignore */
	private readonly incomingStreamUsers = this.p2pWebRTCService.incomingStreamUsers.pipe(
		map(users =>
			users.map(
				({name, username}) : IContactListItem =>
					username ?
						{
							unreadMessageCount: of(0),
							user: this.accountUserLookupService
								.getUser(username)
								.catch(() => undefined),
							username
						} :
						{
							anonymousUser: {
								name: name || this.stringsService.anonymous
							},
							unreadMessageCount: of(0),
							user: Promise.resolve(undefined),
							username: ''
						}
			)
		)
	);

	/** Indicates whether the gallery view is enabled for group video calls. */
	public readonly galleryView = new BehaviorSubject<boolean>(false);

	/** Gallery view configuration. */
	public readonly galleryViewOptions = observableAll([
		this.p2pWebRTCService.incomingStreams,
		this.windowWatcherService.height,
		this.windowWatcherService.width
	]).pipe(
		map(([incomingStreams, height, width]) => {
			const gridMargin = 4;
			const rows = Math.floor(Math.sqrt(incomingStreams.length));
			const columns = Math.floor(
				Math.ceil(incomingStreams.length / rows)
			);
			const widescreen = height * 3 < width * 2;
			const flexAmount = widescreen ? 100 / columns : 100 / rows;
			const totalCount = rows * columns;

			const panels: (typeof incomingStreams[0] | undefined)[] =
				totalCount > incomingStreams.length ?
					incomingStreams.concat(
						new Array(totalCount - incomingStreams.length).fill(
							undefined
						)
					) :
					incomingStreams;

			return {
				flexAmount: flexAmount.toFixed(2),
				gridMargin: gridMargin.toString(),
				panels
			};
		})
	);

	/** @see IP2PHandlers */
	public readonly handlers: IP2PHandlers = {
		acceptConfirm: async (callType, timeout, isAccepted = false) => {
			if (!P2PWebRTCService.isSupported) {
				return false;
			}

			if (isAccepted) {
				return true;
			}

			return this.p2pWarningPersist(async () =>
				this.dialogService.confirm({
					cancel: this.stringsService.decline,
					content: `${this.stringsService.p2pRequest} ${<string> (
						((<any> this.stringsService)[callType + 'Call'] || '')
					)}. ${this.p2pWarning} ${
						this.stringsService.continuePrompt
					}`,
					markdown: true,
					ok: this.stringsService.continueDialogAction,
					timeout,
					title: this.stringsService.p2pTitle
				})
			);
		},
		audioDefaultEnabled: () => !this.chatService.walkieTalkieMode.value,
		canceled: async () => {
			await this.dialogService.toast(
				this.stringsService.p2pCanceled,
				3000
			);
		},
		connected: async isConnected => {
			if (this.sessionInitService.callType) {
				return;
			}

			await this.chatService.addMessage({
				shouldNotify: false,
				value: isConnected ?
					this.stringsService.p2pConnect :
					this.stringsService.p2pDisconnect
			});
		},
		failed: async () => {
			await this.dialogService.toast(this.stringsService.p2pFailed, 3000);
		},
		loaded: async () => {
			if (!this.sessionInitService.ephemeral) {
				this.chatService.initProgressFinish();
			}
		},
		localVideoConfirm: async video => {
			return this.dialogService.confirm({
				content: `${this.stringsService.allow} ${
					video ? this.stringsService.camera : this.stringsService.mic
				} ${this.stringsService.allow}?`,
				title: this.stringsService.p2pTitle
			});
		},
		requestConfirm: async (callType, isAccepted = false) => {
			if (isAccepted) {
				return true;
			}

			return this.p2pWarningPersist(async () =>
				this.dialogService.confirm({
					content: `${this.stringsService.p2pInit} ${<string> (
						((<any> this.stringsService)[callType + 'Call'] || '')
					)}. ${this.p2pWarning} ${
						this.stringsService.continuePrompt
					}`,
					markdown: true,
					ok: this.stringsService.continueDialogAction,
					title: this.stringsService.p2pTitle
				})
			);
		},
		requestConfirmation: async () => {
			if (this.sessionInitService.callType) {
				return;
			}

			await this.chatService.addMessage({
				shouldNotify: false,
				value: this.sessionInitService.ephemeral ?
					this.stringsService.p2pRequestConfirmation :
					this.stringsService.p2pAccountChatNotice
			});
		},
		requestRejection: async () => {
			await this.dialogService.toast(this.stringsService.p2pDeny, 3000);
		}
	};

	/** I/O switcher UI logic. */
	public readonly ioSwitcher = {
		close: () => {
			this.ioSwitcher.isOpen.next(false);
		},
		devices: new BehaviorSubject<{
			cameras: {label: string; switchTo: () => Promise<void>}[];
			mics: {label: string; switchTo: () => Promise<void>}[];
			screen: {switchTo: () => Promise<void>};
			speakers: {label: string; switchTo: () => Promise<void>}[];
		}>({
			cameras: [],
			mics: [],
			screen: {switchTo: async () => {}},
			speakers: []
		}),
		isOpen: new BehaviorSubject<boolean>(false),
		open: async () => {
			this.ioSwitcher.devices.next(
				await this.p2pWebRTCService.getDevices()
			);
			this.ioSwitcher.isOpen.next(true);
		},
		switch: async (
			kind: 'cameras' | 'mics' | 'screen' | 'speakers',
			title: string
		) => {
			try {
				if (kind === 'screen') {
					await this.ioSwitcher.open();
				}

				const devices = this.ioSwitcher.devices.value[kind];

				const device = !(devices instanceof Array) ?
					devices :
					await this.dialogService.prompt({
						bottomSheet: true,
						multipleChoiceOptions: devices.map((o, i) => ({
							title: (i === 0 ? '* ' : '') + o.label,
							value: o
						})),
						title
					});

				if (device) {
					await device.switchTo();
				}
			}
			finally {
				this.ioSwitcher.close();
			}
		}
	};

	/** @see P2PWebRTCService.isActive */
	public readonly isActive = this.p2pWebRTCService.isActive;

	/** Is active or has initial call type. */
	public readonly isActiveOrInitialCall = this.isActive.pipe(
		map(
			isActive =>
				isActive || this.sessionInitService.callType !== undefined
		)
	);

	/** Indicates whether P2P is possible (i.e. both clients support WebRTC). */
	public readonly isEnabled = new BehaviorSubject<boolean>(false);

	/** Indicates whether sidebar is open. */
	public readonly isSidebarOpen = new BehaviorSubject<boolean>(false);

	/** Countup timer for call duration. */
	public readonly timer = this.p2pWebRTCService.webRTC.pipe(
		filterUndefinedOperator(),
		map(o => o.timer)
	);

	/** @ignore */
	private get p2pWarning () : string {
		return this.envService.showAds ?
			this.stringsService.p2pWarningVPN :
			this.stringsService.p2pWarning;
	}

	/** Handles remembering user's answer to P2P warning, if applicable. */
	protected async p2pWarningPersist (
		f: () => Promise<boolean>
	) : Promise<boolean> {
		return f();
	}

	/** @see P2PWebRTCService.request */
	protected async request (callType: 'audio' | 'video') : Promise<void> {
		await this.p2pWebRTCService.request(callType);
	}

	/** Close active P2P session. */
	public async closeButton () : Promise<void> {
		if (
			!this.sessionInitService.ephemeral ||
			this.sessionInitService.callType === undefined
		) {
			await this.p2pWebRTCService.close();
			return;
		}

		await this.chatService.disconnectButton(async () =>
			this.p2pWebRTCService.close()
		);
	}

	/** Creates alert about P2P being unsupported. */
	public async disabledAlert () : Promise<void> {
		await this.dialogService.alert({
			content: this.stringsService.p2pDisabled,
			title: this.stringsService.p2pTitle
		});
	}

	/** Initializes service. */
	public async init (remoteVideos: () => JQuery) : Promise<void> {
		this.p2pWebRTCService.resolveRemoteVideos(remoteVideos);

		this.isEnabled.next(P2PWebRTCService.isSupported);

		this.ioSwitcher.devices.next(await this.p2pWebRTCService.getDevices());
		this.subscriptions.push(
			this.ioSwitcher.devices.subscribe(({cameras}) => {
				this.p2pWebRTCService.videoEnabled.next(cameras.length > 0);
			})
		);
	}

	/** Opens notes. */
	public async openNotes (appointment: IAppointment) : Promise<void> {
		const newNotes = await this.dialogService.prompt({
			bottomSheet: true,
			content:
				(appointment.forms && appointment.forms.length > 0 ?
					`${prettyPrint(appointment.forms)}\n\n\n` :
					'') + this.stringsService.appointmentNotes,
			preFill: appointment.notes,
			title: this.stringsService.notes
		});

		if (newNotes !== undefined) {
			appointment.notes = newNotes;
		}
	}

	/** Toggle window of sidebar containing chat UI. */
	public toggleSidebar () : void {
		this.isSidebarOpen.next(!this.isSidebarOpen.value);
	}

	/**
	 * Attempt to toggle outgoing video stream,
	 * requesting new P2P session if necessary.
	 */
	public async videoCallButton () : Promise<void> {
		if (!this.isEnabled.value) {
			return this.disabledAlert();
		}

		if (
			this.isActive.value &&
			!this.p2pWebRTCService.cameraActivated.value
		) {
			const camera = (await this.p2pWebRTCService.getDevices())
				.cameras[0];
			if (!camera) {
				this.p2pWebRTCService.videoEnabled.next(false);
				return;
			}
			this.p2pWebRTCService.cameraActivated.next(true);
			await camera.switchTo();
			return;
		}

		if (!this.isActive.value) {
			await this.request('video');
		}
		else if (this.p2pWebRTCService.videoEnabled.value) {
			await this.p2pWebRTCService.toggle('video');
		}
	}

	/** If applicable, displays list of current participants in call. */
	public async viewCallParticipants () : Promise<void> {
		await this.dialogService.baseDialog(
			AccountContactsComponent,
			o => {
				const previousValues = {
					contactList: o.contactList,
					readOnly: o.readOnly
				};

				o.contactList = this.incomingStreamUsers;
				o.filterContactList = false;
				o.readOnly = true;
				o.showSpinner = of(false);

				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				o.ngOnChanges({
					contactList: {
						currentValue: o.contactList,
						firstChange: false,
						isFirstChange: () => false,
						previousValue: previousValues.contactList
					},
					readOnly: {
						currentValue: o.readOnly,
						firstChange: false,
						isFirstChange: () => false,
						previousValue: previousValues.readOnly
					}
				});
			},
			undefined,
			true
		);
	}

	/**
	 * Attempt to toggle outgoing audio stream,
	 * requesting new P2P session if necessary.
	 */
	public async voiceCallButton () : Promise<void> {
		if (!this.isEnabled.value) {
			return this.disabledAlert();
		}

		if (!this.isActive.value) {
			await this.request('audio');
		}
		else {
			await this.p2pWebRTCService.toggle('audio');
		}
	}

	constructor (
		/** @ignore */
		protected readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		protected readonly chatService: ChatService,

		/** @ignore */
		protected readonly dialogService: DialogService,

		/** @ignore */
		protected readonly envService: EnvService,

		/** @ignore */
		protected readonly localStorageService: LocalStorageService,

		/** @ignore */
		protected readonly p2pWebRTCService: P2PWebRTCService,

		/** @ignore */
		protected readonly sessionInitService: SessionInitService,

		/** @ignore */
		protected readonly stringsService: StringsService,

		/** @ignore */
		protected readonly windowWatcherService: WindowWatcherService
	) {
		super();

		this.chatService.p2pService.resolve(this);
		this.p2pWebRTCService.resolveHandlers(this.handlers);
	}
}
