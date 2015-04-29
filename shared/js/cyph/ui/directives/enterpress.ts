module Cyph {
	export module UI {
		export module Directives {
			export class Enterpress {
				public static title: string	= 'ngCyphEnterpress';

				private static _	= (() => {
					angular.module(Enterpress.title, []).directive(Enterpress.title, () => ({
						restrict: 'A',
						scope: {
							trigger: '&' + Enterpress.title
						},
						link: (scope, element, attrs) => {
							let platformRestriction: string	= attrs['enterpressOnly'];

							if (!platformRestriction || platformRestriction === Cyph.Env.platformString) {
								element.keypress(e => {
									if (e.keyCode === 13 && !e.shiftKey) {
										e.preventDefault();
										scope['trigger']();
									}
								});
							}
						}
					}));
				})();
			}
		}
	}
}
