import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const base = process.env.UREMO_UI_TEST_ORIGIN;
test("workers browse roles and projects separately, with permission-aware checkout and profile delivery", { skip: !base, timeout: 420000 }, async t => {
  const origin = new URL(base).origin;
  assert.ok(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch({ executablePath: process.env.UREMO_CHROMIUM_PATH || undefined, headless: true, args: ["--disable-gpu"] });
  t.after(() => browser.close());
  const id = digit => digit.repeat(24);
  const role = { _id: id("1"), category: "design", title: "Interface designer", description: "Specialize in interface design.", requirements: "Portfolio\nExplain your decisions", active: true,
    experienceLevel: "intermediate", workMode: "remote", locationEligibility: "Europe", timeCommitment: "By project", skills: ["Prototyping"], responsibilities: ["Review interface prototypes."] };
  const minimalRole = { _id: id("9"), category: "writing", title: "Style editor", active: true };
  const project = { _id:id("2"), kind:"project", needsReview:false, projectId:id("3"), workPositionId:role._id, workPositionTitle:role.title,
    projectTitle:"Navigation redesign", title:"Navigation redesign", category:"design", description:"Evaluate navigation flows.", status:"published", availability:"available",
    applyEnabled:false, rentEnabled:true, rentPrice:12, rentalDays:7, buyEnabled:true, buyPrice:70, currency:"USD", revision:"r1" };
  const legacy = { ...project, _id:id("6"), title:"Historical mixed listing", kind:"legacy", needsReview:true, applyEnabled:true };
  const grant = { _id:id("4"), opportunityId:project._id, projectId:project.projectId, title:project.title, type:"buy", amount:70, currency:"USD", startsAt:"2025-01-01T00:00:00Z", endsAt:null, active:true };
  const old = { ...grant, _id:id("7"), opportunityId:legacy._id, projectId:null, title:"Historical acquisition" };
  let eligible = false, paid = false, simulateRoleOutage = false;
  const writes = [];
  async function open(signedIn, accountRole = "user") {
    const context = await browser.newContext({ viewport:{width:390,height:844} });
    if(signedIn) await context.addInitScript(role => { localStorage.setItem("token","local-browser-fixture"); localStorage.setItem("user",JSON.stringify({name:"Fixture Worker",role, email:"qa@example.test"})); }, accountRole);
    await context.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      if (!["localhost","127.0.0.1"].includes(url.hostname)) return route.abort();
      if (!path.startsWith("/api/")) return route.continue();
      const authed = !!req.headers().authorization;
      const view = { ...project, canRent:authed && eligible, canBuy:authed };
      let body = {};
      if (path === "/api/work-positions" && simulateRoleOutage) return route.fulfill({ status:503, json:{message:"Unavailable"} });
      if (path === "/api/work-positions") body = [role,minimalRole];
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
  await guest.getByRole("searchbox",{name:"Search roles"}).fill("prototyping");
  assert.equal(await guest.locator("article").count(),1);
  await roleCard.getByRole("button",{name:"View brief for "+role.title}).click();
  await roleCard.getByText("Review interface prototypes.",{exact:true}).waitFor();
  await roleCard.getByText("Explain your decisions",{exact:true}).waitFor();
  assert.equal(new URL(guest.url()).searchParams.get("role"),role._id);
  assert.equal(await roleCard.getByRole("link",{name:"Edit role"}).count(),0);
  await guest.getByRole("button",{name:"Filters",exact:true}).click();
  await guest.getByRole("combobox",{name:"Specialization",exact:true}).selectOption("writing");
  await guest.getByRole("heading",{name:"No matching roles"}).waitFor();
  await guest.getByRole("button",{name:"Clear filters"}).click();
  assert.equal(await guest.locator("article").count(),2);
  await visit(guest,"/open-roles?role="+minimalRole._id);
  const archivedShape=guest.locator("article").filter({hasText:minimalRole.title});
  await archivedShape.getByRole("button",{name:"Hide brief for "+minimalRole.title}).waitFor();
  assert.doesNotMatch(await archivedShape.innerText(),/remote|intermediate|portfolio/i);
  assert.equal(await guest.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  simulateRoleOutage = true;
  await visit(guest,"/open-roles?role="+id("a"));
  await guest.getByRole("heading",{name:"Roles couldn’t be loaded"}).waitFor();
  simulateRoleOutage = false;
  await guest.getByRole("button",{name:"Try again"}).click();
  await guest.getByText(/This role is no longer open/).waitFor();
  await guest.getByRole("button",{name:"Browse available roles"}).click();
  assert.equal(new URL(guest.url()).searchParams.has("role"),false);
  const admin=await open(true,"admin");
  await visit(admin,"/open-roles?role="+role._id);
  const editLink=admin.locator("article").filter({hasText:role.title}).getByRole("link",{name:"Edit role"});
  assert.equal(await editLink.getAttribute("href"),"/admin/work-positions?edit="+role._id);
  await admin.context().close();
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
