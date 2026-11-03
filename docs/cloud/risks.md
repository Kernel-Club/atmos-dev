# Project Atmos — Risks

| Risk | Impact | Mitigation |
|---|---|---|
| OpenWeather API unavailable | Weather data cannot be retrieved | Use Redis cache and return a clear application error |
| MongoDB unavailable | Weather history cannot be stored or read | Use persistent storage and verify database health |
| Redis unavailable | Increased API response time and external API load | Application continues without cache where possible |
| Kubernetes deployment failure | Application unavailable in the affected environment | Validate deployments and use separate DEV/PROD environments |
| MongoDB credential rotation failure | Application may lose database access | Use credential overlap and verify connectivity before removing the old credential |
| AWS infrastructure misconfiguration | Cloud environment may be unavailable or unstable | Manage infrastructure with Terraform and validate changes before apply |
| Unexpected AWS costs | Cloud spending exceeds the initial target | Use minimal resources and monitor AWS usage |