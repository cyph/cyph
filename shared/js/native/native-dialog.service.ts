import {ComponentType} from '@angular/cdk/portal';
import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {ModalDialogService} from 'nativescript-angular/modal-dialog';
import {SnackBar} from 'nativescript-snackbar';
import {alert, confirm} from 'tns-core-modules/ui/dialogs/dialogs';
import {DialogImageComponent} from './components/dialog-image';
import {IResolvable} from './js/cyph/iresolvable';
import {LockFunction} from './js/cyph/lock-function-type';
import {DialogService} from './js/cyph/services/dialog.service';
import {StringsService} from './js/cyph/services/strings.service';
import {lockFunction} from './js/cyph/util/lock';
import {sleep} from './js/cyph/util/wait';


/**
 * DialogService implementation for NativeScript.
 */
@Injectable()
export class NativeDialogService implements DialogService {
	/** @ignore */
	private readonly lock: LockFunction	= lockFunction();

	/** @ignore */
	private readonly snackbar: SnackBar	= new SnackBar();

	/**
	 * @inheritDoc
	 * @param closeFunction Currently unsupported (not implemented exception).
	 */
	public async alert (
		o: {content: string; ok?: string; title?: string},
		closeFunction?: IResolvable<() => void>
	) : Promise<void> {
		if (closeFunction) {
			throw new Error('NativeDialogService.baseDialog closeFunction is unsupported.');
		}

		return this.lock(async () => {
			return alert({
				message: o.content,
				okButtonText: o.ok !== undefined ? o.ok : this.stringsService.ok,
				title: o.title
			});
		});
	}

	/**
	 * @inheritDoc
	 * @param setInputs Currently unsupported (not implemented exception).
	 * @param closeFunction Currently unsupported (not implemented exception).
	 */
	public async baseDialog<T> (
		componentType: ComponentType<T>,
		setInputs?: (componentInstance: T) => void,
		closeFunction?: IResolvable<() => void>
	) : Promise<void> {
		if (setInputs) {
			throw new Error('NativeDialogService.baseDialog setInputs is unsupported.');
		}
		if (closeFunction) {
			throw new Error('NativeDialogService.baseDialog closeFunction is unsupported.');
		}

		return this.lock(async () => {
			await this.modalDialogService.showModal(componentType, {});
		});
	}

	/**
	 * @inheritDoc
	 * @param o.timeout Currently unsupported (ignored).
	 * @param closeFunction Currently unsupported (not implemented exception).
	 */
	public async confirm (
		o: {
			cancel?: string;
			content: string;
			ok?: string;
			timeout?: number;
			title?: string;
		},
		closeFunction?: IResolvable<() => void>
	) : Promise<boolean> {
		return this.lock(async () => {
			return !!(await confirm({
				cancelButtonText: o.ok !== undefined ? o.cancel : this.stringsService.cancel,
				message: o.content,
				okButtonText: o.ok !== undefined ? o.ok : this.stringsService.ok,
				title: o.title
			}));
		});
	}

	/** @inheritDoc */
	public async dismissToast () : Promise<void> {
		await this.snackbar.dismiss();
	}

	/**
	 * @inheritDoc
	 * @param closeFunction Currently unsupported (not implemented exception).
	 */
	public async image (
		src: SafeUrl|string,
		closeFunction?: IResolvable<() => void>
	) : Promise<void> {
		if (closeFunction) {
			throw new Error('NativeDialogService.baseDialog closeFunction is unsupported.');
		}

		if (typeof src !== 'string') {
			throw new Error('Unsupported src type.');
		}

		return this.lock(async () => {
			await this.modalDialogService.showModal(DialogImageComponent, {context: src});
		});
	}

	/** @inheritDoc */
	public async toast (content: string, duration: number, action?: string) : Promise<boolean> {
		if (action !== undefined) {
			const args: any	= await this.snackbar.action({
				actionText: action.toUpperCase(),
				hideDelay: duration,
				snackText: content
			});

			return args.command === 'Action';
		}

		let isPending	= true;
		this.snackbar.simple(content).then(() => {
			isPending	= false;
		});

		await sleep(duration);
		if (isPending) {
			await this.snackbar.dismiss();
		}
		await sleep(500);
		return false;
	}

	constructor (
		/** @ignore */
		private readonly modalDialogService: ModalDialogService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {}
}
