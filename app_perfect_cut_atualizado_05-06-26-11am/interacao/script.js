/* ============================================================
   PERFECT CUT - Recomendacao via backend seguro + Mistral AI
   ============================================================ */

const sameOriginApi =
  window.location.protocol !== "file:" ? `${window.location.origin}/recomendar` : null;
const localBackendApi = "http://localhost:3001/recomendar";
const API_URLS = [
  window.location.port === "3001" ? sameOriginApi : localBackendApi,
  window.location.port === "3001" ? localBackendApi : sameOriginApi,
].filter((url, index, urls) => url && urls.indexOf(url) === index);

/* -------- Imagens por corte --------
   Para trocar ou adicionar fotos:
   1. Coloque a imagem dentro da pasta "style".
   2. Escreva aqui o nome do corte e o nome exato do arquivo.
   Exemplo: "Alcatra": "Alcatra.png"
*/
const CUT_IMAGE_FOLDER = "style";
const DEFAULT_CUT_IMAGE = "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=70";

const CUT_IMAGE_FILES = {
  picanha: "Picanha.png",
  alcatra: "Alcatra.png",
  maminha: "Maminha.png",
  fraldinha: "Fraldinha.png",
  costela: "Costela.png",
  musculo: "Musculo.png",
  acem: "Acem.png",
  patinho: "Patinho.png",
  coxaomole: "CoxaoMole.png",
  cupim: "Cupim.png",
  contrafile: "Contrafile.png",
  lagarto: "Largato.png",
};

const LOCAL_CUTS = [
  { nome: "Picanha", sabor: "Intenso", preco_kg: 89.9, com_osso: false, finalidades: ["Churrasco", "Grelhado", "Assado"] },
  { nome: "Alcatra", sabor: "Médio", preco_kg: 56.9, com_osso: false, finalidades: ["Churrasco", "Grelhado", "Frito"] },
  { nome: "Maminha", sabor: "Médio", preco_kg: 59.9, com_osso: false, finalidades: ["Churrasco", "Assado", "Grelhado"] },
  { nome: "Fraldinha", sabor: "Intenso", preco_kg: 54.9, com_osso: false, finalidades: ["Churrasco", "Grelhado", "Assado"] },
  { nome: "Costela", sabor: "Intenso", preco_kg: 42.9, com_osso: true, finalidades: ["Churrasco", "Assado", "Cozido"] },
  { nome: "Acém", sabor: "Médio", preco_kg: 37.9, com_osso: false, finalidades: ["Ensopado", "Cozido", "Assado"] },
  { nome: "Músculo", sabor: "Intenso", preco_kg: 34.9, com_osso: false, finalidades: ["Ensopado", "Cozido"] },
  { nome: "Coxão Mole", sabor: "Suave", preco_kg: 45.9, com_osso: false, finalidades: ["Frito", "Grelhado", "Assado"] },
  { nome: "Patinho", sabor: "Suave", preco_kg: 43.9, com_osso: false, finalidades: ["Frito", "Grelhado", "Cozido"] },
  { nome: "Cupim", sabor: "Intenso", preco_kg: 49.9, com_osso: false, finalidades: ["Churrasco", "Assado"] },
  { nome: "Contrafilé", sabor: "Intenso", preco_kg: 72.9, com_osso: false, finalidades: ["Churrasco", "Grelhado", "Frito"] },
  { nome: "Lagarto", sabor: "Suave", preco_kg: 46.9, com_osso: false, finalidades: ["Assado", "Cozido"] },
];

/* -------- Estado -------- */
const savedRecommendations = [];

/* -------- DOM -------- */
const $        = sel => document.querySelector(sel);
const form     = $("#recForm");
const alertBox = $("#alertBox");
const resultSec  = $("#result");
const resultMain = $("#resultMain");
const altGrid    = $("#altGrid");
const savedSec   = $("#saved");
const savedList  = $("#savedList");
const submitBtn  = $("#submitBtn");
const addAnother = $("#addAnother");

