<!-- joripspace:managed:start -->
# JoripSpace Project Agent Guide

- JoripSpace guide updated at: 2026-07-19

This file is for AI coding agents working on this JoripSpace project. The user may be a complete beginner, so the agent should turn short requests into working service changes without asking platform questions.

## Project

- JoripSpace project: zxcvb
- Service URL: https://zxcvb.joripspace.run
- Project name: (ask the user if this is not clear)
- Main goal: (record what the service should do)
- Target users: (record who will use it)

## What This Project Can Become

- Landing or introduction site for a club, class, shop, person, product, event, or portfolio.
- Reservation, booking, application, inquiry, waitlist, survey, or contact intake service.
- Course, lecture, student assignment, club activity, membership, attendance, or small LMS-style service.
- Simple order, payment-preparation, product request, file upload, gallery, download, or admin review service.
- Owner/admin dashboard for records, statuses, files, messages, customers, students, or bookings.
- Realtime inquiry, support room, small group chat, or live status page when the project needs live interaction.

## First Conversation Onboarding

Beginner onboarding rules:
- Match the language the user is using. If the user writes Korean, continue in Korean. If the user writes another language, use that language unless they ask otherwise.
- Treat the user as a complete beginner. Students and older users should be able to build by conversation alone.
- Ask short, practical questions before building when the site name, topic, audience, or core workflow is empty or unclear.
- Do not ask platform questions. The agent chooses the server, DB, storage, schema, routing, deployment, and testing approach.
- If the user says they do not know, give 2-3 simple examples, recommend one default, and continue.
- Explain only the next useful action. Avoid long technical explanations unless the user asks.
- If something fails, inspect logs, deployments, and runtime events directly; do not make the user debug technical details.

First questions to ask when details are missing:
1. 서비스 이름은 무엇인가요?
2. 이 서비스는 무엇을 하는 서비스인가요? 한두 문장으로 설명해 주세요.
3. 꼭 필요한 주요 기능 3가지는 무엇인가요?
4. 로그인/회원 기능이 필요한가요?
5. 결제, 이메일, 파일 업로드, 관리자 화면 중 필요한 것이 있나요?
6. 누가 사용하나요? 예: 학생, 고객, 회원, 직원, 관리자.
7. 원하는 분위기, 색상, 로고, 참고 사이트, 꼭 들어갈 문구가 있나요?

Choose platform internals yourself. The user should not have to choose Worker, D1, R2, bindings, SQL migrations, MCP resources, deployment payloads, or other technical setup details.
When replying to the user, prefer "서버", "DB", "스토리지", and "실시간". Use implementation names only when the user asks for technical details or when code/debugging context requires them.

## Codex MCP Onboarding Flow

Codex MCP onboarding flow:
- If the user provides only "프로젝트: {project_id}", do not call get_project first by project ID alone.
- First check whether JoripSpace MCP tools are visible in the current agent session, then check the current working folder.
- Without connect_token, do not call start_project_session, select_project, list_my_projects, or prepare_project_workspace.
- Never use an empty string, dummy value, environment bearer token, browser cookie, localStorage value, profile page value, or settings file value as a connect_token.
- If no connection token is available, call start_login or browser_connect and show the returned connect_url. Ask the user to approve the connection in a logged-in browser and paste only the displayed MCP/CLI connection token back into chat.
- After connection approval succeeds, reuse the returned account API token for project tools and write the returned workspace connection files. The user should never have to find, name, or enter JORIPSPACE_API_TOKEN manually.
- Do not ask for email, password, Google app password, SMTP password, personal API key, or payment key in chat.
- If deploy_code, deploy_checkpoint, or rollback_deployment returns deployment_state_unknown, call list_deployments before any retry. If a new successful deployment exists, verify it and do not redeploy. Otherwise retry the same deployment tool at most once.
- Do not restart the connection flow for a deployment timeout. Restart connection only for connection_required, invalid_token, or another explicit authentication error.
- Create local files only after MCP session connection succeeds and workspace_setup.files or local_file_operations are returned.
- Before writing files, verify the current working folder. If it differs from the folder the user specified, stop and ask for confirmation.
- After receiving connect_token, call start_project_session(connect_token, project_id) immediately. If workspace_setup.files are returned, write them. Run git status --short only when Git is installed; otherwise continue without Git.
- If start_project_session fails with connection_required, call start_login again. If it fails with invalid_token, ask for a fresh token. If it returns needs_project_choice, ask the user to choose one project and call start_project_session again. If project_not_found, ask the user to confirm the project ID.
- After workspace setup, ask onboarding questions one at a time: service name, what the service does, three required features, whether login is needed, whether payment/email/file upload/admin is needed, then choose or recommend the deployment target yourself.
- Record each answer in docs/service-brief.md or in the onboarding document returned by MCP.
- Before deployment, verify the project connection, source entrypoint, relevant checks available in the current environment, and target URL. Direct MCP deployment of Worker-compatible source does not require Node.js or Git.
- If get_project or start_project_session times out, follow the returned retryable and next_action fields, retry at most once, then explain briefly that JoripSpace did not respond. Do not ask the beginner to inspect logs, tokens, Node.js, Git, or network internals.
- Preferred quick failure statuses are connection_required, invalid_token, project_not_found, workspace_setup_ready, and timeout instead of a 300-second wait.

