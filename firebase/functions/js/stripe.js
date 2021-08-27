import {stripeSecretKey} from './cyph-admin-vars.js';
import {initSubscriptionService} from './subscription-service.js';

export const {
	cancelSubscriptions,
	cloneSubscription,
	stripe,
	stripeCancelSubscription,
	stripeCancelSubscriptionItem,
	stripeCloneSubscription,
	stripeCloneSubscriptionItem,
	stripeCustomizeProduct,
	stripeGetProduct,
	stripeRefundSubscription,
	stripeRefundSubscriptionItem,
	stripeUpdateSubscriptionItem
} = initSubscriptionService({stripeSecretKey});
