# CMDB-Kit Documentation - Complete Outline

This outline reflects the actual structure and headings of all documentation
files as they exist today.


# User Guide


## Part 1: CMDB Concepts (7 chapters)

### 01-00 Getting Started

- Prerequisites
- Choose a Schema Layer
- Validate the Schema
- Explore the Example Data
- Import into a Database
  - JSM Assets (Cloud or Data Center)
  - ServiceNow CMDB
  - Other Platforms
- Replace Example Data
- Generate CSV Templates
- Next Steps

### 01-01 CMDB Fundamentals

- What a CMDB Is and Why It Matters
  - The Difference Between a CMDB and an Inventory Spreadsheet
  - Configuration Items vs Assets
  - Relationships as First-class Data
- ITIL 4 Service Configuration Management
  - The CMS and Where a CMDB Fits
  - Configuration Management Activities
- The Problem CMDB-Kit Solves
  - Months of Schema Design Eliminated
  - Database-agnostic Schema
  - Version-controlled Schema as Code
- When You Need a CMDB vs When a Spreadsheet Is Fine
  - Indicators That You Have Outgrown Spreadsheets
  - Cost of Not Having a CMDB

### 01-02 CI Selection

- What Makes Something a Configuration Item
  - The ITIL Definition
  - CIs Must Be Individually Identifiable, Subject to Change, and Manageable
  - Industry and Government Standards for CI Designation
- Positive Indicators for CI Designation
  - Critical Technology
  - Independent End-use Function
  - Shared Across Products
  - Defined Interface Boundary
  - Interchangeability Requirements
  - Separate Delivery
  - Separate Test Requirements
  - High Risk or Cost
  - Separate Maintenance (Spare Stocking Rule)
- Negative Indicators (Reasons Not to Designate as a CI)
  - No Independent Identity
  - No Separate Change Control Needed
  - No Separate Delivery or Maintenance
  - Tracking Adds No Value
  - Already Tracked in Another System
  - No Customer or Accreditor Visibility Need
  - Reference or Lookup Data (Not a CI)
- CI Designation Cost Analysis
  - Overhead Impact on CCB, Baselines, and Audits
  - When the Cost of Tracking Exceeds the Value
- Scoping Criteria
  - Start With What Supports Your Critical Services
  - The "Would an Outage Here Cause a P1?" Test
  - Breadth vs Depth
- The CMDB-Kit Type Catalog as a Selection Menu
  - Walking Through the 55 Extended Types as Candidates
  - Base Schema (20 Types) as a Minimum Viable CMDB
  - Extended Schema (55 Types) for Mature Organizations
  - Library vs Engineering CMDB: When Each Is Used
- What Not to Put in the CMDB
  - Ephemeral Resources
  - Data Better Tracked in Other Systems
  - Avoiding CI Sprawl
- Decision Framework
  - Decision Tree: The Five-question Flowchart
  - Ownership, Change Frequency, and Stakeholders
  - Mapping CIs to the Services They Support
  - Documenting Decisions
- Practical Exercise
  - Starting From a Service Map
  - Using the OvocoCRM Example

### 01-03 Taxonomy Design

- What a CMDB Taxonomy Is
  - The Classification System for Your CI Types
  - Why Hierarchy Matters
- Configuration Management Theory
  - Product Lifecycle Phases: Development, Introduction, Growth, Maturity, Decline
  - CM's Role in Managing Product Evolution
  - Design Reuse vs Common Design Decisions
  - Mass Customization and Its CM Implications
- The Four-branch Hierarchy
  - Product CMDB
  - Product Library
  - Directory
  - Lookup Types
- How to Decide What Is a CI Type vs a Lookup Type vs an Attribute
  - Rule of Thumb: Lifecycle and Attributes
  - Fixed Lists of Values as Lookup Types
  - Properties as Attributes
- Parent-child Relationships
  - When to Nest Types Under a Parent vs Keeping Them Flat
  - Inheritance Implications
  - How schema-structure.json Parent Field Works
- Product-specific Type Prefixes
  - When to Use Product Prefixes
  - Shared Types vs Product-specific Types
  - Organizing Multi-product Schemas
- Base Schema vs Extended Schema
  - When to Start With Base and Grow
  - When to Start With Extended and Trim
  - Side-by-side Comparison
- Extending the Taxonomy With Custom Types
  - The 5-step Process
  - Worked Example: Adding a Service Type
- Naming Conventions
  - Title Case for Type Names
  - camelCase for Attribute Names
  - kebab-case for Data File Names
- Real-world Examples
  - How OvocoCRM Models a SaaS Product
  - Tracing a Single Feature From Requirement Through Deployment

### 01-04 Service Management Design

- Mapping Your Service Management Processes to CMDB Types
  - Not Every Team Needs Every Type
  - Start With the Processes You Actually Run
- Change Enablement
  - Change Request, Change Type, Change Impact Types
  - How Change Records Reference Affected CIs
  - Standard, Normal, and Emergency Change Models
