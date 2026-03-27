# Compliance

For security teams, accreditation staff, and ISSMs who need to track security assessments and certification status across products and deployment sites.

## Questions This Domain Answers

- What certifications exist for this version?
- What security assessments have been conducted?
- What is the assessment status for a given deployment?
- What ATO applies to a site or product?

## Types

- Assessment - a security or compliance evaluation conducted against a deployment or product version
- Certification - a formal accreditation or authorization granted to a product or site
- Assessment Type - lookup classifying assessments (e.g., vulnerability scan, audit, penetration test)
- Assessment Status - lookup tracking assessment lifecycle (e.g., planned, in progress, complete)
- Certification Type - lookup classifying certifications (e.g., ATO, IATT, FedRAMP)
- Certification Status - lookup tracking certification lifecycle (e.g., active, expired, revoked)

## Depends on Core

This domain references the following Core types:

- Product
- Product Version
- Deployment Site
- Person

Load the core schema before importing this domain.

## Setup

Validate the domain against core:

```bash
node tools/validate.js --schema schema/core --domain schema/domains/compliance
```
