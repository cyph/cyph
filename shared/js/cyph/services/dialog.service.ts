import {Injectable} from '@angular/core';
import {ComponentType, MdDialog, MdDialogConfig, MdSnackBar} from '@angular/material';
import {DialogAlertComponent} from '../components/dialog-alert.component';
import {DialogConfirmComponent} from '../components/dialog-confirm.component';
import {DialogImageComponent} from '../components/dialog-image.component';
import {util} from '../util';


/**
 * Provides modal/dialog functionality.
 */
@Injectable()
export class DialogService {
	/** @ignore */
	private readonly lock: {}	= {};

	/** Displays alert. */
	public async alert (o: {content: string; ok: string; title: string}) : Promise<void> {
		return util.lock(this.lock, async () => {
			const mdDialogRef	= this.mdDialog.open(DialogAlertComponent);

			mdDialogRef.componentInstance.content	= o.content;
			mdDialogRef.componentInstance.ok		= o.ok;
			mdDialogRef.componentInstance.title		= o.title;

			await mdDialogRef.afterClosed().toPromise();
		});
	}

	/** Generic modal implementation that takes a template / content. */
	public async baseDialog<T> (
		componentType: ComponentType<T>,
		config?: MdDialogConfig,
		setInputs?: (componentInstance: T) => void
	) : Promise<void> {
		return util.lock(this.lock, async () => {
			const mdDialogRef	= this.mdDialog.open(componentType, config);

			if (setInputs) {
				setInputs(mdDialogRef.componentInstance);
			}

			await mdDialogRef.afterClosed().toPromise();
		});
	}

	/** Displays interactive confirmation prompt. */
	public async confirm (o: {
		cancel: string;
		content: string;
		ok: string;
		timeout?: number;
		title: string;
	}) : Promise<boolean> {
		return util.lock(this.lock, async () => {
			const mdDialogRef	= this.mdDialog.open(DialogConfirmComponent);

			mdDialogRef.componentInstance.cancel	= o.cancel;
			mdDialogRef.componentInstance.content	= o.content;
			mdDialogRef.componentInstance.ok		= o.ok;
			mdDialogRef.componentInstance.title		= o.title;

			const promise	= mdDialogRef.afterClosed().toPromise<boolean>();

			let hasReturned	= false;
			if (o.timeout !== undefined && !isNaN(o.timeout)) {
				(async () => {
					await util.sleep(o.timeout);
					if (!hasReturned) {
						mdDialogRef.close(false);
					}
				})();
			}

			try {
				return await promise;
			}
			finally {
				hasReturned	= true;
			}
		});
	}

	/** Displays image. */
	public async image (src: string) : Promise<void> {
		return util.lock(this.lock, async () => {
			const mdDialogRef	= this.mdDialog.open(DialogImageComponent);

			mdDialogRef.componentInstance.src	= src;

			await mdDialogRef.afterClosed().toPromise();
		});
	}

	/** Displays toast notification. */
	public async toast (content: string, duration: number) : Promise<void> {
		await this.mdSnackbar.open(content, undefined, {duration}).afterDismissed().toPromise();
		await util.sleep(500);
	}

	constructor (
		/** @ignore */
		private readonly mdDialog: MdDialog,

		/** @ignore */
		private readonly mdSnackbar: MdSnackBar
	) {}
}
