import {browser, element, by} from 'protractor';


export class CyphPage {
	public async navigateTo () : Promise<any> {
		await browser.waitForAngularEnabled(false);
		return browser.get('/');
	}

	public async getParagraphText () : Promise<string> {
		return element(by.css('footer > div > span:first-child')).getText();
	}
}
