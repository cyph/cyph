import {CyphPlans} from '../proto';

/** Configuration options for Cyph plans. */
export const planConfig: Record<
	CyphPlans,
	{
		checkoutPath?: string;
		enableGroup?: boolean;
		enablePasswords?: boolean;
		enableWallets?: boolean;
		initialInvites: number;
		lifetime: boolean;
		rank: number;
		storageCapGB: number;
		telehealth?: boolean;
		usernameMinLength: number;
		walletEarlyAccess?: string;
	}
> = {
	[CyphPlans.AnnualPremium]: {
		checkoutPath: 'holiday-sale/annual-premium',
		initialInvites: 10,
		lifetime: false,
		rank: 2,
		storageCapGB: 25,
		usernameMinLength: 5,
		walletEarlyAccess: 'beta'
	},
	[CyphPlans.AnnualTelehealth]: {
		checkoutPath: 'accounts/annual-telehealth',
		enableGroup: true,
		initialInvites: 10,
		lifetime: false,
		rank: 2,
		storageCapGB: 5,
		telehealth: true,
		usernameMinLength: 5
	},
	[CyphPlans.FoundersAndFriends]: {
		enableGroup: true,
		enablePasswords: true,
		enableWallets: true,
		initialInvites: 15,
		lifetime: true,
		rank: 4,
		storageCapGB: 100,
		usernameMinLength: 1,
		walletEarlyAccess: 'alpha'
	},
	[CyphPlans.Free]: {
		initialInvites: 2,
		lifetime: false,
		rank: 0,
		storageCapGB: 1,
		usernameMinLength: 5
	},
	[CyphPlans.LifetimePlatinum]: {
		checkoutPath: 'holiday-sale/lifetime-platinum',
		initialInvites: 15,
		lifetime: true,
		rank: 3,
		storageCapGB: 100,
		usernameMinLength: 1,
		walletEarlyAccess: 'alpha'
	},
	[CyphPlans.MonthlyPremium]: {
		checkoutPath: 'holiday-sale/monthly-premium',
		initialInvites: 5,
		lifetime: false,
		rank: 1,
		storageCapGB: 5,
		usernameMinLength: 5
	},
	[CyphPlans.MonthlyTelehealth]: {
		checkoutPath: 'accounts/monthly-telehealth',
		enableGroup: true,
		initialInvites: 5,
		lifetime: false,
		rank: 1,
		storageCapGB: 5,
		telehealth: true,
		usernameMinLength: 5
	}
};
