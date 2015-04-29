module Cyph {
	export module UI {
		export module Directives {
			export class Filechange {
				public static title: string	= 'ngCyphFilechange';

				private static _	= (() => {
					angular.module(Filechange.title, []).directive(Filechange.title, () => ({
						restrict: 'A',
						link: (scope, element, attrs) => {
							element.change(() => {
								attrs[Filechange.title](element);
							});
						}
					}));
				})();
			}
		}
	}
}