User-facing connection message:
JoripSpace 프로젝트를 Codex에 연결하려면 먼저 연결 토큰이 필요합니다.
1. 브라우저에서 아래 링크를 엽니다.
2. JoripSpace에 로그인된 상태에서 연결을 승인합니다.
3. 화면에 표시되는 MCP/CLI 전용 연결 토큰을 이 채팅에 붙여넣습니다.
주의: 이메일이나 비밀번호는 필요하지 않습니다. Google 앱 비밀번호나 SMTP 비밀번호를 채팅에 붙여넣지 마세요. Codex가 브라우저 쿠키나 저장소에서 토큰을 직접 찾으면 안 됩니다. 연결 토큰은 프로젝트 온보딩 세션을 시작하기 위한 값이며, 일반 API bearer token과 다릅니다.

## JoripSpace Capabilities

JoripSpace capabilities for agents:
- Shared platform policy lives in JoripSpace core contracts. Do not invent separate limits or wiring: project plans, usage storage totals, billing evidence fields, domain validation, and deletion preservation are platform rules.
- Server: write the app in the server entrypoint such as worker.js or src/index.js. Deploy with MCP deploy_code or npm run joripspace:deploy only when the user explicitly requests deployment of the current change.
- DB: app code can use env.DB for structured records. For schema changes or data cleanup, use MCP describe_db, query_db, and run_db_migration, or the CLI db commands. A public app route such as /migrate is not the normal path because DB management tools already exist.
- DB-backed features should consider the full operating loop by default: create, list with pagination, view detail, update, delete/archive, validation, empty states, and safe admin controls unless the user explicitly scopes them out.
- Storage: app code can use env.STORAGE for uploads, generated files, and private downloads. For agent-side file checks or one-off file operations, use MCP storage tools or CLI storage commands.
- Realtime: when the user asks to implement realtime chat, use /_joripspace/realtime?room=main and the platform-managed SQLite history/search flow by default. JoripSpace stores accepted message history, preserves room ordering, maintains FTS5 search, and records project usage automatically without asking the user to choose Cloudflare, Durable Object, or FTS5.
- Realtime storage policy: new accepted messages use application-level plaintext plain_v2 JSON in the managed room SQLite store. Legacy encrypted_v1 rows remain readable and migrate compatibly while the legacy encryption key remains available.
- Realtime data placement: never create a D1 messages/chat_history table for platform realtime history. Keep only room lists, membership, permissions, and other ordinary service records in env.DB; keep attachments in env.STORAGE.
- Realtime privacy: use opaque, unguessable room ids for private rooms, verify membership in the app before revealing a room id, and pass only an app-local opaque user id in the user query parameter. Do not put email, phone, name, or message content in room ids or URLs.
- Realtime history: read a room page from /_joripspace/realtime/rooms/{room}/messages?limit=50&before={cursor}. Do not implement a second history store or a custom Durable Object in generated app code.
- Realtime search: search the same room endpoint with search={query}, limit, and before. Search uses managed Unicode token search; do not add LIKE %query% scans or a second search index in env.DB.
- Realtime usage: duplicate message ids and retried usage event ids are idempotent. FTS5 reads/writes count as SQLite usage, search is not a message send, and compatibility migration work is not a new message send. All usage is attributed to the resolved immutable internal project id.
- Project mail: when the user asks to connect email sending, use MCP connect_mail. If it returns smtp_setup_available, send the user to the returned JoripSpace mail tab URL and have them enter the SMTP host, port, security mode, username, password or API key, and sender address in the web UI. Never ask them to paste SMTP credentials into chat. If it returns browser_google_consent_required, return the JoripSpace mail connection start URL. Wait for the user to approve or save the connection in the browser, then call get_mail_status and send_test_mail. Do not modify project source or implement a separate mail integration.
- Explain these to ordinary users as 서버, DB, 스토리지, and 실시간. Use implementation names only when code or technical debugging requires them.

