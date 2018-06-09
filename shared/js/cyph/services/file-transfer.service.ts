import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import memoize from 'lodash-es/memoize';
import {Observable, of} from 'rxjs';
import {LocalAsyncSet} from '../local-async-set';
import {BinaryProto, ChatMessageValue, DataURIProto, IFileTransfer} from '../proto';
import {readableByteLength} from '../util/formatting';
import {saveFile} from '../util/save-file';
import {deserialize} from '../util/serialization';
import {uuid} from '../util/uuid';
import {AnalyticsService} from './analytics.service';
import {ChatService} from './chat.service';
import {ConfigService} from './config.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {FileService} from './file.service';
import {SessionInitService} from './session-init.service';
import {StringsService} from './strings.service';


/**
 * Manages file transfers within a chat.
 */
@Injectable()
export class FileTransferService {
	/** In-progress file transfers. */
	public readonly transfers: LocalAsyncSet<{
		metadata: IFileTransfer;
		progress: Observable<number>;
	}>	= new LocalAsyncSet<{
		metadata: IFileTransfer;
		progress: Observable<number>;
	}>();

	/** Downloads image. */
	public readonly getImage	= memoize(async (fileTransfer: IFileTransfer) : Promise<{
		success: boolean;
		uri?: SafeUrl;
	}> => {
		try {
			if (!fileTransfer.image) {
				throw new Error('Not an image.');
			}

			return {
				success: true,
				uri: await deserialize(DataURIProto, await this.receiveInternal(fileTransfer))
			};
		}
		catch {
			return {success: false};
		}
	});

	/** TODO: Get rid of this and add upload and download methods to EncryptedAsyncMap. */
	private async encryptFile (plaintext: Uint8Array, url: string) : Promise<{
		cyphertext: Uint8Array;
		hash: Uint8Array;
		key: Uint8Array;
	}> {
		const [hash, {cyphertext, key}]	= await Promise.all([
			this.potassiumService.hash.hash(plaintext),
			(async () => {
				const k	= this.potassiumService.randomBytes(
					await this.potassiumService.secretBox.keyBytes
				);

				return {
					cyphertext: await this.potassiumService.secretBox.seal(plaintext, k, url),
					key: k
				};
			})()
		]);

		return {cyphertext, hash, key};
	}

	/** Storage root path. */
	public get path () : string {
		return 'fileTransfers' + (this.sessionInitService.ephemeral ? 'Ephemeral' : '');
	}

	/** @ignore */
	private async receiveInternal (fileTransfer: IFileTransfer) : Promise<Uint8Array> {
		if (
			!(fileTransfer.hash && fileTransfer.hash.length > 0) ||
			!(fileTransfer.key && fileTransfer.key.length > 0)
		) {
			throw new Error('Invalid file transfer.');
		}

		fileTransfer.isOutgoing	= false;
		const {hash, key}		= fileTransfer;
		const url				= `${this.path}/${fileTransfer.id}`;
		const downloadTask		= this.databaseService.downloadItem(url, BinaryProto);
		const transfer			= {metadata: fileTransfer, progress: downloadTask.progress};

		if (!(await downloadTask.alreadyCached)) {
			await this.transfers.addItem(transfer);
		}

		const plaintext: Uint8Array|undefined	= await (async () =>
			this.potassiumService.secretBox.open((await downloadTask.result).value, key, url)
		)().catch(
			() => undefined
		);

		await this.transfers.deleteItem(transfer);

		if (!plaintext || !this.potassiumService.compareMemory(
			hash,
			await this.potassiumService.hash.hash(plaintext)
		)) {
			throw new Error('Invalid file.');
		}

		return plaintext;
	}

	/** Downloads and saves file. */
	public async saveFile (fileTransfer: IFileTransfer) : Promise<void> {
		if (!(await this.dialogService.confirm({
			content: this.stringsService.incomingFileSave,
			markdown: true,
			ok: this.stringsService.save,
			title: `${this.stringsService.incomingFile}: ${fileTransfer.name} (${
				readableByteLength(fileTransfer.size)
			})`
		}))) {
			return;
		}

		try {
			const plaintext	= await this.receiveInternal(fileTransfer);
			await saveFile(plaintext, fileTransfer.name, fileTransfer.mediaType);
		}
		catch {
			await this.chatService.addMessage({
				shouldNotify: false,
				value: `${this.stringsService.incomingFileSaveError} ${fileTransfer.name}`
			});
		}
	}

	/**
	 * Sends file.
	 * @param image If true, file is processed as an image
	 * (compressed and automatically downloaded).
	 */
	public async send (
		file: File,
		image: boolean = this.fileService.isImage(file),
		imageSelfDestructTimeout?: number
	) : Promise<void> {
		if (file.size > this.configService.filesConfig.maxSize) {
			this.analyticsService.sendEvent({
				eventAction: 'toolarge',
				eventCategory: 'file',
				eventValue: 1,
				hitType: 'event'
			});

			return this.dialogService.alert({
				content: this.stringsService.fileTooLarge,
				ok: this.stringsService.ok,
				title: this.stringsService.oopsTitle
			});
		}

		const fileTransfer: IFileTransfer	= {
			id: uuid(true),
			image,
			isOutgoing: true,
			mediaType: file.type,
			name: file.name,
			size: file.size
		};

		const transferPlaceholder	= {metadata: fileTransfer, progress: of(0)};
		let transfer				= transferPlaceholder;

		try {
			await this.transfers.addItem(transfer);

			const url						= `${this.path}/${fileTransfer.id}`;
			const plaintext					= await this.fileService.getBytes(file, image);
			const {cyphertext, hash, key}	= await this.encryptFile(plaintext, url);

			const uploadTask	= this.databaseService.uploadItem(url, BinaryProto, cyphertext);

			fileTransfer.hash	= hash;
			fileTransfer.key	= key;

			transfer	= {metadata: fileTransfer, progress: uploadTask.progress};
			await this.transfers.replaceItem(transferPlaceholder, transfer);

			this.analyticsService.sendEvent({
				eventAction: 'send',
				eventCategory: 'file',
				eventValue: 1,
				hitType: 'event'
			});

			await uploadTask.result;
			await this.transfers.deleteItem(transfer);

			await this.chatService.send(
				ChatMessageValue.Types.FileTransfer,
				{fileTransfer: {...fileTransfer, isOutgoing: false}},
				imageSelfDestructTimeout
			);
		}
		catch {
			await this.chatService.addMessage({
				shouldNotify: false,
				value: `${this.stringsService.incomingFileUploadError} ${fileTransfer.name}`
			});
		}
		finally {
			await this.transfers.deleteItem(transfer);
		}
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
		private readonly sessionInitService: SessionInitService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {}
}
