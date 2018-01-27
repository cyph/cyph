import {browser, by, element, ExpectedConditions} from 'protractor';


export class AccountsPage {
	public async getLoginTitleText () : Promise<string> {
		return element(by.css('cyph-account-login mat-card-title')).getText();
	}

	public async navigateTo () : Promise<void> {
		await browser.get('/#account/login');
	}
}
