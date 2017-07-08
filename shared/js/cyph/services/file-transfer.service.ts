import {Injectable} from '@angular/core';
import {Set as ImmutableSet} from 'immutable';
import {Observable} from 'rxjs';
import {ISessionMessageData, ISessionTransfer} from '../../proto';
import {ISecretBox} from '../crypto/potassium/isecret-box';
import {SecretBox} from '../crypto/potassium/secret-box';
import {eventManager} from '../event-manager';
import {SessionTransfer, SessionTransferAnswer} from '../files';
import {rpcEvents, SessionMessage, users} from '../session';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {ChatService} from './chat.service';
import {ConfigService} from './config.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {FileService} from './file.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Manages file transfers within a chat. Files are transmitted using Firebase Storage.
 * For encryption, native crypto is preferred when available for performance reasons,
 * but libsodium in a separate thread is used as a fallback.
 */
@Injectable()
export class FileTransferService {
	/** @ignore */
	private readonly secretBox: Promise<ISecretBox>	= (async () =>
		(await this.sessionCapabilitiesService.capabilities).nativeCrypto ?
			new SecretBox(true) :
			this.potassiumService.secretBox
	)();

	/** In-progress file transfers. */
	public transfers: ImmutableSet<{
		metadata: ISessionTransfer;
		progress: Observable<number>;
	}>	= ImmutableSet<{
		metadata: ISessionTransfer;
		progress: Observable<number>;
	}>();

	/** @ignore */
	private addImage (transfer: ISessionTransfer, plaintext: Uint8Array) : void {
		this.chatService.addMessage(
			`![](${this.fileService.toDataURI(plaintext, transfer.mediaType)})` +
				`\n\n#### [${transfer.name}](no:link)`
			,
			transfer.author,
			transfer.receiptTimestamp,
			undefined,
			transfer.imageSelfDestructTimeout
		);
	}

	/** @ignore */
	private async encryptFile (plaintext: Uint8Array) : Promise<{
		cyphertext: Uint8Array;
		key: Uint8Array;
	}> {
		try {
			const key: Uint8Array	= this.potassiumService.randomBytes(
				await (await this.secretBox).keyBytes
			);

			return {
				cyphertext: await (await this.secretBox).seal(plaintext, key),
				key
			};
		}
		catch (_) {
			return {
				cyphertext: new Uint8Array(0),
				key: new Uint8Array(0)
			};
		}
	}

	/** @ignore */
	private async receiveTransfer (transfer: ISessionTransfer) : Promise<void> {
		transfer.isOutgoing			= false;

		transfer.answer				= await this.uiConfirm(transfer, true);
		transfer.receiptTimestamp	= await util.timestamp();

		this.sessionService.send(new SessionMessage(rpcEvents.files, {transfer}));

		if (transfer.answer === SessionTransferAnswer.ACCEPTED) {
			const {result, progress}	= this.databaseService.downloadItem(transfer.url);
			const transferSetItem		= {metadata: transfer, progress};
			this.transfers				= this.transfers.add(transferSetItem);

			const plaintext: Uint8Array|undefined	= await (async () =>
				await (await this.secretBox).open(await result, transfer.key)
			)().catch(
				() => undefined
			);

			this.potassiumService.clearMemory(transfer.key);
			this.uiSave(transfer, plaintext);
			this.transfers	= this.transfers.delete(transferSetItem);
		}
		else {
			this.uiRejected(transfer);
		}

		this.databaseService.removeItem(transfer.url).catch(() => {});
	}

	/** @ignore */
	private uiCompleted (transfer: ISessionTransfer, plaintext: Uint8Array) : void {
		if (transfer.answer === SessionTransferAnswer.ACCEPTED && transfer.image) {
			this.addImage(transfer, plaintext);
		}
		else {
			const message: string	= transfer.answer === SessionTransferAnswer.ACCEPTED ?
				this.stringsService.outgoingFileSaved :
				transfer.answer === SessionTransferAnswer.REJECTED ?
					this.stringsService.outgoingFileRejected :
					this.stringsService.outgoingFileError
			;

			this.chatService.addMessage(
				`${message} ${transfer.name}`,
				users.app
			);
		}
	}

	/** @ignore */
	private async uiConfirm (
		transfer: ISessionTransfer,
		isSave: boolean
	) : Promise<SessionTransferAnswer> {
		const title	=
			`${this.stringsService.incomingFile} ${transfer.name} ` +
			`(${util.readableByteLength(transfer.size)})`
		;

		return (
			(
				!isSave &&
				transfer.size < this.configService.filesConfig.approvalLimit
			) ||
			(isSave && transfer.image) ||
			await this.dialogService.confirm({
				cancel: isSave ?
					this.stringsService.discard :
					this.stringsService.reject
				,
				content: isSave ?
					this.stringsService.incomingFileSave :
					this.stringsService.incomingFileDownload
				,
				ok: isSave ?
					this.stringsService.save :
					this.stringsService.accept
				,
				title
			})
		) ?
			SessionTransferAnswer.ACCEPTED :
			SessionTransferAnswer.REJECTED
		;
	}

	/** @ignore */
	private uiRejected (transfer: ISessionTransfer) : void {
		this.chatService.addMessage(
			`${this.stringsService.incomingFileRejected} ${transfer.name}`,
			users.app,
			undefined,
			false
		);
	}

