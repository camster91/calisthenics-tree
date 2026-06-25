# D18 — Subscription edge cases

Status: **DRAFT — needs decision before Phase 5 launch**

Apple's StoreKit 2 handles most of this server-side via the App Store Server API. The decisions below are where the user-facing UX lives.

## Edge cases

### User upgrades mid-period (monthly → annual)
- Apple proration rules apply. User pays the difference, annual term starts now.
- UX: "You've switched to annual. Your next billing date is [date]."
- No data migration needed — same account, same Pro features.

### User downgrades (annual → monthly)
- Apple: downgrade takes effect at end of current annual period. User keeps Pro until then.
- UX: "Your plan changes to monthly on [date]. Until then, you have full Pro access."
- We DO NOT immediately strip Pro features — that violates App Store guidelines.

### User pauses
- Apple does not support subscription pausing for auto-renewable subscriptions (only for consumables in some regions).
- Workaround: user can cancel and re-subscribe. We don't need pause UX.

### User gets a refund
- Apple processes refund via App Store Support. We get a `REFUND` notification via App Store Server Notifications webhook.
- Action: immediately revoke Pro features server-side. UX: "Your subscription was refunded. You've been moved to the Free plan. Resubscribe anytime."
- DO NOT show a "you were refunded" notification in-app — Apple handles the email.

### User's payment method expires
- Apple's automatic retry. If 60 days pass without recovery, subscription auto-cancels.
- UX on day 1 of failure: silent (don't pester).
- UX on day 7 of failure: in-app banner "Your subscription is paused. Update payment to keep Pro."
- UX on day 30: banner gets more prominent.
- UX on day 60 (auto-cancel): user is moved to Free. Banner disappears.

### Family sharing
- If the user is part of someone's Apple Family, they get access via the family organizer's subscription.
- UX: "You're using Calisthenics Tree Pro via [organizer name]'s Family Sharing."
- We can't customize pricing for Family Sharing — Apple handles it.

### User in a region where our pricing tier isn't set
- Apple's pricing matrix covers ~175 regions. If a tier is missing, the buy button is grayed out.
- UX: "Subscriptions aren't available in your region yet."
- Workaround: pre-set all tier prices in App Store Connect for every region.

### Subscription renews but our backend doesn't know yet
- App Store sends a `DID_RENEW` server notification asynchronously. Until we process it, our backend shows the user as still-subscribed (because their last receipt verified).
- If a renewal fails and we never get a notification: rare. Mitigation: weekly reconciliation job that fetches latest receipt status from Apple's verifyReceipt endpoint for all active subscriptions.

## What we explicitly DON'T handle in v1

- **Win-back offers.** "Come back to Pro for $2.99/mo" — requires Offer Codes in StoreKit. v2.
- **Promo codes.** App Store promo codes for free Pro trials. Phase 6+.
- **Custom retention flows.** "Cancel and get 1 month free" — App Store doesn't allow this for auto-renewable subscriptions.

## Action
T20 (StoreKit 2 subscription) implements these UX flows. App Store Server Notifications webhook registered in T1.