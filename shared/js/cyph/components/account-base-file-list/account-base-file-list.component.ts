/* eslint-disable max-lines */

import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges,
	OnInit,
	SimpleChanges,
	ViewChild
} from '@angular/core';
import {MatLegacyPaginator as MatPaginator} from '@angular/material/legacy-paginator';
import {MatLegacyTableDataSource as MatTableDataSource} from '@angular/material/legacy-table';
import {MatSort} from '@angular/material/sort';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {IFileManagerHandlers} from '../../components/file-manager/interfaces/ifile-manager-handlers';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {
	AccountFileRecord,
	IAccountFileRecord,
	IAccountFileReference,
	IEhrApiKey,
	IPassword
} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountDownloadService} from '../../services/account-download.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {ConfigService} from '../../services/config.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PGPService} from '../../services/crypto/pgp.service';
import {DialogService} from '../../services/dialog.service';
import {EHRIntegrationService} from '../../services/ehr-integration.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {copyToClipboard} from '../../util/clipboard';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {normalize, readableByteLength} from '../../util/formatting';
import {debugLogError} from '../../util/log';
import {observableAll} from '../../util/observable-all';
import {saveFile} from '../../util/save-file';
import {
	getDateTimeString,
	getISODateString,
	watchRelativeDateString
} from '../../util/time';
import {waitForValue} from '../../util/wait';