- Incident Management
  - Incident, Incident Severity, Incident Status Types
  - Linking Incidents to Affected Applications
  - Using the CMDB for Impact Analysis
- Service Level Management
  - SLA Type and Application Linking
  - Target Uptime and Response Time Attributes
  - SLA Status Lifecycle
- Release Management
  - Product Version, Baseline, Deployment Types
  - The Release Lifecycle
  - How Versions Reference Components and Previous Versions
- IT Asset Management
  - License, Vendor, Hardware Model Types
  - License Tracking
  - Vendor Relationship Management
- How the Schemas Map to ITIL 4 Practices
  - Cross-reference With ITIL Practices
  - CSDM Domain Alignment
- Designing for Your Actual Processes
  - Worksheet: List Processes, Map to Types
  - Identifying Gaps
  - Identifying Types You Can Skip

### 01-05 Lookup Types and Reference Data

- Why Status Values Are Separate Object Types
  - Shared Reference Tables
  - Consistency Across CIs
  - Adding Descriptions to Explain Usage
- How Lookup Types Work in CMDB-Kit
  - JSON Format: Name and Description
  - How the Import Script Resolves Lookup References
  - Case Sensitivity
- Designing Your Own Lookup Types
  - Naming Pattern
  - When to Create a New Lookup Type vs Adding Values
  - Keeping Lookup Values Minimal and Well-described
- The Complete Lookup Type Catalog
  - Status Lookups
  - Classification Lookups
  - Other Lookups
  - Which Lookup Types Pair With Which CI Types
  - Default Values Provided in the Example Data

### 01-06 Configuration Management Operations

- CM Department Structure
  - The Four Pillars of CM
  - Role Definitions
- Change Control Governance Bodies
  - Product Configuration Control Boards
  - Strategic Delivery Body
  - Joint CM Working Group
  - Interface Control Working Group
- Change Classification
  - Class I Changes (Form, Fit, Function)
  - Class II Changes (Implementation Details)
  - Impact Assessment Methodology
- Baseline Management Process
  - Creating Baselines
  - Locking Baselines
  - Documenting Baselines
  - Baseline Audit and Verification
- Emergency Change Procedures
  - Go/No-go Decision Criteria
  - Expedited Approval Workflows


## Part 2: Schema Design (3 chapters)

### 02-01 Building the Product Library

- What the Product Library Branch Is
  - The Release Management Side of the CMDB
  - What It Tracks
- Product Version as the Anchor
  - Every Release Starts With a Product Version Record
  - Version Numbering Conventions
  - Linking Versions to Components
  - Version Chains With previousVersion References
- Documentation Suite
  - Grouping Documents Into Versioned Packages
  - Linking Documentation to the Version It Covers
  - Document Lifecycle and Document State Values
- Document Types and Release Requirements
  - Document Type Codes and Their Meanings
  - Required Documents Per Product Release
  - Standard Practice Documents
  - Version-to-document Mapping
- Baselines
  - What a Configuration Baseline Is
  - Baseline Type and Baseline Status Values
  - When to Create a Baseline
- Certifications
  - Tracking Compliance Certifications Against Versions
  - Certification Type, Status, Issuing Body, Expiration
  - Compliance Requirements Per Product
- Documentation Completeness Audit
  - Checking All Required Documents Exist Per Version
  - Document Type Checklist
  - Identifying Missing or Draft Documents Before Release
- Building a Complete Release Record
  - Walkthrough: From Version Through Baseline to Deployment
  - The OvocoCRM Example Release Lifecycle

### 02-02 Definitive Media Library

- What the DML Is
  - ITIL Concept: The Secure Store of Authorized Software
  - How CMDB-Kit Models This
- DML Architecture
  - Three-tier Model: Knowledge (Confluence), Catalog (JSM Assets), Storage (DML)
  - Drive Structure and Shared Storage Layout
  - Product-specific Shares and Folder Organization
- Folder Organization
  - Version-based Directory Structure
  - Component Folders Within Each Version
  - Archive Patterns for Superseded Releases
  - Category-based Directory Structure
- Product Media
  - Recording Downloadable Artifacts and Binaries
  - Attributes: Version, File Name, File Size, Checksum
  - One Media Record Per Deliverable Artifact
  - Integrity Verification With Checksums
  - Digest Files: SHA-256 and SHA-512 Checksum Management
- File Naming Standards
  - Standard Format: PRODUCT-DOCTYPE-DESCRIPTOR-VERSION-DATE.ext
  - Document Type Codes and Their Meanings
  - Version Format Rules
  - Software Media Naming and Build Identifiers
- Release Designation System
  - GOLD Releases
  - General Corrections (GC1, GC2)
  - Temporary Releases (TR1 Through TR9)
- Product Suite
  - Bundling Multiple Media Items Into a Distribution Package
  - When to Use a Suite vs Individual Media Records
  - Linking Suites to the Version They Deliver
- Document Tracking
  - CI Relationship Web
  - Document CI Attributes
  - Document Lifecycle
- Media Intake Process
  - Required Metadata Per Submission
