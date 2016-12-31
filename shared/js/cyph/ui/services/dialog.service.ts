import {Inject, Injectable} from '@angular/core';
import {util} from '../../util';


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
			title: string;
			content: string;
			ok: string;
		}
	) : Promise<void> {
		util.lock(this.lock, async () =>
			this.mdDialogService.show(
				this.mdDialogService.alert().
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
			template: string;
			locals?: any;
		}
	) : Promise<{
		ok: boolean;
		locals: any;
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
			title: string;
			content: string;
			ok: string;
			cancel: string;
			timeout?: number;
		}
	) : Promise<boolean> {
		return util.lock(this.lock, async () => {
			const promise	= this.mdDialogService.show(
				this.mdDialogService.confirm().
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
				return (await promise.catch(_ => false));
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
		});

		await util.sleep(o.delay + 500);
	}

	constructor (
		/** @ignore */
		@Inject('MdDialogService')
		private readonly mdDialogService: angular.material.IDialogService,

		/** @ignore */
		@Inject('MdToastService')
		private readonly mdToastService: angular.material.IToastService
	) {}
}
