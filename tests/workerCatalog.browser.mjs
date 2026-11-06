import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const base = process.env.UREMO_UI_TEST_ORIGIN;
test("workers browse roles and projects separately, with permission-aware checkout and profile delivery", { skip: !base, timeout: 420000 }, async t => {
  const origin = new URL(base).origin;
  assert.ok(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch({ executablePath: process.env.UREMO_CHROMIUM_PATH || undefined, headless: true });
  t.after(() => browser.close());
  const id = digit => digit.repeat(24);
  const role = { _id: id("1"), category: "design", title: "Interface designer", description: "Specialize in interface design.", requirements: "Portfolio", active: true };
  const project = { _id:id("2"), kind:"project", needsReview:false, projectId:id("3"), workPositionId:role._id, workPositionTitle:role.title,
    projectTitle:"Navigation redesign", title:"Navigation redesign", category:"design", description:"Evaluate navigation flows.", status:"published", availability:"available",
    applyEnabled:false, rentEnabled:true, rentPrice:12, rentalDays:7, buyEnabled:true, buyPrice:70, currency:"USD", revision:"r1" };
  const legacy = { ...project, _id:id("6"), title:"Historical mixed listing", kind:"legacy", needsReview:true, applyEnabled:true };
  const grant = { _id:id("4"), opportunityId:project._id, projectId:project.projectId, title:project.title, type:"buy", amount:70, currency:"USD", startsAt:"2025-01-01T00:00:00Z", endsAt:null, active:true };
  const old = { ...grant, _id:id("7"), opportunityId:legacy._id, projectId:null, title:"Historical acquisition" };
  let eligible = false, paid = false;
  const writes = [];
  async function open(signedIn) {
    const context = await browser.newContext({ viewport:{width:390,height:844} });
    if(signedIn) await context.addInitScript(() => { localStorage.setItem("token","local-browser-fixture"); localStorage.setItem("user",JSON.stringify({name:"Fixture Worker",role:"user", email:"qa@example.test"})); });
    await context.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      if (!["localhost","127.0.0.1"].includes(url.hostname)) return route.abort();
      if (!path.startsWith("/api/")) return route.continue();
      const authed = !!req.headers().authorization;
      const view = { ...project, canRent:authed && eligible, canBuy:authed };
      let body = {};
      if (path === "/api/work-positions") body = [role];
      if (path === "/api/opportunities") body = {opportunities:[view,legacy]};
      if (path === "/api/opportunities/"+project._id) body = {opportunity:view};
      if (path === "/api/workspace/project/"+project.projectId) body = { acquiredProject: {
        title: project.title, description: project.description, accessType: "rent",
        endsAt: new Date(Date.now() + 5000).toISOString(), handoff: "Time-limited project handoff",
      } };
      if (path === "/api/opportunities/"+legacy._id) body = {opportunity:legacy};
      if (path === "/api/wallet/balance") body = {balance:90,spendable:90};
      if (req.method() === "POST" && path === "/api/opportunities/"+project._id+"/buy") {
        writes.push(req.postDataJSON()); paid = true; body = {ok:true,grant,walletBalance:20};
      }
      if (path === "/api/opportunities/mine") body = {grants:paid?[grant,old]:[old]};
      if (path === "/api/opportunities/"+project._id+"/access") body = {grant,deliverable:"Project delivery notes"};
      if (path === "/api/opportunities/"+legacy._id+"/access") body = {grant:old,deliverable:"Original historical handoff"};
      await route.fulfill({ status:200, json:body });
    });
    const page=await context.newPage();page.setDefaultTimeout(25000);
    return page;
  }
  const visit=(p,path)=>p.goto(origin+path,{waitUntil:"domcontentloaded",timeout:100000});
  const guest=await open(false);
  await visit(guest,"/explore-services?intent=earn");
  await guest.getByRole("heading",{name:"Open roles",exact:true}).waitFor();
  const roleCard = guest.locator("article").filter({hasText:role.title});
  assert.equal(await roleCard.getByRole("link",{name:"Apply for free"}).getAttribute("href"),"/login?next="+encodeURIComponent("/apply-to-work?positionId="+role._id));
  assert.doesNotMatch(await roleCard.innerText(),/rent|full access|buy/i);
  await visit(guest,"/explore-services?intent=rent");
  await guest.getByRole("heading",{name:"Rent projects",exact:true}).waitFor();
  await guest.getByRole("link",{name:"View project"}).click();
  await guest.getByRole("link",{name:"Sign in to check rental eligibility"}).waitFor();
  await guest.getByRole("link",{name:"Sign in for Full Access"}).waitFor();
  assert.equal(await guest.locator('main a[href*="/apply-to-work"], aside a[href*="/apply-to-work"]').count(),0);
  await visit(guest,"/opportunities/"+legacy._id);
  await guest.getByRole("heading",{name:"Project offer unavailable"}).waitFor();
  await guest.context().close();
  const worker=await open(true);
  await visit(worker,"/projects/full-access");
  await worker.getByRole("link",{name:"View project"}).click();
  await worker.getByRole("link",{name:"View specialization"}).waitFor();
  assert.equal(await worker.getByRole("button",{name:"Review rental"}).count(),0);
  assert.equal(await worker.getByRole("link",{name:"View specialization"}).getAttribute("href"),"/open-roles?role="+role._id);
  eligible=true;
  await worker.reload({waitUntil:"domcontentloaded"});
  await worker.getByRole("button",{name:"Review rental"}).click();
  await worker.getByRole("button",{name:"Cancel"}).click();
  assert.equal(writes.length,0);
  eligible=false;
  await worker.reload({waitUntil:"domcontentloaded"});
  await worker.getByRole("button",{name:"Review Full Access"}).click();
  await worker.getByRole("button",{name:/Confirm .*70.* payment/}).click();
  await worker.getByText("Project delivery notes",{exact:true}).waitFor({timeout:100000});
  assert.equal(new URL(worker.url()).pathname,"/profile");
  assert.equal(new URL(worker.url()).searchParams.get("grant"),grant._id);
  assert.equal(writes.length,1);assert.equal(writes[0].expectedAmount,70);assert.ok(writes[0].requestId);
  assert.equal(await worker.getByRole("link",{name:"Open project",exact:true}).first().getAttribute("href"),"/workspace/project/"+project.projectId);
  const history=worker.locator("article").filter({hasText:old.title});
  await history.getByRole("button",{name:"Show access details"}).click();
  await history.getByText("Original historical handoff").waitFor();
  assert.equal(await worker.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  await visit(worker,"/workspace/project/"+project.projectId);
  await worker.getByText("Time-limited project handoff",{exact:true}).waitFor();
  await worker.getByText("This project's rental term has ended.",{exact:true}).waitFor({timeout:20000});
  assert.equal(await worker.getByText("Time-limited project handoff",{exact:true}).count(),0);
});
