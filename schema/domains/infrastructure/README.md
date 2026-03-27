# Infrastructure

For SRE, Platform Ops, network engineers, and data center managers who need to track physical and virtual infrastructure across deployment sites.

## Questions This Domain Answers

- What hardware models are approved for use?
- What virtual machines run at each site?
- What network segments exist and how are they organized?
- What facilities host deployments?

## Types

- Hardware Model - approved hardware platforms with specifications and lifecycle status
- Virtual Machine - compute instances running on servers at deployment sites
- Network Segment - logical or physical network divisions within a facility
- Location - geographic location for facilities and sites
- Facility - physical data center or hosting location
- Network Type - lookup classifying network segments (e.g., production, management, DMZ)

## Depends on Core

This domain references the following Core types:

- Server
- Database
- Deployment Site
- Environment Type

Load the core schema before importing this domain.

## Setup

Validate the domain against core:

```bash
node tools/validate.js --schema schema/core --domain schema/domains/infrastructure
```
