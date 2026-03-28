# Distribution

For CM librarians, media custodians, and shipping coordinators who need to track what was delivered to each site and in what form.

## Questions This Domain Answers

- What media was delivered to each site?
- What is the distribution status for a given delivery?
- What documentation suite ships with each version?
- What product suites bundle multiple deliverables?

## Types

- Distribution Log - a record of media or documentation delivered to a deployment site
- Product Media - physical or digital media containing a product version (e.g., ISO, DVD, download package)
- Product Suite - a bundle of related products delivered together as a single package
- Documentation Suite - a collection of documents that ships with a product version

## Depends on Core

This domain references the following Core types:

- Product Version
- Deployment Site
- Person
- Document
- Document State

Load the core schema before importing this domain.

## Setup

Validate the domain against core:

```bash
node tools/validate.js --schema schema/core --domain schema/domains/distribution
```