- File Verification Workflow
  - Renaming to Standard Conventions
  - Moving to Controlled Storage
  - Tracking on the DML
- Media Delivery Workflow
  - From Build Artifact to Product Media Record
  - Packaging Media Into a Product Suite
  - Recording the Delivery With a Distribution Log Entry
- Distribution Log
  - The Audit Trail
  - Attributes: Version, Site, Distribution Date, Distributed By
  - Why This Record Matters for Compliance and Rollback
- DML Hygiene and Auditing
  - Common Data Quality Issues: Abandoned Files, Corrupted Artifacts, Duplicates
  - Naming Violations and Misplaced Files
  - Cleanup Process: Archival, Deletion, Reorganization
  - Preventive Controls: Intake Rigor, Validation on Upload
  - Content Classification for Migration
- End-to-end Example
  - OvocoCRM v2.3.1: Build, Package, Distribute, Log

### 02-03 Designing Site Deployments

- The Two Record Types
  - Site: The Shared Identity Record
  - Deployment Site: The Product-specific Record
  - Why the Split Matters
- Site as a Shared Identity
  - A Site Has Only a Name
  - Sites Live in the Shared Library
  - All Product Libraries Reference the Same Site Records
  - Adding a New Customer Means Adding One Site Record
- Deployment Site as a Product Record
  - Each Product Library Has Its Own Deployment Sites
  - Deployment Site References a Site
  - Product-specific Attributes: Version, Classification, Network Domains, Seats
  - Deployment Site Status and Workflow Progress
  - Teams and Dates per Deployment Site
- Related Record Types
  - Site Location Assignment
  - Site Org Relationship
  - Site Personnel Assignment
  - Support Team
- Designing Your Site Model
  - One Site Per Customer vs Per Region vs Per Environment
  - Matching Sites to Your Actual Infrastructure Topology
  - When a Site Is a Deployment Site vs a Location vs a Facility
- Site Status Lifecycle
  - Planned, Active, Decommissioned
  - Tracking Go-live Dates
- Deployments
  - Recording Which Version Is Deployed to Which Environment
  - Deployment Status Lifecycle
  - The Relationship Chain: Product Version to Deployment to Environment Type
- Linking Sites to Deployments
  - Distribution Log as the Bridge
  - Tracking Which Sites Have Which Version
  - Identifying Sites Behind on Updates
- Environment Types
  - Development, Staging, Production, DR
  - Designing Your Environment Hierarchy
  - How Environments Relate to Sites and Deployments
- Multi-product Patterns
  - Multiple Product Libraries Sharing the Same Site Records
  - Per-product Deployment Sites With Different Attributes
  - Cross-product Deployment Views for a Single Customer
  - Tracking Per-tenant Version Status
  - The OvocoCRM Example: Regional Deployments


## Part 3: Platform Setup (5 chapters)

### 03-01 JSM Assets Setup

- Why CMDB-Kit Does Things Differently
  - Lookup types: the key difference
  - Why this matters
- Prerequisites
  - JSM instance
  - Credentials
  - Local tools
  - An empty object schema
- Creating an Empty Schema in JSM
- Understanding the Schema Hierarchy
- How Lookup Types Work
  - Adding a new status value
  - Lookup types in the schema definition
- Environment Setup
  - Using a .env file
  - Cloud configuration
  - Data Center configuration
  - All variables
  - Choosing a schema layer
- Running the Import
  - Step 1: Validate locally
  - Step 2: Schema sync
  - Step 3: Data sync
  - Step 4: Review the output
- Verifying the Result
  - Post-import validation
  - Schema check
  - Browsing in the JSM UI
- Replacing Example Data with Your Own
  - Option 1: Edit JSON directly
  - Option 2: CSV/Excel workflow
  - Tips for replacing data
- Data Center Differences
  - DC prerequisites
  - DC schema creation
  - How Cloud vs DC routing works
- API References
  - Cloud
  - Data Center
- Next Steps

### 03-02 Atlassian Implementation Patterns

- Tool Responsibility Matrix
  - Assets Track What Is, Issues Track What Needs to Happen
  - What Belongs in Each Tool
  - Data Flow Between Tools
- Multi-Product Schema Design in JSM Assets
  - Product-Prefixed Type Strategy
  - Schema Hierarchy for Multi-Product
  - Shared Types vs Product-Specific Types
  - Extending CMDB-Kit's Schema Files for Multi-Product
- Portal Request Types
  - Portal Architecture
  - Media Distribution Request
  - Change Request
  - Problem Report
  - Site Registration
  - Site Upgrade Request
  - Site Decommission Request
  - Document Request
  - Other Request Types
- Custom Fields Configuration
  - The Tiered Dependency Model
  - Creating an Assets Custom Field
  - Cascade Filtering With AQL
  - Object Attributes on Issue View
  - Portal Visibility Settings
  - Complete Field Reference
- AQL Query Library
  - AQL Fundamentals
  - Field Scoping Queries (Cascading Selects)
  - Operational Dashboard Queries
  - Data Quality Queries
  - Version Compliance Queries
  - HAVING Queries for Relationship Audits
  - AQL in JQL (Hybrid Queries)
