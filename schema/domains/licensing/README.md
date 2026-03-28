# Licensing

For procurement, finance, and contract administrators who need to track software licenses, vendor relationships, and service level agreements.

## Questions This Domain Answers

- What license type covers this software?
- How many licenses are allocated vs consumed at each site?
- What vendor supports this product?
- What SLA applies to a given deployment or product?

## Types

- License - a software license allocated to a deployment site with entitlement and consumption tracking
- SLA - a service level agreement defining support terms for a product or site
- Vendor - an external supplier or partner providing products or services
- License Type - lookup classifying licenses (e.g., perpetual, subscription, site, concurrent)
- License Status - lookup tracking license lifecycle (e.g., active, expired, pending renewal)
- Vendor Status - lookup tracking vendor relationship state (e.g., active, inactive, under review)
- SLA Status - lookup tracking SLA lifecycle (e.g., active, expired, in negotiation)

## Depends on Core

This domain references the following Core types:

- Product
- Deployment Site
- Organization

Load the core schema before importing this domain.

## Setup

Validate the domain against core:

```bash
node tools/validate.js --schema schema/core --domain schema/domains/licensing
```
