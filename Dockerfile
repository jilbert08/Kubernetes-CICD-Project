# ---------- Stage 1: test ----------
# Copies the code and tests, and runs the tests.
# If a test fails, the image build stops here.
FROM node:20-alpine AS test
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY test ./test
RUN npm test

# ---------- Stage 2: production ----------
# Starts again from a clean image and copies ONLY what the app needs to run
# (no tests), so the final image is small and clean.
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=test /app/package.json ./
COPY --from=test /app/src ./src
USER node
EXPOSE 3000
CMD ["node", "src/app.js"]
