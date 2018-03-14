import * as path from 'path';
import {browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';
import * as util from '../../modules/util';


export class AccountsPage {
	public readonly credentials	= {
		password: 'token',
		pin: '1234',
		username: 'MaxAndFriends'
	};

	public readonly elements	= {
		dialogConfirm: {
			root: () => element(by.css('cyph-dialog-confirm')),

			cancel: () => this.elements.dialogConfirm.root().element(
				by.css('button.cancel')
			),
			ok: () => this.elements.dialogConfirm.root().element(
				by.css('button.ok')
			)
		},

		files: {
			root: () => element(by.css('cyph-account-files')),

			allFiles: () => this.elements.files.root().all(
				by.css('mat-card')
			),
			deleteFirstFile: () => this.elements.files.firstFile().element(
				by.css('button.delete')
			),
			firstFile: () => this.elements.files.root().element(
				by.css('mat-card:first-of-type')
			),
			spinner: () => this.elements.files.root().element(
				by.css('mat-progress-spinner')
			),
			upload: () => element(by.js(() => {
				try {
					const elem: HTMLInputElement	= (<any> document).
						querySelector("cyph-account-files .file-upload").
						dropzone.
						hiddenFileInput
					;
					elem.style.height		= '1px';
					elem.style.opacity		= '1';
					elem.style.visibility	= 'visible';
					elem.style.width		= '1px';
					return elem;
				}
				catch {}
			}))
		},

		login: {
			root: () => element(by.css('cyph-account-login')),

			masterKey: () => this.elements.login.root().element(
				by.css('input[name="masterKey"]')
			),
			pin: () => this.elements.login.root().element(
				by.css('cyph-pin-input > div > input, input[name="lockScreenPin"]')
			),
			spinner: () => this.elements.login.root().element(
				by.css('mat-progress-spinner')
			),
			submit: () => this.elements.login.root().element(
				by.css('button[type="submit"]')
			),
			title: () => this.elements.login.root().element(
				by.css('mat-card-title')
			),
			username: () => this.elements.login.root().element(
				by.css('input[name="cyphUsername"]')
			)
		},

		menu: {
			root: () => element(by.css('cyph-account-menu')),

			files: () => this.elements.menu.root().element(
				by.css('.menu-root:not(.hidden) button.files')
			)
		},

		profile: {
			root: () => element(by.css('cyph-account-profile'))
		}
	};

	public readonly filePath: string	= path.resolve(__dirname, '../src/assets/img/castle.png');

	public async clickElement (elementFinder: () => ElementFinder) : Promise<void> {
		while (true) {
			try {
				await browser.wait(async () => elementFinder().isPresent());
				await browser.wait(ExpectedConditions.elementToBeClickable(elementFinder()));
				await elementFinder().click();
				return;
			}
			catch {}
		}
	}

	public async deleteAllFiles () : Promise<void> {
		await this.waitForElement(this.elements.files.upload);
		await browser.wait(ExpectedConditions.stalenessOf(this.elements.files.spinner()));

		while (true) {
			try {
				if (!(await this.elements.files.deleteFirstFile().isPresent())) {
					return;
				}

				const fileCount	= (await this.elements.files.allFiles()).length;

				await this.clickElement(this.elements.files.deleteFirstFile);
				await this.clickElement(this.elements.dialogConfirm.ok);

				while (true) {
					await util.sleep();
					if (fileCount !== (await this.elements.files.allFiles()).length) {
						break;
					}
				}
			}
			catch {}
		}
	}

	public async getLoginTitleText () : Promise<string> {
		return this.elements.login.title().getText();
	}

	public async getPageTitle () : Promise<string> {
		return browser.getTitle();
	}

	public async logIn () : Promise<void> {
		await browser.wait(ExpectedConditions.invisibilityOf(this.elements.login.spinner()));

		if (!(await this.elements.login.submit().isPresent())) {
			return;
		}

		if (await this.elements.login.pin().isPresent()) {
			await this.elements.login.pin().sendKeys(this.credentials.pin);
		}
		else {
			await this.elements.login.username().sendKeys(this.credentials.username);
			await this.elements.login.masterKey().sendKeys(this.credentials.password);
		}

		await this.clickElement(this.elements.login.submit);
		await (await this.waitForElement(this.elements.profile.root))
	}

	public async navigateTo () : Promise<void> {
		await browser.get('/#account');
	}

	public async waitForElement (elementFinder: () => ElementFinder) : Promise<ElementFinder> {
		await browser.wait(async () => {
			try {
				return (await elementFinder().isPresent());
			}
			catch {
				return false;
			}
		});
		await browser.wait(ExpectedConditions.visibilityOf(elementFinder()));
		return elementFinder();
	}
}
