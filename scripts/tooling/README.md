# scripts/tooling

Standalone scripts that are **not** part of the Furrie app build. They have
their own `package.json` so that `xlsx` (which has open advisories with no
upstream fix) is never installed into the app's `node_modules`.

```bash
cd scripts/tooling
npm install
npm run convert-breeds   # regenerates src/lib/data/breeds.ts from docs/Comprehensive_Dog_Cat_Breed_Database.xlsx
```
