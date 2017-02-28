import {Injectable} from '@angular/core';
import {util} from '../util';
import {MdDialogService} from './material/md-dialog.service';
import {MdToastService} from './material/md-toast.service';


/**
 * Provides modal/dialog functionality.
 */
@Injectable()
export class DialogService {
	/** @ignore */
	private readonly lock: {}	= {};

	/**
	 * Displays alert.
	 * @param o
	 */
	public async alert (
		o: {
			content: string;
			ok: string;
			title: string;
		}
	) : Promise<void> {
		util.lock(this.lock, async () =>
			this.mdDialogService.show(
				(await this.mdDialogService.alert()).
					title(o.title).
					textContent(o.content).
					ok(o.ok)
			)
		);
	}

	/**
	 * Generic modal implementation that takes a template / content.
	 * @param o
	 */
	public async baseDialog (
		o: {
			locals?: any;
			template: string;
		}
	) : Promise<{
		locals: any;
		ok: boolean;
	}> {
		return util.lock(
			this.lock,
			async () => this.mdDialogService.show({
				clickOutsideToClose: true,
				controller: <any> ['$scope', ($scope: any) => {
					$scope.locals	= o.locals;
				}],
				escapeToClose: true,
				template: o.template
			}).then(() =>
				true
			).catch(() =>
				false
			).then(ok => ({
				ok,
				locals: o.locals
			}))
		);
	}

	/**
	 * Displays interactive confirmation prompt.
	 * @param o
	 */
	public async confirm (
		o: {
			cancel: string;
			content: string;
			ok: string;
			timeout?: number;
			title: string;
		}
	) : Promise<boolean> {
		return util.lock(this.lock, async () => {
			const promise	= this.mdDialogService.show(
				(await this.mdDialogService.confirm()).
					title(o.title).
					textContent(o.content).
					ok(o.ok).
					cancel(o.cancel)
			);

			let hasReturned	= false;
			if (o.timeout !== undefined && !isNaN(o.timeout)) {
				(async () => {
					await util.sleep(o.timeout);
					if (!hasReturned) {
						this.mdDialogService.cancel(promise);
					}
				})();
			}

			try {
				return (await promise.catch(() => false));
			}
			finally {
				hasReturned	= true;
			}
		});
	}

	/**
	 * Displays toast notification.
	 * @param o
	 */
	public async toast (
		o: {
			content: string;
			delay: number;
			position?: string;
		}
	) : Promise<void> {
		this.mdToastService.show({
			hideDelay: o.delay,
			position: o.position || 'top right',
			template: `<md-toast><div class='md-toast-content'>${o.content}</div></md-toast>`
		}).catch(
			() => {}
		);

		await util.sleep(o.delay + 500);
	}

	constructor (
		/** @ignore */
		private readonly mdDialogService: MdDialogService,

		/** @ignore */
		private readonly mdToastService: MdToastService
	) {}
}
