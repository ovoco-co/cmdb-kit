#!/usr/bin/env bash
#
# CMDB Kit Data Backup
#
# Creates a timestamped backup of a schema's data/ directory.
#
# Usage:
#   tools/backup-data.sh [--schema <dir>]
#
# Options:
#   --schema <dir>   Schema directory to back up (default: schema/base)
#
# Example:
#   tools/backup-data.sh
#   tools/backup-data.sh --schema schema/base
#
# Backups are stored in .backups/ at the project root.
#   e.g. .backups/base-data-2026-02-25T12-30-00/

set -euo pipefail

# Resolve project root (parent of tools/)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Defaults
SCHEMA_DIR="schema/base"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --schema)
      SCHEMA_DIR="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: tools/backup-data.sh [--schema <dir>]"
      echo ""
      echo "Options:"
      echo "  --schema <dir>   Schema directory to back up (default: schema/base)"
      echo ""
      echo "Creates a timestamped backup of the data/ subdirectory."
      echo "Backups are stored in .backups/ at the project root."
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run with --help for usage." >&2
      exit 1
      ;;
  esac
done

# Resolve paths
SCHEMA_ABS="${PROJECT_ROOT}/${SCHEMA_DIR}"
DATA_DIR="${SCHEMA_ABS}/data"

if [[ ! -d "$DATA_DIR" ]]; then
  echo "Error: Data directory not found: ${DATA_DIR}" >&2
  exit 1
fi

# Derive a label from the schema directory name
SCHEMA_LABEL="$(basename "$SCHEMA_ABS")"

# Create timestamp (filesystem-safe: colons replaced with hyphens)
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%S)"

BACKUP_DIR="${PROJECT_ROOT}/.backups/${SCHEMA_LABEL}-data-${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

# Copy data files
cp -a "$DATA_DIR"/. "$BACKUP_DIR"/

# Count what was backed up
FILE_COUNT="$(find "$BACKUP_DIR" -type f | wc -l)"

echo "Backup complete"
echo "  Source:  ${DATA_DIR}"
echo "  Dest:    ${BACKUP_DIR}"
echo "  Files:   ${FILE_COUNT}"
