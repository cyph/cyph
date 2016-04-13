namespace Cyph {
	export namespace UI {
		export namespace Directives {
			/**
			 * Angular directive for handling enter-presses.
			 */
			export class Enterpress {
				/** Module/directive title. */
				public static title: string	= 'cyphEnterpress';

				private static _	= (() => {
					angular.module(Enterpress.title, []).directive(Enterpress.title, () => ({
						restrict: 'A',
						scope: {
							trigger: '&' + Enterpress.title
						},
						link: (scope, element, attrs) => {
							element.keypress(e => {
								const platformRestriction: string	= attrs['enterpressOnly'];

								/* Allow enter press on external keyboards for mobile */
								const platform: string	= Cyph.Env.isMobile && !VirtualKeyboardWatcher.isOpen ?
									'desktop' :
									Cyph.Env.platformString
								;

								if (
									(!platformRestriction || platformRestriction === platform) &&
									(e.keyCode === 13 && !e.shiftKey)
								) {
									e.preventDefault();
									scope['trigger']();
								}
							});
						}
					}));
				})();
			}
		}
	}
}
