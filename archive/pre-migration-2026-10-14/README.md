# Pre-migration archive (2026-10-14)

## Why archived
Target folder already contained a working ZP02 app under namespace `com.rak.bmp` with OData datasources,
plus legacy WebIDE tooling (`neo-app.json`, `serviceBinding.js`, UI5 CLI 1.x `ui5.yaml`).

`C:\React\rak-zp03` was not found. ZP03 foundation is created fresh in the combined app.

## What was moved here
- Legacy WebIDE/root tooling files listed above
- `.che` project metadata
- Inventory of webapp files before folder reorganization

## Source of truth used for migration
- Working ZP02 implementation: existing `webapp` content in this project (OData ongoing)
- Clean tooling reference: `C:\React\Final-projects\rak-zp02-ui5` (UI5 CLI 4.x / SAPUI5 1.120.14)
- Original ZP02 folder was NOT modified

## Not destroyed
ZP02 views/controllers/services/assets were reorganized under `webapp/**/zp02` and namespace-renamed to `rak.services`, not rewritten from Final-projects.
