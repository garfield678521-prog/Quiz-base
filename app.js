const {createClient}=window.supabase;
const configured=!window.SUPABASE_URL.startsWith("YOUR_")&&!window.SUPABASE_ANON_KEY.startsWith("YOUR_");
const sb=configured?createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;
let user=null, quizzes=[], authMode="signin", currentQuiz=null;

const $=id=>document.getElementById(id);
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2500)}
function page(id){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");history.replaceState(null,"","#"+id); if(id==="library")loadLibrary()}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>page(b.dataset.page));
$("authBtn").onclick=()=>page("auth");
$("toggleAuth").onclick=()=>{authMode=authMode==="signin"?"signup":"signin";$("authTitle").textContent=authMode==="signin"?"Sign in":"Create account";$("toggleAuth").textContent=authMode==="signin"?"Need an account? Sign up":"Already have an account? Sign in"};

function updateAuthUI(){document.querySelectorAll(".auth-only").forEach(x=>x.style.display=user?"":"none");$("authBtn").textContent=user?"Log out":"Sign in"}
async function init(){
 if(!sb){toast("Add your Supabase settings in config.js");return}
 const {data}=await sb.auth.getUser();user=data.user;updateAuthUI();
 sb.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;updateAuthUI()});
}
$("authForm").onsubmit=async e=>{e.preventDefault();if(!sb)return;
 const email=$("email").value,password=$("password").value;
 const r=authMode==="signin"?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password});
 if(r.error)$("authMessage").textContent=r.error.message;else{$("authMessage").textContent=authMode==="signup"?"Check your email to confirm your account.":"Signed in.";if(authMode==="signin")page("home")}
};
$("authBtn").addEventListener("click",async()=>{if(user){await sb.auth.signOut();page("home")}else page("auth")});

function addQuestion(data={}){const n=document.querySelectorAll(".question").length+1;const div=document.createElement("div");div.className="question";div.innerHTML=`<b>Question ${n}</b><input class="qtext" required placeholder="Question text" value="${esc(data.question||"")}"><div class="optionrow"><input class="opt" required placeholder="Answer A" value="${esc(data.options?.[0]||"")}"><label>Correct <input class="correct" type="radio" name="correct${n}" value="0" ${data.correct===0?"checked":""}></label></div><div class="optionrow"><input class="opt" required placeholder="Answer B" value="${esc(data.options?.[1]||"")}"><label>Correct <input class="correct" type="radio" name="correct${n}" value="1" ${data.correct===1?"checked":""}></label></div><div class="optionrow"><input class="opt" required placeholder="Answer C" value="${esc(data.options?.[2]||"")}"><label>Correct <input class="correct" type="radio" name="correct${n}" value="2" ${data.correct===2?"checked":""}></label></div><div class="optionrow"><input class="opt" required placeholder="Answer D" value="${esc(data.options?.[3]||"")}"><label>Correct <input class="correct" type="radio" name="correct${n}" value="3" ${data.correct===3?"checked":""}></label></div>`;$("questions").append(div)}
$("addQuestion").onclick=()=>addQuestion();addQuestion();

$("isTest").onchange=e=>{if(!e.target.checked)$("certificateEnabled").checked=false};
$("certificateEnabled").onchange=e=>{if(e.target.checked)$("isTest").checked=true};

$("quizForm").onsubmit=async e=>{
 e.preventDefault();if(!user)return page("auth");
 const qs=[...document.querySelectorAll(".question")].map(q=>({question:q.querySelector(".qtext").value,options:[...q.querySelectorAll(".opt")].map(x=>x.value),correct:+q.querySelector(".correct:checked")?.value})); 
 if(qs.some(q=>Number.isNaN(q.correct))){toast("Choose a correct answer for every question");return}
 const quiz={title:$("quizTitle").value,description:$("quizDescription").value,is_public:$("isPublic").checked,is_test:$("isTest").checked,certificate_enabled:$("certificateEnabled").checked,pass_percentage:+$("passPercentage").value,questions:qs};
 if(!sb)return;
 const {error}=await sb.from("quizzes").insert({user_id:user.id,title:quiz.title,description:quiz.description,is_public:quiz.is_public,is_test:quiz.is_test,certificate_enabled:quiz.certificate_enabled,pass_percentage:quiz.pass_percentage,questions:qs});
 if(error){toast(error.message);return} toast("Quiz saved");e.target.reset();$("questions").innerHTML="";addQuestion();page("library");
};