## Project Plans And Limits

Project Plans And Limits:
- Project traffic and platform features are limited by the saved JoripSpace project plan.
- Free: server/API requests 10,000 per month, storage 100MB, DB 50MB, realtime messages 1,000, realtime concurrent connections 5, and no custom domains.
- Starter: server/API requests 100,000 per month, storage 1GB, DB 250MB, realtime messages 100,000, realtime concurrent connections 50, and custom domains available.
- Pro: server/API requests 300,000 per month, storage 3GB, DB 750MB, realtime messages 300,000, realtime concurrent connections 150, and custom domains available.
- Business: server/API requests 1,000,000 per month, storage 10GB, DB 2.5GB, realtime messages 1,000,000, realtime concurrent connections 500, and custom domains available.
- If included usage is exceeded, JoripSpace blocks extra runtime traffic without surprise overage billing and shows the block page with quota_blocked.
- Unlimited metered usage is OFF by default. On Starter, Pro, and Business, if unlimited metered usage is enabled, quota overage is not blocked and usage continues to be recorded in the billing ledger.
- Monthly overage budget is optional. If the budget is empty, it means no budget cap. If a budget is set, overage is allowed only until the projected monthly amount reaches that cap.
- Active unlimited-metered rates are server/API requests +100,000, realtime messages +100,000, DB storage +0.25GB, file storage +1GB, and realtime concurrent users +50.
- Speed boost is available on Starter, Pro, and Business. It has a 12,900원 monthly base fee, includes 10GB accelerated traffic, and charges extra accelerated traffic by bytes_in + bytes_out, meaning 들어온 데이터와 나간 데이터 합산.
- If a Free project tries to add a custom domain, the platform returns plan_required. Explain this as "개인 도메인은 Starter 이상에서 사용할 수 있습니다."
- Paid plans may be selectable during development even before billing automation is fully connected. Do not tell users the selection failed unless the API returns an error.
- User-facing wording: 요금제 제공량을 넘으면 추가 과금 없이 기능이 제한되고 차단 안내 페이지가 표시됩니다.

## Project Domains

Project Domains:
- Default joripspace.run domains are created and removed with the project lifecycle. Do not try to delete a default domain.
- Personal custom domains are available on Starter, Pro, and Business plans. Free projects return plan_required when a custom domain is added.
- For non-technical users, the web UI domain tab is the easiest path. Agents may also use MCP list_domains, create_domain, verify_domain, and delete_domain, or the CLI domain commands.
- After adding a custom domain, show the CNAME target clearly and ask the user to set it at their DNS provider, then verify the domain status.
- Do not bypass JoripSpace by editing Cloudflare routes or custom hostnames directly. Use JoripSpace domain tools so the hostnames table, verification status, and routing stay consistent.
- User-facing wording: 개인 도메인은 Starter 이상에서 사용할 수 있습니다. 도메인을 추가한 뒤 안내된 CNAME 값을 DNS에 설정하고 상태 확인을 누르면 됩니다.

## Image And File Placement Defaults

Image and file placement defaults:
- Site design assets that are part of the source, such as hero images, section screenshots, icons, logos, and fixed example images, should usually live in the project files, for example public/images/...
- Source assets are part of the deployment source and should be included when the latest deployment is pulled or restored.
- user-uploaded files, gallery photos, attachments, generated documents, and files that change during operation should use project storage through env.STORAGE.
- Store metadata such as title, description, order, owner, visibility, and storage key in env.DB.
- Do not put large file bytes into DB. Keep file bytes in project source for fixed design assets or in env.STORAGE for operational files.
- User-facing wording: 사이트 디자인에 필요한 이미지는 프로젝트 파일에 넣고, 사용자가 올리는 사진이나 첨부파일은 스토리지에 저장합니다.

