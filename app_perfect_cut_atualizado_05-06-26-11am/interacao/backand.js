/**
 * Perfect Cut - Backend seguro (Node.js + Express + Mistral AI)
 *
 * Instalar dependencias:
 *   npm install
 *
 * Criar arquivo .env na mesma pasta:
 *   MISTRAL_API_KEY=SUA_CHAVE_AQUI
 *
 * Rodar:
 *   npm start
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";

const CUTS = [
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

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const ABSURD_BUDGET_LIMIT = 1000000;
const ABSURD_PEOPLE_LIMIT = 10000;

function validateRequestInput({ budget, people }) {
  const hasBudget = budget !== undefined && budget !== null && budget !== "";
  const hasPeople = people !== undefined && people !== null && people !== "";
  const budgetValue = hasBudget ? Number(budget) : 0;
  const peopleValue = hasPeople ? Number(people) : 0;

  if (!Number.isFinite(budgetValue) || !Number.isFinite(peopleValue)) {
    return "Informe apenas numeros validos em Orcamento e Numero de pessoas.";
  }

  if (budgetValue < 0) {
    return "O orcamento nao pode ser negativo.";
  }

  if (budgetValue > ABSURD_BUDGET_LIMIT) {
    return "Esse orcamento parece muito fora de uma compra comum.";
  }

  if (peopleValue < 0) {
    return "O numero de pessoas nao pode ser negativo.";
  }

  if (peopleValue > 0 && !Number.isInteger(peopleValue)) {
    return "Informe o numero de pessoas sem casas decimais.";
  }

  if (peopleValue > ABSURD_PEOPLE_LIMIT) {
    return "Essa quantidade de pessoas parece muito alta para uma recomendacao comum.";
  }

  return "";
}

function buildPrompt({ purpose, flavor, budget, people }) {
  const contexto = [
    purpose ? `Finalidade: ${purpose}` : "Finalidade: qualquer",
    flavor ? `Sabor preferido: ${flavor}` : "Sabor: sem preferência",
    budget ? `Orçamento: R$ ${budget}` : "Orçamento: sem limite",
    people ? `Número de pessoas: ${people}` : "Pessoas: não informado",
  ].join("\n");

  return `Você é um especialista em cortes de carne brasileira. Com base nas informações abaixo, responda SOMENTE com um JSON válido, sem texto antes ou depois, sem blocos de código, sem markdown.

Informações do cliente:
${contexto}

Responda exatamente neste formato JSON:
{
  "corte_principal": {
    "nome": "Nome do Corte",
    "sabor": "Suave|Médio|Intenso",
    "preco_kg": 00.00,
    "com_osso": false,
    "finalidades": ["Finalidade1", "Finalidade2"],
    "justificativas": [
      "Frase explicando por que é ideal para a finalidade informada.",
      "Frase sobre o sabor e marmoreio.",
      "Frase sobre praticidade ou característica única.",
      "Frase sobre quantidade ideal para as pessoas informadas.",
      "Frase sobre o custo-benefício para o orçamento informado."
    ]
  },
  "alternativas": [
    {
      "nome": "Corte 2",
      "preco_kg": 00.00,
      "com_osso": false,
      "finalidades": ["F1"],
      "sabor": "Médio",
      "justificativas": [
        "Frase explicando por que também atende à finalidade informada.",
        "Frase sobre o sabor e a textura desse corte.",
        "Frase sobre praticidade, preparo ou rendimento.",
        "Frase sobre a quantidade ideal para as pessoas informadas.",
        "Frase sobre o custo-benefício para o orçamento informado."
      ]
    },
    {
      "nome": "Corte 3",
      "preco_kg": 00.00,
      "com_osso": false,
      "finalidades": ["F1"],
      "sabor": "Suave",
      "justificativas": [
        "Frase explicando por que também atende à finalidade informada.",
        "Frase sobre o sabor e a textura desse corte.",
        "Frase sobre praticidade, preparo ou rendimento.",
        "Frase sobre a quantidade ideal para as pessoas informadas.",
        "Frase sobre o custo-benefício para o orçamento informado."
      ]
    },
    {
      "nome": "Corte 4",
      "preco_kg": 00.00,
      "com_osso": true,
      "finalidades": ["F2"],
      "sabor": "Intenso",
      "justificativas": [
        "Frase explicando por que também atende à finalidade informada.",
        "Frase sobre o sabor e a textura desse corte.",
        "Frase sobre praticidade, preparo ou rendimento.",
        "Frase sobre a quantidade ideal para as pessoas informadas.",
        "Frase sobre o custo-benefício para o orçamento informado."
      ]
    }
  ]
}

Regras:
- Use cortes brasileiros reais (Picanha, Alcatra, Fraldinha, Maminha, Costela, Acém, Músculo, Coxão Mole, Patinho, Cupim, Contrafilé, Lagarto, etc.)
- Preços em reais, realistas para 2026
- Máximo 3 alternativas
- justificativas: exatamente 5 frases curtas e diretas em corte_principal e em cada alternativa
- As justificativas de cada alternativa devem considerar a finalidade, sabor, orçamento e número de pessoas informados pelo cliente
- Responda SOMENTE o JSON, nenhum texto adicional`;
}

function parseAIJson(raw) {
  if (!raw) {
    throw new Error("Resposta vazia da IA.");
  }

  let clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("JSON nao encontrado na resposta da IA.");
  }

  clean = clean.slice(start, end + 1);
  return JSON.parse(clean);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatKg(value) {
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function buildJustifications(cut, { purpose, flavor, budget, people }) {
  const selectedPurpose = purpose || cut.finalidades[0];
  const selectedFlavor = flavor || cut.sabor;
  const peopleCount = Number(people) || 4;
  const kg = +((cut.com_osso ? 0.5 : 0.35) * peopleCount).toFixed(2);
  const estimated = +(kg * cut.preco_kg).toFixed(2);
  const budgetText = Number(budget) > 0
    ? `A estimativa fica em R$ ${estimated.toFixed(2).replace(".", ",")} para o orçamento informado.`
    : `O preço de R$ ${cut.preco_kg.toFixed(2).replace(".", ",")}/kg facilita ajustar a compra.`;

  return [
    `${cut.nome} combina bem com ${selectedPurpose}, porque funciona muito bem nesse preparo.`,
    `O sabor ${cut.sabor} atende à preferência ${selectedFlavor} e entrega uma boa experiência.`,
    cut.com_osso
      ? "Por ter osso, ganha mais suculência e sabor durante o preparo."
      : "Por ser sem osso, é prático para cortar, porcionar e servir.",
    `Para ${peopleCount} ${peopleCount === 1 ? "pessoa" : "pessoas"}, a sugestão é comprar cerca de ${formatKg(kg)} kg.`,
    budgetText,
  ];
}

function withJustifications(cut, context) {
  return {
    nome: cut.nome,
    sabor: cut.sabor,
    preco_kg: cut.preco_kg,
    com_osso: cut.com_osso,
    finalidades: cut.finalidades,
    justificativas: buildJustifications(cut, context),
  };
}

function buildFallbackRecommendation(context) {
  const purpose = normalizeText(context.purpose);
  const flavor = normalizeText(context.flavor);
  const budget = Number(context.budget) || 0;
  const people = Number(context.people) || 4;

  const ranked = CUTS
    .map(cut => {
      const kg = (cut.com_osso ? 0.5 : 0.35) * people;
      const estimated = kg * cut.preco_kg;
      const matchesPurpose = cut.finalidades.some(item => normalizeText(item) === purpose);
      const matchesFlavor = normalizeText(cut.sabor) === flavor;
      let score = 0;

      if (!purpose || matchesPurpose) score += 4;
      if (!flavor || matchesFlavor) score += 3;
      if (!budget || estimated <= budget) score += 2;
      if (budget && estimated > budget) score -= Math.min(3, (estimated - budget) / Math.max(budget, 1));
      score -= cut.preco_kg / 100;

      return { ...cut, score };
    })
    .sort((a, b) => b.score - a.score);

  const [main, ...alternatives] = ranked;

  return {
    corte_principal: withJustifications(main, context),
    alternativas: alternatives.slice(0, 3).map(cut => withJustifications(cut, context)),
  };
}

app.post("/recomendar", async (req, res) => {
  const inputError = validateRequestInput(req.body);
  if (inputError) {
    return res.status(400).json({ error: inputError });
  }

  if (!process.env.MISTRAL_API_KEY) {
    console.warn("MISTRAL_API_KEY nao configurada. Usando recomendacao local.");
    return res.json(buildFallbackRecommendation(req.body));
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        max_tokens: 1600,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: buildPrompt(req.body) }],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn(
        "Mistral retornou erro. Usando recomendacao local.",
        data.error?.message || data.message || `HTTP ${response.status}`
      );
      return res.json(buildFallbackRecommendation(req.body));
    }

    const raw = data.choices?.[0]?.message?.content?.trim();
    try {
      res.json(parseAIJson(raw));
    } catch (parseError) {
      console.warn("Resposta da IA veio com JSON invalido. Usando recomendacao local.", parseError.message);
      res.json(buildFallbackRecommendation(req.body));
    }
  } catch (err) {
    console.warn("Falha ao consultar a IA. Usando recomendacao local.", err.message || err);
    res.json(buildFallbackRecommendation(req.body));
  }
});

app.listen(PORT, () => {
  console.log(`Perfect Cut backend rodando em http://localhost:${PORT}`);
});