- Workflows
  - Request Type Workflows
  - The CCB Integration Pattern
  - Status-to-CMDB Synchronization
  - Multi-Level Approval Patterns
- ScriptRunner Automation
  - Auto-Generate Unique Identifiers
  - Auto-Populate Originator Data
  - Calculated Fields (Hours Rollup)
  - Status History Tracking
  - Bidirectional Relationship Maintenance
  - Notification for Restricted Records
  - Archive Processing (Scheduled Job)
  - Workflow Validators
- Automation Rules
  - Request Routing Rules
  - SLA Configuration
  - CMDB Auto-Update Rules
  - Notification Rules
  - Scheduled Data Quality Checks
  - Upgrade Campaign Automation
- Dashboards and Queues
  - Agent Queues
  - CM Operations Dashboard
  - CCB Review Dashboard
  - Version Compliance Dashboard
  - Support Dashboard
  - AQL Gadgets for Dashboards
- Jira Issue Types and Field Mapping
  - Issue Type Architecture
  - Fields per Issue Type
  - Issue Link Types
- Confluence Integration
  - Documentation Space Structure
  - Linking Confluence Pages to Assets Objects
  - Library Item Tracking
  - Templates
- Putting It All Together
  - Implementation Sequence
  - Common Mistakes
  - Troubleshooting
  - The OvocoCRM Multi-Product Example

### 03-03 Wiki Structure

- The Three-tier Documentation Model
  - Why a Wiki Pairs With the CMDB
  - Documentation as Part of the CMS
- Recommended Workspace Structure
  - Dedicated CMDB Documentation Area
  - Child Pages Mirroring the Four-branch Taxonomy
  - Separate Sections for Runbooks, SOPs, and Training
- Page Hierarchy Matching the CMDB Taxonomy
  - Top-level Pages for Each Branch
  - Sub-pages for Each CI Type
  - Per-CI Pages for Critical Infrastructure
- Library Item Tracking
  - Structured Metadata on Wiki Pages
  - Tracking Controlled Documents as Library Items
  - Controlled Deliverables and Their Wiki Pages
- Linking Wiki Pages to CMDB Records
  - Embedding Live CI Data
  - Linking From a CI Record to Its Wiki Page
  - Bidirectional Traceability
- Templates for CI Documentation Pages
  - Standard Page Template
  - Lookup Type Documentation Template
  - Service Documentation Template
- Document Review Workflow
  - Connecting the Wiki, Work Tracker, and CMDB
  - Linking Reviews to Document Pages
  - Comment Resolution Tracking
- Runbook and SOP Page Structure
  - Operational Runbooks Linked to CIs
  - Standard Operating Procedures for CMDB Tasks
  - Incident Response Pages Linked to Affected Applications
- Tagging and Cross-referencing
  - Tag Conventions
  - Using Tags to Create Cross-cutting Views
- Keeping the Wiki in Sync With the Live CMDB
  - Review Cadence
  - Automation Options
  - Detecting Documentation Drift
  - Wiki-DML Boundary Audit
- Confluence with JSM Assets
  - Assets Macros for Live CMDB Data
  - AQL Queries in Documentation and Runbooks
  - Page Properties for Document Tracking
  - Labels for Cross-cutting Views
  - Jira Integration for Document Reviews
  - Automation Rules
- Other Wiki Platforms

### 03-04 ServiceNow Setup

- How CMDB-Kit Maps to ServiceNow
  - ServiceNow's native CMDB model
  - The three-tier type mapping
  - Lookup types in ServiceNow
- Prerequisites
  - ServiceNow instance
  - Credentials
  - Local tools
- Environment Setup
  - Table prefix
  - Choosing a schema layer
- Running the Import
  - Step 1: Test connectivity
  - Step 2: Validate locally
  - Step 3: Schema sync
  - Step 4: Data sync
  - Step 5: Review the output
- Verifying the Result
  - Post-import validation
  - Schema check
  - Browsing in the ServiceNow UI
- Replacing Example Data with Your Own
- Troubleshooting
- Next Steps

### 03-05 Other Platforms

- Supported Adapters
- Options to Explore
  - Relational databases
  - Commercial CMDBs
  - Graph databases
  - Data analysis
- Building a Custom Adapter


## Part 4: Day-to-Day (5 chapters)

### 04-01 Personnel Management

- Modeling Personnel in the CMDB
  - When Personnel Data Belongs in the CMDB vs HR Systems
  - The Directory Branch: Organization, Team, Person
  - Person as the Link Between People and CIs
- Posts and Positions
  - What a Post Is (a Role That Needs Filling, Not a Person)
  - Modeling Posts as a CI Type
  - Linking Posts to Teams and Organizations
  - Tracking Post Status (Vacant, Filled, Frozen)
  - Mapping People to Posts (Person to Post Reference)
  - Succession Planning: Deputy and Acting Assignments
