# GitHub Pages Frontend Deployment TODO

## Plan Steps:
- [ ] 1. Update food-delivery/frontend/package.json: Add homepage URL.
- [ ] 2. Create .github/workflows/pages-deploy.yml: GitHub Actions workflow.
- [ ] 3. Create food-delivery/frontend/netlify-ready/404.html from _redirects for SPA routing.
- [ ] 4. Fresh build: cd food-delivery/frontend && npm install && npm run build → copy to netlify-ready/.
- [ ] 5. Update .gitignore (add netlify.toml if switching fully).
- [ ] 6. Commit/push all changes to main → triggers deploy.
- [ ] 7. Monitor https://github.com/MradulRaghuwanshi/feastfleet01/actions.
- [ ] 8. Test https://MradulRaghuwanshi.github.io/feastfleet01 (routing, APIs).

**Live URL (post-deploy):** https://MradulRaghuwanshi.github.io/feastfleet01
**Repo:** https://github.com/MradulRaghuwanshi/feastfleet01
