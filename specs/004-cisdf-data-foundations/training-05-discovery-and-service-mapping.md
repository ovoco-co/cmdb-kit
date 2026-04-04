# Discovery and Service Mapping

## Discovery Configuration

### MID Server

The MID Server is a lightweight Java application installed on a server inside your network. It acts as a proxy between your ServiceNow instance (in the cloud) and your on-premises infrastructure. Discovery probes run through the MID Server to reach devices that are not directly accessible from the internet.

**Installation requirements**:
- A dedicated server (physical or VM) with network access to the devices you want to discover
- Java Runtime Environment (JRE) 11 or later
- Outbound HTTPS (port 443) to your ServiceNow instance
- Inbound access is NOT required (MID Server polls the instance, not the other way around)
- The service account running the MID Server needs local admin rights on Windows or root/sudo on Linux

**MID Server status**: After installation, the MID Server appears in **MID Server > Servers**. It must show status "Up" and validation state "Validated" before it can be used. If validation fails, check:
- Can the MID Server reach the instance URL?
- Is the MID Server user account active in ServiceNow with the `mid_server` role?
- Are there firewall rules blocking outbound HTTPS?

**High availability**: For production environments, install two or more MID Servers in a cluster. ServiceNow distributes work across cluster members. If one MID Server goes down, the others pick up the load.

### Discovery Credentials

Discovery needs credentials to log into devices and read their configuration. Navigate to **Discovery > Credentials** to manage them.

Credential types:
- **SSH** - for Linux/Unix servers. Username + password or username + SSH private key.
- **Windows (WMI/PowerShell)** - for Windows servers. Domain\username + password. Requires WMI and/or WinRM enabled on targets.
- **SNMP** - for network devices (switches, routers, firewalls). Community string (v1/v2c) or username + auth/priv passwords (v3).
- **VMware** - for vCenter/ESXi. Username + password for the vSphere API.
- **CIM** - for storage devices. Username + password for CIM/SMI-S providers.

**Credential affinity**: You can bind credentials to specific MID Servers or IP ranges so that the right credentials are used for the right network segment. This prevents credential lockouts from failed authentication attempts against the wrong devices.

**Credential testing**: After creating a credential, test it from **Discovery > Credentials > Test Credential**. Select a target IP, MID Server, and credential type. The system attempts to connect using the credential and reports success or failure.

**Security**: Credentials are encrypted at rest in ServiceNow. The MID Server decrypts them only when executing a probe. Never store credentials in plain text outside ServiceNow.

### Discovery Schedules

A Discovery Schedule defines what to scan, when, and how. Navigate to **Discovery > Discovery Schedules**.

**Creating a schedule**:
1. Name: "Production Server Discovery - Weekly"
2. MID Server: Select the MID Server or cluster to use
3. Type: IP Range, CI Group, or Single IP
4. IP ranges: Enter CIDR ranges (e.g., 10.0.1.0/24) or IP lists
5. Exclusion list: IPs to skip (e.g., network appliances that crash when probed)
6. Schedule: Frequency (daily, weekly, monthly), time window, timezone
7. Discovery type: Network only (ping sweep) or Configuration (full device interrogation)

**Quick Discovery vs. full Discovery**: Quick Discovery does a fast scan for new devices (ICMP ping + basic classification). Full Discovery connects to each device, reads configuration, and updates all CI attributes. Quick is useful for initial population; full is for ongoing maintenance.

**Shazzam probes**: The initial probe sent to discover what a device is. It tries multiple protocols (SSH, WMI, SNMP) to determine the device type and OS. Based on the result, ServiceNow sends the appropriate classification and exploration probes.

### Discovery Patterns

Patterns are the rules that tell Discovery how to explore a specific device type and extract CI data. Navigate to **Discovery > Patterns**.

ServiceNow ships with hundreds of OOTB patterns for common platforms (Linux, Windows, VMware, Cisco IOS, Palo Alto, NetApp, etc.). Each pattern defines:
- What commands to run on the device (e.g., `cat /proc/cpuinfo`, `wmic os get caption`)
- How to parse the output into CI attributes
- What relationships to create (e.g., server contains network adapters)

**Never modify OOTB patterns**. If you need to customize, clone the pattern and modify the clone. OOTB patterns are updated by ServiceNow during upgrades.

**Custom patterns**: For devices that don't have OOTB support (custom appliances, IoT devices), you can create patterns using the Pattern Designer. This is a visual tool for defining discovery steps.

### Discovery Troubleshooting

**ECC Queue**: All communication between the instance and MID Server goes through the ECC Queue (**MID Server > ECC Queue**). Each Discovery probe creates an "output" record (command sent to MID Server) and an "input" record (response from MID Server). If Discovery fails, check the ECC Queue for errors.

**Discovery Log**: Navigate to **Discovery > Discovery Log** for a record of what happened during each Discovery run. Filter by schedule, device, or status to find failures.

**Device History**: On any CI, the "Discovery" related list shows the history of Discovery scans for that device: when it was last discovered, what changed, and any errors.

**Common issues**:
- "No MID Server available": The selected MID Server is down or not validated
- "Credential failure": Wrong username/password, or the credential type doesn't match the device
- "Connection timeout": Firewall blocking the protocol, device is offline, or wrong IP
- "Classification failed": Device responded but ServiceNow can't determine what it is. May need a custom pattern.
- "Duplicate CI created": Discovery classified the device into a different class than expected, creating a second CI

## Service Mapping

Service Mapping discovers application-to-infrastructure dependencies automatically. While Discovery scans individual devices bottom-up, Service Mapping traces connections top-down starting from an application entry point.

### How Service Mapping Works

1. You define an **entry point** (a URL, TCP port, or tagged resource)
2. Service Mapping connects to the entry point and identifies the application
3. It traces network connections from that application to other processes, servers, databases, and load balancers
4. It creates CIs for each discovered component and "Runs on" / "Depends on" relationships between them
5. The result is an **Application Service** (cmdb_ci_service_discovered) with a full dependency map

### Entry Point Types

| Type | Example | How It Discovers |
|---|---|---|
| URL | https://app.company.com | HTTP connection to load balancer, traces to web servers, then to app servers, then to databases |
| TCP Connection | 10.0.1.50:8080 | Connects to the port, identifies the process, traces its connections |
| Tag-based | AWS tag: app=payroll | Queries cloud provider API for resources with matching tags |
| CI-based | Existing Business Application CI | Uses the CI as the starting point and maps its dependencies |

### Application Service vs Business Service

These are different CSDM entities:

- **Application Service** (cmdb_ci_service_discovered): The technical runtime. "The payroll application as it runs on servers X, Y, Z with database D." Created automatically by Service Mapping. Shows the actual infrastructure dependency graph.
- **Business Service** (cmdb_ci_service): The business-facing service. "Payroll processing for HR." Created manually by business stakeholders. Represents what the business consumes, regardless of how it is implemented.

The link between them is a relationship: Business Service "Depends on" Application Service. This is the bridge between business impact and technical reality.

### Why Service Mapping Matters for CMDB Administration

Service Mapping generates the relationships that make the CMDB operationally valuable. Without it:
- Impact analysis cannot trace from a failed server to affected business services
- Change risk assessment cannot determine which services a server change affects
- Incident routing cannot automatically identify the responsible team for an application outage

With it:
- A server outage immediately shows "these 3 business services are affected"
- A proposed change shows "this change impacts 500 users of the payroll service"
- An application team can see every infrastructure component their application depends on


