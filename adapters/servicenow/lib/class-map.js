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

  // Scoped app tables (x_cmdbk_*) use clean column names (product_type).
  // Global scope tables (u_cmdbk_*) use prefixed column names (u_cmdbk_prod_type).
  const isScoped = tablePrefix.startsWith('x_');
  function col(scopedName, globalName) {
    return isScoped ? scopedName : globalName;
  }

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
      productType: col('product_type', `${tablePrefix}_prod_type`),
      technology: col('technology', `${tablePrefix}_tech_stack`),
      version: col('version', `${tablePrefix}_prod_version`),
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
      databaseEngine: col('engine_type', `${tablePrefix}_engine_type`),
      version: col('db_version', `${tablePrefix}_ver`),
      server: { column: col('host_server', `${tablePrefix}_host_server`), ref: 'cmdb_ci_server' },
      storageSize: col('storage_size', `${tablePrefix}_store_size`),
      port: col('port', `${tablePrefix}_db_port`),
      instanceName: col('instance_name', `${tablePrefix}_inst_name`),
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
      affectedProduct: { column: 'cmdb_ci', ref: `${tablePrefix}_product` },
    },
  };

  map['SLA'] = {
    tier: 1,
    table: 'contract_sla',
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'short_description',
      product: { column: 'cmdb_ci', ref: `${tablePrefix}_product` },
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
      description: col('description', `${tablePrefix}_description`),
      firstName: col('first_name', `${tablePrefix}_first_name`),
      lastName: col('last_name', `${tablePrefix}_last_name`),
      email: col('email', `${tablePrefix}_email`),
      role: col('role', `${tablePrefix}_role`),
      team: { column: col('team', `${tablePrefix}_team`), ref: 'sys_user_group' },
      phone: col('phone', `${tablePrefix}_phone`),
      isUser: col('is_user', `${tablePrefix}_is_user`),
      userAccount: { column: col('user_account', `${tablePrefix}_user_account`), ref: 'sys_user' },
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
      componentType: { column: col('component_type', `${tablePrefix}_comp_type`), ref: `${tablePrefix}_component_type` },
      repository: col('source_repo', `${tablePrefix}_source_repo`),
      technology: col('technology', `${tablePrefix}_technology`),
      owner: { column: col('owner', `${tablePrefix}_owner`), ref: 'sys_user_group' },
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
      product: { column: col('product', `${tablePrefix}_product`), ref: `${tablePrefix}_product` },
      version: { column: col('version', `${tablePrefix}_version`), ref: `${tablePrefix}_product_version` },
      status: col('status', `${tablePrefix}_status`),
      owner: { column: col('owner', `${tablePrefix}_owner`), ref: 'sys_user_group' },
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
      assessmentType: col('assessment_type', `${tablePrefix}_assessment_type`),
      assessmentDate: col('assessment_date', `${tablePrefix}_assessment_date`),
      status: col('status', `${tablePrefix}_status`),
      assessor: { column: col('assessor', `${tablePrefix}_assessor`), ref: 'sys_user' },
      findings: col('findings', `${tablePrefix}_findings`),
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
      author: { column: 'u_author', ref: `${tablePrefix}_person` },
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
    // Enterprise lookup types
    'Baseline Milestone',
    'Site Type',
    'Site Workflow Status',
    'Upgrade Status',
    'Service Type',
    'Capability Status',
    'Disposition',
    'Library Item Type',
    'Distribution Status',
    'Delivery Method',
    'Media Urgency',
    'Transfer Status',
    'Build Status',
    'Sunset Reason',
    'Implementation Status',
    'Requirement Type',
    'Requirement Status',
    'Requirement Priority',
    'Verification Method',
    'Contract Status',
    'Disposal Method',
    'Media Type',
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
  const CONTAINERS = [
    'Product CMDB', 'Product Library', 'Directory', 'Lookup Types',
    // Enterprise containers
    'Ovoco Portfolio CMDB', 'OvocoCRM CMDB', 'OvocoAnalytics CMDB',
    'Shared Services CMDB', 'Ovoco Library', 'OvocoCRM Library',
    'OvocoAnalytics Library', 'Shared Library',
    'Enterprise Architecture', 'Configuration Library', 'Financial',
  ];
  for (const name of CONTAINERS) {
    map[name] = { tier: 0, table: null, nameField: null, isCi: false, container: true };
  }

  // =========================================================================
  // Enterprise: Standalone types
  // =========================================================================

  map['Site'] = {
    tier: 3,
    table: `${tablePrefix}_site`,
    nameField: 'name',
    isCi: false,
    attrMap: {},
  };

  map['Requirement'] = {
    tier: 3,
    table: `${tablePrefix}_requirement`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      requirementType: 'u_requirement_type',
      status: 'u_status',
      priority: 'u_priority',
      verificationMethod: 'u_verification_method',
    },
  };

  map['Library Item'] = {
    tier: 3,
    table: `${tablePrefix}_library_item`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      itemType: 'u_item_type',
      version: 'u_version',
      status: 'u_status',
    },
  };

  map['Contract'] = {
    tier: 3,
    table: `${tablePrefix}_contract`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      vendor: { column: 'u_vendor', ref: 'core_company' },
      startDate: 'u_start_date',
      endDate: 'u_end_date',
      value: 'u_value',
      status: 'u_status',
    },
  };

  map['Cost Category'] = {
    tier: 3,
    table: `${tablePrefix}_cost_category`,
    nameField: 'name',
    isCi: false,
    attrMap: {
      description: 'u_description',
      parent: { column: 'u_parent', ref: `${tablePrefix}_cost_category` },
    },
  };

  // =========================================================================
  // Enterprise: EA types (custom CI classes)
  // =========================================================================

  map['Service'] = {
    tier: 2,
    table: `${tablePrefix}_service`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      serviceType: col('service_type', `${tablePrefix}_service_type`),
      owner: { column: 'assignment_group', ref: 'sys_user_group' },
      status: { column: 'install_status', transform: INSTALL_STATUS },
    },
  };

  map['Capability'] = {
    tier: 2,
    table: `${tablePrefix}_capability`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      parentCapability: { column: col('parent_capability', `${tablePrefix}_parent_cap`), ref: `${tablePrefix}_capability` },
      owner: { column: 'assignment_group', ref: 'sys_user_group' },
      status: { column: 'install_status', transform: INSTALL_STATUS },
    },
  };

  map['Business Process'] = {
    tier: 2,
    table: `${tablePrefix}_business_process`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
      owner: { column: 'assignment_group', ref: 'sys_user_group' },
    },
  };

  map['Information Object'] = {
    tier: 2,
    table: `${tablePrefix}_information_object`,
    superClass: 'cmdb_ci',
    nameField: 'name',
    isCi: true,
    cmdbApi: true,
    identificationAttributes: ['name'],
    attrMap: {
      description: 'short_description',
    },
  };

  // =========================================================================
  // Enterprise: Product-prefixed types
  // =========================================================================
  // Each product line (CR=OvocoCRM, AN=OvocoAnalytics, SS=Shared Services)
  // gets its own set of types mirroring the base schema.

  function prefixedCiType(prefix, baseName, table, attrMap) {
    map[`${prefix} ${baseName}`] = {
      tier: 2,
      table: `${tablePrefix}_${prefix.toLowerCase()}_${table}`,
      superClass: 'cmdb_ci',
      nameField: 'name',
      isCi: true,
      cmdbApi: true,
      identificationAttributes: ['name'],
      attrMap: { description: 'short_description', ...attrMap },
    };
  }

  function prefixedStandaloneType(prefix, baseName, table, attrMap) {
    map[`${prefix} ${baseName}`] = {
      tier: 3,
      table: `${tablePrefix}_${prefix.toLowerCase()}_${table}`,
      nameField: 'name',
      isCi: false,
      attrMap: attrMap || {},
    };
  }

  for (const prefix of ['CR', 'AN']) {
    // CI types
    prefixedCiType(prefix, 'Product', 'product', {
      status: { column: 'install_status', transform: INSTALL_STATUS },
      owner: { column: 'assignment_group', ref: 'sys_user_group' },
    });
    prefixedCiType(prefix, 'Server', 'server', {});
    prefixedCiType(prefix, 'Hardware Model', 'hardware_model', {});
    prefixedCiType(prefix, 'Network Segment', 'network_segment', {});
    prefixedCiType(prefix, 'Product Component', 'product_component', {});
    prefixedCiType(prefix, 'Virtual Machine', 'virtual_machine', {});
    prefixedCiType(prefix, 'Assessment', 'assessment', {});
    prefixedCiType(prefix, 'License', 'license', {});
    prefixedCiType(prefix, 'Feature', 'feature', {});
    prefixedCiType(prefix, 'Feature Implementation', 'feature_impl', {});
    prefixedCiType(prefix, 'Component Instance', 'component_instance', {});

    // Library types
    prefixedStandaloneType(prefix, 'Product Version', 'product_version', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Baseline', 'baseline', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Document', 'document', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Documentation Suite', 'doc_suite', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Product Media', 'product_media', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Product Suite', 'product_suite', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Certification', 'certification', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Deployment Site', 'deployment_site', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Distribution Log', 'distribution_log', { description: 'u_description' });

    // Site assignment types
    prefixedStandaloneType(prefix, 'Site Location Assignment', 'site_location', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Site Org Relationship', 'site_org_rel', { description: 'u_description' });
    prefixedStandaloneType(prefix, 'Site Personnel Assignment', 'site_personnel', { description: 'u_description' });
  }

  // Shared Services types
  prefixedCiType('SS', 'Product', 'product', {
    status: { column: 'install_status', transform: INSTALL_STATUS },
  });
  prefixedCiType('SS', 'Server', 'server', {});
  prefixedCiType('SS', 'Virtual Machine', 'virtual_machine', {});
  prefixedCiType('SS', 'Network Segment', 'network_segment', {});
  prefixedCiType('SS', 'Hardware Model', 'hardware_model', {});
  prefixedCiType('SS', 'Assessment', 'assessment', {});
  prefixedCiType('SS', 'License', 'license', {});
  prefixedStandaloneType('SS', 'Document', 'document', { description: 'u_description' });
  prefixedStandaloneType('SS', 'Certification', 'certification', { description: 'u_description' });

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
