# CAP Admin UI

This directory contains a minimal CAP project exposing the `ODataServices`
entity via `AdminService`. The schema is defined in `db/schema.cds` and
exposed through `srv/service.cds`.

```bash
npm install
npm run build
cds deploy --to sqlite:../shared.sqlite
npm start
```
