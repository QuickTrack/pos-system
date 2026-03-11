# Push to GitHub Instructions

## Option 1: Using GitHub CLI (Recommended)

1. **Login to GitHub:**
   ```bash
   gh auth login
   ```
   - Select `GitHub.com`
   - Select `HTTPS`
   - Select `Login with a web browser`
   - Copy the one-time code shown in terminal
   - Authorize on the browser

2. **Create the repository:**
   ```bash
   gh repo create nairobi-pos --public --source=. --push
   ```

## Option 2: Using Personal Access Token

1. **Create a GitHub PAT:**
   - Go to: https://github.com/settings/tokens
   - Generate new token (classic)
   - Select scope: `repo`
   - Copy the token

2. **Run these commands:**
   ```bash
   # Replace YOUR_GITHUB_TOKEN with your actual token
   export GH_TOKEN="YOUR_GITHUB_TOKEN"
   
   # Create repository using GitHub API
   curl -L -X POST https://api.github.com/user/repos \
     -H "Accept: application/vnd.github+json" \
     -H "Authorization: Bearer $GH_TOKEN" \
     -d '{"name":"nairobi-pos","private":false}'
   
   # Change remote to GitHub
   git remote set-url origin https://YOUR_GITHUB_TOKEN@github.com/YOUR_USERNAME/nairobi-pos.git
   
   # Push to GitHub
   git push -u origin main
   ```

## Option 3: Manual Steps

1. Go to https://github.com/new
2. Create a new repository named `nairobi-pos`
3. Run these commands in your terminal:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/nairobi-pos.git
   git branch -M main
   git push -u origin main
   ```
