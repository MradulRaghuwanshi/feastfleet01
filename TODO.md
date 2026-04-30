# Deployment TODO - GitHub Pages & Netlify

## Current Status
✅ GitHub Actions workflow configured (`pages-deploy.yml`)  
✅ package.json homepage set  
✅ netlify.toml configured  
✅ SPA routing files (_redirects, 404.html) ready  

## Steps to Complete (Execute in order)

### 1. Fresh Frontend Build ✅
```
cd food-delivery/frontend
npm ci
npm run build
```

### 2. Update Deploy Directory [PENDING]
```
rm -rf food-delivery/frontend/netlify-ready/*
cp -r food-delivery/frontend/build/* food-delivery/frontend/netlify-ready/
```

### 3. Commit & Push (Triggers Auto-Deploy) [PENDING]
```
git add .
git commit -m "Fresh production build for GitHub Pages & Netlify"
git push origin main
```

### 4. Monitor & Test [PENDING]
- GitHub Actions: https://github.com/MradulRaghuwanshi/feastfleet01/actions
- Live URLs:
  - GitHub Pages: https://MradulRaghuwanshi.github.io/feastfleet01
  - Netlify: [TBD - check Netlify dashboard]

### 5. Post-Deploy Tests [PENDING]
- [ ] Homepage loads, restaurants display
- [ ] Routing works (login, menu, checkout)
- [ ] Auth works (Firestore login)
- [ ] API calls succeed (orders, cart)
- [ ] Mobile responsive

### 6. Production Config [PENDING]
- [ ] Set GitHub Pages env vars: REACT_APP_API_URL, Firebase config
- [ ] Update README with live URLs

**Next step: Execute step 1-3 above**

