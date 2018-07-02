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
import QuillDeltaToHtml from 'quill-delta-to-html';
import {BehaviorSubject, combineLatest, concat, Observable, of} from 'rxjs';
import {filter, map, mergeMap, skip, take} from 'rxjs/operators';
import {AccountFile, AccountFileShare, SecurityModels} from '../account';
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
	IRedoxPatient,
	IWallet,
	NotificationTypes,
	RedoxPatient,
	Wallet
} from '../proto';
import {filterUndefined} from '../util/filter';
import {flattenObservable} from '../util/flatten-observable';
import {convertStorageUnitsToBytes} from '../util/formatting';
import {getOrSetDefault, getOrSetDefaultAsync} from '../util/get-or-set-default';
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
			file?: AccountFileShare;
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

	/** @ignore */
	private readonly watchFileDataCache: Map<string|IAccountFileRecord, Observable<any>>	=
		new Map<string|IAccountFileRecord, Observable<any>>()
	;

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
		ehrApiKeys: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.EhrApiKey),
		files: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.File),
		forms: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.Form),
		notes: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.Note),
		redoxPatients: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.RedoxPatient),
		wallets: this.filterFiles(this.filesList, AccountFileRecord.RecordTypes.Wallet)
	};

	/**
	 * Includes downloaded data, where applicable.
	 * @see filesListFiltered
	 */
	public readonly filesListFilteredWithData	= {
		appointments: this.getFiles(
			this.filesListFiltered.appointments,
			AccountFileRecord.RecordTypes.Appointment
		),
		ehrApiKeys: this.getFiles(
			this.filesListFiltered.ehrApiKeys,
			AccountFileRecord.RecordTypes.EhrApiKey
		),
		files: this.getFiles(
			this.filesListFiltered.files,
			AccountFileRecord.RecordTypes.File
		),
		forms: this.getFiles(
			this.filesListFiltered.forms,
			AccountFileRecord.RecordTypes.Form
		),
		redoxPatients: this.getFiles(
			this.filesListFiltered.ehrApiKeys,
			AccountFileRecord.RecordTypes.EhrApiKey
		),
		wallets: this.getFiles(
			this.filesListFiltered.wallets,
			AccountFileRecord.RecordTypes.Wallet
		)
	};

	/** Total size of all files in list. */
	public readonly filesTotalSize: Observable<number>	=
		this.filesListFiltered.files.pipe(map(files =>
			files.reduce((n, {size}) => n + size, 0)
		))
	;

	/** Total storage limit. */
	public readonly fileStorageLimit: number	= convertStorageUnitsToBytes(1, StorageUnits.gb);

	/** File type configurations. */
	public readonly fileTypeConfig	= {
		[AccountFileRecord.RecordTypes.Appointment]: {
			blockAnonymous: true,
			description: 'Appointment',
			isOfType: (file: any) => typeof file.calendarInvite === 'object',
			mediaType: 'cyph/appointment',
			proto: Appointment,
			recordType: AccountFileRecord.RecordTypes.Appointment,
			route: 'appointments',
			securityModel: undefined
		},
		[AccountFileRecord.RecordTypes.Doc]: {
			blockAnonymous: false,
			description: 'Doc',
			isOfType: (file: any) => file instanceof Array,
			mediaType: 'cyph/doc',
			proto: undefined,
			recordType: AccountFileRecord.RecordTypes.Doc,
			route: 'docs',
			securityModel: undefined
		},
		[AccountFileRecord.RecordTypes.EhrApiKey]: {
			blockAnonymous: false,
			description: 'EHR Access',
			isOfType: (file: any) =>
				typeof file.apiKey === 'string' &&
				typeof file.isMaster === 'boolean'
			,
			mediaType: 'cyph/ehr-api-key',
			proto: EhrApiKey,
			recordType: AccountFileRecord.RecordTypes.EhrApiKey,
			route: 'ehr-access',
			securityModel: undefined
		},
		[AccountFileRecord.RecordTypes.File]: {
			blockAnonymous: false,
			description: 'File',
			isOfType: (file: any) => file instanceof Blob,
			mediaType: undefined,
			proto: BinaryProto,
			recordType: AccountFileRecord.RecordTypes.File,
			route: 'files',
			securityModel: undefined
		},
		[AccountFileRecord.RecordTypes.Form]: {
			blockAnonymous: false,
			description: 'Form',
			isOfType: (file: any) => file.components instanceof Array,
			mediaType: 'cyph/form',
			proto: Form,
			recordType: AccountFileRecord.RecordTypes.Form,
			route: 'forms',
			securityModel: SecurityModels.privateSigned
		},
		[AccountFileRecord.RecordTypes.Note]: {
			blockAnonymous: false,
			description: 'Note',
			isOfType: (file: any) => typeof file.chop === 'function' || file.ops instanceof Array,
			mediaType: 'cyph/note',
			proto: BinaryProto,
			recordType: AccountFileRecord.RecordTypes.Note,
			route: 'notes',
			securityModel: undefined
		},
		[AccountFileRecord.RecordTypes.RedoxPatient]: {
			blockAnonymous: true,
			description: 'Patient Info',
			isOfType: (file: any) => typeof file.Demographics === 'object',
			mediaType: 'cyph/redox-patient',
			proto: RedoxPatient,
			recordType: AccountFileRecord.RecordTypes.RedoxPatient,
			route: 'incoming-patient-info',
			securityModel: undefined
		},
		[AccountFileRecord.RecordTypes.Wallet]: {
			blockAnonymous: false,
			description: 'Wallet',
			isOfType: (file: any) => typeof file.cryptocurrency === 'number',
			mediaType: 'cyph/wallet',
			proto: Wallet,
			recordType: AccountFileRecord.RecordTypes.Wallet,
			route: 'wallets',
			securityModel: undefined
		}
	};

	/** List of file record types. */
	public readonly fileTypes: AccountFileRecord.RecordTypes[]	= [
		AccountFileRecord.RecordTypes.Appointment,
		AccountFileRecord.RecordTypes.Doc,
		AccountFileRecord.RecordTypes.EhrApiKey,
		AccountFileRecord.RecordTypes.File,
		AccountFileRecord.RecordTypes.Form,
		AccountFileRecord.RecordTypes.Note,
		AccountFileRecord.RecordTypes.RedoxPatient,
		AccountFileRecord.RecordTypes.Wallet
	];

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

							const incomingFile	= {
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

							if (await this.hasFile(incomingFile.id)) {
								await this.acceptIncomingFile(incomingFile, false);
								return this.nonexistentFile;
							}

							return incomingFile;
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
		ehrApiKeys: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.EhrApiKey),
		files: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.File),
		forms: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.Form),
		notes: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.Note),
		redoxPatients: this.filterFiles(
			this.incomingFiles,
			AccountFileRecord.RecordTypes.RedoxPatient
		),
		wallets: this.filterFiles(this.incomingFiles, AccountFileRecord.RecordTypes.Wallet)
	};

	/**
	 * Includes downloaded data, where applicable.
	 * @see incomingFilesFiltered
	 */
	public readonly incomingFilesFilteredWithData	= {
		appointments: this.getFiles(
			this.incomingFilesFiltered.appointments,
			AccountFileRecord.RecordTypes.Appointment
		),
		ehrApiKeys: this.getFiles(
			this.incomingFilesFiltered.ehrApiKeys,
			AccountFileRecord.RecordTypes.EhrApiKey
		),
		files: this.getFiles(
			this.incomingFilesFiltered.files,
			AccountFileRecord.RecordTypes.File
		),
		forms: this.getFiles(
			this.incomingFilesFiltered.forms,
			AccountFileRecord.RecordTypes.Form
		),
		redoxPatients: this.getFiles(
			this.incomingFilesFiltered.redoxPatients,
			AccountFileRecord.RecordTypes.RedoxPatient
		),
		wallets: this.getFiles(
			this.incomingFilesFiltered.wallets,
			AccountFileRecord.RecordTypes.Wallet
		)
	};

	/** Indicates whether the first load has completed. */
	public initiated: boolean				= false;

	/** Determines whether file should be treated as an image. */
	public readonly isImage	= memoize(async (id: string) => {
		const file	= await this.getFile(id);
		return file.mediaType.startsWith('image/') && !file.mediaType.startsWith('image/svg');
	});

	/** Maximum number of characters in a file name. */
	public readonly maxNameLength: number	= 80;

	/** Indicates whether spinner should be displayed. */
	public showSpinner: boolean				= true;

	/** @ignore */
	private deltaToString (delta: IQuillDelta) : string {
		return htmlToText.fromString(new QuillDeltaToHtml(delta.ops || []).convert());
	}

	/** @ignore */
	private downloadItem<T> (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
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
	private filterFiles<T extends {owner: string}> (
		filesList: Observable<(IAccountFileRecord&T)[]>,
		filterRecordTypes: AccountFileRecord.RecordTypes
	) : Observable<(IAccountFileRecord&T)[]> {
		return filesList.pipe(map(files => files.filter(({owner, recordType, wasAnonymousShare}) =>
			!!owner &&
			recordType === filterRecordTypes &&
			!(this.fileTypeConfig[recordType].blockAnonymous && wasAnonymousShare)
		)));
	}

	/** @ignore */
	private getFiles<T, TRecord extends {owner: string}> (
		filesList: Observable<(IAccountFileRecord&TRecord)[]>,
		recordType: AccountFileRecord.RecordTypes
	) : () => Observable<{
		data: T;
		record: IAccountFileRecord;
	}[]> {
		return memoize(() => filesList.pipe(
			mergeMap(records => combineLatest(records.map(record =>
				this.watchFileData(record, recordType).pipe(map(data => ({
					data,
					record
				})))
			))),
			map(files =>
				<any> files.filter(o => o.data !== undefined)
			)
		));
	}

	/** @ignore */
	private watchFileData<T> (
		id: string|IAccountFileRecord,
		recordType: AccountFileRecord.RecordTypes
	) : Observable<T|undefined> {
		const {proto, securityModel}	= this.fileTypeConfig[recordType];

		return getOrSetDefault(
			this.watchFileDataCache,
			typeof id === 'string' ? id : id.id,
			() => {
				const filePromise	= this.getFile(id);

				return this.accountDatabaseService.watch(
					filePromise.then(file => `users/${file.owner}/files/${file.id}`),
					<any> proto,
					securityModel,
					filePromise.then(file => file.key)
				).pipe(map(o =>
					isNaN(o.timestamp) ? undefined : o.value
				));
			}
		);
	}

	/** Accepts or rejects incoming file. */
	public async acceptIncomingFile (
		incomingFile: IAccountFileRecord&IAccountFileReference,
		options: boolean|{copy?: boolean; name?: string; reject?: boolean} = true,
		metadata?: string
	) : Promise<void> {
		if (typeof options === 'boolean') {
			options	= {reject: !options};
		}

		const fileConfig				= this.fileTypeConfig[incomingFile.recordType];

		const promises: Promise<any>[]	= [
			this.accountDatabaseService.removeItem(`incomingFiles/${incomingFile.id}`)
		];

		if (options.name) {
			incomingFile.name	= options.name;
		}

		if (incomingFile.wasAnonymousShare) {
			options.copy	= true;
		}

		if (!options.reject && !options.copy) {
			promises.push(this.accountDatabaseService.setItem<IAccountFileReference>(
				`fileReferences/${incomingFile.id}`,
				AccountFileReference,
				{
					id: incomingFile.id,
					key: incomingFile.key,
					metadata,
					owner: incomingFile.owner
				}
			));

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
		else if (!options.reject && options.copy) {
			const file	=
				incomingFile.recordType === AccountFileRecord.RecordTypes.Doc ?
					(await this.getDoc(incomingFile).asyncList.getValue()) :
				fileConfig.proto ?
					await this.downloadItem<any>(
						incomingFile,
						fileConfig.proto,
						fileConfig.securityModel
					).result :
					undefined
			;

			if (!file) {
				throw new Error('Cannot get file for copying.');
			}

			promises.push(this.upload(incomingFile.name, file, undefined, metadata).result);
		}

		if (incomingFile.wasAnonymousShare) {
			promises.push(this.remove(incomingFile, false));
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

	/** Downloads and returns file. */
	public downloadFile (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
		recordType: AccountFileRecord.RecordTypes.Appointment
	) : {
		progress: Observable<number>;
		result: Promise<IAppointment>;
	};
	public downloadFile (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
		recordType: AccountFileRecord.RecordTypes.Doc
	) : never;
	public downloadFile (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
		recordType: AccountFileRecord.RecordTypes.EhrApiKey
	) : {
		progress: Observable<number>;
		result: Promise<IEhrApiKey>;
	};
	public downloadFile (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
		recordType: AccountFileRecord.RecordTypes.File|AccountFileRecord.RecordTypes.Note
	) : {
		progress: Observable<number>;
		result: Promise<Uint8Array>;
	};
	public downloadFile (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
		recordType: AccountFileRecord.RecordTypes.Form
	) : {
		progress: Observable<number>;
		result: Promise<IForm>;
	};
	public downloadFile (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
		recordType: AccountFileRecord.RecordTypes.RedoxPatient
	) : {
		progress: Observable<number>;
		result: Promise<IRedoxPatient>;
	};
	public downloadFile (
		id: string|IAccountFileRecord|(IAccountFileRecord&IAccountFileReference),
		recordType: AccountFileRecord.RecordTypes
	) : any {
		const fileConfig	= this.fileTypeConfig[recordType];

		if (!fileConfig || !fileConfig.proto) {
			throw new Error(
				`Cannot download file ${id} of type ${AccountFileRecord.RecordTypes[recordType]}`
			);
		}

		return this.downloadItem<any>(id, fileConfig.proto, fileConfig.securityModel);
	}

	/** Downloads file and returns as data URI. */
	public downloadURI (id: string|IAccountFileRecord) : {
		progress: Observable<number>;
		result: Promise<SafeUrl|string>;
	} {
		return this.downloadItem(id, DataURIProto);
	}

	/** Downloads file and returns wallet. */
	public downloadWallet (id: string|IAccountFileRecord) : {
		progress: Observable<number>;
		result: Promise<IWallet>;
	} {
		return this.downloadItem(id, Wallet);
	}

	/** Gets a doc in the form of an async list. */
	public getDoc (id: string|Async<IAccountFileRecord>) : {
		asyncList: IAsyncList<IQuillDelta|IQuillRange>;
		deltas: Observable<IQuillDelta>;
		selections: Observable<IQuillRange>;
	} {
		const file	= typeof id === 'string' ?
			Promise.all([id, this.getFile(id)]) :
			awaitAsync(id).then(
				async (o) : Promise<[string, IAccountFileRecord&IAccountFileReference]> =>
					[o.id, await this.getFile(o)]
			)
		;

		const asyncList	= this.accountDatabaseService.getAsyncList(
			file.then(([fileID, {owner}]) => `users/${owner}/docs/${fileID}`),
			BinaryProto,
			undefined,
			file.then(([_, {key}]) => key)
		);

		const docAsyncList: IAsyncList<IQuillDelta|IQuillRange>	= {
			clear: async () => asyncList.clear(),
			getFlatValue: async () => docAsyncList.getValue(),
			getValue: async () => (await asyncList.getValue()).map(bytes => msgpack.decode(bytes)),
			lock: async (f, reason) => asyncList.lock(f, reason),
			pushItem: async delta => asyncList.pushItem(msgpack.encode(delta)),
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
			watchFlat: () => docAsyncList.watch(),
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

	/**
	 * Returns EHR API key.
	 * TODO: Support cases where user has multiple EHR API keys to choose from.
	 */
	public async getEhrApiKey () : Promise<IEhrApiKey> {
		const ehrApiKeys	= await this.filesListFiltered.ehrApiKeys.pipe(take(1)).toPromise();

		if (ehrApiKeys.length < 1) {
			throw new Error('No EHR API keys.');
		}
		else if (ehrApiKeys.length > 1) {
			throw new Error('More than one EHR API key.');
		}

		return this.downloadFile(ehrApiKeys[0], AccountFileRecord.RecordTypes.EhrApiKey).result;
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

		return {...record, ...reference};
	}

	/** Gets file size. */
	public async getFileSize (
		file: AccountFile,
		{recordType}: {recordType: AccountFileRecord.RecordTypes}
	) : Promise<number> {
		const fileConfig	= this.fileTypeConfig[recordType];

		return (
			fileConfig.recordType === AccountFileRecord.RecordTypes.Doc ?
				(
					file instanceof Array ?
						file.map(o => msgpack.encode(o).length).reduce((a, b) => a + b, 0) :
						0
				) :
			fileConfig.recordType === AccountFileRecord.RecordTypes.File ?
				(file instanceof Blob ? file.size : NaN) :
			fileConfig.recordType === AccountFileRecord.RecordTypes.Note ?
				msgpack.encode(<IQuillDelta> file).length :
			fileConfig.proto ?
				(await serialize<any>(fileConfig.proto, file)).length :
				NaN
		);
	}

	/** Gets file type. */
	public getFileType (file: AccountFile|IAccountFileRecord) : AccountFileRecord.RecordTypes {
		if ('recordType' in file) {
			return file.recordType;
		}

		for (const recordType of this.fileTypes) {
			if (this.fileTypeConfig[recordType].isOfType(file)) {
				return recordType;
			}
		}

		throw new Error('Cannot detect record type.');
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

	/** Indicates whether this user has a file with the specified id. */
	public async hasFile (id: string) : Promise<boolean> {
		return this.accountDatabaseService.hasItem(`fileReferences/${id}`);
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

	/** Opens an image file. */
	public async openImage (id: string) : Promise<void> {
		if (await this.isImage(id)) {
			this.dialogService.image({
				src: await this.downloadURI(id).result,
				title: (await this.getFile(id)).name
			});
		}
	}

	/** Removes a file. */
	public async remove (
		id: string|Async<IAccountFileRecord>,
		confirmAndRedirect: boolean = true
	) : Promise<void> {
		if (typeof id !== 'string') {
			id	= await awaitAsync(id);
		}

		const file	= await this.getFile(id);

		if (typeof id !== 'string') {
			id	= id.id;
		}

		if (confirmAndRedirect) {
			if (await this.dialogService.confirm({
				content: `${this.stringsService.deleteMessage} ${file.name}?`,
				title: this.stringsService.deleteConfirm
			})) {
				this.router.navigate([accountRoot, this.fileTypeConfig[file.recordType].route]);
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
						`users/${o.owner}/fileRecords/${id}`,
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

		try {
			await this.databaseService.setItem(
				`users/${username}/incomingFiles/${id}`,
				BinaryProto,
				await this.potassiumService.box.seal(
					await serialize(AccountFileReferenceContainer, accountFileReferenceContainer),
					(await this.accountDatabaseService.getUserPublicKeys(username)).encryption
				)
			);
		}
		catch {
			/* setItem will fail with permission denied when
				trying to share the same file more than once. */
			return;
		}

		if (accountFileReferenceContainer.anonymousShare) {
			return;
		}

		await this.accountDatabaseService.notify(
			username,
			NotificationTypes.File,
			{fileType: await fileType, id}
		);
	}

	/** Creates a dialog to share a file with another user. */
	public async shareFilePrompt (file: AccountFileShare) : Promise<void> {
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
	public upload (name: string, file: AccountFile, shareWithUser?: string, metadata?: string) : {
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

		const id			= uuid();
		const key			= (async () => this.potassiumService.randomBytes(
			await this.potassiumService.secretBox.keyBytes
		))();
		const url			= `users/${username}/files/${id}`;

		const fileConfig	= this.fileTypeConfig[this.getFileType(file)];

		const {progress, result}	=
			fileConfig.recordType === AccountFileRecord.RecordTypes.Doc ?
				(() => {
					const doc			= file instanceof Array ? file : [];
					const docProgress	= new BehaviorSubject(0);

					return {progress: docProgress, result: (async () => {
						for (let i = 0 ; i < doc.length ; ++i) {
							docProgress.next(Math.round(i / doc.length * 100));

							await this.accountDatabaseService.pushItem(
								`users/${username}/docs/${id}`,
								BinaryProto,
								msgpack.encode(doc[i]),
								undefined,
								key
							);
						}

						docProgress.next(100);
						return {hash: '', url: ''};
					})()};
				})() :
			fileConfig.recordType === AccountFileRecord.RecordTypes.File ?
				this.accountDatabaseService.uploadItem(
					url,
					BlobProto,
					file instanceof Blob ? file : new Blob(),
					undefined,
					key
				) :
			fileConfig.recordType === AccountFileRecord.RecordTypes.Note ?
				this.accountDatabaseService.uploadItem(
					url,
					BinaryProto,
					msgpack.encode(<IQuillDelta> file),
					undefined,
					key
				) :
				this.accountDatabaseService.uploadItem(
					url,
					<any> fileConfig.proto,
					file,
					fileConfig.securityModel,
					key
				)
		;

		return {
			progress,
			result: result.then(async () => {
				const accountFileRecord	= {
					id,
					mediaType:
						fileConfig.mediaType ||
						(file instanceof Blob ? file.type : undefined) ||
						'application/octet-stream'
					,
					name,
					recordType: fileConfig.recordType,
					size: await this.getFileSize(file, fileConfig),
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
							metadata,
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
	public watchMetadata (id: string|IAccountFileRecord) : Observable<
		IAccountFileRecord&IAccountFileReference
	> {
		const filePromise	= this.getFile(id);

		return this.accountDatabaseService.watch(
			filePromise.then(file => `users/${file.owner}/fileRecords/${file.id}`),
			AccountFileRecord,
			undefined,
			filePromise.then(file => file.key)
		).pipe(mergeMap(async o => ({
			...o.value,
			...(await filePromise),
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
