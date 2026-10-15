# RAK Services UI5

Combined SAPUI5 frontend for RAK digital services:

- **ZP02** — New Building Permit
- **ZP03** — Infrastructure NOC (Modify first; other journeys reserved)

Namespace: `rak.services`

## Requirements

- Node.js 18+
- UI5 CLI 4.x
- SAPUI5 1.120.14 (`sap_horizon`)

## Scripts

```bash
npm install
npm start
npm run build
```

## Entry / routing

Local catalogue: `#/` (Home)

ZP02 and ZP03 are **independent** journeys. Do not navigate from ZP02 into ZP03.

### ZP02

- `#/zp02/new-building-permit`
- `#/zp02/new-building-permit/project-selection`
- … through payment / confirmation / drawing-upload

### ZP03 Modify

- `#/zp03/modify-infrastructure-noc`
- `#/zp03/modify-infrastructure-noc/select-noc`
- `#/zp03/modify-infrastructure-noc/details`
- `#/zp03/modify-infrastructure-noc/work-location`
- `#/zp03/modify-infrastructure-noc/attachments`
- `#/zp03/modify-infrastructure-noc/review`
- `#/zp03/modify-infrastructure-noc/confirmation`

## Architecture

```
Controller → Module Service Facade → Mock / OData Adapter → Mock JSON or SAP OData
```

- Shared UI/utilities only under `webapp/service/common` and `webapp/control`
- ZP02 business logic stays under `webapp/service/zp02`
- ZP03 business logic stays under `webapp/service/zp03`

## Sources

- Working ZP02 implementation migrated from this project's pre-combined webapp (OData ongoing)
- Tooling reference: `C:\React\Final-projects\rak-zp02-ui5`
- Original ZP02 folder is not modified
- `C:\React\rak-zp03` was not present at migration time
- Pre-migration WebIDE tooling archived under `archive/pre-migration-2026-10-14`
