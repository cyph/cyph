import {Util} from '../util';
import {IDialogManager} from './idialogmanager';


/** @inheritDoc */
export class DialogManager implements IDialogManager {
	/** @inheritDoc */
	public async alert (
		o: {
			title: string;
			content: string;
			ok: string;
		}
	) : Promise<any> {
		return this.$mdDialog.show(
			this.$mdDialog.alert().
				title(o.title).
				textContent(o.content).
				ok(o.ok)
		);
	}

	/** @inheritDoc */
	public async baseDialog (
		o: {
			template: string;
			locals?: any;
			oncomplete?: Function;
			onclose?: Function;
		}
	) : Promise<{
		ok: boolean;
		locals: any;
	}> {
		return <Promise<{
			ok: boolean;
			locals: any;
		}>> new Promise(resolve => this.$mdDialog.show({
			clickOutsideToClose: true,
			controller: <any> ['$scope', '$mdDialog', ($scope, $mdDialog) => {
				$scope.locals	= o.locals;
				$scope.close	= (ok: any) => {
					$mdDialog.hide();

					resolve({ok: ok === true, locals: o.locals});

					if (o.onclose) {
						o.onclose(ok);
					}
				};
			}],
			escapeToClose: true,
			onComplete: o.oncomplete,
			template: o.template
		}));
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
		private $mdDialog: angular.material.IDialogService,

		/** @ignore */
		private $mdToast: angular.material.IToastService
	) {}
}
