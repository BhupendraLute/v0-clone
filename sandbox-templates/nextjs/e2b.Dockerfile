# ---------- Base ----------
FROM node:21-slim

# Install curl
RUN apt-get update && apt-get install -y curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Add compile script early (cached layer)
COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# ---------- App Setup ----------
WORKDIR /home/user/nextjs-app

# Create Next.js app with Tailwind preconfigured
RUN npx --yes create-next-app@latest . \
    --tailwind \
    --eslint \
    --app \
    --import-alias "@/*"

# Install shadcn + ALL components
RUN npx --yes shadcn@latest init --yes -b base --force \
    && npx --yes shadcn@latest add --all --yes

# 🔥 Fix broken import introduced by shadcn
RUN sed -i '/tw-animate-css/d' app/globals.css || true

# ---------- Move app ----------
# Move INCLUDING hidden files
RUN cp -a /home/user/nextjs-app/. /home/user/ \
    && rm -rf /home/user/nextjs-app

WORKDIR /home/user