/**
 * Angular component for "file" list UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-base-file-list',
	styleUrls: ['./account-base-file-list.component.scss'],
	templateUrl: './account-base-file-list.component.html'
})
export class AccountBaseFileListComponent
	extends BaseProvider
	implements OnChanges, OnInit
{
	/** @ignore */
	private readonly filterFunctionSubject = new BehaviorSubject<
		((o: IAccountFileRecord) => boolean) | undefined
	>(undefined);

	/** @see AccountNotesComponent.anonymousMessages */
	@Input() public anonymousMessages: boolean = false;

	/** Current directory. */
	public readonly currentDirectory = new BehaviorSubject<string>('');

	/** @see IFileManagerHandlers */
	public readonly fileManagerHandlers: IFileManagerHandlers = {
		changeDirectory: async directory =>
			this.changeDirectory(directory, true),
		checkIfLinkShared: this.accountDownloadService.watchIfShared,
		createDirectory: async directory => this.createDirectory(directory),
		downloadAndSave: async file =>
			this.accountFilesService.downloadAndSave(file.dataItem.id).result,
		moveFile: async (file, destinationPath, copy) =>
			this.accountFilesService.moveFile(
				file.dataItem,
				destinationPath,
				copy
			),
		removeDirectory: async directory =>
			this.accountFilesService.directories.delete(directory, false),
		removeFile: async id => this.accountFilesService.remove(id, false),
		revokeDownloadLink: async file =>
			this.revokeDownloadLink(file.dataItem),
		selectedFileOpen: async file =>
			this.accountFilesService.openFile(file.dataItem.id),
		shareDownloadLink: async file => this.shareDownloadLink(file.dataItem),
		shareFile: async file =>
			this.accountFilesService.shareFilePrompt(file.record),
		uploadFile: async fileData => {
			await this.accountFilesService.upload(
				fileData.name,
				fileData,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				this.currentDirectory.value
			).result;
		}
	};

	/** Record filter function. */
	@Input() public filterFunction?: (o: IAccountFileRecord) => boolean;

	/** @see getDateTimeString */
	public readonly getDateTimeString = getDateTimeString;

	/** Gets filter function. */
	public readonly getFilterFunction = memoize((incoming: boolean = false) =>
		observableAll([this.currentDirectory, this.filterFunctionSubject]).pipe(
			map(
				([currentDirectory, filterFunction]) =>
					(o: IAccountFileRecord) =>
						(filterFunction === undefined || filterFunction(o)) &&
						(incoming || (o.parentPath || '') === currentDirectory)
			)
		)
	);

	/** @see getISODateString */
	public readonly getISODateString = getISODateString;

	/** Gets row data of files and directories. */
	public readonly getMergedRowData = memoize(
		(
			files: {
				data: any;
				owner: string;
				record: IAccountFileRecord;
			}[]
		) =>
			memoize((directories: string[]) =>
				directories
					.map<{
						data: any;
						owner: string;
						record: IAccountFileRecord;
					}>(directory => ({
						data: undefined,
						owner:
							this.accountDatabaseService.currentUser.value?.user
								.username || '',
						record: {
							id: directory,
							mediaType: 'cyph/folder',
							name: directory,
							recordType: AccountFileRecord.RecordTypes.File,
							size: 0,
							timestamp: 0
						}
					}))
					.concat(files)
			)
	);

	/** Gets PGP key data, if applicable. */
	public readonly getPGPKey = memoize(
		async ({record}: {record: IAccountFileRecord}) => {
			if (record.recordType !== AccountFileRecord.RecordTypes.PGPKey) {
				return;
			}

			const pgpKey = await this.accountFilesService.downloadPGPKey(
				record
			);

			const pgpKeyFingerprint = !!pgpKey.pgpMetadata.fingerprint ?
				normalize(pgpKey.pgpMetadata.fingerprint) :
				undefined;

			return {
				isPrimary: toBehaviorSubject(
					pgpKeyFingerprint ?
						this.accountFilesService.pgp
							.primaryKeyFingerprint()
							.pipe(
								map(
									fingerprint =>
										!!fingerprint &&
										normalize(fingerprint) ===
											pgpKeyFingerprint
								)
							) :
						of(false),
					false
				),
				key: pgpKey,
				savePrivateKey: !potassiumUtil.isEmpty(
					pgpKey.keyPair?.privateKey
				) ?
					async () =>
						saveFile(
							(await this.pgpService.getPrivateKeyArmor(
								pgpKey.keyPair?.privateKey
							)) || '',
							`${
								pgpKey.pgpMetadata.fingerprint || record.name
							}.priv.asc`
						) :
					undefined,
				savePublicKey: async () =>
					saveFile(
						(
							await this.pgpService.getPublicKeyMetadata(
								!potassiumUtil.isEmpty(pgpKey.publicKey) ?
									pgpKey.publicKey :
									pgpKey.keyPair?.publicKey
							)
						).publicKey || '',
						`${
							pgpKey.pgpMetadata.fingerprint || record.name
						}.pub.asc`
					)
			};
		}
	);

	/** Gets table columns. */
	public readonly getTableColumns = memoize(
		(recordType: AccountFileRecord.RecordTypes) => [
			'type',
			...(recordType === AccountFileRecord.RecordTypes.Password ?
				['passwordURL', 'passwordUsername', 'password'] :
				[
					'name',
					...(this.anonymousMessages ? ['replyTo'] : []),
					...(recordType !== AccountFileRecord.RecordTypes.PGPKey ?
						['timestamp'] :
						[])
				]),
			...(recordType === AccountFileRecord.RecordTypes.PGPKey ?
				['pgpExpires', 'pgpPublicKey', 'pgpPrivateKey'] :
				[]),
			...(recordType === AccountFileRecord.RecordTypes.File ?
				['size'] :
				[]),
			...(recordType === AccountFileRecord.RecordTypes.Password ||
			recordType === AccountFileRecord.RecordTypes.PGPKey ||
			this.anonymousMessages ?
				[] :
				['owner']),
			'actions'
		]
	);

	/** Gets table data source. */
	public readonly getTableDataSource = memoize(
		(
			rows: {
				data: any;
				owner: string;
				record: IAccountFileRecord;
			}[]
		) => {
			const dataSource = new MatTableDataSource(rows);

			Promise.all([
				waitForValue(() => this.paginator),
				waitForValue(() => this.sort)
			]).then(([paginator, sort]) => {
				dataSource.paginator = paginator;
				dataSource.sort = sort;
			});

			return dataSource;
		}
	);

	/** @see MatPaginator */
	@ViewChild(MatPaginator) public paginator?: MatPaginator;

	/** @see readableByteLength */
	public readonly readableByteLength = readableByteLength;

	/** @see AccountFileRecord.RecordTypes */
	@Input() public recordType: AccountFileRecord.RecordTypes =
		AccountFileRecord.RecordTypes.File;

	/** @see AccountFileRecord.RecordTypes */
	public readonly recordTypes = AccountFileRecord.RecordTypes;

	/** @see MatSort */
	@ViewChild(MatSort) public sort?: MatSort;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @see watchRelativeDateString */
	public readonly watchRelativeDateString = watchRelativeDateString;

	/** Accepts incoming EHR API key. */
	public async acceptEhrApiKey (
		record: IAccountFileRecord & IAccountFileReference
	) : Promise<void> {
		await this.accountFilesService.acceptIncomingFile(record, {
			copy: true,
			name: !record.wasAnonymousShare ?
				record.owner :
				getDateTimeString(record.timestamp)
		});
	}

	/** Navigates to specified directory. */
	public changeDirectory (
		directory: string,
		absolutePath: boolean = false
	) : void {
		this.currentDirectory.next(
			this.accountFilesService.directories.transform(
				absolutePath ? '' : this.currentDirectory.value,
				directory
			)
		);
	}

	/** Creates a directory. */
	public async createDirectory (
		directory: string | undefined = undefined
	) : Promise<void> {
		if (directory === undefined) {
			directory = await this.dialogService.prompt({
				content: '',
				placeholder: this.stringsService.createDirectoryPlaceholder,
				title: this.stringsService.createDirectoryTitle
			});
		}

		if (!directory) {
			return;
		}

		await this.accountFilesService.directories.create(
			this.accountFilesService.directories.transform(
				this.currentDirectory.value,
				directory
			)
		);
	}

	/** Copies a password value to the clipboard. */
	public async copyPassword (
		{record}: {record: IAccountFileRecord},
		key: keyof IPassword
	) : Promise<void> {
		const password = await this.accountFilesService.downloadPassword(record)
			.result;
		const value = password[key];

		if (typeof value !== 'string' || value.length < 1) {
			return;
		}

		await copyToClipboard(value);
	}

	/** Deletes a directory. */
	public async deleteDirectory (directory: string) : Promise<void> {
		directory = this.accountFilesService.directories.transform(
			this.currentDirectory.value,
			directory
		);

		if (!directory) {
			return;
		}

		await this.accountFilesService.directories.delete(directory);
	}

	/** Edits a password. */
	public async editPassword (
		{record}: {record: IAccountFileRecord},
		key: keyof IPassword
	) : Promise<void> {
		const password = await this.accountFilesService.downloadPassword(record)
			.result;

		let oldValue = password[key];
		if (typeof oldValue !== 'string' || oldValue.length < 1) {
			oldValue = '';
		}

		const keyString =
			key === 'password' ?
				this.stringsService.passwordKeyPassword :
			key === 'url' ?
				this.stringsService.passwordKeyURL :
				this.stringsService.passwordKeyUsername;

		const value = await this.dialogService.prompt({
			content: this.stringsService.setParameters(
				this.stringsService.passwordEditContent,
				{key: keyString}
			),
			password: key === 'password',
			placeholder: this.stringsService.capitalize(keyString),
			preFill: oldValue,
			title: this.stringsService.passwordEditTitle
		});

		if (value === undefined) {
			await this.dialogService.toast(
				this.stringsService.passwordEditAborted
			);
			return;
		}

		try {
			await this.accountFilesService.updatePassword(record.id, {
				...password,
				[key]: value
			});
			await this.dialogService.toast(
				this.stringsService.passwordEditSaved
			);
		}
		catch (err) {
			debugLogError(() => ({passwordEditFail: err}));
			await this.dialogService.toast(
				this.stringsService.passwordEditFailed
			);
		}
	}

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (changes.filterFunction) {
			this.filterFunctionSubject.next(this.filterFunction);
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.filterFunctionSubject.next(this.filterFunction);
	}

	/** Removes an EHR API key. */
	public async removeEhrApiKey (o: {
		data: IEhrApiKey;
		record: IAccountFileRecord & IAccountFileReference;
	}) : Promise<void> {
		await Promise.all([
			this.accountFilesService.remove(o.record),
			o.record.metadata ?
				this.ehrIntegrationService.deleteApiKey(
					o.data.apiKey,
					o.record.metadata
				) :
				undefined
		]);
	}

	/** Revoke public file download link. */
	public async revokeDownloadLink (o: {
		record: IAccountFileRecord & IAccountFileReference;
	}) : Promise<void> {
		await this.accountDownloadService.revoke(o.record.id);
		await this.dialogService.toast(
			this.stringsService.downloadRevokeSuccess
		);
	}

	/** Shares file publicly and copies link to clipboard. */
	public async shareDownloadLink (o: {
		record: IAccountFileRecord & IAccountFileReference;
	}) : Promise<void> {
		await copyToClipboard(
			`${this.envService.cyphDownloadUrl}${
				this.envService.cyphDownloadUrl.indexOf('#') > -1 ? '' : '#'
			}${
				(await this.accountDatabaseService.getCurrentUser()).user
					.username
			}/${await this.accountDownloadService.share(o.record.id)}`,
			this.stringsService.downloadShareSuccess
		);
	}

	/** Creates and shares new EHR API key. */
	public async shareEhrApiKey (o: {
		data: IEhrApiKey;
		record: IAccountFileRecord & IAccountFileReference;
	}) : Promise<void> {
		await this.accountFilesService.shareFilePrompt(async username => ({
			data: {
				apiKey: await this.ehrIntegrationService.generateApiKey(
					username,
					o.data.apiKey
				),
				isMaster: false
			},
			metadata: o.data.apiKey,
			name: username
		}));
	}

	constructor (
		/** @ignore */
		public readonly ehrIntegrationService: EHRIntegrationService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountDownloadService */
		public readonly accountDownloadService: AccountDownloadService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see DialogService */
		public readonly dialogService: DialogService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see PGPService */
		public readonly pgpService: PGPService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