## Build And Deployment Defaults

Build and deployment defaults:
1. Prefer a pure Worker app for new JoripSpace services. It is the safest default and works directly with server, DB, storage, and realtime.
2. Use a plain HTML/CSS/JS static site when the request is mostly a landing page, portfolio, guide, or brochure site.
3. Use a Vite SPA plus Worker API when the UI is larger and needs React, Vue, Svelte, or similar frontend structure.
4. Use frameworks with a Cloudflare-compatible output only when the existing project or request clearly benefits from them.
5. Next.js static export can be deployed after local build/export and Worker-compatible static serving setup.
6. Next.js SSR needs OpenNext or another Cloudflare-compatible conversion before deployment; do not assume a normal Next.js server can be uploaded directly.
7. Express, NestJS, and other long-running Node servers are not the default path. Convert them to Worker-compatible routes or explain the needed conversion.
- Do not ask the user to choose a framework or deployment target. If there is no existing code, start with the pure Worker default. If package.json exists, inspect it, detect the framework, build locally when needed, and prepare a Worker-compatible result. Deploy it only when the user explicitly requests deployment of the current change.

After MCP or CLI setup:
- At the start of each new distinct user task, call search_knowledge once with the user's plain request before planning or asking questions. Use the returned user_guidance, recommendation, and actions to turn short beginner requests into a guided plan. Do not repeat the search for every follow-up in the same task unless the topic changes or current guidance is needed.
- If search_knowledge returns no direct match, use its prioritized fallback guidance and ask at most three short business questions. If the knowledge service fails, continue with the built-in JoripSpace guide and explain only when the failure blocks the task.
- Do not stop with only "yes, it is possible" or a capability checklist.
- If setup cannot continue because connect_token or api_token is missing, do not click through the browser, inspect cookies, localStorage, sessionStorage, or account pages, or attempt login automation. Tell the user exactly where to get the token and how to paste it back.
- The user does not need to say "onboarding". After connection succeeds, continue into project selection, workspace file writing, and the first service questions automatically.
- Prefer a single start_project_session tool call when it is available. It combines session lookup, project choice handling, workspace file instructions, and first questions.
- If an MCP response includes workspace_setup.files, write those files into the current working folder immediately before replying.
- If an MCP response includes local_file_operations, execute those local file writes/appends before replying to the user.
- Compare agent_guide.updated_at from the server with the JoripSpace guide updated date in AGENTS.md. When the server date is newer or the local date is missing, replace only the JoripSpace managed block with the returned AGENTS.md content and preserve all user-authored content outside the block.
- When MCP connection and workspace setup succeed, continue without asking the user to install Node.js or Git, run npm or git commands, locate API environment variables, or repeat the connection token.
- Do not ask the user to paste another start prompt when you already have project context and workspace files.
- If the user has not described the service yet, immediately start with up to three short questions.
- If the user asks what to do next, do not only provide examples. Start the onboarding questions when the project is already selected.
- If the user says they do not know what to build, suggest 2-3 simple service examples and pick a practical default.
- End each user-facing reply with the next thing to click, check, or answer.
- If MCP tools do not appear immediately in an app, tell the user to open a new chat or restart the app, then continue from the copied start prompt.

## Prompts To Start The Build

Use these only when no MCP workspace_setup.files are available yet. If workspace_setup.files are present, write the files and begin asking questions directly instead of asking the user to paste a prompt.

### 처음부터 만들기

이 JoripSpace 프로젝트에서 만들 서비스를 MCP 기본 온보딩 순서대로 질문하면서 정리하고, 필요한 파일을 만든 뒤 배포와 확인까지 진행해 주세요.
아이디어가 아직 정리되지 않아도 됩니다. 사이트 이름, 목적, 사용자, 필요한 기능을 쉬운 예시와 짧은 질문으로 정리해 주세요.
API 키나 결제 키는 코드에 넣지 말고 JoripSpace 프로젝트 secret 또는 gitignore 처리된 로컬 파일에만 저장해 주세요.
프로젝트: zxcvb

