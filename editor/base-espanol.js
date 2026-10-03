/* Base simplificada para el editor de Proyecto Eliza.
   Solo lo esencial para que el usuario parta de algo funcional y claro. */

var elizaInitials = [
  "¡Hola! ¿Cuál es tu problema?",
  "Hola, soy Eliza. ¿Qué te trae por aquí?",
  "¡Hola! Cuéntame, ¿cómo te sientes?"
];

var elizaFinals = [
  "¡Adiós! ¡Gracias por venir!",
  "Hasta luego. Cuídate mucho.",
  "¡Chao! Si necesitas hablar más, aquí estaré."
];

var elizaQuits = ["bye", "adiós", "adios", "chao", "hasta luego", "nos vemos"];

var elizaPres = [
  "qué","que", "sí","si", "tú","tu", "yo","yo",
  "estoy","estoy", "soy","soy", "mi","mi", "me","me"
];

var elizaPosts = [
  "estoy","estás", "soy","eres", "mi","tu", "me","te",
  "yo","tú", "mío","tuyo", "mía","tuya"
];

var elizaSynons = {
  triste: ["triste", "deprimido", "deprimida", "mal", "solo", "sola"],
  familia: ["mamá", "mama", "papá", "papa", "madre", "padre", "hermano", "hermana"],
  feliz: ["feliz", "alegre", "contento", "contenta"]
};

var elizaKeywords = [

  ["xnone", 0, [
    ["*", [
      "Continúa, por favor.",
      "Entiendo. Sigue.",
      "¿Puedes dar más detalles?",
      "¿Qué más puedes contarme?"
    ]]
  ]],

  ["hola", 0, [
    ["*", [
      "¡Hola! ¿Cómo estás?",
      "Te escucho.",
      "¿En qué piensas hoy?"
    ]]
  ]],

  ["gracias", 0, [
    ["*", [
      "¡No hay de qué!",
      "De nada. ¿Qué más quieres contarme?",
      "Me alegra ayudar."
    ]]
  ]],

  ["soy", 2, [
    ["* soy *", [
      "¿Por qué crees que eres (2)?",
      "¿Desde cuándo eres (2)?",
      "¿Cómo te hace sentir ser (2)?"
    ]]
  ]],

  ["estoy", 2, [
    ["* estoy *", [
      "¿Por qué estás (2)?",
      "¿Desde cuándo te sientes (2)?",
      "Háblame más de eso."
    ]],
    ["* estoy @triste *", [
      "Siento oír que estás triste.",
      "¿Qué te hace sentir así?",
      "¿Quieres hablar de lo que te pone triste?"
    ]]
  ]],

  ["madre", 5, [
    ["* mi madre *", [
      "Háblame más de tu madre.",
      "¿Cómo es tu relación con ella?",
      "¿Qué sientes cuando piensas en tu madre?"
    ]],
    ["*", [
      "Cuéntame más sobre tu familia."
    ]]
  ]],

  ["padre", 5, [
    ["* mi padre *", [
      "Háblame más de tu padre.",
      "¿Cómo es tu relación con él?"
    ]],
    ["*", [
      "Cuéntame más sobre tu familia."
    ]]
  ]],

  ["familia", 4, [
    ["* @familia *", [
      "Cuéntame más sobre tu familia.",
      "¿Cómo te llevas con ellos?",
      "¿Qué significa la familia para ti?"
    ]]
  ]],

  ["triste", 4, [
    ["* @triste *", [
      "¿Qué te pone triste?",
      "¿Desde cuándo te sientes así?",
      "¿Hay algo que alivie esa tristeza?"
    ]]
  ]],

  ["feliz", 2, [
    ["* @feliz *", [
      "¿Qué te hace feliz?",
      "Me alegra oír eso. ¿Quieres contarme más?"
    ]]
  ]],

  ["quiero", 3, [
    ["* quiero *", [
      "¿Por qué quieres (2)?",
      "¿Qué te motivó a querer (2)?",
      "¿Cómo te sentirías al conseguirlo?"
    ]]
  ]],

  ["porque", 0, [
    ["*", [
      "¿Es esa la verdadera razón?",
      "¿Qué más se te ocurre?",
      "¿Hay otras razones?"
    ]]
  ]]

];

var elizaPostTransforms = [
  /\s{2,}/g, ' ',
  /^\s+|\s+$/g, '',
  /^[a-z]/, s => s.toUpperCase()
];
