/* tslint:disable:max-file-line-count */

import {ComponentType} from '@angular/cdk/portal';
import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {Router} from '@angular/router';
import * as htmlToText from 'html-to-text';
import memoize from 'lodash-es/memoize';
import * as msgpack from 'msgpack-lite';
import {DeltaOperation, DeltaStatic} from 'quill';
import * as Delta from 'quill-delta';
import * as QuillDeltaToHtml from 'quill-delta-to-html';
import {BehaviorSubject, combineLatest, concat, Observable, of} from 'rxjs';
import {filter, map, mergeMap, skip, take} from 'rxjs/operators';
import {AccountFile, SecurityModels} from '../account';
import {Async} from '../async-type';
import {StorageUnits} from '../enums/storage-units';
import {IAsyncList} from '../iasync-list';
import {IProto} from '../iproto';
import {IQuillDelta} from '../iquill-delta';
import {IQuillRange} from '../iquill-range';
import {IResolvable} from '../iresolvable';
import {
	AccountFileRecord,
	AccountFileReference,
	AccountFileReferenceContainer,
	Appointment,
	BinaryProto,
	BlobProto,
	DataURIProto,
	EhrApiKey,
	Form,
	IAccountFileRecord,
	IAccountFileReference,
	IAccountFileReferenceContainer,
	IAppointment,
	IEhrApiKey,
	IForm,
	NotificationTypes
} from '../proto';
import {filterUndefined} from '../util/filter';
import {flattenObservable} from '../util/flatten-observable';
import {convertStorageUnitsToBytes} from '../util/formatting';
import {getOrSetDefaultAsync} from '../util/get-or-set-default';
import {saveFile} from '../util/save-file';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {awaitAsync, resolvable, sleep} from '../util/wait';
import {AccountDatabaseService} from './crypto/account-database.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {StringsService} from './strings.service';


/**
 * Account file service.
 */
@Injectable()
export class AccountFilesService {
	/**
	 * Resolves circular dependency needed for shareFilePrompt to work.
	 * @see AccountFileSharingComponent
	 */
	public static accountFileSharingComponent	=
		resolvable<ComponentType<{
			closeFunction?: IResolvable<() => void>;
			file?: IAccountFileRecord;
		}>>()
	;


	/** @ignore */
	private readonly incomingFileCache: Map<
		Uint8Array,
		IAccountFileRecord&IAccountFileReference
	>	=
		new Map<Uint8Array, IAccountFileRecord&IAccountFileReference>()
	;

	/** @ignore */
	private readonly nonexistentFile: IAccountFileRecord&IAccountFileReference	= {
		id: '',
		key: new Uint8Array(0),
		mediaType: '',
		name: '',
		owner: '',
		recordType: AccountFileRecord.RecordTypes.File,
		size: NaN,
		timestamp: 0,
		wasAnonymousShare: false
	};

	/** @ignore */
	private readonly noteSnippets: Map<string, string>	= new Map<string, string>();

	/** @ignore */
	private readonly watchFile	= memoize(
		(value: IAccountFileReference) =>
			!value.owner ? undefined : this.accountDatabaseService.watch(
				`users/${value.owner}/fileRecords/${value.id}`,
				AccountFileRecord,
				undefined,
				value.key
			).pipe(map(o => ({
				timestamp: o.timestamp,
				value: {
					...o.value,
					name: o.value.name.slice(0, this.maxNameLength),
					owner: value.owner
				}
			})))
		,
		(value: IAccountFileReference) => value.id
	);

	/** List of file records owned by current user, sorted by timestamp in descending order. */
	public readonly filesList: Observable<(IAccountFileRecord&{owner: string})[]>	=
		this.accountDatabaseService.watchList(
			'fileReferences',
			AccountFileReference,
			undefined,
			undefined,
			undefined,
			false
		).pipe(
			mergeMap(references => combineLatest(filterUndefined(references.map(({value}) =>
				this.watchFile(value)
			)))),
			map(records => records.
				filter(o => !isNaN(o.timestamp)).
				sort((a, b) => b.timestamp - a.timestamp).
				map(o => o.value)
			)
		)
	;

