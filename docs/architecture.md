# Wellness Center Runtime Architecture

```mermaid
flowchart LR
    user["User"]
    frontend["Web Frontend\n/static + browser entry proxy"]
    backend["Web Backend\nEJS rendering + /api proxy"]
    gateway["API Gateway\nAPI routing + session cookie"]

    subgraph services["Services"]
        configurator["Package Configurator"]
        aftercare["Aftercare Shop"]
        ai["AI Feature"]
        visit["Visit Context Service"]
        cart["Shopping Cart"]
    end

    subgraph data["Infrastructure"]
        mysqlConfigurator["MySQL Configurator DB"]
        mysqlAftercare["MySQL Aftercare DB"]
        mysqlVisit["MySQL Visit Context DB"]
        redis["Redis"]
        minio["MinIO"]
    end

    subgraph external["External APIs"]
        gemini["Gemini API"]
        google["Google Maps Platform"]
    end

    user --> frontend --> backend --> gateway
    frontend -->|homepage-only /media/home/*.mp4 proxy| minio
    gateway --> configurator
    gateway --> aftercare
    gateway --> ai
    gateway --> visit
    gateway --> cart
    configurator --> mysqlConfigurator
    configurator --> minio
    aftercare --> mysqlAftercare
    aftercare --> minio
    visit --> mysqlVisit
    visit --> google
    ai --> gemini
    ai --> configurator
    ai --> aftercare
    cart --> redis
```

The browser only reaches domain data through the frontend, backend, and gateway chain. Domain services own their storage, and cross-service reads happen through HTTP APIs.

## Browser Media Boundary

Browser-visible media has three allowed paths:

- Presentation images use `/static/images/*` and are served by `web-frontend` from `web/public/images`.
- The homepage presentation video exception uses `/media/home/*.mp4`; this path is only for homepage MP4 presentation videos and must not become a generic MinIO bucket proxy.
- Package and aftercare business media use `/api/*/assets/*` and remain behind the owning-service API boundary. Center media is not currently browser-exposed; if exposed later, it must also stay behind an owning-service API boundary.

MinIO is never exposed directly to the browser. Browser-visible business media requests must flow through `web-frontend -> web-backend -> api-gateway -> owning service -> MinIO`. The only browser-visible MinIO shortcut is the narrowly scoped `web-frontend` proxy for `/media/home/*.mp4` homepage presentation videos.
