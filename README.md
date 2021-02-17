ProgRadio
=========

https://www.programmes-radio.com

Dependencies
--------------
- VueJs 2.x
- PHP 7.4|8.0 / Symfony 5.x
- NodeJS v10+ (Scraper)
- Elixir 1.11+ (Importer)
- PostgreSQL & Redis
- Nginx or Apache
- ImageMagick
- CapRover (deployment)
- ~~Capistrano 3 (deployment)~~ (deprecated)


Run
--------------
**Scraper**: cd Scraper && node index.js

**Importer**: cd Importer && iex -S mix (dev)

**Vue app**: npm run build / npm run dev

Architecture
--------------

![Flowchart](docs/ProgRadioFlowchart.png)

