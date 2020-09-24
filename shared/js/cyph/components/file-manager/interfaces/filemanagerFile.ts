export interface IFilemanagerFile {
	key: string;
	name: string;
	size: number | string;
	isDirectory: boolean;
	originalConfig: any;
}
