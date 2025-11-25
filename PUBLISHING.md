# Publishing Checklist

## Pre-Publishing Tasks

### 1. Code Quality
- [ ] Run `npm run lint` and fix any errors
- [ ] Run `npm run build` to ensure no build errors
- [ ] Test extension manually in VS Code

### 2. Update Metadata
- [ ] Update `publisher` field in `package.json` with your VS Code Marketplace publisher ID
- [ ] Update `author.name` in `package.json`
- [ ] Update `repository.url` with your GitHub repo URL
- [ ] Update `bugs.url` with your issues URL
- [ ] Update `homepage` with your repo URL
- [ ] Update copyright year/name in `LICENSE`

### 3. Branding
- [ ] Create extension icon (128x128 PNG) and save as `icon.png`
- [ ] Add `"icon": "icon.png"` to `package.json`
- [ ] Take screenshots for README (optional but recommended)
- [ ] Update marketplace badges in README with your publisher name

### 4. Documentation
- [ ] Update CHANGELOG.md with release date
- [ ] Review and finalize README.md
- [ ] Add screenshots/GIFs to README (optional)

### 5. Testing
- [ ] Test on macOS
- [ ] Test on Windows (if available)
- [ ] Test on Linux (if available)
- [ ] Test with different Markdown files
- [ ] Test all conversion methods (title bar, context menu, status bar, keyboard)
- [ ] Test settings changes

### 6. Final Build
- [ ] Run `npm install` to ensure clean dependencies
- [ ] Run `npm run build`
- [ ] Run `npm run package` to create VSIX
- [ ] Install VSIX locally and test

---

## Publishing Steps

### First-Time Setup
1. Create a Microsoft account (if you don't have one)
2. Create a publisher at https://marketplace.visualstudio.com/manage
3. Generate a Personal Access Token (PAT):
   - Go to https://dev.azure.com
   - User Settings → Personal Access Tokens
   - Create token with "Marketplace (Publish)" scope

### Publish
```bash
# Login with your PAT
npx vsce login <publisher-name>

# Publish
npx vsce publish

# Or publish with version bump
npx vsce publish minor  # 1.0.0 → 1.1.0
npx vsce publish patch  # 1.0.0 → 1.0.1
```

### Alternative: Upload VSIX
1. Go to https://marketplace.visualstudio.com/manage
2. Click your publisher
3. Click "New extension" → "Visual Studio Code"
4. Upload the `.vsix` file

---

## Post-Publishing
- [ ] Verify extension appears on marketplace
- [ ] Test installation from marketplace
- [ ] Share on social media / dev communities
- [ ] Monitor issues and reviews

