import {IDialogManager} from 'idialogmanager';


export class DialogManager implements IDialogManager {
	public alert (
		o: {
			title: string;
			content: string;
			ok: string;
		},
		callback?: (promiseValue: any) => void
	) : void {
		this.$mdDialog.
			show(
				this.$mdDialog.alert().
					title(o.title).
					textContent(o.content).
					ok(o.ok)
			).
			then(callback)
		;
	}

	public baseDialog (
		o: {
			template: string;
			locals?: any;
			oncomplete?: Function;
			onclose?: Function;
		},
		callback: (ok: boolean, locals: any) => void = (ok, locals) => {}
	) : void {
		const f	= (ok: boolean) => {
			if (o.onclose) {
				o.onclose(ok);
			}
		};

		this.$mdDialog.show({
			clickOutsideToClose: true,
			escapeToClose: true,
			template: o.template,
			onComplete: o.oncomplete,
			controller: <any> ['$scope', '$mdDialog', ($scope, $mdDialog) => {
				$scope.locals	= o.locals;
				$scope.close	= (ok: any) => {
					$mdDialog.hide();
					callback(ok === true, o.locals);
				};
			}]
		}).then(f).catch(f);
	}

	public confirm (
		o: {
			title: string;
			content: string;
			ok: string;
			cancel: string;
			timeout?: number;
		},
		callback?: (ok: boolean) => void
	) : void {
		const promise	= this.$mdDialog.show(
			this.$mdDialog.confirm().
				title(o.title).
				textContent(o.content).
				ok(o.ok).
				cancel(o.cancel)
		);

		let timeoutId;
		if ('timeout' in o) {
			timeoutId	= setTimeout(() =>
				this.$mdDialog.cancel(promise)
			, o.timeout);
		}

		const f	= (ok: any) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			if (callback) {
				callback(ok === true);
				callback	= null;
			}
		};

		promise.then(f).catch(f);
	}

	public toast (
		o: {
			content: string;
			delay: number;
			position?: string;
		},
		callback?: () => void
	) : void {
		this.$mdToast.show({
			template: `<md-toast><div class='md-toast-content'>${o.content}</div></md-toast>`,
			hideDelay: o.delay,
			position: o.position || 'top right'
		});

		setTimeout(callback, o.delay + 500);
	}

	/**
	 * @param $mdDialog
	 * @param $mdToast
	 */
	public constructor(
		private $mdDialog: angular.material.IDialogService,
		private $mdToast: angular.material.IToastService
	) {}
}
