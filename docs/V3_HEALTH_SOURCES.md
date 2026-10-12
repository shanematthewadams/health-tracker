# Health sources and coaching constraints

Checked against vendor documentation October 12, 2026. This describes the next implementation path, not live connections.

## Apple Health: preferred inbound path

The React app and Netlify server cannot open an iPhone's HealthKit store. A device-side component must request permission and send approved samples. Source records can have gaps, user-denied access, overlapping sources and deletions. Missing samples must not be interpreted as zero or as evidence of denied permission.

| Method | Reliability and experience | Cost/maintenance | Current decision |
| --- | --- | --- | --- |
| Shortcuts | Useful manual proof of concept for supported Find Health Samples categories; automation, workout fidelity and background execution must be tested on actual iOS. Do not promise all categories or unattended delivery. | Low code cost; users install/configure a Shortcut; account-token management still needs a safe solution. | Device pilot after MCP activation; no Shortcut installed yet. |
| Small native iOS companion | HealthKit authorization by category, anchored queries, source UUIDs and observer/background delivery. More dependable identity, deletion handling and sample fidelity; background scheduling remains OS-controlled. | Xcode, Apple signing/distribution and ongoing iOS work. No paid enrollment or resource has been created. | Preferred long-term bridge if the Shortcut pilot is insufficient. |
| Third-party HealthKit bridge | Potentially quickest unattended sync but sends sensitive information to another service and may charge fees. | Evaluate terms, security, provenance and subscription costs first. | No third-party bridge selected or activated. |

Keep the companion minimal: With sign-in, category permission screen, sync status, manual sync, retry queue and disconnect. Do not rebuild With as a native app. No outbound HealthKit writes in this phase.

Implemented now: `src/connectedHealth/importPlan.js` prepares bounded imported samples, validates approved categories, unit/interval/time zone, detects exact source-ID retries and proposes cross-source reconciliation. It does not query HealthKit or send data. `external_health_observations` stores originals with RLS; its migration is unapplied. No MCP access to that raw table is granted.

### Sync contract and reconciliation

- Each authorized person's own profile is resolved from authentication, never supplied as a trusted upload ID.
- Preserve HealthKit sample UUID, source app/device, original unit, offset timestamps, IANA time zone and related Garmin IDs where actually present. Do not invent upstream identifiers.
- Store original observations before deciding canonical totals. Handle source deletions explicitly; a successful upload is not evidence a sample still exists on-device.
- Exact `(person, source, source_id)` retries are idempotent. Changed records require revision handling rather than silent overwrite.
- Cross-source workout similarities (type, start within 2 minutes, comparable duration) create **review candidates**, not automatic merges. Add distance/heart-rate evidence only when actually available. Manual confirmation must support two legitimately adjacent workouts.
- Steps, distance, sleep and energy can overlap. Do not sum source totals; choose a canonical provider/interval, retaining original records and disagreement.
- Stable cursor/anchor advances only after durable server acknowledgement. Offline batches retry with the same sample IDs. Permissions and deletion/revocation apply separately from AI consent.
- HealthKit import consent does not equal AI permission. Do not share imported provider data with With members or AI automatically.
- Raw data from Strava's API cannot be routed to AI by relabeling it as Apple Health. Preserve origin and enforce provider restrictions.

Apple documentation: https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data and https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.healthkit.background-delivery . Actual device/Shortcut behavior has not been tested in this environment.

## Garmin

The Connect Developer Program is business/enterprise-oriented and application approval is required. Garmin's FAQ says program access has no general licensing/maintenance fee, while some commercial metrics may require a license fee or device quantity commitment. The program uses OAuth 2.0. This is not evidence that a personal With project qualifies or every metric is available.

Health API public descriptions include steps, heart rate, sleep and stress; Activity API provides detailed activities. Body Battery, training readiness, recovery time and training-load availability must be confirmed in the approved portal. Connect IQ access is a different program and not a substitute for Connect API approval. Do not scrape Garmin Connect or use unofficial password-based APIs.

Practical order: verify authorized Garmin → Apple Health categories on Shane's actual phone, support legitimate user-provided Garmin exports where useful, then consider direct API access only if With qualifies and additional data justify the maintenance.

Sources: https://developer.garmin.com/gc-developer-program/program-faq/ , https://developer.garmin.com/gc-developer-program/health-api/ , https://developer.garmin.com/gc-developer-program/activity-api/ . No application was submitted or fee accepted.

## Strava

Current API Policy (June 1, 2026) section 5.3 prohibits using API data directly or indirectly for AI operation, including context-window ingestion and grounding; section 3.5 identifies Strava's own MCP as an exception for subscribers' personal use. Do not build a With MCP tool that returns Strava API data to ChatGPT. Aggregated/derived copies are not an escape hatch. With's existing relationship model also cannot automatically share imported Strava data with other members.

Strava's documented new-app capacity is one athlete, with a self-service upgrade to ten and review above that. Current default limits: 200 requests/15 minutes and 2,000/day overall; non-upload reads 100/15 minutes and 1,000/day. Published tiers may impose subscription requirements. API registration and permission have not been completed.

Possible separate path: use Strava's authorized personal MCP alongside With rather than proxying Strava data through With. Actual availability and account eligibility need verification. Direct With integration is held until provider terms and the specific use case are resolved; no claim that the whole proposed coaching flow is permitted.

Sources: https://www.strava.com/legal/api_policy , https://www.strava.com/legal/api , https://developers.strava.com/docs/rate-limits/ . No credentials were created.

## Coaching

The MCP tools provide observations, targets, logged summaries and completeness caveats. The assistant supplies recommendations in the conversation; With does not call a paid AI API. Goals are individual and there is no Shane-specific backend rule.

For a suggested workout, use only categories actually approved. Account for recorded F3/running/strength and subjective recovery, state gaps, and do not infer soreness/HRV/protein compliance. Explain estimates and distinguish them from observed values. No diagnosis or claim to replace medical care. Medical precautions need verified individual information, not assumptions from group membership.
