# CI/CD Pipeline: GitHub Actions → Docker Hub → Kubernetes

## Project Objective
Automatically **test, build, push and deploy** a containerized Node.js application to Kubernetes every time code is pushed to the `main` branch.

## Architecture

```
 Developer
    │  git push (main)
    ▼
 GitHub repository ──triggers──► GitHub Actions workflow (.github/workflows/deploy.yml)
                                   │
          ┌────────────────────────┴───────────────────────────┐
          │ Job 1: build-and-push                              │
          │  checkout → npm test → docker build (multi-stage)  │
          │  → push image to Docker Hub (:latest and :<sha>)   │
          └────────────────────────┬───────────────────────────┘
                                   │ needs
          ┌────────────────────────┴───────────────────────────┐
          │ Job 2: deploy                                      │
          │  create Kind cluster → kubectl apply -f k8s/       │
          │  → rollout status → curl the app (verify)          │
          └────────────────────────┬───────────────────────────┘
                                   ▼
                     Docker Hub image also runs on local Minikube
                     (kubectl apply -f k8s/ + rollout restart)
```

| Component | Role |
|---|---|
| `src/app.js` | Node.js web app (port 3000): `/` shows message + version, `/health` returns `{"status":"ok"}` |
| `test/app.test.js` | Automated tests (Node built-in test runner) |
| `Dockerfile` | Multi-stage build: stage 1 runs tests, stage 2 is a small production image |
| GitHub Actions | CI/CD engine, triggered on every push to `main` |
| Docker Hub | Container registry storing the images |
| Kind | Kubernetes cluster created inside the GitHub runner for automated deployment |
| Minikube | Local Kubernetes cluster for manual verification |
| `k8s/deployment.yaml` | 2 replicas, rolling update, probes, resource limits |
| `k8s/service.yaml` | NodePort Service: port 80 → container 3000, node port 30080 |

## Project Structure
```
Kubernetes-CICD-Project/
├── .github/workflows/deploy.yml   # CI/CD pipeline
├── k8s/
│   ├── deployment.yaml
│   └── service.yaml
├── src/app.js                     # application
├── test/app.test.js               # tests
├── Dockerfile                     # multi-stage build
├── .dockerignore
├── package.json
├── docs/screenshots/              # pipeline evidence
└── README.md
```

## Pipeline Stages

| Job | Step | What it does |
|---|---|---|
| build-and-push | Run tests | `npm test` – the pipeline stops if a test fails |
| | Build image | Multi-stage Docker build (tests run again inside the build) |
| | Push image | Pushes `<user>/cicd-demo:latest` and `<user>/cicd-demo:<commit-sha>` to Docker Hub |
| deploy | Create cluster | Kind cluster inside the runner |
| | Apply manifests | Sets the image to this commit's tag, `kubectl apply -f k8s/` |
| | Rollout | `kubectl rollout status` waits until the new Pods are ready |
| | Verify | Port-forward and `curl` `/` and `/health` |

Tagging every image with the **commit SHA** means each deployment runs exactly the code of that commit, and any version can be redeployed.

## Multi-stage Dockerfile

| Stage | Base | Purpose |
|---|---|---|
| `test` | node:20-alpine | Copy code and tests, run `npm test` |
| `production` | node:20-alpine | Copy only `package.json` and `src/`, run as non-root user `node` |

Result: a small image without test files; a failing test stops the build.

## Setup Instructions

### Prerequisites
Docker Desktop, Minikube, kubectl, Git, a GitHub account and a Docker Hub account.

### 1. Run and test locally
```powershell
docker build -t cicd-demo:local .
docker run -d -p 3000:3000 --name cicd-demo-local cicd-demo:local
# open http://localhost:3000
docker stop cicd-demo-local; docker rm cicd-demo-local
```

### 2. Configure secrets
Docker Hub → Account settings → Personal access tokens → create a **Read & Write** token.
GitHub repo → Settings → Secrets and variables → Actions → add:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

### 3. Trigger the pipeline
```powershell
git add .
git commit -m "your change"
git push
```
Watch it in the repository's **Actions** tab.

## Deployment Guide (local Minikube)
```powershell
minikube start --driver=docker
kubectl apply -f k8s/
kubectl rollout status deployment/cicd-demo
kubectl get deploy,pods,svc
minikube service cicd-demo-service --url
```
After the pipeline pushes a new image:
```powershell
kubectl rollout restart deployment/cicd-demo
kubectl rollout status deployment/cicd-demo
```
`imagePullPolicy: Always` makes the new Pods pull the newest `:latest` image.

## Pipeline Test (code change)
1. Changed `APP_VERSION` in `src/app.js` from `1.0.0` to `2.0.0`.
2. Pushed to `main` → the workflow ran automatically and passed.
3. The deploy job's *Verify the app responds* step showed `Version: 2.0.0`.
4. On Minikube, `kubectl rollout restart` showed the new version in the browser.

## Evidence
Screenshots in [`docs/screenshots`](docs/screenshots):

| File | Shows |
|---|---|
| `01-local-docker-run.png` | App running locally in Docker |
| `02-actions-success.png` | Successful workflow run (both jobs green) |
| `03-build-push-log.png` | Build and push step log |
| `04-deploy-log.png` | Rollout and verify step log |
| `05-dockerhub-tags.png` | Image tags on Docker Hub |
| `06-minikube-v2.png` | Updated app (v2.0.0) on Minikube |

## Cleanup
```powershell
kubectl delete -f k8s/
minikube stop
```

## Author
**Jilbert Ekka** – RHCSA Certified | Linux & DevOps
