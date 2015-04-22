module Cyph {
	export module UI {
		export class DialogManager implements IDialogManager {
			private $mdDialog: angular.material.MDDialogService;
			private $mdToast: angular.material.MDToastService;

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
							content(o.content).
							ok(o.ok)
					).
					then(callback)
				;
			}

			public baseDialog (
				o: {
					template: string;
					vars?: any;
					oncomplete?: Function;
				},
				callback?: (ok: boolean, vars: any) => void
			) : void {
				this.$mdDialog.show({
					template: o.template,
					onComplete: o.oncomplete,
					controller: <any> ['$scope', '$mdDialog', ($scope, $mdDialog) => {
						$scope.vars		= o.vars;
						$scope.close	= (ok: any) => {
							$mdDialog.hide();
							callback && callback(ok === true, o.vars);
						};
					}]
				});
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
				let promise	= this.$mdDialog.
					show(
						this.$mdDialog.confirm().
							title(o.title).
							content(o.content).
							ok(o.ok).
							cancel(o.cancel)
					).
					then(callback)
				;

				let timeoutId;
				if ('timeout' in o) {
					timeoutId	= setTimeout(() =>
						this.$mdDialog.cancel(promise)
					, o.timeout);
				}

				let f	= (ok: any) => {
					timeoutId && clearTimeout(timeoutId);
					callback && callback(ok === true);
				};

				promise.then(f).catch(f);
			}

			public toast (
				o: {
					content: string;
					position: string;
					delay: number;
				},
				callback?: () => void
			) : void {
				this.$mdToast.show({
					template: '<md-toast>' + o.content + '</md-toast>',
					hideDelay: o.delay,
					position: o.position
				});

				setTimeout(callback, o.delay + 500);
			}

			public constructor (
				$mdDialog: angular.material.MDDialogService,
				$mdToast: angular.material.MDToastService
			) {
				this.$mdDialog	= $mdDialog;
				this.$mdToast	= $mdToast;
			}
		}
	}
}
