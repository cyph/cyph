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
								let split: string[]	= attrs[Filechange.title].split('.');

								let o: any			= scope.$parent.$eval(
									split.slice(0, -1).join('.')
								);

								o[split.slice(-1)[0].split('(')[0]](element[0]);
							});
						}
					}));
				})();
			}
		}
	}
}