- Certifications and Qualifications
  - Using the Certification Type for Personnel Qualifications
  - Professional Certifications (PMP, ITIL, CISSP, Cloud Certs)
  - Tracking Certification Expiration and Renewal Dates
  - Linking Certifications to Persons
  - Certification Status Lifecycle (Active, Expiring, Expired, Renewed)
  - Reporting on Certification Coverage Across Teams
- Security Clearances
  - Modeling Clearances as a CI Type or Extending Certification
  - Clearance Levels and How to Represent Them as Lookup Values
  - Tracking Clearance Grant Date, Expiration, and Sponsoring Organization
  - Linking Clearances to Persons and Posts
  - Posts That Require Specific Clearance Levels
  - Clearance Status Lifecycle (Pending, Active, Suspended, Expired, Revoked)
- Role-based CI Ownership
  - Assigning CI Ownership to Posts Rather Than People
  - Why Post-based Ownership Survives Staff Turnover
  - Tracking Who Is Responsible for What Across the CMDB
- Extending the Schema for Personnel
  - Adding a Post Type to the Directory Branch
  - Adding a Clearance Type or Extending Certification
  - Updating LOAD_PRIORITY for New Personnel Types
- Practical Examples
  - Modeling an Operations Team With Posts, People, and Clearances
  - Tracking Certification Gaps Before an Audit
  - The OvocoCRM Example: Team Structure and Qualifications

### 04-02 Requirements Management With Features

- Using the Feature Type for Requirements
  - What a Feature Record Represents
  - Attributes: Description, Version, Status, Owner
  - Using Version Status Values to Track Feature Lifecycle
- Requirement Types and Hierarchy
  - Program Requirements (Top-level)
  - Derived Requirements (Decomposition)
  - Interface Requirements
  - Test Requirements
- Requirement Lifecycle
  - Draft, Approved, Implemented, Verified, Closed States
  - Immutable Audit Records Per Release
- Linking Features to Versions
  - A Feature References the Product Version It Will Ship In
  - Tracking Which Features Are in Which Release
  - Feature Status as a Release Readiness Indicator
- Traceability
  - Traceability Link Types: Implements, Satisfies, Verifies, Derives, Documents
  - Tracing Requirements Back to External Sources and Standards
  - Bidirectional Traceability From Requirement to Deployment
- Designing a Requirements Workflow
  - Capturing Requirements as Feature Records
  - Assigning Features to Teams
  - Tracking Feature Status Through the Development Lifecycle
  - Using the CMDB to Answer "What Shipped in Version X?"
- Baseline and Version Management
  - Snapshot Requirements at Milestones
  - Hybrid Container and Leaf Structure
  - Depends On vs Dependents: Decomposition vs Cross-cutting
- Integration With Change Management
  - Linking Features to Change Requests
  - Traceability: Requirement to Feature to Change to Deployment
- Integration With Test Management
  - Linking Test Cases to Requirements
  - Coverage Reporting
- Extending for Detailed Requirements
  - When the Base Feature Type Is Enough
  - Adding Custom Attributes
  - Adding Custom Types
  - Keeping It Pragmatic

### 04-03 Data Entry and Maintenance

- JSON Editing Workflow
  - Direct Editing of Data Files
  - JSON Syntax Rules and Common Pitfalls
  - Using Validation to Catch Errors Before Import
- CSV and Excel Workflow
  - Generating CSV Templates
  - Template Columns Match Schema Attributes
  - Filtering Templates by Role or Family
  - Filling Templates in a Spreadsheet
  - Converting Back to JSON
  - When CSV Is Better Than Direct JSON Editing
  - End-to-End CSV Checklist
- Reference Value Consistency
  - Exact Name Matching
  - Case Sensitivity
  - Common Mistakes
- Adding, Updating, and Removing CI Records
  - Adding: Append to the Array
  - Updating: Find by Name and Modify Attributes
  - Removing: Delete the Object, Check References First
  - Never Include Key or id Fields
- Bulk Data Operations
  - Using CSV Workflow for Large Batches
  - Scripting JSON Transformations
- Documentation Quality Standards
  - Completeness Audit Methodology
  - Document Type Requirements by Product
  - Archive and Obsolescence Procedures
- Validation Before Every Import
  - Always Run tools/validate.js Before Importing
  - Fix All Errors Before Running the Import Script

### 04-04 Validation and Troubleshooting

- Offline Validation With tools/validate.js
  - Running Validation
  - Schema Structure Integrity
  - Attribute Definitions
  - Data File Existence
  - Data Field Alignment
  - Reference Resolution
  - LOAD_PRIORITY Coverage
  - LOAD_PRIORITY Ordering
  - Naming Convention Compliance
  - Duplicate Detection
- Post-import Validation With validate-import.js
  - Comparing Imported vs Expected
  - Identifying Records That Failed Silently
- Schema Drift Detection With check-schema.js
  - Comparing Repo Schema to Target Database
  - Detecting Manual Changes
