/**
 * ServiceNow class mapping for cmdb-kit types.
 *
 * Maps every cmdb-kit type name to a ServiceNow table, name field,
 * and attribute mappings. Three tiers:
 *
 *   Tier 1: OOTB ServiceNow tables (no custom table creation needed)
 *   Tier 2: Custom CI classes extending cmdb_ci (u_cmdbk_* under cmdb_ci)
 *   Tier 3: Custom standalone tables (u_cmdbk_* not under cmdb_ci)
 *
 * Attribute maps use { localKey: snColumnName } for OOTB tables.
 * Custom tables auto-convert camelCase to snake_case when no explicit
 * mapping is provided.
 *
 * Usage:
 *   const { getClassMap, getMapping, getAllMappings } = require('./class-map');
 */

// ---------------------------------------------------------------------------
// install_status value mappings (SN uses integers)
// ---------------------------------------------------------------------------
const INSTALL_STATUS = {
  'Active': '1',
  'Retired': '7',
  'In Development': '2',
  'In Maintenance': '6',
  'Absent': '100',
  'Installed': '1',
  'On Order': '101',
  'In Stock': '102',
  'In Transit': '103',
};

// ---------------------------------------------------------------------------
// Helper: generate table name from cmdb-kit type name
// ---------------------------------------------------------------------------
function customTable(prefix, typeName) {
  const slug = typeName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return `${prefix}_${slug}`;
}

function lookupTable(prefix, typeName) {
  // Abbreviate common suffixes to keep table names short
  const slug = typeName.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  return `${prefix}_${slug}`;
}

