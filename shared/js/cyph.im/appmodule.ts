import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeAdapter} from '@angular/upgrade';


@NgModule({
	imports: [BrowserModule]
})
export class AppModule {
	public static upgradeAdapter	= new UpgradeAdapter(AppModule);
}