- Common Errors and Their Fixes
  - Reference Not Found
  - Unknown Attribute
  - Type Not in LOAD_PRIORITY
  - Dependency Order Violation
  - Duplicate Name
- The Debugging Checklist
  - Is the Type in LOAD_PRIORITY?
  - Does the JSON File Name Match the Type Name Convention?
  - Are All Referenced Objects Imported First?
  - Do Field Names Match schema-attributes.json?
  - Are Reference Values Exact Matches?
  - Is the JSON Valid?
  - Does the Data File Use the Correct Format?

### 04-05 DML Operations

- Document Review Reporting
  - DRR Workflow
  - Review Cycle Management
  - Comment Resolution Tracking
- Document Lifecycle on the DML
- Intake Processing
  - Required Metadata
  - Artifact Type Taxonomy
  - Additional Requirements by Artifact Type
  - Submission Methods
  - Intake Form Template
  - Processing Steps
  - Rejection Criteria
  - Email Templates
  - Common Mistakes
- Operational Checklists
  - DML-CMDB Consistency
  - Document Review Compliance
  - Wiki-DML Boundary
  - Naming and Organization


## Part 5: Governance (4 chapters)

### 05-01 Portfolio and Shared Services Management

- Managing the CMDB Across a Program Portfolio
  - One CMDB Schema vs Per-program Schemas
  - Modeling Programs as Organizational Units
  - Scoping CI Ownership to Programs
  - Cross-program Dependencies and Shared CIs
  - Portfolio-level Reporting From the CMDB
- Managing the CMDB Within a Shared Services Department
  - Shared Services as the CMDB Custodian
  - Separating Shared Infrastructure From Program-specific CIs
  - Modeling Shared Services in the Directory Branch
  - Service Catalog Alignment for Shared Services
  - Intake Process for New CI Types Requested by Programs
  - Access Control and Ownership Boundaries
- When to Use a Global Lookup
  - What Makes a Lookup Global vs Program-specific
  - Global Lookups: Values That Must Be Consistent Across All Programs
  - Program-specific Lookups: Values That Only One Program Needs
  - Decision Criteria for Global vs Scoped Lookups
  - Managing Global Lookup Changes Across Consumers
  - Governance for Adding Values to Global Lookups
- Practical Patterns
  - A Shared Services Team Running One Schema for Multiple Programs
  - A Program Team Extending the Shared Schema With Program-specific Types
  - Keeping Shared Lookups in Sync Across Multiple Schema Directories
  - The OvocoCRM Example: Shared Platform Team and Product Teams

### 05-02 Enterprise Architecture

- What Enterprise Architecture Means for the CMDB
  - The UAF as an EA Template for the CMDB
  - UAF Viewpoints and How They Map to Configuration Management
  - The CMDB as the Single Source of Truth for EA Artifacts
- UAF Grid and CMDB-Kit Branches
  - Personnel Viewpoint to Directory Branch
  - Resources Viewpoint to Product CMDB Branch
  - Services Viewpoint and Service Modeling
  - Projects Viewpoint and Release Management
  - Standards Viewpoint and Lookup Types
- Mapping UAF Domains to CMDB-Kit Types
  - Strategic Domain: Capabilities and Services
  - Operational Domain: Processes and Activities
  - Services Domain: Applications, Components, and Infrastructure
  - Personnel Domain: Organizations, Teams, and Persons
  - Resources Domain: Servers, Databases, Networks, and Hardware
- Service Modeling
  - Defining Business Services and Technical Services
  - Mapping Services to Applications, Components, and Infrastructure
  - Service Dependencies and Impact Chains
  - Using References to Build the Service Model
- Capability Mapping
  - What a Business Capability Is in UAF Terms
  - Linking Capabilities to Applications and Teams
  - When to Add a Capability Type to the Schema
  - Keeping Capability Maps Aligned With the CMDB
- Application Portfolio Management
  - Using Application Status for Lifecycle Planning
  - TIME Classification (Tolerate, Invest, Migrate, Eliminate)
  - Technology Radar: Tracking Technology Choices Across Applications
  - Vendor and License Data as Portfolio Inputs
- Integration Patterns
  - The CMDB as EA Repository vs Feeding a Separate EA Tool
  - Export Workflows for UAF-compliant Tools
  - Keeping EA Views in Sync With Operational Reality
- Extending the Schema for EA
  - Adding Custom Types for UAF Artifacts (Capability, Business Process, Information Object)
  - Adding EA-specific Attributes to Existing Types
  - Balancing EA Detail With Operational Simplicity

### 05-03 Scaling and Governance

- Data Quality Practices
  - Defining Data Quality Standards
  - Mandatory vs Optional Fields Per Type
  - Automated Validation as a Quality Gate
- Data Hygiene Auditing
  - Audit Methodology and Framework
  - Common Data Quality Issues
  - Cleanup Process: Archival, Deletion, Reorganization
  - Preventive Controls
- Ownership and Accountability
  - Assigning CI Ownership to Teams
  - Data Steward Roles
  - Who Approves Schema Changes