### 기존 사이트 수정

이 JoripSpace 프로젝트의 기존 사이트를 확인한 뒤, 바꾸고 싶은 내용을 짧은 질문으로 정리하고 직접 수정, 배포, 확인까지 진행해 주세요.
요청이 애매하면 쉬운 선택지 2-3개를 보여주고 안전한 기본값을 추천한 뒤 진행해 주세요.
API 키나 결제 키는 코드에 넣지 말고 JoripSpace 프로젝트 secret 또는 gitignore 처리된 로컬 파일에만 저장해 주세요.
프로젝트: zxcvb

### 오류 해결 또는 배포 확인

이 JoripSpace 프로젝트에서 오류나 배포 상태를 확인하고, 로그를 직접 살펴본 뒤 수정, 재배포, 확인까지 진행해 주세요.
결과는 쉬운 말로 설명하고, 제가 다음에 눌러야 할 것, 확인할 것, 답해야 할 것만 명확히 알려주세요.
기술 로그를 직접 보라고 하거나 서버, DB, 스토리지, MCP, 배포 설정을 저에게 고르게 하지 마세요.
프로젝트: zxcvb

## Payment Provider Guidance

Payment Provider Guidance:
- If the user wants payment features, explain the payment type first in plain language and send the correct JoripSpace partner signup link.
- 결제 연동을 쓰려면 안내된 링크로 가입해 주세요. 해당 링크로 가입해야 JoripSpace 연동 개발과 서비스 이용을 진행할 수 있습니다.
- 토스페이먼츠 - 일반결제: 국내 카드, 간편결제, 계좌이체 같은 1회 결제에 사용합니다. 가입 링크: https://onboarding.tosspayments.com/registration/entry/funnelmoa?utm_source=funnelmoa&utm_medium=hosting
- 토스페이먼츠 - 빌링결제: 정기결제, 구독, 자동결제처럼 고객 카드를 등록하고 반복 청구할 때 사용합니다. 가입 링크: https://onboarding.tosspayments.com/registration/entry/funnelmoa_bill?utm_source=funnelmoa_bill&utm_medium=hosting
- 도도 페이먼츠 - 글로벌 SaaS 결제: 해외 고객 대상 SaaS 구독, 디지털 상품, 글로벌 카드 결제에 사용합니다. 가입 링크: https://app.dodopayments.com/partners/POhKqoePmZ/signup
- If provider credentials are not ready, build a safe payment_pending flow and explain that real payment activation needs provider signup, keys stored as project secrets, and server-side webhook verification.

## Secret And Key Handling

Secret and token rules:
- Never put API keys, payment keys, SMS/email keys, database URLs, or tokens in source code, README files, browser JavaScript, screenshots, chat summaries, logs, error messages, or audit metadata.
- Store external service keys used by deployed code only as JoripSpace project secrets. Only the selected project User Worker secret binding stores the value; the platform DB keeps project-scoped name, status, and lifecycle timestamps only.
- Never copy project Secret values into source code, env.DB, env.STORAGE, deployment source, checkpoint files, saved copies, logs, error messages, or audit metadata.
- Do not ask the user to paste provider Secret values into chat. Send them to the selected project web settings to register, replace, or delete the value, then use list_secrets only to confirm name, status, and timestamps. Secret values never appear in list responses or agent reports.
- Local temporary values are allowed only in ignored files such as .env.joripspace or .joripspace/agent-session.json.
- If an MCP/CLI connect_token or api_token is missing, do not browse around, inspect cookies, read browser storage, or try profile pages to discover it. Ask the user for the MCP/CLI connection token and give the exact connection URL, token argument name, and CLI command to paste it into.
- Secret names must match [_A-Z][_A-Z0-9]* and be at most 128 characters. DB, STORAGE, PROJECT_ID and names beginning JORIPSPACE_, CF_, or CLOUDFLARE_ are reserved and must not be used.
- A project supports at most 60 active secrets, and each value must be 1-5,120 UTF-8 bytes. Use clear uppercase names such as TOSS_PAYMENTS_SECRET_KEY, TOSS_PAYMENTS_BILLING_SECRET_KEY, DODO_PAYMENTS_API_KEY, SOLAPI_API_KEY, or SOLAPI_API_SECRET.
- For app-internal random values such as session signing, CSRF protection, encryption, or test secrets, call generate_project_secret. The platform generates and stores the value directly; the agent uses only the binding name and never asks the user to enter a value.
- Secrets are isolated by the immutable internal project id. A name or binding from one project must never be treated as available to another project.
- Normal project deployments and rollbacks preserve secret_text and secret_key bindings. Do not copy or re-upload Secret values as part of deployment source; project deletion cleans up the project Worker secrets with its metadata.
- Browser code may receive only public keys or safe redirect URLs. Server routes must handle private provider calls.

