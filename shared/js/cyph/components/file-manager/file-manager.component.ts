import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges,
	ViewChild
} from '@angular/core';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import {DxFileManagerComponent} from 'devextreme-angular/ui/file-manager';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {IAccountFileDirectory} from '../../proto';
import {StringsService} from '../../services/strings.service';
import {IDataSourceFile} from './interfaces/idata-source-file';
import {IFileManagerDirectory} from './interfaces/ifile-manager-directory';
import {IFileManagerHandlers} from './interfaces/ifile-manager-handlers';

/**
 * Angular component for file manager UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-file-manager',
	styleUrls: ['./file-manager.component.scss'],
	templateUrl: './file-manager.component.html'
})
export class FileManagerComponent extends BaseProvider implements OnChanges {
	/** @ignore */
	private allData: (IDataSourceFile | IFileManagerDirectory)[] = [];

	/** Current selection. */
	public readonly currentSelection = new BehaviorSubject<FileSystemItem[]>(
		[]
	);

	/** @see CustomFileSystemProvider */
	public readonly customProvider: CustomFileSystemProvider;

	/** Tree of directories. */
	@Input() public directories?: IAccountFileDirectory;

	/** @see DxFileManagerComponent */
	@ViewChild('fileManager', {read: DxFileManagerComponent})
	public fileManager?: DxFileManagerComponent;

	/** List of files. */
	@Input() public files?: IDataSourceFile[];

	/** @see IFileManagerHandlers */
	@Input() public handlers?: IFileManagerHandlers;

	/** @ignore */
	private readonly defaultCheckIfLinkShared = (_DOWNLOAD_ID: string) =>
		of(true);

	/** @ignore */
	private fillDirectories (
		files: IDataSourceFile[],
		directories: IFileManagerDirectory[]
	) : (IFileManagerDirectory | IDataSourceFile)[] {
		const rootFiles: (IFileManagerDirectory | IDataSourceFile)[] = [];

		for (const file of files.map(o => ({
			...o,
			dateModified: new Date(o.record.timestamp)
		}))) {
			if (!file.record.parentPath) {
				rootFiles.push(file);
				continue;
			}

			this.findDirectory(file.record.parentPath, directories)?.items.push(
				file
			);
		}

		return [...directories, ...rootFiles];
	}

	/** @ignore */
	private findDirectory (
		name: string,
		dirArr: IFileManagerDirectory[]
	) : IFileManagerDirectory | undefined {
		const nameArr: string[] = name.split('/');
		let curDir: IFileManagerDirectory | undefined;

		while (nameArr.length) {
			const dirName: string | undefined = nameArr.shift();

			if (!curDir) {
				curDir = dirArr.find(el => el.isDirectory && el.id === dirName);
				continue;
			}

			curDir = <IFileManagerDirectory | undefined> (
				curDir.items.find(
					el =>
						'isDirectory' in el &&
						el.isDirectory &&
						el.id === dirName
				)
			);
		}

		return curDir;
	}

	/** @ignore */
	private transformDirectories (
		directories: IAccountFileDirectory,
		resultStructure: IFileManagerDirectory[] = []
	) : IFileManagerDirectory[] {
		for (const [key, value] of Object.entries(directories.children || {})) {
			const filemanagerDirObject = {
				id: key,
				isDirectory: true,
				items: <IFileManagerDirectory[]> [],
				name: key
			};

			resultStructure.push(filemanagerDirObject);

			if (Object.keys(value.children || {}).length > 0) {
				this.transformDirectories(value, filemanagerDirObject.items);
			}
		}

		return resultStructure;
	}

	/** @see IFileManagerHandlers.checkIfLinkShared */
	public get checkIfLinkShared () : (
		downloadID: string
	) => Observable<boolean> {
		return (
			this.handlers?.checkIfLinkShared || this.defaultCheckIfLinkShared
		);
	}

	/** @inheritDoc */
	public ngOnChanges () : void {
		if (!this.directories || !this.files) {
			return;
		}

		this.allData = this.fillDirectories(
			this.files,
			this.transformDirectories(this.directories)
		);

		this.fileManager?.instance.refresh();
	}

	/** @see DxFileManagerComponent.onCurrentDirectoryChanged */
	public async onCurrentDirectoryChanged (event?: {
		directory?: FileSystemItem;
	}) : Promise<void> {
		if (event?.directory) {
			await this.handlers?.changeDirectory(event.directory.path);
		}
	}

	/** @see DxFileManagerComponent.onSelectedFileOpened */
	public async onSelectedFileOpened (event?: {
		file?: FileSystemItem;
	}) : Promise<void> {
		if (event?.file) {
			this.handlers?.selectedFileOpen(event.file);
		}
	}

	/** @see DxFileManagerComponent.onSelectionChanged */
	public async onSelectionChanged (event?: {
		selectedItems?: FileSystemItem[];
	}) : Promise<void> {
		this.currentSelection.next(event?.selectedItems || []);

		const selectionChange = this.handlers?.selectionChange;
		if (!selectionChange) {
			return;
		}

		await selectionChange(this.currentSelection.value);
	}

	/** Revoke public link button click handler. */
	public readonly revokeDownloadLinkClick = async () => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		await Promise.all(
			files.map(async file => {
				if (file.isDirectory) {
					return;
				}

				await this.handlers?.revokeDownloadLink(file);
			})
		);
	};

	/** Share files as public link button click handler. */
	public readonly shareDownloadLinkClick = async () => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		await Promise.all(
			files.map(async file => {
				if (file.isDirectory) {
					return;
				}

				await this.handlers?.shareDownloadLink(file);
			})
		);
	};

	/** Share file button click handler. */
	public readonly shareFileClick = async () => {
		const files = this.fileManager?.instance.getSelectedItems();

		if (!files) {
			return;
		}

		await Promise.all(
			files.map(async file => {
				if (file.isDirectory) {
					return;
				}

				await this.handlers?.shareFile(file.dataItem);
			})
		);
	};

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.customProvider = new CustomFileSystemProvider({
			copyItem: async (item, destinationDirectory) =>
				this.handlers?.moveFile(
					item,
					`${destinationDirectory.path}/${item.name}`,
					true
				),
			createDirectory: async (_PARENT_DIR, name) =>
				this.handlers?.createDirectory(name),
			deleteItem: async item => {
				if (!item.isDirectory) {
					await this.handlers?.removeFile(item.dataItem.id);
					return;
				}

				await this.handlers?.removeDirectory(item.path);

				const relatedFiles =
					this.files?.filter(
						el => el.record.parentPath?.indexOf(item.path) === 0
					) || [];

				await Promise.all(
					relatedFiles.map(
						async file => this.handlers?.removeFile(file.record.id)
					)
				);
			},
			downloadItems: async items =>
				Promise.all(
					items.map(
						async item => this.handlers?.downloadAndSave(item)
					)
				),
			getItems: async (
				pathInfo
			) : Promise<(IDataSourceFile | IFileManagerDirectory)[]> => {
				if (!pathInfo.name) {
					return this.allData;
				}

				return pathInfo.dataItem.items;
			},
			moveItem: async (item, destinationDirectory) =>
				this.handlers?.moveFile(
					item,
					`${destinationDirectory.path}/${item.name}`,
					false
				),
			renameItem: async (item, newName) =>
				this.handlers?.moveFile(
					item,
					`${item.pathKeys.slice(0, -1).join('')}/${newName}`,
					false
				),
			uploadFileChunk: async (fileData: File) =>
				this.handlers?.uploadFile(fileData)
		});
	}
}