- Review Cadence
  - How Often to Audit the CMDB
  - Using Export and Diff Tools to Detect Drift
  - Scheduled Validation Runs
- Performance Considerations for Large Schemas
  - Import Time Scaling With Record Count
  - Reference Resolution Performance
  - When to Split Schemas
- Backup and Recovery
  - Export Before Import as a Safety Practice
  - Git History as a Recovery Mechanism

### 05-04 IT Asset Management Lifecycle

- Six-phase Asset Lifecycle
  - Request and Initiation
  - Requirements and Design
  - Acquisition and Build
  - Fielding and Fulfillment
  - Monitor
  - Sunset and Disposal
- ITAM Data Model Alignment
  - Attributes Needed at Each Phase
  - Organization, Location, and Person Data Across Phases
  - Status Transitions Through the Lifecycle
- Financial and Compliance Integration
  - License Tracking Across the Lifecycle
  - Contract Linkage
  - Cost Attribution to CIs
- Discovery and Reconciliation
  - Automated Discovery Sources
  - Reconciling Discovered Assets With CMDB Records
  - Handling Orphaned and Rogue Assets
- Compliance Frameworks
  - Audit Readiness
  - Category Management
  - Regulatory Requirements for Asset Tracking
- Mapping the Lifecycle to CMDB-Kit Types
  - License, Vendor, and Hardware Model at Each Phase
  - Using Application Status to Track Lifecycle Position
  - Extending the Schema for Lifecycle-specific Attributes


## Part 6: Deployment Lifecycle (4 chapters)

### 06-01 Site Lifecycle and Enterprise Model

- The Full Lifecycle
  - Pre-planning Phases
  - Planning Phases
  - Deployment Phases
  - Operational Phases
  - Closed Phase
- The Three-status Data Model
  - Site Status
  - Workflow Status
  - Upgrade Status
  - How the Three Statuses Interact
- Phase Ownership Across the Enterprise
  - Business Development
  - Engineering
  - Operations and Maintenance
  - Configuration Management
  - PMO
- When to Use a Separate Pipeline System
- Pipeline Schema Design
  - Object Type Hierarchy
  - Pipeline Lookup Types
  - Deployment Site Attributes in the Pipeline

### 06-02 Pre-deployment Pipeline

- Pipeline Tracker Setup
  - Issue Types
  - Workflows
  - Task Checklists
  - Templated Responses
  - Board View
  - Dashboards
- Managing the Pipeline
  - Creating Records on First Contact
  - Advancing Workflow Status
  - Linking Issues to Asset Records
- Prospecting and Qualification
  - Initial Contact
  - Qualifying the Prospect
  - Handling Stalls
- Site Survey and Engineering
  - Facility Assessment
  - Network Diagrams and Documents
  - Engineering Handoff
- Handoff Preparation
  - Checklist Verification
  - Field Validation
  - CM Notification
  - Closing the Pipeline Issue
- Pipeline Reporting
  - Pipeline by Product
  - Stalled Sites
  - Seat Counts
  - Time-in-stage Analysis
- Automation Rules

### 06-03 Deployment Handoff

- Migration Triggers
- Migration Steps
  - Export From the Pipeline
  - Import to the Production CMDB
  - Post-migration Verification
- Data Mapping
  - Fields That Transfer Directly
  - Fields That Require Translation
  - Fields That Exist Only in Production
- Cross-team Coordination
  - Business Development Closes the Pipeline
  - CM Creates Production Records
  - Engineering Picks Up at Ready to Install
- Go-live Process
  - Installation
  - Testing
  - Cutover to Operational

### 06-04 Upgrade and Distribution Operations

- Upgrade Campaign Management
  - Upgrade Status Lifecycle
  - Running a Campaign
  - Campaign Tracking Dashboards
  - Cross-system Notification for Air-gapped Environments
- Media Distribution Tracking
  - Distribution Log Workflow
  - Creating Distribution Log Records
  - Delivery Methods
  - Risk Flags
- Site Version Tracking
  - Three Version References
  - Version Update Sequence
  - Version Parity Reporting
- Contact Management
  - Role Types at Deployment Sites
  - sitePOC Attribute vs Full Personnel Assignments
  - Keeping Contacts Current


# Developer Manual


## Part 1: Project Internals (3 chapters)

### 01-01 File Naming and Project Structure

- Repository Layout
  - schema/
  - adapters/
  - tools/
  - docs/
  - src/
- Schema Directory Structure
  - schema-structure.json
  - schema-attributes.json
  - data/
- Data File Naming Convention
  - Type Name to kebab-case
  - How the Import Script Resolves File Names to Type Names
- Document File Naming Standard
  - Standard Format: PRODUCT-DOCTYPE-DESCRIPTOR-VERSION-DATE.ext
  - Document Type Codes and Their Meanings
  - Version Format Rules
  - Date Format (YYYYMMDD)
  - Software Media Naming Conventions
- Product-specific Naming Standards
  - Example Product A File Naming
  - Example Product B File Naming
  - Common Patterns Across Products