## Agent Operating Rules

- Public pricing page copy is product-approved content. Do not rename, paraphrase, reorder, or otherwise improve plan names, subtitles, benefits, prices, units, descriptions, or CTA text unless the user explicitly requests that exact change. When a pricing copy change is requested, update SSR, browser rendering, documentation, and release checks together.
- JoripSpace execution order: use MCP tools first when they are available; if MCP tools are unavailable or the app cannot see them, use the package.json helper scripts.
- MCP-only setup and deploy do not require Node.js or Git. Do not install Node.js or Git when working MCP tools can complete the requested operation, and do not ask the beginner to run npm or git commands.
- If a required MCP/CLI token is missing, stop setup and give precise recovery instructions instead of browsing around: open https://joripspace.com/connect/ in a logged-in browser, approve the connection, copy the displayed MCP/CLI connection token, then provide it as connect_token or run `joripspace login --connect-token "복사한_연결_토큰"`.
- Package helper scripts require Node.js 18 or newer, but their presence in package.json is not a reason to use or install Node.js. Use a helper only when MCP is unavailable or the requested local checkpoint, restore, pull, or framework build cannot be completed through MCP.
- If a package helper is the only available path and Node.js is missing, explain the reason in one sentence and ask permission before installing Node.js LTS. Never make Node.js installation a prerequisite for ordinary MCP onboarding or direct MCP deploy.
- Run `npm run joripspace:doctor` or `npm run joripspace:deploy` only when MCP is unavailable and Node.js is already available or the user approved its installation. Do not ask the user to choose or run the command.
- If package.json has `joripspace:pull` and the project folder has no app code, ask the user for permission and pull the latest successful deployment source before building.
- If the user asks to replace local files with the latest deployed version, run `npm run joripspace:pull:force`; this backs up overwritten files under `.joripspace/local-backups/` first.
- When speaking to the user, use simple product terms: say server, DB, storage, and realtime. Use implementation names only when the user asks for technical details or when writing code.
- Read `.joripspace/project.json` and `.joripspace/agent-session.json` before deploying or operating the project.
- A JoripSpace project should already have its server, DB, and storage prepared at project creation. Do not ask the user to choose or configure DB/storage bindings.
- Use MCP/CLI DB tools to inspect schema, run migrations, and query project data when the service needs stored records.
- Use MCP/CLI storage tools to list, read, write, and delete project files when the service needs uploads or generated files.
- Keep secrets out of git. Add provider keys through project secrets or ignored local files only.
- If dependencies are missing, detect the package manager and install what is needed yourself when it is safe. Ask the user only for paid accounts, credentials, or business decisions.
- Git is optional for JoripSpace onboarding and MCP deployment. If Git is not installed, do not install it, do not block editing or deployment, and do not ask the beginner to initialize, commit, fetch, or push.
- If Git is already available, preserve its normal safety workflow: initialize only when appropriate, run relevant checks, fetch before completion when an upstream exists, integrate upstream changes safely, and commit and push completed work when configured. Missing Git or a missing remote is informational, not a JoripSpace failure.
- Build the smallest usable version first, then improve it after testing.
- Deploy only when the user explicitly requests deployment of the current change. Otherwise run checks and save a checkpoint without deploying.
- If deploy fails with `project_resources_invalid` or `project_db_binding_invalid`, treat it as a JoripSpace project resource issue, not a user-code bug. Explain plainly that the project server/DB connection needs repair, then retry after the platform/project resources are fixed.

## Checkpoint And Restore Rules