/* -------- Helpers -------- */
const ABSURD_BUDGET_LIMIT = 1000000;
const ABSURD_PEOPLE_LIMIT = 10000;
const PROTEIN_G_PER_100G = 22;

const fmt = n => n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const fmtKg = n => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const fmtProtein = kg => {
  const grams = Math.round(((Number(kg) || 0) * 1000 * PROTEIN_G_PER_100G / 100) / 10) * 10;
  return grams.toLocaleString("pt-BR");
};

function parseNumberInput(selector){
  const raw = $(selector).value.trim().replace(",", ".");
  if (!raw) return 0;
  return Number(raw);
}

function validateRequestInput(budget, people){
  if (!Number.isFinite(budget) || !Number.isFinite(people)){
    return "Informe apenas números válidos em Orçamento e Número de pessoas.";
  }

  if (budget < 0){
    return "O orçamento não pode ser negativo. Se não quiser informar um orçamento, deixe o campo em branco.";
  }

  if (budget > ABSURD_BUDGET_LIMIT){
    return "Esse orçamento parece muito fora de uma compra comum. Confira o valor informado antes de continuar.";
  }

  if (people < 0){
    return "O número de pessoas não pode ser negativo. Informe quantas pessoas vão saborear a carne.";
  }

  if (people > 0 && !Number.isInteger(people)){
    return "Informe o número de pessoas sem casas decimais. Exemplo: 4 pessoas.";
  }

  if (people > ABSURD_PEOPLE_LIMIT){
    return "Essa quantidade de pessoas parece muito alta para uma recomendação comum. Confira se o número foi digitado corretamente.";
  }

  return "";
}

const cleanCutName = name =>
  String(name || "").replace(/\s*\((?:vazio|empty|null|undefined)?\)\s*$/i, "").trim();

const normalizeCutKey = name =>
  cleanCutName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

function getCutImage(cutName){
  const cleanName = cleanCutName(cutName);
  const fileName = CUT_IMAGE_FILES[normalizeCutKey(cleanName)];

  if (!fileName) {
    return DEFAULT_CUT_IMAGE;
  }

  return `${CUT_IMAGE_FOLDER}/${encodeURIComponent(fileName)}`;
}

