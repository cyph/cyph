/// <reference path="enterpress.ts" />
/// <reference path="filechange.ts" />


module Cyph {
	export module UI {
		export module Directives {
			export class Chat {
				public static title: string	= 'ngCyphChat';

				private static _	= (() => {
					angular.module(Chat.title, [
						Enterpress.title,
						Filechange.title,
						'ngMaterial'
					]).
						directive(Chat.title + 'Cyphertext', () => ({
							restrict: 'A',
							scope: {
								$this: '=' + Chat.title + 'Cyphertext'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: UI.Chat.Templates.cyphertext
						})).
						directive(Chat.title + 'Main', () => ({
							restrict: 'A',
							transclude: true,
							scope: {
								$this: '=' + Chat.title + 'Main'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: UI.Chat.Templates.main
						})).
						directive(Chat.title + 'MessageBox', () => ({
							restrict: 'A',
							scope: {
								$this: '=' + Chat.title + 'MessageBox'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: UI.Chat.Templates.messageBox
						})).
						directive(Chat.title + 'Sidebar', () => ({
							restrict: 'A',
							scope: {
								$this: '=' + Chat.title + 'Sidebar',
								showChat: '=showChat'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: UI.Chat.Templates.sidebar
						})).
						directive(Chat.title + 'Toolbar', () => ({
							restrict: 'A',
							scope: {
								$this: '=' + Chat.title + 'Toolbar',
								open: '&open',
								showChat: '=showChat'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: UI.Chat.Templates.toolbar
						})).
						factory('chatSidenav', [
							'$mdSidenav',

							$mdSidenav => () => $mdSidenav('sidenav')
						])
					;
				})();
			}
		}
	}
}