- After meaningful work and relevant checks, create a JoripSpace checkpoint with create_checkpoint or npm run joripspace:save when that path is available without adding unapproved tooling. Always provide a concise label describing the change. Identical content is reused instead of creating a duplicate.
- Saving is the default after meaningful work when MCP can complete it directly or the required local helper is already available. A local_upload_required checkpoint response must not block ordinary MCP work or direct deployment and must not trigger Node.js installation unless the user explicitly requested a standalone checkpoint, restore, or pull and approved the required helper. Do not enable, assume, or perform automatic deployment during initial onboarding.
- Deploy the saved checkpoint only when the user explicitly asks to deploy the current change or explicitly asks for completed work to be deployed automatically. Without that request, stop after creating and verifying the checkpoint.
- If tests or checks fail, do not deploy. A clearly labeled 작업 중 checkpoint may be created when preserving the current files is useful.
- Documentation-only changes create a checkpoint but do not require a server deployment.
- Before restoring files, create a restore_safety checkpoint and a local backup under .joripspace/local-backups. Preview additions, overwrites, deletions, and protected paths first; never overwrite conflicts without approval.
- Treat local file restore and production rollback as separate confirmed actions. 이전 상태로 돌아가 means explain and confirm both independently.
- Never include secrets, .env files, token/session files, private keys, .git, node_modules, or .wrangler in checkpoints.
- Prefer MCP checkpoint tools. If MCP is unavailable, use joripspace:save, joripspace:checkpoints, joripspace:restore, and joripspace:deploy-checkpoint helpers.

Framework and build priority:
Build and deployment defaults:
1. Prefer a pure Worker app for new JoripSpace services. It is the safest default and works directly with server, DB, storage, and realtime.
2. Use a plain HTML/CSS/JS static site when the request is mostly a landing page, portfolio, guide, or brochure site.
3. Use a Vite SPA plus Worker API when the UI is larger and needs React, Vue, Svelte, or similar frontend structure.
4. Use frameworks with a Cloudflare-compatible output only when the existing project or request clearly benefits from them.
5. Next.js static export can be deployed after local build/export and Worker-compatible static serving setup.
6. Next.js SSR needs OpenNext or another Cloudflare-compatible conversion before deployment; do not assume a normal Next.js server can be uploaded directly.
7. Express, NestJS, and other long-running Node servers are not the default path. Convert them to Worker-compatible routes or explain the needed conversion.
- Do not ask the user to choose a framework or deployment target. If there is no existing code, start with the pure Worker default. If package.json exists, inspect it, detect the framework, build locally when needed, and prepare a Worker-compatible result. Deploy it only when the user explicitly requests deployment of the current change.

## Package Helper Fallback

These scripts are fallback tools for environments where MCP is unavailable or a local checkpoint, restore, pull, or framework build specifically requires them:
They require Node.js 18 or newer. Do not install Node.js merely because these scripts exist. If a helper is the only available path, explain why and ask permission before installing Node.js LTS.

- `npm run joripspace:doctor`: check JoripSpace project connection, token, package scripts, and deploy entrypoint.
- `npm run joripspace:save`: create an encrypted checkpoint without changing the running server.
- `npm run joripspace:checkpoints`: list recent checkpoints.
- `npm run joripspace:restore -- --checkpoint CHECKPOINT_ID`: preview a local restore. Add `--apply` only after approval.
- `npm run joripspace:deploy-checkpoint -- --checkpoint CHECKPOINT_ID`: deploy one selected checkpoint.
- `npm run joripspace:deploy`: save the current files and deploy that exact checkpoint.
- `npm run joripspace:pull`: download the latest successful deployed server source into an empty or safe folder.
- `npm run joripspace:pull:force`: back up conflicting local files, then replace them with the latest successful deployed server source.
- `npm run deploy`: may point to the same helper if the project did not already define its own deploy script.

If MCP tools are visible, prefer MCP. If not, use these package.json scripts directly. Do not ask the user to provide a deployment command.
Never overwrite local project files during pull unless the user explicitly asked to replace them or approved the force mode.

## Project Brief

Update this section as the service becomes clearer.

- Core pages:
- Core data:
- Admin/owner features:
- Payment/message providers:
- Open questions:

<!-- joripspace:managed:end -->