function showAlert(type, msg){
  alertBox.className = "alert show " + type;
  alertBox.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${msg}`;
}
function clearAlert(){ alertBox.className = "alert"; alertBox.innerHTML = ""; }

function estimateKg(people, cut){
  const kgPerPerson = cut?.com_osso ? 0.5 : 0.35;
  return Math.max(0.5, (people || 4) * kgPerPerson);
}

function withLocalJustifications(cut, ctx){
  const kg = estimateKg(ctx.people, cut);
  const estimated = cut.preco_kg * kg;
  const status = budgetStatus(estimated, ctx.budget);

  return {
    ...cut,
    justificativas: buildFallbackJustifications(cut, ctx, kg, estimated, status),
  };
}

function buildLocalRecommendation(ctx){
  const ranked = LOCAL_CUTS
    .map(cut => {
      const estimated = cut.preco_kg * estimateKg(ctx.people, cut);
      let score = 0;

      if (ctx.purpose && cut.finalidades.includes(ctx.purpose)) score += 6;
      if (ctx.flavor && cut.sabor === ctx.flavor) score += 4;
      if (!ctx.budget || estimated <= ctx.budget) score += 2;
      if (ctx.budget && estimated > ctx.budget) {
        score -= Math.min(3, (estimated - ctx.budget) / Math.max(ctx.budget, 1));
      }
      score -= cut.preco_kg / 100;

      return { ...cut, score };
    })
    .sort((a, b) => b.score - a.score);

  const [main, ...alternatives] = ranked;
  return {
    corte_principal: withLocalJustifications(main, ctx),
    alternativas: alternatives.slice(0, 3).map(cut => withLocalJustifications(cut, ctx)),
  };
}

/* -------- Chamada ao backend seguro -------- */
async function callAI(purpose, flavor, budget, people){
  const context = { purpose, flavor, budget, people };
  const payload = JSON.stringify({ purpose, flavor, budget, people });
  let lastNetworkError = null;
  let response = null;

  for (const apiUrl of API_URLS) {
    try {
      const candidateResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      response = candidateResponse;
      if (candidateResponse.status === 404 || candidateResponse.status === 405) {
        lastNetworkError = new Error(`Endpoint indisponível (${candidateResponse.status})`);
        continue;
      }
      break;
    } catch (err) {
      lastNetworkError = err;
    }
  }

  if (!response) {
    console.warn("Backend indisponível. Usando recomendação local.", lastNetworkError?.message || "");
    return buildLocalRecommendation(context);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.warn("Backend retornou erro. Usando recomendação local.", err.error || response.status);
    return buildLocalRecommendation(context);
  }

  try {
    return await response.json();
  } catch (err) {
    console.warn("Resposta inválida do backend. Usando recomendação local.", err.message || err);
    return buildLocalRecommendation(context);
  }
}

/* -------- Status do orçamento -------- */
function budgetStatus(estimated, budget){
  if (!budget) return null;
  if (estimated <= budget)       return { cls:"ok",   text:"Dentro do orçamento", icon:"fa-circle-check" };
  if (estimated <= budget*1.15)  return { cls:"near", text:"Próximo do orçamento", icon:"fa-triangle-exclamation" };
  return                                { cls:"over",  text:"Acima do orçamento",   icon:"fa-circle-xmark" };
}

/* -------- Render -------- */
function buildFallbackJustifications(cut, ctx, kg, estimated, status){
  const purpose = ctx.purpose || (cut.finalidades || [])[0] || "o preparo escolhido";
  const people = ctx.people || 4;
  const flavor = ctx.flavor || cut.sabor || "equilibrado";
  const boneText = cut.com_osso
    ? "Por ter osso, ganha mais suculência e sabor durante o preparo."
    : "Por ser sem osso, é prático para cortar, porcionar e servir.";
  const budgetText = ctx.budget
    ? `${status?.text || "Boa opção"}: a estimativa fica em ${fmt(estimated)} para o orçamento informado.`
    : `O preço de ${fmt(cut.preco_kg)}/kg oferece uma compra fácil de ajustar à quantidade desejada.`;

  return [
    `${cut.nome} é uma boa escolha para ${purpose}, porque combina com o modo de preparo selecionado.`,
    `O sabor ${cut.sabor || flavor} atende à preferência informada e entrega uma experiência agradável ao cliente.`,
    boneText,
    `Para ${people} ${people === 1 ? "pessoa" : "pessoas"}, a sugestão é comprar cerca de ${fmtKg(kg)} kg.`,
    budgetText,
  ];
}

function renderMainCut(cut, ctx, label = "Corte recomendado", eyebrow = "Melhor escolha para você"){
  const cutName     = cleanCutName(cut.nome);
  const ppl         = ctx.people || 4;
  const kgPerPerson = cut.com_osso ? 0.5 : 0.35;
  const kg          = +(kgPerPerson * ppl).toFixed(2);
  const estimated   = +(kg * cut.preco_kg).toFixed(2);
  const protein     = fmtProtein(kg);
  const status      = budgetStatus(estimated, ctx.budget);
  const img         = getCutImage(cutName);
  const reasons     = Array.isArray(cut.justificativas) && cut.justificativas.length >= 5
    ? cut.justificativas.slice(0, 5)
    : buildFallbackJustifications(cut, ctx, kg, estimated, status);
  const bullets     = reasons.map(b => `<li>${b}</li>`).join("");

  resultMain.innerHTML = `
    <div class="img-wrap">
      <img src="${img}" alt="${cutName}" onerror="this.onerror=null;this.src='${DEFAULT_CUT_IMAGE}'" />
      <div class="image-caption">
        <span class="caption-label">${label}</span>
        <strong>${cutName}</strong>
      </div>
    </div>
    <div class="result-body">
      <span class="eyebrow">${eyebrow}</span>
      <h3>${cutName}</h3>
      <div class="sub">${(cut.finalidades || []).join(" • ")} • Sabor ${cut.sabor}</div>
      <ul>${bullets}</ul>
      <div class="meta">
        <span class="chip"><i class="fa-solid fa-weight-scale"></i> ${fmtKg(kg)} kg total</span>
        <span class="chip"><i class="fa-solid fa-drumstick-bite"></i> ${protein} g proteína</span>
        <span class="chip"><i class="fa-solid fa-tag"></i> ${fmt(cut.preco_kg)}/kg</span>
        <span class="chip"><i class="fa-solid fa-receipt"></i> Estimativa ${fmt(estimated)}</span>
        ${status ? `<span class="badge ${status.cls}"><i class="fa-solid ${status.icon}"></i> ${status.text}</span>` : ""}
      </div>
    </div>
  `;
}

function renderResult(data, ctx){
  const cut         = data.corte_principal;
  const alts        = data.alternativas || [];
  const ppl         = ctx.people || 4;
  const kgPerPerson = cut.com_osso ? 0.5 : 0.35;
  const kg          = +(kgPerPerson * ppl).toFixed(2);

  renderMainCut(cut, ctx);

  altGrid.innerHTML = alts.map((a, index) => `
    <button class="alt-card" type="button" data-alt-index="${index}" aria-label="Ver recomendação de ${cleanCutName(a.nome)}">
      <h4>${cleanCutName(a.nome)}</h4>
      <div class="price">${fmt(a.preco_kg)}/kg • ${a.com_osso ? "com osso" : "sem osso"}</div>
      <div class="tags">
        ${(a.finalidades || []).map(p => `<span class="tag">${p}</span>`).join("")}
        <span class="tag">${a.sabor}</span>
      </div>
      <span class="alt-action">Ver esta opção <i class="fa-solid fa-arrow-right"></i></span>
    </button>
  `).join("");

  altGrid.querySelectorAll(".alt-card").forEach(card => {
    card.addEventListener("click", () => {
      const selected = alts[+card.dataset.altIndex];
      renderMainCut(selected, ctx, "Opção selecionada", "Alternativa compatível");
      altGrid.querySelectorAll(".alt-card").forEach(item => item.classList.remove("selected"));
      card.classList.add("selected");
      resultSec.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });

  savedRecommendations.push({ name: cut.nome, purpose: ctx.purpose || "Geral", kg });
  renderSaved();
}

function renderSaved(){
  if (savedRecommendations.length === 0){ savedSec.classList.add("hidden"); return; }
  savedSec.classList.remove("hidden");
  savedList.innerHTML = savedRecommendations.map((s, i) => `
    <div class="saved-item">
      <div>
        <strong>${s.name}</strong>
        <small>${s.purpose} • ${fmtKg(s.kg)} kg</small>
      </div>
      <button data-i="${i}" title="Remover"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join("");
  savedList.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      savedRecommendations.splice(+btn.dataset.i, 1);
      renderSaved();
    });
  });
}

/* -------- Submit -------- */
form.addEventListener("submit", async e => {
  e.preventDefault();
  clearAlert();

  const purpose = $("#purpose").value;
  const flavor  = $("#flavor").value;
  const budget  = parseNumberInput("#budget");
  const people  = parseNumberInput("#people");
  const inputError = validateRequestInput(budget, people);
  if (inputError){
    showAlert("warn", inputError);
    return;
  }
  if (!purpose && !flavor && !budget && !people){
    showAlert("info", "Nenhum filtro informado — a IA vai sugerir os melhores cortes do dia.");
  }

  const original = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="loader"></span> Consultando IA...';
  submitBtn.disabled = true;

  try {
    const data = await callAI(purpose, flavor, budget, people);
    renderResult(data, { purpose, flavor, budget, people });
    resultSec.classList.remove("hidden");
    resultSec.scrollIntoView({ behavior:"smooth", block:"start" });
  } catch (err) {
    showAlert("warn", `Erro ao consultar a IA: ${err.message}`);
  } finally {
    submitBtn.innerHTML = original;
    submitBtn.disabled = false;
  }
});

addAnother.addEventListener("click", () => {
  form.reset();
  clearAlert();
  document.getElementById("form").scrollIntoView({ behavior:"smooth" });
});
