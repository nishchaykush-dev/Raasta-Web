var $=function(i){return document.getElementById(i)};
function L(t,c,k){return{t:t,c:c,k:k}}function G(t,g){return{t:t,g:g}}function S(t,i,it){return{t:t,i:i,it:it}}
var SEC=[
S('About Us','Demo Bijli Seva Nigam (DBSN) is a pretend electricity distribution company made for a hackathon.',[
 L('Profile','DBSN supplies electricity to about 41 lakh pretend consumers in 12 districts.\n- Established: 2005 (demo)\n- Sub-divisions: 310\n- Feeders: 2,150'),
 L('Vision & Mission','Vision: reliable and affordable power for every household.\nMission:\n- Serve every consumer with respect\n- Keep outages short\n- Offer every service online'),
 L('Board of Directors','Name | Role\nA. Verma | Chairman\nS. Kaur | Managing Director\nR. Iyer | Director (Finance)\nP. Nair | Director (Technical)'),
 L('Organisation Chart','Corporate Office → 3 Zones → 12 Circles → 48 Divisions → 310 Sub-divisions.'),
 L('Annual Reports','- Annual Report 2025-26\n- Annual Report 2024-25\n- Annual Report 2023-24\nDownloads are not available in this demo.')]),
S('Consumer Services','Services for existing consumers. Choose a group or a service.',[
 G('Billing & Payments',[
  L('Pay Your Bill','Pay your electricity bill online using your 10-digit consumer account number.','pay'),
  L('View / Download Bill','Enter your account number to see your latest bill.','view'),
  L('Bill Payment Centres','District | Centre | Hours\nCity A | Main Cash Counter | 9 am – 5 pm\nCity B | Sub-division Office | 9 am – 4 pm\nCity C | Bijli Bill Branch | 10 am – 6 pm'),
  L('Duplicate Receipt','To get a duplicate receipt:\n- Keep your payment reference ready\n- Visit any bill payment centre\n- Ask for a duplicate receipt (fee ₹10)'),
  L('Online Payment Grievance','If money was deducted but the bill still shows unpaid:\n- Note the transaction reference\n- Wait 48 hours\n- Then register a complaint with that reference')]),
 G('Meter Services',[
  L('Meter Reading Schedule','Zone | Reading dates\nNorth | 1st – 5th\nCentral | 6th – 12th\nSouth | 13th – 20th'),
  L('Meter Testing Request','If you think your meter runs fast, apply for a meter test.\n- Fee: ₹250\n- Test within 7 working days'),
  L('Meter Replacement','Faulty or burnt meters are replaced free of cost.\n- Report the fault\n- A technician visits in 3 working days')]),
 G('Name / Load Change',[
  L('Change of Name','Documents needed:\n- Latest bill\n- Sale deed or rent agreement\n- Photo ID of the new owner'),
  L('Load Extension / Reduction','Apply to change your sanctioned load. A site visit is made before approval.'),
  L('Category Change','Move between Domestic and Commercial category by applying at your sub-division office.')]),
 G('Consumer Grievances',[
  L('Billing Dispute','If your bill looks wrong, ask for a bill review within 30 days of receiving it.'),
  L('Supply Interruption','Report power cuts to the 24x7 helpline. Planned cuts are announced 24 hours before.'),
  L('Escalation Matrix','Level | Officer | Time limit\n1 | Sub-division Officer | 7 days\n2 | Division Engineer | 15 days\n3 | Circle Head | 30 days')]),
 L('Download Forms','- Change of Name form\n- Load change form\n- Meter test form\n- Category change form\nDownloads are not available in this demo.')]),
S('Tariff','Rates are set by the regulatory commission. All rates here are made-up demo rates.',[
 L('Domestic Tariff','Units per month | Rate per unit\nUp to 50 | ₹2.00\n51 – 150 | ₹2.50\n151 – 250 | ₹5.25\n251 – 500 | ₹6.30\nAbove 500 | ₹7.10'),
 L('Commercial & Industrial Tariff','Category | Fixed charge | Energy charge\nShops | ₹120 per kW | ₹7.00\nSmall industry | ₹150 per kW | ₹6.50\nLarge industry | ₹300 per kVA | ₹6.00'),
 L('Agricultural Tariff','Farm pumps are billed at a subsidised rate.\n- Up to 5 HP: ₹0.90 per unit\n- Above 5 HP: ₹1.40 per unit'),
 L('Tariff Calculator','Enter the units used to estimate a domestic bill.','calc'),
 L('Fixed Charges & Surcharges','- Fixed charge: ₹50 per kW per month\n- FPPAS surcharge: changes every quarter\n- Electricity duty: 5%\n- Late payment: 1.5% per month')]),
S('Projects','Network upgrades across the DBSN area.',[
 L('Ongoing Projects','Project | Progress\nNew 132 kV substation, City B | 70%\nUnderground cabling, City A | 45%\nFeeder upgrade, Zone North | 20%'),
 L('Completed Projects','- 33 kV ring main, City C (2025)\n- 120 transformers replaced (2025)\n- Solar-powered pump feeders (2024)'),
 L('Smart Metering Programme','Smart meters show your usage and reduce wrong bills.\n- 8 lakh installed\n- 20 lakh planned by 2028'),
 L('Feeder Separation','Separate feeders for farms and villages give villages 24-hour supply.')]),
S('Tenders','Tenders for works and supplies.',[
 L('Active Tenders','Tender no. | Work | Last date\nT-101 | Supply of 11 kV cables | 20 Nov 2026\nT-102 | Transformer repair | 28 Nov 2026\nT-103 | Meter boxes | 5 Dec 2026'),
 L('Archived Tenders','- T-088 Pole supply (closed)\n- T-091 Line works, City C (closed)'),
 L('Vendor Registration','To register as a vendor:\n- Fill the vendor form\n- Attach PAN and GST certificate\n- Submit at the Corporate Office')]),
S('Circulars','Official notices for consumers and staff.',[
 L('Latest Circulars','- 20 Oct 2026: Revised FPPAS surcharge\n- 12 Oct 2026: Rooftop solar subsidy vendors\n- 03 Oct 2026: Maintenance of 33 kV feeders'),
 L('Tariff Orders','- Tariff Order 2026-27\n- Tariff Order 2025-26\n- True-up Order 2024-25'),
 L('Office Orders','- Holiday list 2027\n- Cash counter timings in festival weeks')]),
S('Nearest Offices','Find a DBSN office near you.',[
 L('District Offices','District | Office | Phone\nCity A | Circle Office | 011-5550-101\nCity B | Circle Office | 011-5550-102\nCity C | Circle Office | 011-5550-103'),
 L('Sub-division Offices','Visit your sub-division office for billing and meter work. Open 10 am – 5 pm, Monday to Saturday.'),
 L('Customer Care Centres','- City A: Gandhi Road\n- City B: Station Road\n- City C: Market Square\nOpen 9 am – 6 pm.')]),
S('Careers','Join DBSN.',[
 L('Current Openings','Post | Vacancies | Last date\nJunior Engineer | 40 | 30 Nov 2026\nLineman | 120 | 15 Dec 2026\nAccounts Clerk | 25 | 15 Dec 2026'),
 L('Apprenticeship','ITI students can apply for one-year apprenticeships.\n- Stipend: ₹8,000 per month'),
 L('Results & Notices','- Lineman exam result 2026\n- Junior Engineer admit card')]),
S('RTI','Right to Information.',[
 L('About RTI','Any citizen can ask for information held by DBSN under the RTI Act.'),
 L('How to File an RTI','- Write your question clearly\n- Pay the ₹10 fee\n- Send it to the Public Information Officer\n- Expect a reply within 30 days'),
 L('Public Information Officers','Office | Officer\nCorporate Office | M. Reddy\nZone North | K. Singh\nZone South | L. Das'),
 L('RTI Fees','- Application fee: ₹10\n- Photocopy: ₹2 per page\n- BPL applicants: no fee')]),
S('Solar Connection','Install rooftop solar and earn credits on your bill.',[
 L('Rooftop Solar Scheme','Make power on your own roof. Extra power goes to the grid and is credited to your bill.'),
 L('Eligibility','- A shade-free roof area\n- A valid DBSN connection\n- No pending dues'),
 L('Subsidy Details','Capacity | Subsidy\nUp to 2 kW | ₹30,000 per kW\n2 – 3 kW | ₹18,000 per kW\nAbove 3 kW | Fixed ₹78,000'),
 L('Apply for Net Metering','Fill this form to apply.','solar'),
 L('Empanelled Vendors','- SunBright Energy\n- GreenRoof Solutions\n- Surya Installers')]),
S('New Connection','Apply for a new electricity connection.',[
 L('Documents Required','- Photo ID\n- Address proof\n- Ownership or rent proof\n- Passport photo'),
 L('Application Procedure','- Fill the online form\n- Pay the application fee\n- Site visit in 5 days\n- Connection in 15 days'),
 L('Apply Online','Fill the form to apply.','newc'),
 L('Track Application','Enter your application reference number.','track'),
 L('Security Deposit & Charges','Load | Security deposit\nUp to 2 kW | ₹1,500\n2 – 5 kW | ₹3,000')]),
S('Register Complaints','Report problems with supply, billing or meters.',[
 L('Lodge a Complaint','Fill the form below.','comp'),
 L('Track Complaint','Enter your complaint number.','track'),
 L('Helpline Numbers','Issue | Number\nPower cut | 1912\nBilling | 1800-000-0100\nSafety emergency | 1800-000-0101')]),
S('Contact Us','Reach DBSN.',[
 L('Corporate Office','DBSN Corporate Office, Vidyut Bhawan, Demo City. Monday to Saturday, 10 am – 5 pm.'),
 L('Customer Care','24x7 helpline: 1912\nEmail: care@dbsn.example'),
 L('Feedback','Tell us how we can improve.','feed')])];
