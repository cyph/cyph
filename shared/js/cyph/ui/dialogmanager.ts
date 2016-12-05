import {Util} from '../util';
import {IDialogManager} from './idialogmanager';


/** @inheritDoc */
export class DialogManager implements IDialogManager {
	/** @ignore */
	private readonly lock: {}	= {};

	/** @inheritDoc */
	public async alert (
		o: {
			title: string;
			content: string;
			ok: string;
		}
	) : Promise<void> {
		Util.lock(this.lock, async () =>
			this.$mdDialog.show(
				this.$mdDialog.alert().
					title(o.title).
					textContent(o.content).
					ok(o.ok)
			)
		);
	}

	/** @inheritDoc */
	public async baseDialog (
		o: {
			template: string;
			locals?: any;
		}
	) : Promise<{
		ok: boolean;
		locals: any;
	}> {
		return Util.lock(
			this.lock,
			async () => this.$mdDialog.show({
				clickOutsideToClose: true,
				controller: <any> [
					'$scope',
					'$mdDialog',
					($scope: any, $mdDialog: angular.material.IDialogService) => {
						$scope.locals	= o.locals;
					}
				],
				escapeToClose: true,
				template: `<md-dialog>${o.template}</md-dialog>`
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

	/** @inheritDoc */
	public async confirm (
		o: {
			title: string;
			content: string;
			ok: string;
			cancel: string;
			timeout?: number;
		}
	) : Promise<boolean> {
		return Util.lock(this.lock, async () => {
			const promise	= this.$mdDialog.show(
				this.$mdDialog.confirm().
					title(o.title).
					textContent(o.content).
					ok(o.ok).
					cancel(o.cancel)
			);

			const timeoutId	= 'timeout' in o ?
				setTimeout(() => this.$mdDialog.cancel(promise), o.timeout) :
				null
			;

			try {
				return (await promise.catch(_ => false));
			}
			finally {
				if (timeoutId) {
					clearTimeout(timeoutId);
				}
			}
		});
	}

	/** @inheritDoc */
	public async toast (
		o: {
			content: string;
			delay: number;
			position?: string;
		}
	) : Promise<void> {
		this.$mdToast.show({
			hideDelay: o.delay,
			position: o.position || 'top right',
			template: `<md-toast><div class='md-toast-content'>${o.content}</div></md-toast>`
		});

		await Util.sleep(o.delay + 500);
	}

	constructor (
		/** @ignore */
		private readonly $mdDialog: angular.material.IDialogService,

		/** @ignore */
		private readonly $mdToast: angular.material.IToastService
	) {}
}
