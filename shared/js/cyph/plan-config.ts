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
		innerCircleLimit?: number;
		lifetime: boolean;
		rank: number;
		storageCapGB: number;
		telehealth?: boolean;
		unlimitedCalling: boolean;
		usernameMinLength: number;
		walletEarlyAccess?: string;
	}
> = {
	[CyphPlans.AnnualPremium]: {
		checkoutPath: 'accounts/annual-premium',
		initialInvites: 10,
		innerCircleLimit: 10,
		lifetime: false,
		rank: 2,
		storageCapGB: 25,
		unlimitedCalling: false,
		usernameMinLength: 5,
		walletEarlyAccess: 'beta'
	},
	[CyphPlans.AnnualTelehealth]: {
		checkoutPath: 'accounts/annual-telehealth',
		enableGroup: true,
		initialInvites: 10,
		innerCircleLimit: 10,
		lifetime: false,
		rank: 2,
		storageCapGB: 5,
		telehealth: true,
		unlimitedCalling: true,
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
		unlimitedCalling: true,
		usernameMinLength: 1,
		walletEarlyAccess: 'alpha'
	},
	[CyphPlans.Free]: {
		initialInvites: 2,
		innerCircleLimit: 2,
		lifetime: false,
		rank: 0,
		storageCapGB: 1,
		unlimitedCalling: false,
		usernameMinLength: 5
	},
	[CyphPlans.LifetimePlatinum]: {
		checkoutPath: 'accounts/lifetime-platinum',
		enableGroup: true,
		initialInvites: 15,
		lifetime: true,
		rank: 3,
		storageCapGB: 100,
		unlimitedCalling: true,
		usernameMinLength: 1,
		walletEarlyAccess: 'alpha'
	},
	[CyphPlans.MonthlyPremium]: {
		checkoutPath: 'accounts/monthly-premium',
		initialInvites: 5,
		innerCircleLimit: 5,
		lifetime: false,
		rank: 1,
		storageCapGB: 5,
		unlimitedCalling: false,
		usernameMinLength: 5
	},
	[CyphPlans.MonthlyTelehealth]: {
		checkoutPath: 'accounts/monthly-telehealth',
		enableGroup: true,
		initialInvites: 5,
		innerCircleLimit: 5,
		lifetime: false,
		rank: 1,
		storageCapGB: 5,
		unlimitedCalling: true,
		telehealth: true,
		usernameMinLength: 5
	},
	[CyphPlans.Platinum]: {
		checkoutPath: 'accounts/platinum',
		enableGroup: true,
		initialInvites: 15,
		lifetime: false,
		rank: 3,
		storageCapGB: 100,
		unlimitedCalling: true,
		usernameMinLength: 1,
		walletEarlyAccess: 'alpha'
	}
};