var F={view:{f:['Consumer Account Number (10 digits)'],b:'View Bill'},
 comp:{f:['Consumer Account Number','Type of complaint|sel:No supply,Wrong bill,Meter fault,Voltage fluctuation','Details|area'],b:'Submit Complaint',r:'CMP'},
 track:{f:['Reference number'],b:'Track',s:'Status of {0}: under process. Expected completion in 3 working days.'},
 newc:{f:['Applicant name','Mobile number','Address|area','Load required (kW)','Category|sel:Domestic,Commercial,Agricultural'],b:'Submit Application',r:'APP'},
 solar:{f:['Consumer Account Number','Proposed solar capacity (kW)','Roof area (sq ft)'],b:'Apply for Net Metering',r:'SOL'},
 feed:{f:['Your name','Message|area'],b:'Send Feedback',r:'FDB'}};
var R={v:'home',s:0,p:'',tx:'',q:''},acct='';
function esc(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function inr(n){return '₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
function slabs(u){var r=[[50,2],[100,2.5],[100,5.25],[250,6.3],[1e9,7.1]],left=u,t=0,rows=[];r.forEach(function(x){var n=Math.min(left,x[0]);if(n>0){rows.push([n,x[1],n*x[1]]);t+=n*x[1];left-=n}});return{rows:rows,t:t}}
function md(s){var o='',A=s.split('\n'),i=0;while(i<A.length){var l=A[i];
 if(l.indexOf(' | ')>0){var r=[];while(i<A.length&&A[i].indexOf(' | ')>0)r.push(A[i++]);o+='<div class="tw"><table>'+r.map(function(x,j){return '<tr>'+x.split(' | ').map(function(c){return j?'<td>'+c+'</td>':'<th>'+c+'</th>'}).join('')+'</tr>'}).join('')+'</table></div>';continue}
 if(l.slice(0,2)==='- '){var u=[];while(i<A.length&&A[i].slice(0,2)==='- ')u.push('<li>'+A[i++].slice(2)+'</li>');o+='<ul>'+u.join('')+'</ul>';continue}
 o+='<p>'+l+'</p>';i++}return o}
function nav(){var h='<button class="nl" data-n="-1|">Home</button>';
 SEC.forEach(function(s,i){h+='<span class="rel"><button class="nl" data-n="'+i+'|">'+s.t+'</button><div class="dd">'+s.it.map(function(it,j){return it.g?'<div class="rel2"><button class="grp" data-n="'+i+'|'+j+'">'+it.t+'</button><div class="sub">'+it.g.map(function(c,k){return '<button data-n="'+i+'|'+j+'.'+k+'">'+c.t+'</button>'}).join('')+'</div></div>':'<button data-n="'+i+'|'+j+'">'+it.t+'</button>'}).join('')+'</div></span>'});
 $('nav').innerHTML=h}
function get(s,p){var a=p.split('.'),it=SEC[s].it[+a[0]];return a[1]!==undefined?it.g[+a[1]]:it}
function bc(a){return '<div class="bc">'+a.map(function(x){return x[1]!==null?'<button data-n="'+x[1]+'">'+x[0]+'</button> › ':'<b>'+x[0]+'</b>'}).join('')+'</div>'}
function list(s,items,pre){return '<ul class="ls">'+items.map(function(x,j){return '<li><button data-n="'+s+'|'+pre+j+'">'+x.t+'</button>'+(x.g?' <span class="mut">('+x.g.length+' services)</span>':'')+'</li>'}).join('')+'</ul>'}
function side(s,p){return '<b>In this section</b>'+SEC[s].it.map(function(x,j){var on=p===''+j||p.indexOf(j+'.')===0;return '<button class="'+(on?'on':'')+'" data-n="'+s+'|'+j+'">'+x.t+'</button>'+(x.g&&on?x.g.map(function(c,k){return '<button class="in '+(p===j+'.'+k?'on':'')+'" data-n="'+s+'|'+j+'.'+k+'">'+c.t+'</button>'}).join(''):'')}).join('')}
function formHTML(k){var f=F[k];return f.f.map(function(x,i){var a=x.split('|'),t=a[1]||'';return '<label for="f'+i+'">'+a[0]+'</label>'+(t.indexOf('sel:')===0?'<select class="f" id="f'+i+'">'+t.slice(4).split(',').map(function(o){return '<option>'+o+'</option>'}).join('')+'</select>':t==='area'?'<textarea class="f" id="f'+i+'" rows="3"></textarea>':'<input class="f" id="f'+i+'" autocomplete="off">')}).join('')+'<button class="btn" data-a="fs" data-k="'+k+'">'+f.b+'</button><div id="fr"></div>'}
function extra(it){var k=it.k;if(k==='pay')return '<p>Select a payment mode:</p><button class="btn alt" data-a="note" data-m="Login is not available in this demo.">Login &amp; Pay</button><button class="btn" data-a="quick">Quick Pay</button><button class="btn alt" data-a="note" data-m="BBPS payment is not available in this demo.">Pay via BBPS</button><button class="btn alt" data-n="1|0.1">View Bill (without login)</button><div id="nt"></div>';
 if(k==='calc')return '<label for="u">Units used in the month</label><input class="f" id="u" inputmode="numeric" value="312"><button class="btn" data-a="calc">Calculate</button><div id="fr"></div>';
 return k?formHTML(k):''}
function billHTML(a){var b=slabs(312);return '<table><tr><td>Consumer Name</td><td>R. K. Sharma (demo)</td></tr><tr><td>Account No.</td><td id="cno">'+mask(a)+'</td></tr><tr><td>Billing Month</td><td>Oct 2026</td></tr><tr><td>Units Consumed</td><td>312</td></tr><tr><td>Due Date</td><td>10 Nov 2026</td></tr><tr><td>Amount Payable</td><td id="amt"><b>'+inr(b.t)+'</b></td></tr></table>'}
function mask(a){return a.length>=10?a.slice(0,2)+'XXXXXX'+a.slice(-2):a}
function secHTML(s,p){var X=SEC[s],it=p?get(s,p):null,c=[['Home','-1|'],[X.t,p?s+'|':null]],b;
 if(p&&p.indexOf('.')>0){var gi=p.split('.')[0];c.push([get(s,gi).t,s+'|'+gi])}
 if(p)c.push([it.t,null]);
 if(!p)b='<h2>'+X.t+'</h2><p>'+X.i+'</p>'+list(s,X.it,'');
 else if(it.g)b='<h2>'+it.t+'</h2><p>Services in this group:</p>'+list(s,it.g,p+'.');
 else b='<h2>'+it.t+'</h2>'+md(it.c)+extra(it);
 return bc(c)+'<div class="lay"><aside>'+side(s,p)+'</aside><section class="card">'+b+'</section></div>'}
function homeHTML(){var T=[[2,'Tariff'],[10,'New Connection'],[9,'Solar Connection'],[11,'Register Complaints'],[6,'Nearest Offices'],[7,'Careers']];
 return '<div class="hero"><h2>Welcome to Demo Bijli Seva Nigam</h2><p>Services for consumers across 12 districts.</p></div>'+
 '<div class="card fig"><div><b>41 lakh</b>consumers</div><div><b>310</b>sub-divisions</div><div><b>1912</b>24x7 helpline</div></div>'+
 '<div class="card"><h3>Latest notices</h3><ul class="ls"><li><button data-n="5|0">Revised FPPAS surcharge (20 Oct 2026)</button></li><li><button data-n="5|0">Rooftop solar subsidy vendors (12 Oct 2026)</button></li><li><button data-n="3|0">New 132 kV substation, City B: 70% complete</button></li></ul></div>'+
 '<h3>Quick links</h3><div class="tiles">'+T.map(function(x){return '<button class="tile" data-n="'+x[0]+'|">'+x[1]+'</button>'}).join('')+'</div>'}
var cd={},otp='',otpEnd=0,otpSent=0,otpLeft=3,otpX=0,tmr=null,pt=null;
function pad(n){return (n<10?'0':'')+n}
function clr(){if(tmr){clearInterval(tmr);tmr=null}if(pt){clearTimeout(pt);pt=null}}
function brand(n){return /^4/.test(n)?'VISA':/^(5[1-5]|2[2-7])/.test(n)?'MASTERCARD':/^3[47]/.test(n)?'AMEX':/^(60|65|81|82|508)/.test(n)?'RUPAY':''}
function stepper(n){var s=['Bill','Card','OTP','Receipt'];return '<ol class="stp">'+s.map(function(x,i){return '<li class="'+(i<n?'done':i===n?'cur':'')+'"><span>'+(i<n?'✔':i+1)+'</span>'+x+'</li>'}).join('')+'</ol>'}
function sumHTML(){return '<div class="sum"><div><span class="mut">Account No.</span><b>'+mask(acct)+'</b></div><div><span class="mut">Amount payable</span><b>'+inr(slabs(312).t)+'</b></div></div>'}
function sendOtp(){otp=String(Math.floor(100000+Math.random()*900000));otpEnd=Date.now()+300000;otpSent=Date.now();otpLeft=3;otpX=0}
function setE(id,m){$('e-'+id).textContent=m||'';$(id).classList.toggle('bad',!!m);return !m}
function cardGo(){
 var n=$('cn').value.replace(/\D/g,''),h=$('ch').value.trim(),e=$('ce').value,c=$('cv').value.replace(/\D/g,''),em='Enter expiry as MM/YY.',m=/^(\d\d)\/(\d\d)$/.exec(e);
 if(m){var mo=+m[1],yr=2000+(+m[2]),now=new Date();em=mo<1||mo>12?'Month must be between 01 and 12.':(yr<now.getFullYear()||(yr===now.getFullYear()&&mo<now.getMonth()+1))?'This card has expired.':''}
 var r=[setE('cn',n.length===16?'':'Enter the 16-digit card number.'),
  setE('ch',/^[A-Za-z][A-Za-z .'-]{2,39}$/.test(h)?'':'Enter the name as printed on the card.'),
  setE('ce',em),setE('cv',c.length===3?'':'Enter the 3-digit CVV.')];
 if(r.indexOf(false)>-1){var b=document.querySelector('.f.bad');if(b)b.focus();return}
 cd={l4:n.slice(-4),nm:h};sendOtp();R={v:'tx',tx:'otp'};show()}
function otpGo(){
 var v='',i;for(i=0;i<6;i++)v+=$('o'+i).value;
 if(Date.now()>otpEnd)return msg('This OTP has expired. Please resend a new OTP.',1);
 if(otpLeft<=0)return msg('Too many wrong attempts. Please resend OTP.',1);
 if(v.length<6)return msg('Please enter all 6 digits.',1);
 if(v!==otp){otpLeft--;for(i=0;i<6;i++)$('o'+i).value='';$('o0').focus();var w=$('ow');w.classList.remove('shk');void w.offsetWidth;w.classList.add('shk');
  if(otpLeft<=0)$('vb').disabled=true;
  return msg(otpLeft>0?'Incorrect OTP. '+otpLeft+' attempt'+(otpLeft>1?'s':'')+' left.':'Too many wrong attempts. Please resend OTP.',1)}
 R={v:'tx',tx:'proc'};show()}
function tick(){
 var tl=$('tl');if(!tl){clr();return}
 var left=Math.max(0,Math.ceil((otpEnd-Date.now())/1000)),cool=Math.max(0,30-Math.floor((Date.now()-otpSent)/1000)),rs=$('rs'),exp=left===0;
 tl.textContent=pad(Math.floor(left/60))+':'+pad(left%60);tl.classList.toggle('low',left<=60);$('tb').style.width=(left/300*100)+'%';
 if(exp){$('vb').disabled=true;if(!otpX){otpX=1;msg('This OTP has expired. Please resend a new OTP.',1)}}
 rs.disabled=!(exp||otpLeft<=0||cool===0);
 rs.textContent=rs.disabled?'Resend OTP in '+cool+'s':'Resend OTP'}
function after(){
 if(R.v!=='tx')return;
 if(R.tx==='otp'){tick();tmr=setInterval(tick,500);$('o0').focus()}
 if(R.tx==='proc'){var m=['Verifying your OTP…','Contacting your bank…','Confirming your payment…'],i=0;
  tmr=setInterval(function(){i=Math.min(i+1,2);var e=$('ps');if(e)e.textContent=m[i]},1100);
  pt=setTimeout(function(){R={v:'tx',tx:'success'};show()},3600)}}
function txHTML(){var t=R.tx,amt=inr(slabs(312).t);
 if(t==='number')return '<div class="card"><h2>Quick Pay</h2><label for="acct">Consumer Account Number (10 digits)</label><input class="f" id="acct" inputmode="numeric" maxlength="10" autocomplete="off" value="'+acct+'"><div id="fr"></div><button class="btn" data-a="num">Submit</button><button class="btn alt" data-n="-1|">Cancel</button></div>';
 if(t==='confirm')return '<div class="card"><h2>Bill Details</h2>'+billHTML(acct)+'<button class="btn red" data-a="pay">Proceed to Pay</button><button class="btn alt" data-a="quick">Edit Details</button><button class="btn alt" data-n="-1|">Cancel</button></div>';
 if(t==='card')return '<div class="card pop">'+stepper(1)+'<h2>Card Details</h2>'+sumHTML()
  +'<div class="cpv" aria-hidden="true"><div class="top2"><span class="chip"></span><span id="pb"></span></div><div class="cn" id="pn">•••• •••• •••• ••••</div><div class="cr"><div><small>CARD HOLDER</small><span id="ph">YOUR NAME</span></div><div><small>EXPIRES</small><span id="pe">MM/YY</span></div></div></div>'
  +'<label for="cn">Card Number</label><input class="f" id="cn" inputmode="numeric" maxlength="19" autocomplete="off" placeholder="1234 5678 9012 3456"><div class="er" id="e-cn"></div>'
  +'<label for="ch">Card Holder Name</label><input class="f" id="ch" maxlength="40" autocomplete="off" placeholder="Name as printed on card"><div class="er" id="e-ch"></div>'
  +'<div class="two"><div><label for="ce">Expiry (MM/YY)</label><input class="f" id="ce" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="MM/YY"><div class="er" id="e-ce"></div></div>'
  +'<div><label for="cv">CVV</label><input class="f" id="cv" type="password" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="•••"><div class="er" id="e-cv"></div></div></div>'
  +'<p class="mut sm">Demo only: type any dummy details. Never enter a real card on this pretend site.</p>'
  +'<button class="btn red" data-a="card">Pay '+amt+'</button><button class="btn alt" data-a="back">Back</button><button class="btn alt" data-n="-1|">Cancel</button></div>';
 if(t==='otp'){var bx='',i;for(i=0;i<6;i++)bx+='<input class="ob" id="o'+i+'" inputmode="numeric" maxlength="1" autocomplete="'+(i?'off':'one-time-code')+'" aria-label="OTP digit '+(i+1)+'">';
  return '<div class="card pop">'+stepper(2)+'<h2>Verify OTP</h2><p>Enter the 6-digit OTP sent to your registered mobile number for the card ending <b>'+cd.l4+'</b>.</p>'
  +'<div class="ok">Demo mode: no SMS is sent. Your OTP is <b>'+otp+'</b></div>'
  +'<div class="tm"><span>OTP valid for</span><b id="tl" aria-live="off">05:00</b></div><div class="bar"><i id="tb"></i></div>'
  +'<div class="otpr" id="ow">'+bx+'</div><div id="fr"></div>'
  +'<button class="btn red" id="vb" data-a="otpv">Verify</button><button class="btn alt" id="rs" data-a="resend" disabled>Resend OTP in 30s</button><button class="btn alt" data-a="back2">Change Card</button><button class="btn alt" data-n="-1|">Cancel</button></div>'}
 if(t==='proc')return '<div class="card pop">'+stepper(3)+'<div class="proc"><div class="spin" role="img" aria-label="Processing payment"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="38"/><path class="arc" d="M50 12 A38 38 0 1 1 12 50"/><polygon points="12,34 2,52 22,52" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg></div>'
  +'<h2>Processing your payment</h2><p id="ps" role="status" aria-live="polite">Verifying your OTP…</p><p class="mut sm">Please do not refresh or press back.</p></div></div>';
 var d=new Date();return '<div class="card pop">'+stepper(4)+'<h2 style="color:var(--ok)">✔ Payment successful (demo)</h2><p>No real money moved.</p><div class="ok cr24" role="status">⏱ Your payment will be credited within 24 hours.</div><div class="card"><h3>Record slip</h3><table><tr><td>Amount</td><td>'+inr(slabs(312).t)+'</td></tr><tr><td>Account</td><td>'+mask(acct)+'</td></tr><tr><td>Date and time</td><td>'+d.toLocaleString()+'</td></tr><tr><td>Reference</td><td>DEMO-'+String(d.getTime()).slice(-6)+'</td></tr></table><p class="mut">This is your own record, not an official complaint. If a payment was a mistake, tell your bank at once and show this.</p></div><button class="btn" data-n="-1|">Back to Home</button></div>'}
function flat(){var o=[];SEC.forEach(function(s,i){s.it.forEach(function(it,j){if(it.g)it.g.forEach(function(c,k){o.push([i,j+'.'+k,c])});else o.push([i,''+j,it])})});return o}
function searchHTML(){var q=R.q.toLowerCase(),m=q?flat().filter(function(x){return (x[2].t+' '+x[2].c).toLowerCase().indexOf(q)>-1}):[];
 return '<div class="card"><h2>Search results for “'+esc(R.q)+'”</h2>'+(m.length?'<ul class="ls">'+m.map(function(x){return '<li><button data-n="'+x[0]+'|'+x[1]+'">'+x[2].t+'</button> <span class="mut">in '+SEC[x[0]].t+'</span></li>'}).join('')+'</ul>':'<p>No results found.</p>')+'</div>'}
function show(){clr();$('view').innerHTML=R.v==='home'?homeHTML():R.v==='tx'?txHTML():R.v==='search'?searchHTML():secHTML(R.s,R.p);window.scrollTo(0,0);after()}
function msg(h,bad){$('fr').innerHTML='<div class="'+(bad?'err':'ok')+'">'+h+'</div>'}
function act(a,el){
 if(a==='search'){R={v:'search',q:$('q').value.trim()};show()}
 else if(a==='note')$('nt').innerHTML='<div class="ok">'+el.dataset.m+'</div>';
 else if(a==='quick'){R={v:'tx',tx:'number'};show()}
 else if(a==='num'){var v=$('acct').value.replace(/\D/g,'');acct=v;if(v.length<10)msg('Please enter all 10 digits.',1);else{R={v:'tx',tx:'confirm'};show()}}
 else if(a==='pay'||a==='back2'){R={v:'tx',tx:'card'};show()}
 else if(a==='back'){R={v:'tx',tx:'confirm'};show()}
 else if(a==='card')cardGo();
 else if(a==='otpv')otpGo();
 else if(a==='resend'){sendOtp();show();msg('A new OTP has been sent. The demo OTP is shown above.')}
 else if(a==='calc'){var u=Math.max(0,+$('u').value||0),b=slabs(u);msg('<table><tr><th>Units</th><th>Rate</th><th>Amount</th></tr>'+b.rows.map(function(r){return '<tr><td>'+r[0]+'</td><td>₹'+r[1]+'</td><td>'+inr(r[2])+'</td></tr>'}).join('')+'<tr><td colspan="2"><b>Total energy charge</b></td><td><b>'+inr(b.t)+'</b></td></tr></table>')}
 else if(a==='fs'){var k=el.dataset.k,f=F[k],vals=f.f.map(function(x,i){return $('f'+i).value.trim()});
  if(vals.some(function(x){return !x}))return msg('Please fill in every field.',1);
  if(k==='view'){var d=vals[0].replace(/\D/g,'');if(d.length!==10)return msg('Please enter all 10 digits.',1);return msg(billHTML(d))}
  if(f.s)return msg(esc(f.s.replace('{0}',vals[0])));
  msg('✔ Submitted. Your reference number is <b>'+f.r+'-'+String(Math.floor(100000+Math.random()*899999))+'</b>. Please keep it safe.')}}
document.addEventListener('click',function(e){
 var n=e.target.closest('[data-n]'),a=e.target.closest('[data-a]');
 if(n){var x=n.dataset.n.split('|'),s=+x[0];R=s<0?{v:'home'}:{v:'sec',s:s,p:x[1]};show();$('nav').classList.add('x');if(document.activeElement)document.activeElement.blur()}
 else if(a)act(a.dataset.a,a)});
$('nav').addEventListener('pointerover',function(){this.classList.remove('x')});
$('q').addEventListener('keydown',function(e){if(e.key==='Enter')act('search')});
document.addEventListener('input',function(e){var t=e.target,id=t.id,d;
 if(t.classList.contains('bad')&&$('e-'+id))setE(id,'');
 if(id==='cn'){d=t.value.replace(/\D/g,'').slice(0,16);t.value=d.replace(/(.{4})/g,'$1 ').trim();$('pn').textContent=(d+'••••••••••••••••').slice(0,16).replace(/(.{4})/g,'$1 ').trim();$('pb').textContent=brand(d)}
 else if(id==='ch'){t.value=t.value.replace(/[^A-Za-z .'-]/g,'');$('ph').textContent=t.value.toUpperCase()||'YOUR NAME'}
 else if(id==='ce'){d=t.value.replace(/\D/g,'').slice(0,4);if(d.length===1&&+d>1)d='0'+d;t.value=d.length>2?d.slice(0,2)+'/'+d.slice(2):d;$('pe').textContent=t.value||'MM/YY'}
 else if(id==='cv')t.value=t.value.replace(/\D/g,'').slice(0,3);
 else if(t.classList.contains('ob')){t.value=t.value.replace(/\D/g,'').slice(-1);var n=$('o'+(+id.slice(1)+1));if(t.value&&n)n.focus()}});
document.addEventListener('keydown',function(e){var t=e.target,id=t.id;
 if(e.key==='Enter'&&(id==='cn'||id==='ch'||id==='ce'||id==='cv'))act('card');
 else if(t.classList.contains('ob')){var i=+id.slice(1);
  if(e.key==='Enter')act('otpv');
  else if(e.key==='Backspace'&&!t.value&&i>0){$('o'+(i-1)).focus()}
  else if(e.key==='ArrowLeft'&&i>0){e.preventDefault();$('o'+(i-1)).focus()}
  else if(e.key==='ArrowRight'&&i<5){e.preventDefault();$('o'+(i+1)).focus()}}});
document.addEventListener('paste',function(e){var t=e.target;if(!t.classList||!t.classList.contains('ob'))return;
 e.preventDefault();var d=((e.clipboardData||window.clipboardData).getData('text')||'').replace(/\D/g,'').slice(0,6);
 for(var i=0;i<d.length;i++)$('o'+i).value=d[i];$('o'+Math.min(d.length,5)).focus()});
document.addEventListener('focusin',function(e){if(e.target.classList&&e.target.classList.contains('ob'))e.target.select()});
nav();show();
