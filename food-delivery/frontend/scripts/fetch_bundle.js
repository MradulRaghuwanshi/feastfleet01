(async ()=>{
  try{
    const site = 'https://feastfleet.tech';
    const res = await fetch(site);
    if(!res.ok) throw new Error('Failed fetching site: '+res.status);
    const html = await res.text();
    require('fs').writeFileSync('prod_index.html', html, 'utf8');
    const m = html.match(/src="([^"]*main\.[^"]*\.js)"/);
    if(!m){ console.log('NO_BUNDLE_FOUND'); process.exit(0); }
    let bundlePath = m[1];
    let bundleUrl = bundlePath;
    if(!/^https?:\/\//.test(bundlePath)){
      bundleUrl = site.replace(/\/$/, '') + (bundlePath.startsWith('/')?bundlePath:('/'+bundlePath));
    }
    console.log('BUNDLE_URL:'+bundleUrl);
    const bres = await fetch(bundleUrl);
    if(!bres.ok) throw new Error('Failed fetching bundle: '+bres.status);
    const b = await bres.text();
    require('fs').writeFileSync('prod_main.js', b, 'utf8');
    const pats = ['getProjectConfig','CONFIGURATION_NOT_FOUND','AIzaSyAjz7-JdOVMYXHEsb-BOQ0V3MoaGH2Qo_Y','feastfleet-backend-0ozz.onrender.com'];
    for(const p of pats) if(b.includes(p)) console.log('FOUND:'+p);
    console.log('DONE');
  }catch(e){ console.error('ERROR', e && e.message); process.exit(2); }
})();
