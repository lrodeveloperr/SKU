# Exact Search Guard review fixes

Shopify review reference 139173 was paused on 15 October 2026. Requirement 1.2.1 identified four advertised pricing plans without a selectable, testable billing flow. Requirements 4.5.4 and 4.5.5 requested complete, functional test access.

## Implemented in this change

- Plans and billing page, plus entry points from navigation, Overview, and Settings.
- Shopify-hosted plan-selection redirect using the authenticated shop domain.
- Partner API verification, persisted subscription state, allowances, pending changes, cancellation and bounded outage handling.
- Correct large-catalog handle, including migration of the prior local large key.
- Server checks for Go live and storefront matches, including cached results. Native search remains the fallback.
- Authenticated merchant actions: Overview no longer falls back to an offline session after failed request authentication.
- English and Spanish billing UI; removed the unfinished-billing message.
- Updated testing instructions below, automated billing coverage, and a verification workflow.

## Account access instructions

The app has no separate username/password account. Reviewers install it on their Shopify test store and open it through Apps in Shopify admin. Keep the submission's no-separate-account checkbox checked. Do not submit the owner's Shopify credentials or credentials for a Shopify test store.

## Testing instructions for the submission form

1. Install Exact Search Guard on your Shopify test store and open it from Apps. No separate account, password, Google login, or external service is required.
2. Open Plans and billing from app navigation. Choose a plan to open Shopify's hosted plan-selection page. Approve Development or an eligible no-charge development-store paid plan. After returning, confirm the selected plan and allowance appear. Use Change plan to test the other plans, and Refresh subscription status to verify the result.
3. Create three active products published to Online Store: one variant with SKU ESG-101 and barcode 9900000000101; two variants on different products sharing SKU ESG-202. Leave other SKUs distinct. Keep the catalog within the selected allowance.
4. Use Rebuild index and wait for completion. Open Identifier health to verify ESG-202 is reported as a duplicate.
5. Open Test search. ESG-101 should produce one exact product/variant match; 9900000000101 should match the same variant; ESG-202 should offer the matching products; ESG-999 should return native-search fallback.
6. Open the theme editor through Overview, enable the Exact Search Guard app embed in a test theme, and save. In test mode, open the storefront with ?esg_preview=1 (or &esg_preview=1 if a query string exists), then test those identifiers in the theme search form. An ordinary phrase should continue to native Shopify search.
7. Select a plan covering the catalog and use Go live. Repeat storefront searches without the preview parameter. Disable exact search in Settings to confirm native search is restored.
8. Review Recovery analytics after searches. Test a plan change and confirm the app displays the verified active plan, separately from any scheduled next-cycle change.

## Live release gates

These require the signed-in Shopify dashboard and a server-side Partner API credential; local automated tests cannot establish them.

- Confirm the actual App Store handle and hosted pricing destination.
- Set the Partner API runtime variables; verify a real subscription query succeeds for the app and dev store.
- Save /app/billing return URLs and Free for partners and developers on all paid managed plan drafts.
- Inspect the Starter draft before retrying edits: a browser call attempting those changes timed out, and persistence was not verified.
- Confirm no paid legacy subscriptions require migration, and enable Shopify App Pricing.
- Deploy the exact tested commit and confirm migration success.
- From a fresh eligible dev-store installation, test each plan, decline/return, upgrade, downgrade, cancellation and app reload. Confirm zero-charge testing through Shopify.
- Test unique/duplicate/unknown storefront cases, Go live, disable and uninstall.
- Record a real 3–8 minute demonstration showing installation, billing selection and return, catalog import, health, diagnostic search, theme activation, storefront behavior and analytics. Replace the old screencast URL after verifying the new video opens without sign-in.
- Save the testing instructions above, then submit fixes against 1.2.1, 4.5.4 and 4.5.5. Do not reply to the noreply email.

## Resubmission response after the live gates pass

Requirement 1.2.1: Exact Search Guard now uses Shopify App Pricing. Reviewers can open Plans and billing, choose or change a plan on Shopify's hosted page, and return to see the independently verified active subscription and catalog allowance. The four plans match the listing, including Large Catalog. Eligible development stores can test the paid plans at no charge.

Requirements 4.5.4 and 4.5.5: The app uses Shopify installation authentication and requires no separate account or third-party login. The submission instructions describe the full merchant and storefront test journey, including billing and deterministic test identifiers. The accompanying demonstration shows that journey on a fresh test installation.

Use this response only after those behaviors have been verified live.
