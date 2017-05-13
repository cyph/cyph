import {Injectable} from '@angular/core';
import {ComponentType} from '@angular/material';
import {ModalDialogService} from 'nativescript-angular/modal-dialog';
import {SnackBar} from 'nativescript-snackbar';
import {alert, confirm} from 'tns-core-modules/ui/dialogs';
import {DialogImageComponent} from './dialog-image.component';
import {DialogService} from './js/cyph/services/dialog.service';
import {util} from './js/cyph/util';


/**
 * DialogService implementation for NativeScript.
 */
@Injectable()
export class NativeDialogService implements DialogService {
	/** @ignore */
	private readonly lock: {}			= {};

	/** @ignore */
	private readonly snackbar: SnackBar	= new SnackBar();

	/** @inheritDoc */
	public async alert (o: {content: string; ok: string; title: string}) : Promise<void> {
		return util.lock(this.lock, async () => {
			return alert({
				message: o.content,
				okButtonText: o.ok,
				title: o.title
			});
		});
	}

	/**
	 * @inheritDoc
	 * @param setInputs Currently unsupported (not implemented exception).
	 */
	public async baseDialog<T> (
		componentType: ComponentType<T>,
		setInputs?: (componentInstance: T) => void
	) : Promise<void> {
		if (setInputs) {
			throw new Error('NativeDialogService.baseDialog setInputs param is unsupported.');
		}

		return util.lock(this.lock, async () => {
			await this.modalDialogService.showModal(componentType, {});
		});
	}

	/**
	 * @inheritDoc
	 * @param timeout Currently unsupported (ignored).
	 */
	public async confirm (o: {
		cancel: string;
		content: string;
		ok: string;
		timeout?: number;
		title: string;
	}) : Promise<boolean> {
		return util.lock(this.lock, async () => {
			return !!(await confirm({
				cancelButtonText: o.cancel,
				message: o.content,
				okButtonText: o.ok,
				title: o.title
			}));
		});
	}

	/** @inheritDoc */
	public async image (src: string) : Promise<void> {
		return util.lock(this.lock, async () => {
			await this.modalDialogService.showModal(DialogImageComponent, {context: src});
		});
	}

	/** @inheritDoc */
	public async toast (content: string, duration: number) : Promise<void> {
		let isPending	= true;
		this.snackbar.simple(content).then(() => {
			isPending	= false;
		});

		await util.sleep(duration);
		if (isPending) {
			this.snackbar.dismiss();
		}
		await util.sleep(500);
	}

	constructor (
		/** @ignore */
		private readonly modalDialogService: ModalDialogService
	) {}
}
