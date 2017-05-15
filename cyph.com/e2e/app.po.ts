import {browser, element, by} from 'protractor';


export class Cyph.WsPage {
	public navigateTo () : void {
		return browser.get('/');
	}

	public getParagraphText () : void {
		return element(by.css('app-root h1')).getText();
	}
}