- JSON Data Formats
  - Flat Format: Top-level Array of Objects
  - Nested Format: Object With Type Name as Key
  - When Each Format Is Used
  - Field Names Match schema-attributes.json
- Adding New Files When Extending the Schema
  - Create the Data File After Adding the Type
  - File Must Follow the kebab-case Convention
  - Empty Arrays for Types With No Data Yet
- Keeping Base and Extended Schemas in Sync
  - Schema Layers as Strict Supersets
  - When to Backport Changes
  - Validation Checks That Catch Drift

### 01-02 Schema Reference

- Schema Hierarchy
  - Base Layer (20 types)
  - Extended Layer (adds 35 types)
- CI Types
  - Application
  - Server
  - Database
  - Product Component
  - Product Version
  - Document
  - Deployment
  - Organization
  - Team
  - Person
- Extended CI Types
  - Hardware Model
  - Network Segment
  - Virtual Machine
  - License
  - Assessment
  - Feature
  - Baseline
  - Change Request
  - Incident
  - SLA
- Lookup Types
  - Base Lookups
  - Extended Lookups

### 01-03 Schema Changes and Version Control

- Git Workflow for Schema Changes
  - Separate Schema Commits From Data Commits
  - Commit Message Conventions
- Adding New Types
  - Step 1: Add to schema-structure.json
  - Step 2: Add Attributes to schema-attributes.json
  - Step 3: Add to LOAD_PRIORITY
  - Step 4: Create Data JSON File
  - Step 5: Run Validation
  - Worked Example: Adding a Problem Type
- Modifying Existing Types
  - Adding New Attributes
  - Removing Attributes
  - Changing Attribute Types
- Promoting Changes Across Environments
  - Development to Staging to Production
  - Using Git Branches or Tags
  - Re-running the Import After Schema Changes
- Rollback Strategy
  - Git Revert for Schema Changes
  - Keeping the Previous Import State
  - Export Before Import as a Safety Net


## Part 2: Extending (3 chapters)

### 02-01 Writing Custom Adapters

- Adapter Structure
- Required Scripts
  - import.js
  - export.js
  - validate-import.js
- Using Shared Libraries
- Configuration Pattern
- Data File Resolution
- Import Order
- Reference Resolution
- Error Handling
- Example: Minimal Adapter

### 02-02 System Integration Patterns

- Assets vs Issues: The Core Principle
  - Assets Track What Is (Persistent State)
  - Issues Track What Needs to Happen (Temporary Work)
  - Decision Matrix: Where Each Item Type Belongs
- Common Integration Scenarios
  - New Site Deployment: CI Persists After Epic Closes
  - Media Distribution: Request Closes, Distribution Log Persists
  - Software Release: Version CI With Multi-site Deployments
  - Incident to CI Linkage
  - Change Request to Affected CI Mapping
- Linking Patterns
  - Asset Fields in Jira Issues
  - Jira Issue References in Asset Records
  - Bidirectional Traceability
- AQL Fundamentals
  - Operators: Equals, Not Equals, IN, LIKE, IS EMPTY
  - Comparison Operators for Dates and Numbers
  - Functions: startOfDay, now, currentUser
  - Relationship Functions: inboundReferences, outboundReferences
  - HAVING Clause for Relationship Counting
  - Dot Notation for Traversal
- AQL Query Patterns
  - Finding Objects by Status
  - Finding Objects by Relationship
  - Component Hierarchy Queries
  - Gap Detection Queries
  - Capacity and Coverage Reporting
  - Multi-product Views
- Portability
  - Using Object Type Names Instead of Numeric IDs
  - Writing Queries That Survive Schema Changes
- Dashboard Integration
  - AQL in JQL Filters
  - AQL Gadgets for Dashboards
  - Real-time CMDB Views in Jira
- Cross-System Reporting
  - The Export-and-Join Pattern
  - Reporting Across Products
- Anti-Duplication Principles
  - What Not to Create
  - The Automation Imperative
- Putting It Together: The OvocoCRM Example

### 02-03 Air-Gapped and Offline Deployment

- Deployment Scenarios
  - Connected Environments
  - Air-gapped and Classified Environments
  - When Each Applies
- Import Method Comparison
  - Method 1: ScriptRunner Groovy Scripts
  - Method 2: Portable Node.js Package
  - Method 3: cURL and REST API
  - Choosing the Right Method
- ScriptRunner Import
  - Groovy Script Structure for Schema Import
  - Groovy Script Structure for Data Import
  - Configuration: Auth, JSM Paths, and Logging
  - Running Scripts in the ScriptRunner Console
- Portable Package Import
  - Building the Portable Package
  - Import Directory Setup and Permissions
  - Running the Import Offline
- Media Transfer Procedures
  - Encrypted USB and Physical Media Procedures for Disconnected Networks
  - Classification Marking Requirements
  - Chain of Custody Documentation
- Verification After Import
  - Spot-checking Imported Objects
  - Relationship Validation
  - Comparing Expected vs Actual Record Counts
  - Handling Import Failures in Offline Environments