async function loadLibrary(){
 if(!sb){renderLocal();return}
 const {data,error}=await sb.from("quizzes").select("*").eq("is_public",true).order("created_at",{ascending:false});
 quizzes=data||[];renderLibrary()
}
function renderLibrary(){const term=$("search").value.toLowerCase();const list=quizzes.filter(q=>(q.title||"").toLowerCase().includes(term));$("quizList").innerHTML=list.map(q=>`<article class="quiz-card"><h3>${esc(q.title)}</h3><p>${esc(q.description||"")}</p><div class="meta">${q.questions?.length||0} questions ${q.is_test?"• Test":""}</div><button class="primary" onclick="play(${JSON.stringify(q.id)})">Play</button> <button class="secondary" onclick="exportQuizById(${JSON.stringify(q.id)})">Export</button></article>`).join("")||"<p>No public quizzes found.</p>"}
$("search").oninput=renderLibrary;

function play(id){const q=quizzes.find(x=>String(x.id)===String(id));if(q)startPlay(q)}
function startPlay(q){currentQuiz=q;page("play");$("player").innerHTML=`<div class="playerbox"><span class="eyebrow">Quiz</span><h2>${esc(q.title)}</h2><p class="muted">${esc(q.description||"")}</p><form id="playForm" class="panel">${q.questions.map((x,i)=>`<div><h3>${i+1}. ${esc(x.question)}</h3>${x.options.map((o,j)=>`<label class="choice"><input required type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join("")}</div>`).join("")}<button class="primary full">Finish quiz</button></form></div>`;$("playForm").onsubmit=finishPlay}
async function finishPlay(e){e.preventDefault();let score=0;q=currentQuiz;q.questions.forEach((x,i)=>{if(+new FormData(e.target).get("q"+i)===x.correct)score++});const pct=Math.round(score/q.questions.length*100);const passed=pct>=(q.pass_percentage||70);$("player").innerHTML=`<div class="result"><span class="eyebrow">Result</span><h2>${score}/${q.questions.length} — ${pct}%</h2><p>${passed?"Passed":"Not passed"}${q.is_test?" • Test":""}</p>${passed&&q.certificate_enabled?certificateHTML(q,pct):""}<button class="secondary" onclick="page('library')">Back to quizzes</button></div>`;if(user&&sb){await sb.from("quiz_attempts").insert({quiz_id:q.id,user_id:user.id,score,percentage:pct,passed})}}
function certificateHTML(q,pct){const id=crypto.randomUUID().slice(0,8).toUpperCase();return `<div id="certificate" class="certificate"><h1>Certificate of Achievement</h1><p>This certifies that</p><h2>${esc(user?.email||"Quiz participant")}</h2><p>successfully completed</p><h2>${esc(q.title)}</h2><p>with a score of <b>${pct}%</b></p><p>${new Date().toLocaleDateString()} • Certificate ${id}</p></div><button class="primary full" onclick="downloadCertificate()">Download certificate</button>`}
function downloadCertificate(){const c=$("certificate");const html=`<html><head><meta charset="utf-8"><title>Certificate</title><style>body{font-family:Georgia,serif;text-align:center;padding:70px}div{border:8px double #5b5ce2;padding:60px}h1{font-size:42px}</style></head><body><div>${c.innerHTML}</div></body></html>`;const w=window.open("","_blank");w.document.write(html);w.document.close();w.print()}

async function exportQuizById(id){const q=quizzes.find(x=>String(x.id)===String(id));if(!q)return;downloadQZ(q)}
function downloadQZ(q){const blob=new Blob([JSON.stringify({format:"QuizShare-QZ",version:1,quiz:q},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(q.title||"quiz").replace(/[^a-z0-9-_]+/gi,"-")+".qz";a.click();URL.revokeObjectURL(a.href)}
async function importFile(file){try{if(!file.name.toLowerCase().endsWith(".qz"))throw Error("Only .qz files are supported");const obj=JSON.parse(await file.text());const q=obj.quiz||obj;if(!q.title||!Array.isArray(q.questions))throw Error("Invalid .qz quiz");quizzes=[q,...quizzes];toast("Quiz imported");startPlay(q)}catch(e){toast(e.message)}}
["homeImport","libraryImport"].forEach(id=>$(id).onchange=e=>e.target.files[0]&&importFile(e.target.files[0]));
function renderLocal(){renderLibrary()}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
init();if(location.hash.slice(1)&&$(location.hash.slice(1)))page(location.hash.slice(1));else page("home");