// ---------------------------------------------------------------------------
// Build the complete class map
// ---------------------------------------------------------------------------
function getClassMap(tablePrefix = 'u_cmdbk') {
  const map = {};

  // =========================================================================
  // TIER 1: OOTB ServiceNow tables
  // =========================================================================

  // Product is a custom CI class, not cmdb_ci_appl. ServiceNow's Application
  // class requires a hosting relationship to hardware (independent=false).
  // Product is an independent entity you build and deliver.
  map['Product'] = {
    tier: 2,
    table: `${tablePrefix}_product`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      productType: { column: `${tablePrefix}_product_type`, ref: `${tablePrefix}_product_status` },
      technology: `${tablePrefix}_technology`,
      version: `${tablePrefix}_version`,
      owner: { column: 'assignment_group', ref: 'sys_user_group' },
      status: { column: 'install_status', transform: INSTALL_STATUS },
      // Inherited from cmdb_ci
      environment: 'environment',
      company: { column: 'company', ref: 'core_company' },
      location: { column: 'location', ref: 'cmn_location' },
      assignedTo: { column: 'assigned_to', ref: 'sys_user' },
    },
  };

  map['Server'] = {
    tier: 1,
    table: 'cmdb_ci_server',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    attrMap: {
      description: 'short_description',
      hostname: 'host_name',
      ipAddress: 'ip_address',
      operatingSystem: { column: 'os', transform: 'splitOs' },
      cpu: { column: 'cpu_name', transform: 'splitCpu' },
      ram: { column: 'ram', transform: 'parseRam' },
      storage: { column: 'disk_space', transform: 'parseDiskSpace' },
      classification: 'classification',
      manufacturer: { column: 'manufacturer', ref: 'core_company' },
      modelId: { column: 'model_id', ref: 'cmdb_model' },
      serialNumber: 'serial_number',
      virtual: 'virtual',
      // Inherited from cmdb_ci
      environment: 'environment',
      company: { column: 'company', ref: 'core_company' },
      location: { column: 'location', ref: 'cmn_location' },
      assignedTo: { column: 'assigned_to', ref: 'sys_user' },
      assignmentGroup: { column: 'assignment_group', ref: 'sys_user_group' },
    },
  };

  // Database is a custom CI class. ServiceNow's cmdb_ci_database requires
  // a Contains relationship to cmdb_ci_cloud_database (independent=false).
  map['Database'] = {
    tier: 2,
    table: `${tablePrefix}_database`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      databaseEngine: `${tablePrefix}_db_engine`,
      version: `${tablePrefix}_db_version`,
      server: { column: `${tablePrefix}_db_server`, ref: 'cmdb_ci_server' },
      storageSize: `${tablePrefix}_storage_size`,
      port: `${tablePrefix}_port`,
      instanceName: `${tablePrefix}_instance_name`,
      // Inherited from cmdb_ci
      environment: 'environment',
      company: { column: 'company', ref: 'core_company' },
      location: { column: 'location', ref: 'cmn_location' },
      assignedTo: { column: 'assigned_to', ref: 'sys_user' },
      assignmentGroup: { column: 'assignment_group', ref: 'sys_user_group' },
    },
  };

  map['Hardware Model'] = {
    tier: 1,
    table: 'cmdb_hardware_product_model',
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'short_description',
      manufacturer: 'manufacturer',
      modelNumber: 'model_number',
      cpu: 'u_cpu',
      ram: 'u_ram',
      storage: 'u_storage',
      formFactor: 'u_form_factor',
    },
  };

  map['Network Segment'] = {
    tier: 1,
    table: 'cmdb_ci_ip_network',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    attrMap: {
      description: 'short_description',
      networkType: 'u_network_type',
      cidr: 'u_cidr',
      vlan: 'u_vlan',
      gateway: 'u_gateway',
    },
  };

  // Virtual Machine is a custom CI class. ServiceNow's cmdb_ci_vm_instance
  // requires a hosting relationship (independent=false).
  map['Virtual Machine'] = {
    tier: 2,
    table: `${tablePrefix}_virtual_machine`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      hostname: 'host_name',
      server: { column: `${tablePrefix}_host_server`, ref: 'cmdb_ci_server' },
      operatingSystem: { column: 'os', transform: 'splitOs' },
      cpu: { column: 'cpu_name', transform: 'splitCpu' },
      ram: { column: 'ram', transform: 'parseRam' },
      // Inherited from cmdb_ci
      environment: 'environment',
      company: { column: 'company', ref: 'core_company' },
      location: { column: 'location', ref: 'cmn_location' },
      assignedTo: { column: 'assigned_to', ref: 'sys_user' },
      assignmentGroup: { column: 'assignment_group', ref: 'sys_user_group' },
    },
  };

  map['License'] = {
    tier: 1,
    table: 'alm_license',
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'short_description',
      licenseType: 'u_license_type',
      vendor: { column: 'vendor', ref: 'core_company' },
      expirationDate: 'end_date',
      quantity: 'quantity',
      status: 'u_status',
    },
  };

  map['Change Request'] = {
    tier: 1,
    table: 'change_request',
    nameField: 'number',
    autoName: true,
    isCi: false,
    attrMap: {
      description: 'short_description',
      changeType: 'type',
      impact: 'impact',
      requestedBy: { column: 'requested_by', ref: 'sys_user' },
      requestDate: 'opened_at',
      status: 'state',
    },
  };

  map['Incident'] = {
    tier: 1,
    table: 'incident',
    nameField: 'number',
    autoName: true,
    isCi: false,
    attrMap: {
      description: 'short_description',
      severity: 'severity',
      status: 'state',
      reportedBy: { column: 'caller_id', ref: 'sys_user' },
      reportDate: 'opened_at',
      resolvedDate: 'resolved_at',
      affectedProduct: { column: 'cmdb_ci', ref: 'cmdb_ci_appl' },
    },
  };

  map['SLA'] = {
    tier: 1,
    table: 'contract_sla',
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'short_description',
      product: { column: 'cmdb_ci', ref: 'cmdb_ci_appl' },
      status: 'u_status',
      targetUptime: 'u_target_uptime',
      responseTime: 'u_response_time',
      reviewDate: 'u_review_date',
    },
  };

  map['Organization'] = {
    tier: 1,
    table: 'core_company',
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'notes',
      orgType: 'u_org_type',
      website: 'website',
      parentOrganization: { column: 'parent', ref: 'core_company' },
      phone: 'phone',
      city: 'city',
      state: 'state',
      country: 'country',
      zip: 'zip',
    },
  };

  map['Vendor'] = {
    tier: 1,
    table: 'core_company',
    nameField: 'name',
    isCi: false,
    vendorFlag: true,
    attrMap: {
      description: 'notes',
      website: 'website',
      contactEmail: 'u_contact_email',
      status: 'u_vendor_status',
      contractExpiry: 'u_contract_expiry',
      phone: 'phone',
      city: 'city',
      state: 'state',
      country: 'country',
      zip: 'zip',
    },
  };

  map['Team'] = {
    tier: 1,
    table: 'sys_user_group',
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'description',
      organization: { column: 'company', ref: 'core_company' },
      teamLead: { column: 'manager', ref: 'sys_user' },
    },
  };

  // Person is a custom standalone table, NOT sys_user. CMDB-Kit Person records
  // represent external contacts, site POCs, and deployment stakeholders, not
  // ServiceNow platform users. Mapping to sys_user conflates CMDB data with
  // the platform's user directory and creates conflicts with LDAP/SSO provisioning.
  map['Person'] = {
    tier: 3,
    table: `${tablePrefix}_person`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: `${tablePrefix}_description`,
      firstName: `${tablePrefix}_first_name`,
      lastName: `${tablePrefix}_last_name`,
      email: `${tablePrefix}_email`,
      role: `${tablePrefix}_role`,
      team: { column: `${tablePrefix}_team`, ref: 'sys_user_group' },
      phone: `${tablePrefix}_phone`,
    },
  };

  map['Location'] = {
    tier: 1,
    table: 'cmn_location',
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'street',
      address: 'street',
      city: 'city',
      country: 'country',
      locationType: 'u_location_type',
    },
  };

  // =========================================================================
  // TIER 2: Custom CI classes extending cmdb_ci
  // =========================================================================

  map['Product Component'] = {
    tier: 2,
    table: `${tablePrefix}_product_component`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      componentType: { column: `${tablePrefix}_comp_type`, ref: `${tablePrefix}_component_type` },
      repository: `${tablePrefix}_source_repo`,
      technology: `${tablePrefix}_technology`,
      owner: { column: `${tablePrefix}_owner`, ref: 'sys_user_group' },
    },
  };

  map['Feature'] = {
    tier: 2,
    table: `${tablePrefix}_feature`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      version: { column: 'u_version', ref: `${tablePrefix}_product_version` },
      status: 'u_status',
      owner: { column: 'u_owner', ref: 'sys_user_group' },
    },
  };

  map['Assessment'] = {
    tier: 2,
    table: `${tablePrefix}_assessment`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      assessmentType: 'u_assessment_type',
      assessmentDate: 'u_assessment_date',
      status: 'u_status',
      assessor: { column: 'u_assessor', ref: 'sys_user' },
      findings: 'u_findings',
    },
  };

  // =========================================================================
  // TIER 3: Custom standalone tables
  // =========================================================================

  // --- Product Library types ---

  map['Product Version'] = {
    tier: 3,
    table: `${tablePrefix}_product_version`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      versionNumber: 'u_version_number',
      releaseDate: 'u_release_date',
      status: 'u_status',
      components: { column: 'u_components', multi: true, ref: `${tablePrefix}_product_component` },
      previousVersion: { column: 'u_previous_version', ref: `${tablePrefix}_product_version` },
    },
  };

  map['Document'] = {
    tier: 3,
    table: `${tablePrefix}_document`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      documentType: 'u_document_type',
      state: 'u_state',
      author: { column: 'u_author', ref: 'sys_user' },
      publishDate: 'u_publish_date',
      url: 'u_url',
    },
  };

  map['Deployment'] = {
    tier: 3,
    table: `${tablePrefix}_deployment`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      version: { column: 'u_version', ref: `${tablePrefix}_product_version` },
      environment: 'u_environment',
      deployDate: 'u_deploy_date',
      status: 'u_status',
      deployedBy: { column: 'u_deployed_by', ref: 'sys_user' },
    },
  };

  map['Baseline'] = {
    tier: 3,
    table: `${tablePrefix}_baseline`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      baselineType: 'u_baseline_type',
      version: { column: 'u_version', ref: `${tablePrefix}_product_version` },
      status: 'u_status',
      approvalDate: 'u_approval_date',
    },
  };

  map['Documentation Suite'] = {
    tier: 3,
    table: `${tablePrefix}_doc_suite`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      version: { column: 'u_version', ref: `${tablePrefix}_product_version` },
      documents: { column: 'u_documents', multi: true, ref: `${tablePrefix}_document` },
      state: 'u_state',
    },
  };

  map['Product Media'] = {
    tier: 3,
    table: `${tablePrefix}_product_media`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      version: { column: 'u_version', ref: `${tablePrefix}_product_version` },
      fileName: 'u_file_name',
      fileSize: 'u_file_size',
      checksum: 'u_checksum',
    },
  };

  map['Product Suite'] = {
    tier: 3,
    table: `${tablePrefix}_product_suite`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      version: { column: 'u_version', ref: `${tablePrefix}_product_version` },
      media: { column: 'u_media', multi: true, ref: `${tablePrefix}_product_media` },
    },
  };

  map['Certification'] = {
    tier: 3,
    table: `${tablePrefix}_certification`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      certificationType: 'u_certification_type',
      status: 'u_status',
      issueDate: 'u_issue_date',
      expirationDate: 'u_expiration_date',
      issuingBody: 'u_issuing_body',
    },
  };

  map['Deployment Site'] = {
    tier: 3,
    table: `${tablePrefix}_deployment_site`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      location: { column: 'u_location', ref: 'cmn_location' },
      status: 'u_status',
      environment: 'u_environment',
      goLiveDate: 'u_go_live_date',
    },
  };

  map['Distribution Log'] = {
    tier: 3,
    table: `${tablePrefix}_distribution_log`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      version: { column: 'u_version', ref: `${tablePrefix}_product_version` },
      site: { column: 'u_site', ref: `${tablePrefix}_deployment_site` },
      distributionDate: 'u_distribution_date',
      distributedBy: { column: 'u_distributed_by', ref: 'sys_user' },
    },
  };

  map['Facility'] = {
    tier: 3,
    table: `${tablePrefix}_facility`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      location: { column: 'u_location', ref: 'cmn_location' },
      facilityType: 'u_facility_type',
      capacity: 'u_capacity',
    },
  };

  // --- Lookup Types ---
  // All lookup types get custom tables with name + description columns

  const LOOKUP_TYPES = [
    'Product Status',
    'Version Status',
    'Deployment Status',
    'Environment Type',
    'Document Type',
    'Document State',
    'Component Type',
    'Priority',
    'Organization Type',
    'Deployment Role',
    'Change Type',
    'Change Impact',
    'Incident Severity',
    'Incident Status',
    'Certification Type',
    'Certification Status',
    'Assessment Type',
    'Assessment Status',
    'Network Type',
    'Baseline Type',
    'Baseline Status',
    'License Type',
    'License Status',
    'Site Status',
    'Vendor Status',
    'SLA Status',
  ];

  for (const typeName of LOOKUP_TYPES) {
    map[typeName] = {
      tier: 3,
      table: lookupTable(tablePrefix, typeName),
      nameField: 'name',
      isCi: false,
      isLookup: true,
      attrMap: {
        description: 'u_description',
      },
    };
  }

  // =========================================================================
  // Container types (not imported, structure only)
  // =========================================================================
  map['Product CMDB'] = { tier: 0, table: null, nameField: null, isCi: false, container: true };
  map['Product Library'] = { tier: 0, table: null, nameField: null, isCi: false, container: true };
  map['Directory'] = { tier: 0, table: null, nameField: null, isCi: false, container: true };
  map['Lookup Types'] = { tier: 0, table: null, nameField: null, isCi: false, container: true };

  return map;
}

/**
 * Get a single type mapping. Returns null if not found.
 */
function getMapping(typeName, tablePrefix) {
  const map = getClassMap(tablePrefix);
  return map[typeName] || null;
}

/**
 * Get all mappings.
 */
function getAllMappings(tablePrefix) {
  return getClassMap(tablePrefix);
}

/**
 * Get all importable type names (non-container types with tables).
 */
function getImportableTypes(tablePrefix) {
  const map = getClassMap(tablePrefix);
  return Object.keys(map).filter(name => map[name].table && !map[name].container);
}

module.exports = { getClassMap, getMapping, getAllMappings, getImportableTypes, INSTALL_STATUS };