	/**
	 * Files filtered by record type.
	 * @see files
	 */
	public readonly filesListFiltered	= {
		appointments: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.Appointment),
		docs: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.Doc),
		files: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.File),
		forms: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.Form),
		notes: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.Note)
	};

	/** Total size of all files in list. */
	public readonly filesTotalSize: Observable<number>	=
		this.filesListFiltered.files.pipe(map(files =>
			files.reduce((n, {size}) => n + size, 0)
		))
	;

	/** Total storage limit. */
	public readonly fileStorageLimit: number	= convertStorageUnitsToBytes(1, StorageUnits.gb);

	/** Incoming files. */
	public readonly incomingFiles: Observable<(IAccountFileRecord&IAccountFileReference)[]>	=
		this.accountDatabaseService.currentUser.pipe(mergeMap(o =>
			!o ? [] : this.databaseService.watchList(
				`users/${o.user.username}/incomingFiles`,
				BinaryProto
			).pipe(mergeMap(async arr =>
				(await Promise.all(arr.map(async ({value}) => getOrSetDefaultAsync(
					this.incomingFileCache,
					value,
					async () => {
						try {
							const currentUser	= this.accountDatabaseService.currentUser.value;

							if (!currentUser) {
								return this.nonexistentFile;
							}

							const referenceContainer	= await deserialize(
								AccountFileReferenceContainer,
								await this.potassiumService.box.open(
									value,
									o.keys.encryptionKeyPair
								)
							);

							let record: IAccountFileRecord;
							let reference: IAccountFileReference;

							if (referenceContainer.anonymousShare) {
								record	= referenceContainer.anonymousShare.accountFileRecord;
								record.wasAnonymousShare	= true;

								reference	= {
									id: record.id,
									key: referenceContainer.anonymousShare.key,
									owner: currentUser.user.username
								};
							}
							else if (referenceContainer.signedShare) {
								reference	= await deserialize(
									AccountFileReference,
									await this.potassiumService.sign.open(
										referenceContainer.signedShare.accountFileReference,
										(await this.accountDatabaseService.getUserPublicKeys(
											referenceContainer.signedShare.owner
										)).signing
									)
								);

								record	= await this.accountDatabaseService.getItem(
									`users/${reference.owner}/fileRecords/${reference.id}`,
									AccountFileRecord,
									undefined,
									reference.key
								);
							}
							else {
								return this.nonexistentFile;
							}

							return {
								id: record.id,
								key: reference.key,
								mediaType: record.mediaType,
								name: record.name,
								owner: reference.owner,
								recordType: record.recordType,
								size: record.size,
								timestamp: record.timestamp,
								wasAnonymousShare: record.wasAnonymousShare
							};
						}
						catch {
							return this.nonexistentFile;
						}
					}
				)))).
					filter(file => file !== this.nonexistentFile)
			))
		))
	;

	/**
	 * Incoming files filtered by record type.
	 * @see files
	 */
	public readonly incomingFilesFiltered	= {
		appointments: this.filterFiles(
			this.incomingFiles,
			AccountFileRecord.RecordTypes.Appointment
		),
		docs: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.Doc),
		files: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.File),
		forms: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.Form),
		notes: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.Note)
	};

	/** Indicates whether the first load has completed. */
	public initiated: boolean				= false;

	/** Maximum number of characters in a file name. */
	public readonly maxNameLength: number	= 80;

	/** Indicates whether spinner should be displayed. */
	public showSpinner: boolean				= true;

	/** @ignore */
	private deltaToString (delta: IQuillDelta) : string {
		return htmlToText.fromString(new QuillDeltaToHtml(delta.ops).convert());
	}

	/** @ignore */
	private downloadItem<T> (
		id: string|IAccountFileRecord,
		proto: IProto<T>,
		securityModel?: SecurityModels
	) : {
		progress: Observable<number>;
		result: Promise<T>;
	} {
		const filePromise	= this.getFile(id);

		const {progress, result}	= this.accountDatabaseService.downloadItem(
			filePromise.then(file => `users/${file.owner}/files/${file.id}`),
			proto,
			securityModel,
			filePromise.then(file => file.key)
		);

		return {progress, result: result.then(o => o.value)};
	}

	/** @ignore */
	private fileIsAppointment (file: AccountFile) : boolean {
		const maybeAppointment	= <any> file;
		return maybeAppointment.calendarInvite !== undefined;
	}

	/** @ignore */
	private fileIsDelta (file: AccountFile) : boolean {
		const maybeDelta	= <any> file;
		return typeof maybeDelta.chop === 'function' || maybeDelta.ops instanceof Array;
	}

	/** @ignore */
	private fileIsEhrApiKey (file: AccountFile) : boolean {
		const maybeEhrApiKey	= <any> file;
		return (
			typeof maybeEhrApiKey.apiKey === 'string' &&
			typeof maybeEhrApiKey.isMaster === 'boolean'
		);
	}

	/** @ignore */
	private filterFiles<T extends {owner: string}> (
		filesList: Observable<(IAccountFileRecord&T)[]>,
		filterRecordTypes: AccountFileRecord.RecordTypes
	) : Observable<(IAccountFileRecord&T)[]> {
		return filesList.pipe(map(files => files.filter(({owner, recordType}) =>
			!!owner && recordType === filterRecordTypes
		)));
	}

	/** Accepts or rejects incoming file. */
	public async acceptIncomingFile (
		incomingFile: IAccountFileRecord&IAccountFileReference,
		shouldAccept: boolean = true
	) : Promise<void> {
		const promises: Promise<any>[]	= [
			this.accountDatabaseService.removeItem(`incomingFiles/${incomingFile.id}`)
		];

		if (shouldAccept) {
			promises.push(this.accountDatabaseService.setItem<IAccountFileReference>(
				`fileReferences/${incomingFile.id}`,
				AccountFileReference,
				incomingFile
			));

			if (incomingFile.wasAnonymousShare) {
				promises.push(this.accountDatabaseService.setItem<IAccountFileRecord>(
					`fileRecords/${incomingFile.id}`,
					AccountFileRecord,
					incomingFile,
					undefined,
					incomingFile.key
				));
			}

			if (incomingFile.recordType === AccountFileRecord.RecordTypes.Appointment) {
				/*
				Temporarily commented out pending final appointments architecture

				promises.push((async () => {
					const currentUser	= this.accountDatabaseService.currentUser.value;

					if (!currentUser) {
						throw new Error('User not signed in. Cannot RSVP.');
					}

					const appointment	= await this.downloadAppointment(incomingFile).result;

					if (!appointment.rsvps) {
						appointment.rsvps	= {};
					}

					appointment.rsvps[currentUser.user.username]	= Appointment.RSVP.Yes;

					return this.accountDatabaseService.setItem(
						`users/${incomingFile.owner}/files/${incomingFile.id}`,
						Appointment,
						appointment,
						undefined,
						incomingFile.key
					);
				})());
				*/
			}
		}

		await Promise.all(promises);
	}

	/** Downloads and saves file. */
	public downloadAndSave (id: string) : {
		progress: Observable<number>;
		result: Promise<void>;
	} {
		const {progress, result}	= this.downloadItem(id, BinaryProto);

		return {
			progress,
			result: (async () => {
				const file	= await this.getFile(id);

				await saveFile(
					await result,
					file.name,
					file.mediaType
				);
			})()
		};
	}

	/** Downloads and returns appointment. */
	public downloadAppointment (id: string|IAccountFileRecord) : {
		progress: Observable<number>;
		result: Promise<IAppointment>;
	} {
		return this.downloadItem(id, Appointment);
	}

	/** Downloads and returns EHR API key. */
	public downloadEhrApiKey (id: string|IAccountFileRecord) : {
		progress: Observable<number>;
		result: Promise<IEhrApiKey>;
	} {
		return this.downloadItem(id, EhrApiKey);
	}

	/** Downloads file and returns form. */
	public downloadForm (id: string|IAccountFileRecord) : {
		progress: Observable<number>;
		result: Promise<IForm>;
	} {
		return this.downloadItem(id, Form, SecurityModels.privateSigned);
	}

	/** Downloads file and returns as data URI. */
	public downloadURI (id: string|IAccountFileRecord) : {
		progress: Observable<number>;
		result: Promise<SafeUrl|string>;
	} {
		return this.downloadItem(id, DataURIProto);
	}

	/** Gets a doc in the form of an async list. */
	public getDoc (id: string) : {
		asyncList: IAsyncList<IQuillDelta|IQuillRange>;
		deltas: Observable<IQuillDelta>;
		selections: Observable<IQuillRange>;
	} {
		const file		= this.getFile(id);

		const asyncList	= this.accountDatabaseService.getAsyncList(
			file.then(({owner}) => `users/${owner}/docs/${id}`),
			BinaryProto,
			undefined,
			file.then(({key}) => key)
		);

		const docAsyncList: IAsyncList<IQuillDelta|IQuillRange>	= {
			clear: async () => asyncList.clear(),
			getValue: async () => (await asyncList.getValue()).map(bytes => msgpack.decode(bytes)),
			lock: async (f, reason) => asyncList.lock(f, reason),
			pushValue: async delta => asyncList.pushValue(msgpack.encode(delta)),
			setValue: async deltas =>
				asyncList.setValue(deltas.map(delta => msgpack.encode(delta)))
			,
			subscribeAndPop: f => asyncList.subscribeAndPop(bytes => f(msgpack.decode(bytes))),
			updateValue: async f => asyncList.updateValue(async bytesArray =>
				(await f(bytesArray.map(bytes => msgpack.decode(bytes)))).map(delta =>
					msgpack.encode(delta)
				)
			),
			watch: memoize(() =>
				asyncList.watch().pipe(map(deltas => deltas.map(delta => msgpack.decode(delta))))
			),
			watchPushes: memoize(() =>
				asyncList.watchPushes().pipe(skip(1), map(delta =>
					delta.length > 0 ? msgpack.decode(delta) : {}
				))
			)
		};

		const watchers	= docAsyncList.getValue().then(deltas => {
			const pushes	= docAsyncList.watchPushes().pipe(skip(deltas.length));

			return {
				deltas: <Observable<IQuillDelta>> concat(
					of({
						clientID: '',
						ops: deltas.length < 1 ? [] : deltas.
							filter(o => o && typeof (<any> o).index !== 'number').
							map<DeltaOperation[]|undefined>(o => (<any> o).ops).
							reduce<DeltaStatic>(
								(delta, ops) => ops ? delta.compose(new Delta(ops)) : delta,
								new Delta()
							).ops || []
					}),
					pushes.pipe(filter((o: any) =>
						o && typeof o.index !== 'number' && o.ops !== undefined
					))
				),
				selections: <Observable<IQuillRange>> pushes.pipe(
					filter((o: any) =>
						o && typeof o.index === 'number' && typeof o.length === 'number'
					)
				)
			};
		});

		return {
			asyncList: docAsyncList,
			deltas: flattenObservable(watchers.then(o => o.deltas)),
			selections: flattenObservable(watchers.then(o => o.selections))
		};
	}

	/** Gets the specified file record. */
	public async getFile (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
		recordType?: AccountFileRecord.RecordTypes
	) : Promise<IAccountFileRecord&IAccountFileReference> {
		if (typeof id !== 'string') {
			const maybeFileReference: any	= id;
			if (maybeFileReference.owner !== undefined && maybeFileReference.key !== undefined) {
				return maybeFileReference;
			}
			else {
				id	= id.id;
			}
		}

		await this.accountDatabaseService.getCurrentUser();

		const reference	= await this.accountDatabaseService.getItem(
			`fileReferences/${id}`,
			AccountFileReference
		);

		const record	= await this.accountDatabaseService.getItem(
			`users/${reference.owner}/fileRecords/${reference.id}`,
			AccountFileRecord,
			undefined,
			reference.key
		);

		if (recordType !== undefined && record.recordType !== recordType) {
			throw new Error('Specified file does not exist.');
		}

		return {
			id,
			key: reference.key,
			mediaType: record.mediaType,
			name: record.name,
			owner: reference.owner,
			recordType: record.recordType,
			size: record.size,
			timestamp: record.timestamp
		};
	}

	/** Gets the Material icon name for the file default thumbnail. */
	public getThumbnail (mediaType: string) : 'insert_drive_file'|'movie'|'photo' {
		const typeCategory	= mediaType.split('/')[0];

		switch (typeCategory) {
			case 'image':
				return 'photo';

			case 'video':
				return 'movie';

			default:
				return 'insert_drive_file';
		}
	}

	/** Returns a snippet of a note to use as a preview. */
	public noteSnippet (id: string) : string {
		if (!this.noteSnippets.has(id)) {
			this.noteSnippets.set(id, '...');

			(async () => {
				const limit		= 75;
				const file		= await this.getFile(id);
				const content	= this.deltaToString(
					msgpack.decode(
						await this.accountDatabaseService.getItem(
							`users/${file.owner}/files/${id}`,
							BinaryProto,
							undefined,
							file.key
						)
					)
				);

				this.noteSnippets.set(
					id,
					content.length > limit ?
						`${content.substr(0, limit)}...` :
						content
				);
			})();
		}

		return this.noteSnippets.get(id) || '';
	}

	/** Opens a file. */
	public async openFile (id: string) : Promise<void> {
		const file	= await this.getFile(id);

		if (file.mediaType.startsWith('image/') && !file.mediaType.startsWith('image/svg')) {
			this.dialogService.image(await this.downloadURI(id).result);
		}
		else {
			this.downloadAndSave(id);
		}
	}

	/** Removes a file. */
	public async remove (
		id: string|Async<IAccountFileRecord>,
		confirmAndRedirect: boolean = true
	) : Promise<void> {
		if (typeof id !== 'string') {
			id	= (await awaitAsync(id)).id;
		}

		const file	= await this.getFile(id);

		if (confirmAndRedirect) {
			if (await this.dialogService.confirm({
				content: `${this.stringsService.deleteMessage} ${file.name}?`,
				title: this.stringsService.deleteConfirm
			})) {
				this.router.navigate([
					accountRoot,
					file.recordType === AccountFileRecord.RecordTypes.Appointment ?
						'appointments' :
						file.recordType === AccountFileRecord.RecordTypes.Doc ?
							'docs' :
							file.recordType === AccountFileRecord.RecordTypes.File ?
								'files' :
								file.recordType === AccountFileRecord.RecordTypes.Form ?
									'forms' :
									'notes'
				]);

				await sleep();
			}
			else {
				return;
			}
		}

		const promises	= [
			this.accountDatabaseService.removeItem(`fileReferences/${id}`)
		];

		if (
			this.accountDatabaseService.currentUser.value &&
			file.owner === this.accountDatabaseService.currentUser.value.user.username
		) {
			promises.push(...[
				this.accountDatabaseService.removeItem(`users/${file.owner}/docs/${id}`),
				this.accountDatabaseService.removeItem(`users/${file.owner}/files/${id}`),
				this.accountDatabaseService.removeItem(`users/${file.owner}/fileRecords/${id}`)
			]);
		}

		await Promise.all(promises);
	}

	/** Shares file with another user. */
	public async shareFile (
		id: string|AccountFileReferenceContainer.IAnonymousShare,
		username: string
	) : Promise<void> {
		if (
			this.accountDatabaseService.currentUser.value &&
			this.accountDatabaseService.currentUser.value.user.username === username
		) {
			return;
		}

		let accountFileReferenceContainer: IAccountFileReferenceContainer;

		const fileType	=
			typeof id !== 'string' ?
				id.accountFileRecord.recordType :
				this.accountDatabaseService.getItem(
					`fileReferences/${id}`,
					AccountFileReference
				).then(async o =>
					this.accountDatabaseService.getItem(
						`fileRecords/${id}`,
						AccountFileRecord,
						undefined,
						o.key
					)
				).then(o =>
					o.recordType
				)
		;

		/* Anonymous */
		if (typeof id !== 'string') {
			accountFileReferenceContainer	= {anonymousShare: id};
			id	= id.accountFileRecord.id;
		}
		/* Non-anonymous/signed */
		else if (this.accountDatabaseService.currentUser.value) {
			const data	=
				await this.accountDatabaseService.getItem(`fileReferences/${id}`, BinaryProto)
			;

			accountFileReferenceContainer	= {signedShare: {
				accountFileReference: await this.potassiumService.sign.sign(
					data,
					this.accountDatabaseService.currentUser.value.keys.signingKeyPair.privateKey
				),
				owner: this.accountDatabaseService.currentUser.value.user.username
			}};
		}
		/* Invalid attempt to perform signed share */
		else {
			throw new Error('Invalid AccountFilesService.shareFile input.');
		}

		await this.databaseService.setItem(
			`users/${username}/incomingFiles/${id}`,
			BinaryProto,
			await this.potassiumService.box.seal(
				await serialize(AccountFileReferenceContainer, accountFileReferenceContainer),
				(await this.accountDatabaseService.getUserPublicKeys(username)).encryption
			)
		);

		if (accountFileReferenceContainer.anonymousShare) {
			return;
		}

		await this.accountDatabaseService.notify(username, NotificationTypes.File, await fileType);
	}

	/** Creates a dialog to share a file with another user. */
	public async shareFilePrompt (file: IAccountFileRecord) : Promise<void> {
		const closeFunction	= resolvable<() => void>();

		await this.dialogService.baseDialog(
			await AccountFilesService.accountFileSharingComponent.promise,
			o => {
				o.closeFunction	= closeFunction;
				o.file			= file;
			},
			closeFunction
		);
	}

	/** Overwrites an existing appointment. */
	public async updateAppointment (
		id: string,
		content: IAppointment,
		name?: string,
		onlyIfOwner: boolean = false
	) : Promise<void> {
		const file		= await this.getFile(id, AccountFileRecord.RecordTypes.Appointment);

		if (
			onlyIfOwner && (
				!this.accountDatabaseService.currentUser.value ||
				file.owner !== this.accountDatabaseService.currentUser.value.user.username
			)
		) {
			return;
		}

		file.timestamp	= await getTimestamp();

		if (name) {
			file.name	= name;
		}

		await Promise.all([
			this.accountDatabaseService.setItem(
				`users/${file.owner}/files/${id}`,
				Appointment,
				content,
				undefined,
				file.key
			),
			this.accountDatabaseService.setItem<IAccountFileRecord>(
				`users/${file.owner}/fileRecords/${id}`,
				AccountFileRecord,
				file,
				undefined,
				file.key
			)
		]);
	}

	/** Overwrites an existing doc. */
	public async updateDoc (id: string, delta: IQuillDelta|IQuillRange) : Promise<void> {
		const file	= await this.getFile(id);

		await this.accountDatabaseService.pushItem(
			`users/${file.owner}/docs/${id}`,
			BinaryProto,
			msgpack.encode(delta),
			undefined,
			file.key
		);
	}

	/** Updates file record with new metadata. */
	public async updateMetadata (id: string, metadata: {
		mediaType?: string;
		name?: string;
		size?: number;
	}) : Promise<void> {
		const original	= await this.getFile(id);

		await this.accountDatabaseService.setItem(
			`users/${original.owner}/fileRecords/${id}`,
			AccountFileRecord,
			{
				id,
				mediaType: metadata.mediaType === undefined ?
					original.mediaType :
					metadata.mediaType
				,
				name: metadata.name === undefined ? original.name : metadata.name,
				recordType: original.recordType,
				size: metadata.size === undefined ? original.size : metadata.size,
				timestamp: await getTimestamp()
			},
			undefined,
			original.key
		);
	}

	/** Overwrites an existing note. */
	public async updateNote (id: string, content: IQuillDelta, name?: string) : Promise<void> {
		const file		= await this.getFile(id, AccountFileRecord.RecordTypes.Note);
		file.size		= this.potassiumService.fromString(this.deltaToString(content)).length;
		file.timestamp	= await getTimestamp();

		if (name) {
			file.name	= name;
		}

		await Promise.all([
			this.accountDatabaseService.setItem(
				`users/${file.owner}/files/${id}`,
				BinaryProto,
				msgpack.encode(content),
				undefined,
				file.key
			),
			this.accountDatabaseService.setItem<IAccountFileRecord>(
				`users/${file.owner}/fileRecords/${id}`,
				AccountFileRecord,
				file,
				undefined,
				file.key
			)
		]);
	}

	/**
	 * Uploads new file.
	 * @param shareWithUser Username of another user to optionally share this file with.
	 */
	public upload (name: string, file: AccountFile, shareWithUser?: string) : {
		progress: Observable<number>;
		result: Promise<string>;
	} {
		let anonymous	= false;
		let username: string;

		if (this.accountDatabaseService.currentUser.value) {
			username	= this.accountDatabaseService.currentUser.value.user.username;
		}
		else if (shareWithUser) {
			anonymous	= true;
			username	= shareWithUser;
		}
		else {
			throw new Error('Invalid AccountFilesService.upload input.');
		}

		const id	= uuid();
		const key	= (async () => this.potassiumService.randomBytes(
			await this.potassiumService.secretBox.keyBytes
		))();
		const url	= `users/${username}/files/${id}`;

		const {progress, result}	= file instanceof Blob ?
			this.accountDatabaseService.uploadItem(url, BlobProto, file, undefined, key) :
			file instanceof Array ?
				(() => {
					const docProgress	= new BehaviorSubject(0);

					return {progress: docProgress, result: (async () => {
						for (let i = 0 ; i < file.length ; ++i) {
							docProgress.next(Math.round(i / file.length * 100));

							await this.accountDatabaseService.pushItem(
								`users/${username}/docs/${id}`,
								BinaryProto,
								msgpack.encode(file[i]),
								undefined,
								key
							);
						}

						docProgress.next(100);
						return {hash: '', url: ''};
					})()};
				})() :
				this.fileIsDelta(file) ?
					this.accountDatabaseService.uploadItem(
						url,
						BinaryProto,
						msgpack.encode(<IQuillDelta> file),
						undefined,
						key
					) :
					this.fileIsAppointment(file) ?
						this.accountDatabaseService.uploadItem(
							url,
							Appointment,
							<Appointment> file,
							undefined,
							key
						) :
						this.fileIsEhrApiKey(file) ?
							this.accountDatabaseService.uploadItem(
								url,
								EhrApiKey,
								<EhrApiKey> file,
								undefined,
								key
							) :
							this.accountDatabaseService.uploadItem(
								url,
								Form,
								<Form> file,
								SecurityModels.privateSigned,
								key
							)
		;

		return {
			progress,
			result: result.then(async () => {
				const accountFileRecord	= {
					id,
					mediaType: file instanceof Blob ?
						file.type :
						file instanceof Array ?
							'cyph/doc' :
							this.fileIsDelta(file) ?
								'cyph/note' :
								this.fileIsAppointment(file) ?
									'cyph/appointment' :
									this.fileIsEhrApiKey(file) ?
										'cyph/ehr-api-key' :
										'cyph/form'
					,
					name,
					recordType: file instanceof Blob ?
						AccountFileRecord.RecordTypes.File :
						file instanceof Array ?
							AccountFileRecord.RecordTypes.Doc :
							this.fileIsDelta(file) ?
								AccountFileRecord.RecordTypes.Note :
								this.fileIsAppointment(file) ?
									AccountFileRecord.RecordTypes.Appointment :
									this.fileIsEhrApiKey(file) ?
										AccountFileRecord.RecordTypes.EhrApiKey :
										AccountFileRecord.RecordTypes.Form
					,
					size: file instanceof Blob ?
						file.size :
						!(file instanceof Array) && this.fileIsDelta(file) ?
							this.potassiumService.fromString(
								this.deltaToString(<IQuillDelta> file)
							).length :
							NaN
					,
					timestamp: await getTimestamp()
				};

				if (anonymous) {
					await this.shareFile({accountFileRecord, key: await key}, username);
				}
				else {
					await this.accountDatabaseService.setItem(
						`fileRecords/${id}`,
						AccountFileRecord,
						accountFileRecord,
						undefined,
						key
					);

					await this.accountDatabaseService.setItem(
						`fileReferences/${id}`,
						AccountFileReference,
						{
							id,
							key: await key,
							owner: username
						}
					);

					if (shareWithUser) {
						await this.shareFile(id, shareWithUser);
					}
				}

				return id;
			})
		};
	}

	/** Watches appointment. */
	public watchAppointment (id: string|IAccountFileRecord) : Observable<IAppointment> {
		const filePromise	= this.getFile(id);

		return this.accountDatabaseService.watch(
			filePromise.then(file => `users/${file.owner}/files/${file.id}`),
			Appointment,
			undefined,
			filePromise.then(file => file.key)
		).pipe(map(o =>
			o.value
		));
	}

	/** Watches file record. */
	public watchMetadata (id: string|IAccountFileRecord) : Observable<IAccountFileRecord> {
		const filePromise	= this.getFile(id);

		return this.accountDatabaseService.watch(
			filePromise.then(file => `users/${file.owner}/fileRecords/${file.id}`),
			AccountFileRecord,
			undefined,
			filePromise.then(file => file.key)
		).pipe(map(o => ({
			...o.value,
			name: o.value.name.slice(0, this.maxNameLength)
		})));
	}

	/** Watches note. */
	public watchNote (id: string|IAccountFileRecord) : Observable<IQuillDelta> {
		const filePromise	= this.getFile(id);

		return this.accountDatabaseService.watch(
			filePromise.then(file => `users/${file.owner}/files/${file.id}`),
			BinaryProto,
			undefined,
			filePromise.then(file => file.key)
		).pipe(map(o =>
			o.value.length > 0 ? msgpack.decode(o.value) : {ops: []}
		));
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		(async () => {
			if ((await this.accountDatabaseService.getListKeys('fileReferences')).length === 0) {
				this.initiated		= true;
				this.showSpinner	= false;
			}
			else {
				this.filesList.pipe(
					filter(arr => arr.length > 0),
					take(1)
				).toPromise().then(() => {
					this.initiated		= true;
					this.showSpinner	= false;
				});
			}
		})();
	}
}