	/** @ignore */
	private uiSave (transfer: ISessionTransfer, plaintext?: Uint8Array) : void {
		if (!plaintext) {
			this.chatService.addMessage(
				`${this.stringsService.incomingFileSaveError} ${transfer.name}`,
				users.app,
				undefined,
				false
			);
		}
		else if (transfer.image) {
			this.addImage(transfer, plaintext);
		}
		else {
			util.saveFile(plaintext, transfer.name);
		}
	}

	/** @ignore */
	private uiStarted (transfer: ISessionTransfer) : void {
		if (transfer.image) {
			return;
		}

		const message: string	=
			transfer.author === users.me ?
				this.stringsService.fileTransferInitMe :
				this.stringsService.fileTransferInitFriend
		;

		this.chatService.addMessage(`${message} ${transfer.name}`, users.app);
	}

	/** @ignore */
	private async uiTooLarge () : Promise<void> {
		return this.dialogService.alert({
			content: this.stringsService.fileTooLarge,
			ok: this.stringsService.ok,
			title: this.stringsService.oopsTitle
		});
	}

	/**
	 * Sends file.
	 * @param file
	 * @param image If true, file is processed as an image
	 * (compressed and displayed in the message list).
	 * @param imageSelfDestructTimeout
	 */
	public async send (
		file: File,
		image: boolean = this.fileService.isImage(file),
		imageSelfDestructTimeout?: number
	) : Promise<void> {
		if (file.size > this.configService.filesConfig.maxSize) {
			this.uiTooLarge();

			this.analyticsService.sendEvent({
				eventAction: 'toolarge',
				eventCategory: 'file',
				eventValue: 1,
				hitType: 'event'
			});

			return;
		}

		const transferSetPlaceholder	= {
			metadata: new SessionTransfer(
				file.name,
				file.type,
				image,
				imageSelfDestructTimeout,
				file.size
			),
			progress: Observable.of(0)
		};

		this.transfers	= this.transfers.add(transferSetPlaceholder);

		const url					= 'ephemeral/' + util.uuid();
		const plaintext				= await this.fileService.getBytes(file, image);
		const {cyphertext, key}		= await this.encryptFile(plaintext);
		const uploadTask			= await this.databaseService.uploadItem(url, cyphertext);

		const transfer	= new SessionTransfer(
			file.name,
			file.type,
			image,
			imageSelfDestructTimeout,
			cyphertext.length,
			key,
			true,
			url
		);

		const transferSetItem	= {metadata: transfer, progress: uploadTask.progress};

		this.transfers			= this.transfers.
			remove(transferSetPlaceholder).
			add(transferSetItem)
		;

		this.analyticsService.sendEvent({
			eventAction: 'send',
			eventCategory: 'file',
			eventValue: 1,
			hitType: 'event'
		});

		this.uiStarted(transfer);

		const completedEvent	= `transfer-${transfer.id}`;

		eventManager.one<ISessionTransfer>(completedEvent).then(incomingTransfer => {
			this.potassiumService.clearMemory(transfer.key);

			transfer.answer	=
				incomingTransfer.answer !== undefined ?
					incomingTransfer.answer :
					SessionTransferAnswer.EMPTY
			;

			transfer.receiptTimestamp	= incomingTransfer.receiptTimestamp;

			this.uiCompleted(transfer, plaintext);

			if (transfer.answer !== SessionTransferAnswer.ACCEPTED) {
				this.transfers	= this.transfers.delete(transferSetItem);
				uploadTask.cancel();
			}

			this.databaseService.removeItem(transfer.url).catch(() => {});
		});

		this.sessionService.send(new SessionMessage(rpcEvents.files, {transfer}));

		try {
			await uploadTask.result;
			this.sessionService.send(new SessionMessage(rpcEvents.files, {transfer}));
		}
		catch (_) {
			if (transfer.answer !== SessionTransferAnswer.REJECTED) {
				eventManager.trigger(completedEvent, transfer);
			}
		}

		this.transfers	= this.transfers.delete(transferSetItem);
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly fileService: FileService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly sessionCapabilitiesService: SessionCapabilitiesService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		const downloadAnswers	= new Map<string, SessionTransferAnswer>();

		this.sessionService.on(rpcEvents.files, async (o: ISessionMessageData) => {
			const transfer	= o.transfer;
			if (!transfer || !transfer.id) {
				return;
			}
			transfer.author	= o.author;

			/* Outgoing file transfer acceptance or rejection */
			if (transfer.answer !== SessionTransferAnswer.EMPTY) {
				eventManager.trigger(`transfer-${transfer.id}`, transfer);
			}
			/* Incoming file transfer */
			else if (downloadAnswers.has(transfer.id)) {
				while (downloadAnswers.get(transfer.id) === SessionTransferAnswer.EMPTY) {
					await util.sleep();
				}

				if (downloadAnswers.get(transfer.id) === SessionTransferAnswer.ACCEPTED) {
					downloadAnswers.delete(transfer.id);
					this.receiveTransfer(transfer);
				}
			}
			/* Incoming file transfer request */
			else {
				downloadAnswers.set(transfer.id, SessionTransferAnswer.EMPTY);
				this.uiStarted(transfer);

				const answer	= await this.uiConfirm(transfer, false);
				downloadAnswers.set(transfer.id, answer);

				if (answer !== SessionTransferAnswer.ACCEPTED) {
					this.uiRejected(transfer);
					transfer.answer				= SessionTransferAnswer.REJECTED;
					transfer.receiptTimestamp	= o.timestamp;
					this.sessionService.send(new SessionMessage(rpcEvents.files, {transfer}));
				}
			}
		});
	}
}
