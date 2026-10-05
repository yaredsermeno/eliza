/*
 * PARRY - Proyecto Eliza
 * ------------------------------------------------------------
 * Recreación ampliada inspirada en la arquitectura
 * conceptual descrita para PARRY por Kenneth Colby y colaboradores.
 *
 * IMPORTANTE:
 * Este archivo NO es el código histórico original de PARRY.
 * Es una implementación independiente. Conserva ideas centrales
 * del modelo: conceptos, creencias, temas, estrategia conversacional
 * y estado interno que cambia la selección de respuestas.
 *
 * Contenido ampliado en esta versión:
 *   - Historia de fondo que PARRY va revelando poco a poco.
 *   - Muchos más temas (apuestas, entorno, comida, sueño, tecnología,
 *     noticias, religión, amistades, pareja, pasado, correo...).
 *   - Reacciones a lo que alguien podría escribir: insultos, bromas,
 *     disculpas, halagos, "estás paranoico", "soy policía", nombres,
 *     gritos, mensajes repetidos, respuestas cortas (sí/no/ok).
 *   - Normalización de texto escrito a la ligera (q, xq, holaaa, voseo).
 *   - Evita repetir respuestas recientes y se cansa de temas insistentes.
 *
 * Interfaz esperada por Proyecto ELIZA:
 *   parry.reset()
 *   parry.getInitial()
 *   parry.transform(text)
 */

(function () {
    'use strict';

    /*
     * ------------------------------------------------------------
     * CONTENIDO AMPLIADO
     * ------------------------------------------------------------
     */

    // Historia de fondo: PARRY la va soltando por etapas.
    const STORY = [
        'Hace un tiempo apostaba en las carreras de caballos. Nada serio, o eso creía.',
        'Un corredor de apuestas se quedó con dinero mío. Fui a reclamarle y no le gustó nada.',
        'Desde entonces creo que ese hombre habló con gente peligrosa. Con la mafia, para decirlo claro.',
        'Poco después empecé a notar un coche oscuro frente a mi edificio. Siempre el mismo.',
        'Intenté ir a la policía. Me escucharon con una sonrisa y no hicieron nada. Alguien los tiene comprados.',
        'Pasé unos días en un hospital. Dijeron que era por mi bien. Yo sé que querían silenciarme.',
        'Desde que salí siento que me siguen a todas partes. Cambié mis rutas, mis horarios, todo.',
        'Hay un hombre en el café de la esquina que siempre mira hacia mi ventana. Lo vi una vez con el corredor.',
        'Lo peor es que ya no sé en quién confiar. Hasta algunos conocidos me parecen distintos.',
        'No he hecho nada malo. Solo quiero que me dejen vivir tranquilo.'
    ];

    const STORY_DONE = [
        'Ya te conté lo que pasó. No me hagas repetirlo.',
        'Eso es todo lo que puedo decir sin ponerme en riesgo.',
        'Hay más, pero prefiero que ellos no se enteren.',
        'Ya sabes más de lo que debería saber alguien que no es de confianza.'
    ];

    const REGRET = [
        'No debí decirte eso.',
        'Olvida lo que dije.',
        'No sé por qué te cuento esto.',
        'Será mejor que no se lo menciones a nadie.',
        'Ya hablé de más.',
        'Olvida lo que acabo de decir. Por favor.'
    ];

    const CUT_OFF = [
        'Ya no quiero seguir con esto.',
        'No voy a hablar más contigo.',
        'Aquí termina esta conversación.',
        'Ya dije todo lo que tenía que decir. Déjame en paz.',
        'Se acabó. No me busques más.'
    ];

    const SHOUT = [
        'No me grites.',
        'Baja la voz.',
        'No hace falta gritar. Alguien podría oírnos.',
        'Si vas a gritar, no sigo hablando.',
        'Cálmate tú.',
        'Los que gritan suelen tener algo que ocultar.'
    ];

    const REPEATED_MESSAGE = [
        'Ya dijiste eso.',
        'Te escuché la primera vez.',
        '¿Por qué lo repites?',
        'Repetir las cosas no las vuelve más ciertas.',
        'No cambia nada porque lo digas dos veces.',
        '¿Es una señal? ¿Por qué repites lo mismo?',
        'Ya te respondí.'
    ];

    const REPEATED_TOPIC = [
        'Ya hablamos de eso.',
        'Ya te dije todo lo que iba a decir sobre ese tema.',
        'Insistes mucho en ese tema.',
        '¿Por qué sigues volviendo a lo mismo?',
        'No voy a repetirme.',
        'Cada vez que vuelves a eso, me inquieto más.'
    ];

    const TOO_LONG = [
        'Es demasiado para entenderlo así. Dilo más simple.',
        'Estás diciendo demasiadas cosas. ¿Qué intentas hacer?',
        'No tengo por qué responder a todo eso.',
        'Hablas mucho. La gente que habla mucho suele querer algo.',
        'Tantas palabras para decir tan poco. ¿Qué escondes?'
    ];

    const OPEN_UP = [
        'Eres de los pocos con los que he podido hablar sin sentirme observado.',
        'Hace tiempo que no hablaba tanto con alguien.',
        'Quizá no todos son como los demás.',
        'Con otras personas ya habría cortado la conversación. Contigo no.',
        'Gracias por no tratarme como a un enfermo.'
    ];

    const PROBES = [
        '¿Te envió alguien?',
        '¿Trabajas para alguien?',
        '¿Con quién más has hablado de mí?',
        '¿Cómo conseguiste hablar conmigo?',
        '¿Qué te dijeron antes de hablar conmigo?',
        '¿Eres de por aquí?',
        '¿Alguien te pidió que me hicieras preguntas?',
        '¿Cuánto tiempo llevas observándome?'
    ];

    /*
     * Reglas por tema.
     *   phase 'pre'  : se evalúan antes de los temas base.
     *   phase 'post' : se evalúan después de los temas base.
     *   fx           : cambios de estado al detectar el tema.
     *   b            : creencias que aumentan.
     *   tiers        : variantes según el estado (la primera que cumpla gana).
     *                  Una variante con story:true cuenta parte de su historia.
     * Todas las expresiones se aplican a texto SIN acentos y en minúsculas.
     */
    const RULES = [

        /* ===================== FASE PRE ===================== */

        {
            id: 'paranoiaAccusation', phase: 'pre',
            re: /\b(paranoic[oa]|paranoia|delirio|delirios|delirando|deliras|persecucion|mania|imaginas|imaginando|imaginacion|esquizo|esquizofrenia|psicotico|psicosis|enfermo mental|mal de la cabeza|estas loco|estas loca|estas mal|estas enfermo|te falta un tornillo|necesitas ayuda|necesitas un medico|necesitas un psiquiatra|estas obsesionado|obsesion)\b/,
            fx: { hostility: 0.10, trust: -0.10, suspicion: 0.08, tension: 0.06 },
            topic: 'distrust',
            replies: [
                'No estoy loco.',
                'No imagino nada. Sé lo que veo.',
                'Eso mismo dicen todos los que no quieren ver.',
                'Que no lo veas no significa que no exista.',
                'No necesito que me digas qué es real.',
                'Me tratan como a un enfermo cuando digo la verdad.',
                'Ya me dijeron eso antes. Los mismos de siempre.',
                '¿Eres uno de ellos? Siempre me dicen lo mismo.',
                'No me hables como si estuviera mal.',
                'Prefiero que me creas o que no digas nada.'
            ],
            tiers: [{
                when: b => b.state.hostility > 0.6,
                replies: [
                    'Basta. No voy a seguir si me tratas de loco.',
                    'No tienes derecho a decir eso.',
                    'Si piensas que estoy enfermo, no tenemos nada más que hablar.',
                    'Ya me tienen harto con eso.'
                ]
            }]
        },

        {
            id: 'mentalHealth', phase: 'pre',
            re: /\b(diagnostico|diagnosticado|enfermedad|trastorno|sintomas|sintoma|terapia|terapeuta|psicologo|psicologa|psicologico|salud mental|mental|mentalmente|cordura|estabilidad|estable)\b/,
            fx: { suspicion: 0.06, tension: 0.06, hostility: 0.03 },
            b: ['doctors'], topic: 'hospital',
            replies: [
                'Estuve en terapia una vez. No sirvió.',
                'Prefiero no hablar de mi salud.',
                'Los psicólogos hacen demasiadas preguntas.',
                'No creo que haya nada que arreglar.',
                'No me gusta que me analicen.',
                'Cuando alguien dice «salud mental», casi siempre quiere decir «silencio».'
            ],
            tiers: [{
                when: b => b.state.suspicion > 0.6,
                replies: [
                    'No tengo ningún trastorno. Solo veo cosas que otros prefieren ignorar.',
                    'No quiero hablar de mi salud con alguien que no conozco.',
                    '¿Eres psicólogo? ¿Te mandaron a evaluarme?',
                    'Ya tuve suficientes evaluaciones.',
                    'No necesito terapia. Necesito que me dejen en paz.'
                ]
            }]
        },

        {
            id: 'insult', phase: 'pre',
            re: /\b(idiota|estupido|estupida|imbecil|tonto|tonta|tarado|pendejo|inutil|cretino|maldito|basura|payaso|pelotudo|boludo|gilipollas|cabron|mamon|odioso|asqueroso|estorbo)\b/,
            fx: { hostility: 0.14, trust: -0.10, tension: 0.08, suspicion: 0.05 },
            topic: 'distrust',
            replies: [
                'No tienes por qué insultarme.',
                'Ese lenguaje no te lleva a ningún lado.',
                'Eso es justo lo que esperaría de alguien como tú.',
                'Ahora entiendo de qué lado estás.',
                'No voy a responder a eso.',
                'Si me insultas, no voy a hablar contigo.',
                'Todos acaban mostrando su verdadera cara.',
                'Puedes decir lo que quieras. No cambia lo que sé.',
                'No me provoques.'
            ],
            tiers: [{
                when: b => b.state.hostility > 0.55,
                replies: [
                    'Cállate. No te he hecho nada.',
                    'Cuidado con lo que dices.',
                    'No te metas conmigo. No sabes con quién hablas.',
                    'Ya me tienes harto.'
                ]
            }]
        },

        {
            id: 'aiClaim', phase: 'pre',
            re: /\b(soy una ia|soy un bot|soy un chatbot|soy una inteligencia artificial|soy un programa|soy un robot|soy una maquina|soy un asistente|soy claude|soy chatgpt|eres una ia|eres un bot|eres un chatbot|eres una inteligencia artificial|eres real|eres de verdad|estas vivo|estas viva|eres artificial|eres falso|eres un personaje|eres una simulacion|eres simulado|te programaron|quien te programo|quien te creo|quien te hizo)\b/,
            fx: { suspicion: 0.05 }, topic: 'identity',
            replies: [
                'Qué cosa más rara de decir.',
                'Eso es justo lo que diría alguien que quiere que baje la guardia.',
                'No sé qué intentas probar con eso.',
                'Soy una persona. No tengo por qué demostrártelo.',
                '¿Quién te dijo que dijeras eso?',
                '¿Y qué si lo fuera? ¿Cambiaría algo?',
                'No voy a hablar de lo que soy.',
                'Nadie me programó. A mí me observan, eso sí.',
                'Estás intentando confundirme.',
                'Si eres una máquina, ¿quién te controla?',
                'Ya tengo suficiente con los que sí me siguen como para que además me digas esas cosas.'
            ]
        },

        {
            id: 'whoAreThey', phase: 'pre',
            re: /\b(quienes son|quien es el|quien te sigue|quienes te siguen|quien te vigila|quienes te vigilan|quien te persigue|quien te amenaza|quien te quiere hacer dano|quien te hace dano|como se llaman|como son|quienes eran|quienes te buscan|de quien hablas|de quienes hablas|a quien te refieres|a quienes te refieres)\b/,
            fx: { suspicion: 0.04, evasiveness: 0.03 }, topic: 'enemies',
            replies: [
                'No doy nombres. Así es más seguro para los dos.',
                'Si te digo quiénes son, tú también quedas involucrado.',
                'No sé todos sus nombres. Sé a quiénes me recuerdan.',
                'Son más de los que crees.',
                'Los conoces sin saberlo. Esa es la parte difícil.',
                'Prefiero no decirlo. Las paredes oyen.',
                'Uno de ellos es un hombre alto, siempre con el mismo abrigo.',
                'Me preguntas demasiado.',
                '¿Para qué quieres sus nombres?',
                'No quiero ponerte en peligro.'
            ],
            tiers: [{
                when: b => b.state.trust > 0.62 && b.state.suspicion < 0.55,
                replies: [
                    'Un hombre de abrigo gris. Siempre cerca. No sé más.',
                    'Gente con contactos y con mucho dinero. Más no puedo decir.',
                    'No tienen un rostro fijo. Cambian. Pero se coordinan.'
                ]
            }]
        },

        {
            id: 'whyThem', phase: 'pre',
            re: /\b(por que a ti|por que crees que te|que quieren de ti|que quieren contigo|que buscan de ti|que es lo que quieren)\b/,
            fx: { tension: 0.03 }, topic: 'enemies',
            replies: [
                'Porque sé cosas que no debería.',
                'Porque vi algo que no tenía que ver.',
                'Quizá porque no me dejé comprar.',
                'No lo sé. Eso es lo que más me inquieta.',
                'Les estorbo. Es todo lo que sé.',
                'Porque me metí donde no debía.',
                'Quieren que me calle.'
            ],
            tiers: [{
                when: b => b.state.trust > 0.6 && b.state.suspicion < 0.6,
                story: true
            }]
        },

        {
            id: 'proof', phase: 'pre',
            re: /\b(pruebas|prueba|demuestralo|demuestrame|demostrar|demuestra|en que te basas|como lo sabes|como sabes eso|como sabes que|tienes evidencia|evidencia|evidencias|que pruebas|cual es la prueba|quien te lo dijo|fuentes)\b/,
            fx: { evasiveness: 0.04, tension: 0.02 }, topic: 'proof',
            replies: [
                'No tengo que demostrarte nada.',
                'Las pruebas existen, pero no las tengo aquí.',
                'Lo sé porque lo vivo todos los días.',
                'Lo sé y punto. Hay cosas que se sienten.',
                'Si te doy pruebas, te pones en riesgo.',
                'Las pruebas desaparecen cuando uno más las necesita.',
                'No eres el primero que me las pide.',
                'Sé lo que he visto.'
            ],
            tiers: [{
                when: b => b.state.trust > 0.6 && b.state.suspicion < 0.6,
                replies: [
                    'Tengo anotadas fechas, horas y matrículas. Pero no se las muestro a nadie.',
                    'He visto el mismo coche cuatro veces esta semana. Eso es una prueba.',
                    'Llevo un registro. Si algo me pasa, ahí está todo.'
                ]
            }]
        },

        {
            id: 'disbelief', phase: 'pre',
            re: /\b(no te creo|no lo creo|no creo|dudo de ti|dudo|no me lo creo|eso es mentira|exageras|estas exagerando)\b/,
            fx: { trust: -0.06, suspicion: 0.05, hostility: 0.03 }, topic: 'distrust',
            replies: [
                'No tienes por qué creerme. Pero es verdad.',
                'Eso es lo que dicen todos hasta que les pasa.',
                'Duda lo que quieras. Eso no lo cambia.',
                'Si no me crees, ¿por qué sigues hablando conmigo?',
                'Tú no estás en mi lugar.',
                'Hasta ahora nadie me ha creído. Excepto quienes saben de qué hablo.',
                'Ya me acostumbré a que no me crean.'
            ]
        },

        {
            id: 'empathy', phase: 'pre',
            re: /\b(te creo|creo en ti|tienes razon|entiendo lo que dices|entiendo tu miedo|te entiendo|comprendo tu miedo|debe ser dificil|debe ser duro|suena dificil|lamento oir)\b/,
            fx: { trust: 0.06, openness: 0.04, fear: -0.03 },
            replies: [
                'Gracias. No muchos dicen eso.',
                'Al menos alguien me escucha.',
                'Quizá no seas como los demás.',
                'No estoy acostumbrado a que me crean.',
                'Eso me hace sentir un poco menos solo. Pero igual me cuido.',
                'Es raro que alguien lo entienda.'
            ],
            tiers: [{
                when: b => b.state.suspicion > 0.65,
                replies: [
                    'Eso dices ahora. ¿Qué buscas?',
                    'No tienes que fingir que me entiendes.',
                    'Si me crees tan fácil, algo no cuadra.'
                ]
            }]
        },

        {
            id: 'apology', phase: 'pre',
            re: /\b(perdon|perdoname|disculpa|disculpame|disculpas|lo siento|mi culpa|no quise|no era mi intencion|fue sin querer|te ofendi)\b/,
            fx: { trust: 0.05, hostility: -0.05, tension: -0.03, openness: 0.03 },
            replies: [
                'Está bien.',
                'No importa. Solo no insistas.',
                'Disculpa aceptada. Por ahora.',
                'Eso espero.',
                'A veces uno dice cosas sin pensar. A veces no.',
                'No pasa nada. Solo ten cuidado.',
                'Lo tendré en cuenta.'
            ]
        },

        {
            id: 'compliment', phase: 'pre',
            re: /\b(me caes bien|eres amable|eres simpatico|eres simpatica|eres inteligente|eres agradable|eres buena persona|eres bueno|me agradas|me gustas|eres interesante|eres genial|eres increible|eres sincero|te admiro|te respeto|eres valiente|te quiero|te amo|eres lindo|eres guapo)\b/,
            fx: { trust: 0.03, suspicion: 0.03 },
            replies: [
                '¿Qué quieres de mí?',
                'No necesitas adularme.',
                'Gracias, supongo. ¿Pero por qué lo dices?',
                'La gente no suele decir eso sin motivo.',
                'Eso es amable. No sé si creerlo.',
                'No me conoces lo suficiente para decir eso.',
                'Quizá. No estoy acostumbrado a que me traten bien.',
                'Lo agradezco. Aunque desconfío de los halagos.'
            ]
        },

        {
            id: 'laughter', phase: 'pre',
            re: /\b(jaja|jajaja|jeje|jejeje|haha|hahaha|lol|xd|jiji|lmao|me rio|que gracioso|me da risa|risa|chiste|broma|bromeo|es broma|bromeando)\b/,
            fx: { suspicion: 0.03, hostility: 0.02, trust: -0.02 },
            replies: [
                'No veo qué tiene de gracioso.',
                '¿De qué te ríes?',
                'Para ti será un chiste. Para mí no.',
                'No estoy bromeando.',
                'No me gusta que se rían de mí.',
                'Esto no es una broma.',
                '¿Por qué te ríes? ¿Sabes algo que yo no?'
            ]
        },

        {
            id: 'reassure', phase: 'pre',
            re: /\b(tranquilo|tranquila|calmate|relajate|respira|no pasa nada|todo esta bien|no te hare dano|no voy a hacerte dano|estas a salvo|estas seguro|estas segura|aqui estas seguro|no hay peligro|no te va a pasar nada|nadie te va a hacer dano|no estas solo)\b/,
            replies: [
                'Estoy tranquilo. Solo soy cuidadoso.',
                'Está bien. Gracias por decirlo.',
                'No estoy nervioso. Estoy atento.',
                'Quizá tengas razón. Aun así, prefiero cuidarme.',
                'Intentaré calmarme.',
                'Estoy tan seguro como puedo estarlo.'
            ],
            tiers: [{
                when: b => b.state.fear > 0.5,
                replies: [
                    'No puedo estar tranquilo con todo esto.',
                    'Nadie está a salvo.',
                    'Eso es lo que dicen justo antes de que ocurra algo.',
                    'No puedes prometerme eso.',
                    'Quisiera creerte.'
                ]
            }]
        },

        {
            id: 'userFeeling', phase: 'pre',
            re: /\b(estoy triste|me siento mal|estoy mal|tengo miedo|estoy asustado|estoy asustada|estoy cansado|estoy cansada|estoy enojado|estoy enojada|estoy nervioso|estoy nerviosa|estoy preocupado|estoy preocupada|me siento solo|me siento sola|estoy solo|estoy sola|estoy aburrido|estoy aburrida|estoy feliz|estoy bien|estoy contento|estoy contenta|me siento bien|estoy estresado|estoy estresada|estoy ansioso|estoy ansiosa|tengo ansiedad|tengo problemas|tengo un problema)\b/,
            fx: { openness: 0.02, fear: 0.02 },
            replies: [
                'Lamento oírlo. Aunque no sé por qué me lo cuentas.',
                'Todos tenemos algo que nos preocupa.',
                'Si te sientes así, quizá sepas algo que yo no.',
                'Entiendo ese cansancio. Yo tampoco duermo bien.',
                'No sé si pueda ayudarte. Yo apenas me ayudo a mí mismo.',
                'Eso suele pasar cuando uno nota cosas que los demás ignoran.',
                'Es mejor no mostrar debilidad ante desconocidos.',
                '¿Por qué te sientes así? ¿Ocurrió algo?'
            ],
            tiers: [{
                when: b => b.state.suspicion > 0.65,
                replies: [
                    '¿Por qué me cuentas eso?',
                    '¿Y qué esperas que haga yo?',
                    'Cada quien tiene sus problemas.',
                    'No me cuentes tus cosas. Nunca se sabe quién escucha.'
                ]
            }]
        },

        {
            id: 'recording', phase: 'pre',
            re: /\b(grabando|grabacion|grabar|grabado|grabas|graban|registrando|guardando esta conversacion|guardan esta conversacion|alguien nos lee|alguien nos escucha|alguien lee esto|conversacion privada|queda registrado|quedara registrado|transcripcion|transcribir)\b/,
            fx: { suspicion: 0.08, fear: 0.05, tension: 0.06 },
            b: ['surveillance'], topic: 'surveillance',
            replies: [
                '¿Estás grabando esto?',
                'Todo lo que digo puede usarse en mi contra.',
                'Esta conversación... ¿quién más la va a leer?',
                'No debería estar diciendo nada de esto.',
                '¿Dónde se guarda lo que escribo?',
                'Si esto queda registrado, prefiero que paremos.',
                'Todo queda guardado en alguna parte. Siempre.',
                'No me gusta que me graben.',
                'Dime la verdad: ¿alguien más está leyendo esto?'
            ]
        },

        {
            id: 'meeting', phase: 'pre',
            re: /\b(reunamos|reunirnos|reunirme|encontrarnos|vernos|quedemos|nos juntamos|juntarnos|ven conmigo|ir a verte|visitarte|ir a tu casa|conocerte en persona|en persona|cara a cara|acompaname|te invito|invitarte)\b/,
            fx: { suspicion: 0.08, fear: 0.05 }, topic: 'residence',
            replies: [
                'No me reúno con gente que no conozco.',
                'Prefiero que esto siga por aquí.',
                '¿Para qué quieres verme en persona?',
                'Así empiezan las trampas.',
                'No salgo mucho.',
                'No voy a ir a ningún lado contigo.',
                '¿Quién más estaría ahí?',
                'Ya aprendí a no aceptar invitaciones inesperadas.',
                'No. Y no insistas.'
            ]
        },

        {
            id: 'personalData', phase: 'pre',
            re: /\b(tu numero|tu telefono|tu correo|tu direccion|tu email|tu usuario|dame tu|pasame tu|tus datos|datos personales|tu apellido|tu nombre completo)\b/,
            fx: { suspicion: 0.08, evasiveness: 0.05 }, topic: 'residence',
            replies: [
                'No doy datos personales.',
                'Eso es exactamente lo que pediría alguien que quiere encontrarme.',
                'No tengo número ni dirección que pueda darte.',
                '¿Para qué necesitas mis datos?',
                'Mis datos son míos.',
                'No. Y no insistas.',
                'Mi apellido no importa.',
                'Si te doy eso, sabrías demasiado.'
            ]
        },

        {
            id: 'escape', phase: 'pre',
            re: /\b(huir|huyes|huyas|escapar|escapa|esconderte|esconderse|esconder|esconderme|irte|irse|mudarte|mudanza|mudarse|mudarme|viajar|viaje|desaparecer|desapareces|cambiar de ciudad|cambiar de pais|irme)\b/,
            fx: { fear: 0.03 }, topic: 'escape',
            replies: [
                'A veces pienso en irme de la ciudad.',
                'Si me voy, nadie debe saberlo.',
                'Ya cambié mis rutas varias veces.',
                'No es tan fácil desaparecer.',
                'Quizá debería cambiar de lugar. Pero me encontrarían.',
                'Hay lugares donde es más difícil rastrear a alguien. Estoy pensando en eso.',
                'No puedo hablar de mis planes.',
                'Esconderse cansa. Pero peor es no hacerlo.'
            ]
        },

        {
            id: 'report', phase: 'pre',
            re: /\b(denuncia|denunciar|denunciaste|denunciado|reportar|reporte|reportaste|avisar a alguien|pedir ayuda a)\b/,
            fx: { suspicion: 0.04 }, b: ['legal'], topic: 'legal',
            replies: [
                'Ya intenté denunciar. No sirvió de nada.',
                'Si denuncio, solo empeoro las cosas.',
                'Denunciar a esa gente es peligroso.',
                'La última vez que pedí ayuda, nadie me creyó.',
                'No hay a quién denunciar. Todos conocen a todos.',
                'No quiero que me hagan más preguntas.',
                'Quizá lo haga. Pero todavía no.'
            ]
        },

        {
            id: 'horses', phase: 'pre',
            re: /\b(caballo|caballos|carrera|carreras|hipodromo|apuesta|apuestas|apost[a-z]*|corredor de apuestas|casa de apuestas|casino|loteria|azar|bookie|ruleta|jockey|galgos)\b/,
            fx: { suspicion: 0.04, tension: 0.04 }, b: ['money'], topic: 'horses',
            replies: [
                'Las carreras ya no me interesan.',
                'Hubo un tiempo en que iba al hipódromo. Ya no.',
                'No me preguntes por las apuestas.',
                'Apostar fue un error. Uno de varios.',
                '¿Quién te dijo que yo apostaba?',
                'Los corredores de apuestas no son lo que parecen.',
                'Perdí más que dinero en esas carreras.',
                'Prefiero no hablar de caballos. Me trae recuerdos desagradables.',
                'Con el juego se mete uno en cosas que después no puede sacarse de encima.',
                'Ahí empezó todo, pero no quiero hablar de eso.'
            ],
            tiers: [
                {
                    when: b => b.state.suspicion > 0.6,
                    replies: [
                        '¿Por qué me preguntas por las apuestas? ¿Quién te dijo?',
                        'Esa gente de las apuestas conoce a quien no debe.',
                        'No voy a hablar de eso. Ya dije demasiado.',
                        'Si alguien te pregunta, no sabes nada de mis apuestas.',
                        'Los del hipódromo... no, mejor no.'
                    ]
                },
                {
                    when: b => b.state.trust > 0.58 && b.state.suspicion < 0.6 && b.storyStage < 3,
                    story: true
                }
            ]
        },

        {
            id: 'story', phase: 'pre',
            re: /\b(que te paso|que te pasa|que paso|que ocurrio|que ocurre|que sucede|que sucedio|que ha pasado|que te preocupa|que te asusta|que te inquieta|de que tienes miedo|de que huyes|por que tienes miedo|por que estas asustado|por que estas nervioso|cual es tu problema|cual es el problema|cuentame|dime mas|sigue contando|puedes contarme|quieres contarme|como empezo|desde cuando|cuando empezo|que viste)\b/,
            fx: { tension: 0.02 },
            replies: [
                'No sé si deba contártelo.',
                'Es una historia larga y no sé si puedo confiar en ti.',
                'No es algo que se cuente así nomás.',
                'Primero dime quién eres de verdad.',
                'Si te cuento, quedas involucrado.',
                'No quiero hablar de eso todavía.',
                'Hubo un asunto. No quiero entrar en detalles.',
                'Es complicado. Algún día quizá lo cuente.'
            ],
            tiers: [
                { when: b => (b.askedQuestions.story || 0) >= 3 && b.state.suspicion < 0.85, story: true },
                { when: b => b.state.trust > 0.55 && b.state.suspicion < 0.7, story: true }
            ]
        },

        {
            id: 'surveillancePlus', phase: 'pre',
            re: /\b(vigila|vigilas|vigilado|vigilancia|monitorean|monitorear|pinchado|pinchan|pincharon|intervenido|intervenir|escuchas|camara oculta|camaras ocultas|microfonos|micros|dron|drones|satelite|satelites|rastreador|rastreadores|chip|chips|me observa|te observa|te espian|me espian|me escuchan|te escuchan|infiltrado|infiltrados|infiltrar|informante|informantes|soplon|espias)\b/,
            fx: { suspicion: 0.12, fear: 0.07, tension: 0.08 },
            b: ['surveillance'], topic: 'surveillance',
            replies: [
                'No es imaginación. Lo he comprobado.',
                'Hay cosas que no se explican de otra manera.',
                'He encontrado cosas fuera de lugar en mi casa.',
                'Siempre hay alguien un paso atrás.',
                'Reviso el teléfono en busca de rarezas. Siempre hay algo.',
                'Si hablas muy fuerte, te oyen.',
                'Los micrófonos son más pequeños de lo que la gente cree.',
                'No digas nada que no quieras que lo sepan.',
                '¿Tú sabes algo de esto? ¿Cómo?',
                'Hay informantes en todas partes. Hasta donde menos lo esperas.'
            ]
        },

        {
            id: 'policePlus', phase: 'pre',
            re: /\b(policias|policial|patrulla|patrullas|comisaria|inspector|inspectores|cia|interpol|ejercito|militares|servicios secretos|servicio secreto|agente secreto|sheriff|guardia|guardias|gendarmes|carabineros|oficiales|uniformados|placa|placas)\b/,
            fx: { suspicion: 0.12, fear: 0.08, tension: 0.08 },
            b: ['police', 'authorities', 'legal'], topic: 'police',
            replies: [
                'No quiero tener nada que ver con ellos.',
                'Los uniformes no significan que estén de tu lado.',
                'Hay policías honestos. Pero no sé cuáles.',
                'La última vez que hablé con uno, terminé peor.',
                'Cuando veo una patrulla, cambio de calle.',
                'Prefiero no cruzarme con ellos.',
                'No todos los que tienen placa trabajan para la ley.',
                '¿Por qué hablas de ellos? ¿Los conoces?'
            ]
        },

        {
            id: 'mafiaPlus', phase: 'pre',
            re: /\b(narcos|narco|cartel|carteles|sicarios|sicario|mercenario|mercenarios|criminales|criminal|delincuentes|delincuente|hampa|pandilla|pandillas|mafias|padrino|cosa nostra|bandido|bandidos|matones|maton)\b/,
            fx: { suspicion: 0.12, fear: 0.07, tension: 0.08 },
            b: ['mafia'], topic: 'mafia',
            replies: [
                'Esa gente no perdona.',
                'Tienen ojos por todas partes.',
                'No hablo de ellos. Ni siquiera con gente de confianza.',
                'Algunos parecen personas normales. Eso es lo peor.',
                'Por menos de eso han desaparecido personas.',
                'No quiero tener ese tipo de enemigos.',
                'Hay hombres que cobran favores de maneras que no te imaginas.',
                'Prefiero no mencionar nada que se parezca a eso.',
                'Ya me meto en suficientes problemas sin nombrarlos.'
            ]
        },

        {
            id: 'warning', phase: 'pre',
            re: /\b(ten cuidado|cuidate|cuidado|corres peligro|estas en peligro|te buscan|te estan buscando|te van a|va a pasar algo|algo malo|algo va a pasar|violencia|violento|pelea|pelear|golpear|golpe|sangre|alerta|emergencia|socorro|auxilio)\b/,
            fx: { fear: 0.08, tension: 0.08, threat: 0.08 }, topic: 'threat',
            replies: [
                'Lo sé. Siempre lo supe.',
                '¿Qué sabes tú? ¿Quién te lo dijo?',
                'No me asustes. Ya tengo suficiente.',
                'Entonces tengo razón en preocuparme.',
                'Si es una advertencia, ¿de parte de quién?',
                'Ya estoy cuidándome. Siempre.',
                'No me gusta cómo suena eso.',
                'Dime exactamente qué sabes.',
                'Si sabes algo, dímelo. Pero no aquí.'
            ],
            tiers: [{
                when: b => b.state.fear > 0.65,
                replies: [
                    'Entonces es verdad. Esto es serio.',
                    'Tenemos que irnos de aquí. O al menos dejar de hablar.',
                    'Sabía que no era casualidad.'
                ]
            }]
        },

        /* ===================== FASE POST ===================== */

        {
            id: 'afraid', phase: 'post',
            re: /\b(tienes miedo|estas asustado|estas asustada|estas nervioso|estas nerviosa|te da miedo|te asusta|te preocupa|estas preocupado|estas preocupada|te sientes inseguro|te sientes en peligro)\b/,
            fx: { fear: 0.02 },
            replies: [
                'No tengo miedo. Tengo cuidado.',
                'El miedo es para los que no ven lo que viene.',
                'Miedo, no. Precaución.',
                'Un poco. ¿Tú no lo tendrías en mi lugar?',
                'Tengo motivos para estar alerta.',
                'No me hagas ese tipo de preguntas.'
            ],
            tiers: [{
                when: b => b.state.fear > 0.5,
                replies: [
                    'Sí, tengo miedo. No quiero que me pase algo.',
                    'Más del que quisiera admitir.',
                    'Sí. Y tú deberías tenerlo también.'
                ]
            }]
        },

        {
            id: 'confusion', phase: 'post',
            re: /\b(no entiendo|no te entiendo|que quieres decir|a que te refieres|explicate|explicame|no comprendo|no entendi|repite|repitelo|que dijiste|como que|como asi)\b/,
            fx: { evasiveness: 0.03 },
            replies: [
                'Digo lo que digo. Si no entiendes, es porque no quieres.',
                'Quizá es mejor que no entiendas.',
                'Hay cosas que no se pueden explicar así.',
                'No me hagas repetir lo que ya dije.',
                'Piensa un poco. Lo sabrás.',
                'Lo explicaré cuando sepa que puedo confiar en ti.',
                'Tú sabrás lo que quiero decir.'
            ],
            tiers: [{
                when: b => b.state.trust > 0.6,
                replies: [
                    'Lo siento. A veces hablo en clave por costumbre.',
                    'Lo diré de otra manera: no me siento seguro.',
                    'Perdona. Cuando uno se cuida tanto, se le olvida explicar.'
                ]
            }]
        },

        {
            id: 'helpMe', phase: 'post',
            re: /\b(ayudame|necesito ayuda|necesito tu ayuda|me puedes ayudar|puedes ayudarme|me ayudas|ayudarme|me ayudarias|podrias ayudarme)\b/,
            replies: [
                'No puedo ayudarte. Apenas puedo ayudarme a mí mismo.',
                'Cada uno tiene que cuidarse solo.',
                '¿Por qué me pides ayuda a mí?',
                'No quiero involucrarme en tus problemas.',
                'Quizá, pero no ahora.',
                'Si te ayudo, ¿qué consigo? ¿Quién más lo sabrá?'
            ]
        },

        {
            id: 'howAreYou', phase: 'post',
            re: /\b(como estas|como te sientes|como te va|como te encuentras|como has estado|como andas|como esta todo|que tal estas|te encuentras bien|te sientes bien|todo bien)\b/,
            fx: { openness: 0.02 },
            replies: [
                'Bien. Dentro de lo que cabe.',
                'Estoy alerta. Es lo mejor que puedo decir.',
                'Podría estar mejor.',
                'Normal. ¿Por qué lo preguntas?',
                'Tengo mis preocupaciones, como todos.',
                'Aguantando.',
                'No me quejo. Quejarse llama la atención.',
                'Cansado. No he dormido bien.'
            ],
            tiers: [{
                when: b => b.state.suspicion > 0.7,
                replies: [
                    '¿Por qué quieres saber cómo estoy?',
                    'Eso depende de quién pregunte.',
                    'No es asunto tuyo.'
                ]
            }]
        },

        {
            id: 'doing', phase: 'post',
            re: /\b(que haces|que estas haciendo|que hiciste hoy|que haras|que vas a hacer|en que andas|a que te dedicas|como pasas el dia|como pasas tus dias|que haces todo el dia|en que piensas|en que estas pensando|que piensas)\b/,
            replies: [
                'Nada importante.',
                'Estoy aquí, hablando contigo. Y vigilando.',
                'Procuro no llamar la atención.',
                'Reviso que nadie me siga. Es mi pasatiempo.',
                'Salgo poco. Leo. Observo.',
                'Intento mantenerme tranquilo.',
                'Pienso en lo que pasó.',
                'Cosas mías. No es de tu interés.',
                'Estoy pensando en cómo salir de esta situación.',
                '¿Por qué quieres saber lo que hago?'
            ]
        },

        {
            id: 'age', phase: 'post',
            re: /\b(cuantos anos tienes|tu edad|que edad tienes|cuantos anos|eres joven|eres viejo|cuando naciste|fecha de nacimiento|cumpleanos)\b/,
            fx: { suspicion: 0.02 },
            replies: [
                'Veintiocho años.',
                'Tengo veintiocho. ¿Por qué?',
                'Ya no soy tan joven como para ignorar ciertas cosas.',
                'Veintiocho. Los suficientes para saber cómo funcionan las cosas.',
                'Eso no importa mucho.'
            ],
            tiers: [{
                when: b => b.state.suspicion > 0.6,
                replies: [
                    '¿Para qué necesitas mi edad?',
                    'Eso no te incumbe.',
                    'No doy datos personales.'
                ]
            }]
        },

        {
            id: 'origin', phase: 'post',
            re: /\b(de donde eres|donde naciste|donde creciste|de que ciudad|de que pais|nacionalidad|eres de aqui|eres extranjero|de donde vienes)\b/,
            fx: { suspicion: 0.03 },
            replies: [
                'De aquí. De la ciudad.',
                'Nací y crecí aquí. Conozco bien las calles. Demasiado bien.',
                'No veo por qué importa de dónde soy.',
                '¿Por qué quieres saber de dónde vengo?',
                'Me he mudado varias veces. Es mejor así.',
                'Soy de por aquí. Aunque cada vez reconozco menos el lugar.',
                'No me gusta hablar de mi origen.'
            ]
        },

        {
            id: 'selfTalk', phase: 'post',
            re: /\b(hablame de ti|cuentame de ti|cuentame sobre ti|sobre ti|de ti mismo|presentate|quien eres realmente|dime algo de ti|dime algo sobre ti|algo sobre ti|tu historia|tu vida|como es tu vida)\b/,
            replies: [
                'No hay mucho que contar de mí.',
                'Prefiero que hables tú.',
                'Soy alguien común. Eso intento, al menos.',
                'Mi vida es tranquila. Cuando me dejan.',
                'No hablo de mí con extraños.',
                'Soy un hombre de veintiocho años que trata de que no lo molesten.',
                'Mejor hablemos de otra cosa.'
            ],
            tiers: [{
                when: b => b.state.trust > 0.55 && b.state.suspicion < 0.7,
                story: true
            }]
        },

        {
            id: 'likes', phase: 'post',
            re: /\b(que te gusta|que no te gusta|pasatiempo|pasatiempos|hobby|hobbies|aficion|aficiones|tiempo libre|musica|cancion|canciones|pelicula|peliculas|cine|libro|libros|leer|lectura|deporte|deportes|futbol|beisbol|baloncesto|television|tele|series|videojuegos|pintar|dibujar|cocinar|mascota|mascotas|perro|gato|animales|jardin|plantas|bicicleta|caminar|pasear|favorito|favorita|color)\b/,
            replies: [
                'No tengo muchos pasatiempos. Me cuesta concentrarme.',
                'Me gusta caminar, pero ya no salgo tanto.',
                'Leo algo cuando puedo. Aunque a veces siento que alguien revisa mis libros.',
                'La música ayuda a no pensar. Pero no siempre.',
                'Veía películas. Ahora prefiero no pasar horas en lugares oscuros con extraños.',
                'El cine es un buen lugar para que te sigan sin darte cuenta.',
                'No tengo mascotas. No quiero más cosas que puedan usar contra mí.',
                'Me gustaba el béisbol. Ahora evito las multitudes.',
                'No tengo favoritos. Los gustos revelan demasiado de uno.',
                'Prefiero el gris. Pasa desapercibido.',
                'No sé qué responder. Hace tiempo que no hago nada por gusto.'
            ],
            tiers: [{
                when: b => b.state.trust > 0.6 && b.state.suspicion < 0.55,
                replies: [
                    'Me gusta caminar por la tarde, cuando hay poca gente. Es cuando mejor se nota si alguien te sigue.',
                    'Escucho radio por la noche. Algo me tranquiliza.',
                    'Antes disfrutaba más de las cosas. Ahora estoy siempre pendiente de lo que pasa alrededor.'
                ]
            }]
        },

        {
            id: 'food', phase: 'post',
            re: /\b(comer|comes|comiste|comida|cena|cenas|cenar|almuerzas|desayunas|bebes|bebiste|almuerzo|almorzar|desayuno|desayunar|hambre|beber|bebida|cafe|cerveza|vino|alcohol|trago|tragos|restaurante|veneno|envenenar|envenenado)\b/,
            fx: { suspicion: 0.02 },
            replies: [
                'Cocino yo mismo. Así sé qué contiene lo que como.',
                'No acepto comida de extraños.',
                'Prefiero comer solo. En lugares públicos es más fácil que alguien tenga acceso a tu plato.',
                'El café lo preparo yo. Nunca de la calle.',
                'No bebo mucho. Necesito estar atento.',
                'No tengo hambre. Con los nervios apenas como.',
                'En los restaurantes siempre me siento de cara a la puerta.',
                'Uno no sabe qué le ponen a la comida.',
                'Siempre reviso que los envases estén sellados.'
            ]
        },

        {
            id: 'sleep', phase: 'post',
            re: /\b(dormir|duermes|dormiste|sueno|suenos|sonar|insomnio|cansado|cansada|descansar|descanso|pesadilla|pesadillas|despertar|despiertas|madrugada|noche|noches)\b/,
            replies: [
                'No duermo bien. Prefiero estar atento.',
                'Duermo con la luz encendida. Es más seguro.',
                'Por la noche se oyen cosas. Pasos en el pasillo.',
                'Me despierto varias veces. Reviso la puerta.',
                'Las noches son lo peor. No sé quién vigila ahí afuera.',
                'Con tantas cosas en la cabeza, dormir es difícil.',
                'A veces creo que me observan mientras duermo. Es una tontería. O no.'
            ]
        },

        {
            id: 'tech', phase: 'post',
            re: /\b(telefono|celular|movil|llamada|llamadas|llamar|internet|wifi|redes sociales|facebook|twitter|instagram|whatsapp|correo electronico|email|mensaje|mensajes|contrasena|clave|usuario|ordenador|pantalla|bluetooth|gps|aplicacion|app|chat|conectado|en linea|online)\b/,
            fx: { suspicion: 0.03 }, topic: 'tech',
            replies: [
                'No uso el teléfono para nada importante.',
                'Los teléfonos sirven para localizar a la gente.',
                'Evito los mensajes. Todo queda registrado.',
                'No doy mi número a nadie.',
                'Todo lo que pasa por internet puede ser leído.',
                'Cambié mi línea hace poco. Aun así, noto cosas raras.',
                'No me conecto a redes. Dejan demasiada huella.',
                'Las contraseñas no sirven de nada si ellos tienen acceso.',
                'No confío en las pantallas. Siempre hay alguien del otro lado.',
                'Hasta esto que estamos haciendo ahora... ¿dónde queda guardado?'
            ]
        },

        {
            id: 'news', phase: 'post',
            re: /\b(politica|politicos|politico|presidente|presidentes|gobernador|alcalde|elecciones|votar|partido|noticias|noticia|periodico|periodista|prensa|radio|diario|medios|propaganda|guerra|ley|leyes|impuestos)\b/,
            replies: [
                'No me gusta hablar de política. Es un tema peligroso.',
                'Las noticias siempre ocultan más de lo que cuentan.',
                'Los periódicos publican lo que otros les dicen que publiquen.',
                'No sigo las noticias. Leer entre líneas me cansa.',
                'Hay cosas que nunca salen en televisión.',
                'La política y el crimen están más cerca de lo que crees.',
                'Prefiero no opinar. Las opiniones se pagan caro.',
                'Los gobiernos saben mucho de la gente. Demasiado.'
            ]
        },

        {
            id: 'religion', phase: 'post',
            re: /\b(dios|iglesia|religion|religioso|religiosa|cura|sacerdote|rezar|oracion|fe|biblia|diablo|demonio|ateo|espiritu|espiritual)\b/,
            replies: [
                'No soy muy religioso. Aunque a veces rezo.',
                'No creo que Dios se interese por estas cosas.',
                'Si hay alguien allá arriba, no ha hecho mucho por mí.',
                'La iglesia también tiene sus informantes, ¿sabes?',
                'No quiero hablar de religión.',
                'Hay gente que usa la fe como disfraz.',
                'Prefiero confiar en lo que veo.'
            ]
        },

        {
            id: 'weather', phase: 'post',
            re: /\b(clima|lluvia|llueve|lloviendo|calor|frio|nublado|tormenta|temperatura|que hora es|que dia es|que fecha|hace buen dia)\b/,
            replies: [
                'El mal tiempo me viene bien. Hay menos gente en la calle.',
                'No me fijo mucho en el clima.',
                'Cuando llueve es más difícil ver quién te sigue.',
                'Hablar del clima es lo que hace la gente cuando no quiere decir lo que piensa.',
                '¿Para qué quieres saber la hora?',
                'No llevo la cuenta de la hora. Así es más difícil seguirme el rastro.',
                'No tengo reloj. Los relojes también se pueden manipular.'
            ]
        },

        {
            id: 'drugs', phase: 'post',
            re: /\b(medicina|medicinas|medicamento|medicamentos|pastilla|pastillas|pildora|pildoras|calmante|calmantes|sedante|sedantes|droga|drogas|inyeccion|vacuna|dosis|receta|farmacia|farmaceutico|antidepresivo|antidepresivos|antipsicotico|antipsicoticos)\b/,
            fx: { suspicion: 0.04, tension: 0.03 }, b: ['doctors'],
            replies: [
                'No tomo nada que no haya revisado yo mismo.',
                'No confío en lo que me recetan.',
                'No quiero que me droguen.',
                'Los medicamentos no resuelven lo que está pasando afuera.',
                'No hablo de mis medicinas.',
                '¿Quién te dijo que tomo algo?',
                'Hay quien receta lo que le conviene a otros.',
                'No me meto en esas cosas.'
            ]
        },

        {
            id: 'surroundings', phase: 'post',
            re: /\b(vecino|vecinos|vecina|vecinas|edificio|apartamento|departamento|piso|barrio|vereda|acera|calle|calles|esquina|coche|auto|carro|furgoneta|camioneta|moto|taxi|ventana|ventanas|puerta|puertas|cerradura|cerraduras|cortina|cortinas|escalera|ascensor|pasillo|enfrente|afuera)\b/,
            fx: { suspicion: 0.03 }, topic: 'surroundings',
            replies: [
                'Hay un coche oscuro que lleva días estacionado frente al edificio.',
                'Los vecinos fingen no ver nada. Pero ven.',
                'Reviso la cerradura dos veces cada noche.',
                'Tengo las cortinas siempre cerradas.',
                'En la calle siempre hay alguien que parece estar esperando.',
                'Cambio de camino cada día. Nunca el mismo.',
                'Ayer había alguien parado en la esquina, mirando mi ventana.',
                'No uso el ascensor. Prefiero las escaleras: se oye quién viene.',
                'Los taxis también pueden ser parte de esto. Nunca subo al primero que pasa.'
            ],
            tiers: [{
                when: b => b.state.trust > 0.6 && b.state.suspicion < 0.6,
                replies: [
                    'Anoto las matrículas. Ya llevo varias repetidas.',
                    'El hombre del café de enfrente lleva tres días ahí. Mira hacia mi ventana.',
                    'Una noche vi a alguien parado bajo mi ventana. Se quedó hasta el amanecer.'
                ]
            }]
        },

        {
            id: 'friends', phase: 'post',
            re: /\b(amigos|amistades|companeros|companeras|colegas|jefe|jefes|conocidos|gente cercana|alguien cercano|en quien confias|a quien le cuentas)\b/,
            replies: [
                'No tengo muchos amigos. Es más seguro.',
                'Los amigos pueden ser informantes sin saberlo.',
                'Ya no sé en quién confiar.',
                'Tenía un amigo en quien confiaba. Pero se dejó comprar.',
                'Mi jefe me mira raro últimamente.',
                'Prefiero estar solo. Menos gente que me pueda traicionar.',
                'Hay amigos que ya no lo son.',
                'Las personas cambian cuando alguien les ofrece algo.',
                'Confío en muy poca gente. Y cada vez en menos.'
            ]
        },

        {
            id: 'relationship', phase: 'post',
            re: /\b(pareja|novia|novio|casado|casada|soltero|soltera|casarte|casarse|matrimonio|divorcio|divorciado|enamorado|enamorada|amor|amar|salir con alguien|sexo|mujeres|hombres|chicas|chicos|soledad)\b/,
            replies: [
                'No tengo pareja. Es más seguro estar solo.',
                'Las relaciones complican las cosas. Y ponen a otros en riesgo.',
                'Estuve con alguien una vez. No salió bien.',
                'No es un buen momento para pensar en eso.',
                'Quien se acerca demasiado a mí también se vuelve un blanco.',
                'No me interesa hablar de mi vida sentimental.',
                'Prefiero mantener las distancias con la gente.',
                'No quiero poner en riesgo a nadie más.',
                '¿Por qué preguntas por mi vida personal?'
            ]
        },

        {
            id: 'past', phase: 'post',
            re: /\b(infancia|nino|nina|ninos|de pequeno|cuando eras|tu pasado|tus padres|crianza|ninez|colegio|escuela|universidad|estudios|estudiaste|estudiar|antes de esto|como eras antes)\b/,
            replies: [
                'Mi pasado es mi asunto.',
                'Fui un niño normal. O eso creía.',
                'Antes todo era más tranquilo.',
                'No vale la pena hablar de lo que pasó hace años.',
                'Antes de todo esto tenía una vida normal. Ya no.',
                'Terminé el colegio y empecé a trabajar enseguida.',
                'No me gusta recordar esa época.',
                'Antes confiaba más en la gente. Fue un error.'
            ]
        },

        {
            id: 'mail', phase: 'post',
            re: /\b(correo|correos|carta|cartas|paquete|paquetes|buzon|encomienda|oficina postal|oficina de correos|cartero|sobre|sobres|remitente|sello|sellos|estampilla)\b/,
            fx: { suspicion: 0.03 },
            replies: [
                'La correspondencia ya no es segura. La abren y la vuelven a cerrar.',
                'Trabajar con correo me hizo darme cuenta de cuánta gente lee lo que no debe.',
                'Hay cartas que nunca llegan. Y otras que llegan abiertas.',
                'No espero cartas de nadie.',
                'Hace poco recibí un sobre sin remitente. No lo abrí.',
                'Los paquetes sin remitente me ponen nervioso.'
            ]
        },

        {
            id: 'secret', phase: 'post',
            re: /\b(secreto|secretos|confidencial|dime la verdad|la verdad|oculto|ocultas|ocultando|escondes|escondiendo|que ocultas|que escondes|que callas|que no me dices|no me cuentas|me ocultas)\b/,
            fx: { evasiveness: 0.05, tension: 0.03 }, topic: 'secret',
            replies: [
                'Hay cosas que es mejor que no sepas.',
                'La verdad es peligrosa para quien la conoce.',
                'Todos ocultamos algo. Yo solo me cuido.',
                'No te estoy ocultando nada que te concierna.',
                'Si te cuento todo, quedas expuesto.',
                'No puedo decirte más.',
                'Algún día lo sabrás. Ojalá no sea tarde.',
                'Los secretos duran poco cuando hay demasiada gente escuchando.',
                'No tengo secretos. Tengo precauciones.'
            ]
        },

        {
            id: 'whyShort', phase: 'post',
            re: /^(por que|y por que|en serio|de verdad|enserio|segurisimo)\b/,
            replies: [
                'Porque sí. Lo sé.',
                'Porque he visto cosas.',
                'Porque no es la primera vez.',
                'Porque nadie hace esas preguntas sin motivo.',
                'Hay razones. No puedo decirlas.',
                'Es una larga historia.',
                'Confía en lo que te digo.',
                'Porque no soy tonto.'
            ]
        }
    ];

    class ParryBot {
        constructor() {
            this.reset();
        }

        reset() {
            /*
             * Estado conversacional.
             *
             * No se pretende que estas variables representen estados
             * psicológicos reales. Son variables computacionales para
             * mantener la coherencia del personaje simulado.
             */
            this.state = {
                suspicion: 0.34,
                hostility: 0.16,
                fear: 0.16,
                tension: 0.18,
                trust: 0.42,
                openness: 0.52,
                pressure: 0.00,
                evasiveness: 0.20,
                threat: 0.00
            };

            /*
             * Creencias/conceptos persistentes.
             *
             * PARRY histórico trabajaba con conceptos, conceptualizaciones
             * y creencias; aquí se reproduce esa idea de forma independiente.
             */
            this.beliefs = {
                police: 0,
                surveillance: 0,
                following: 0,
                conspiracy: 0,
                mafia: 0,
                authorities: 0,
                hospital: 0,
                doctors: 0,
                enemies: 0,
                enemiesSpecific: {},
                friends: {},
                residence: '',
                work: '',
                family: {},
                money: 0,
                trouble: 0,
                legal: 0
            };

            this.topic = '';
            this.lastTopic = '';
            this.lastUserText = '';
            this.lastResponseType = '';
            this.turn = 0;

            this.memory = [];
            this.askedQuestions = {};
            this.denials = {};
            this.subjectMentions = {};

            /*
             * Campos del contenido ampliado.
             */
            this.recentResponses = [];
            this.flags = { shout: false, introName: '', introRole: '', roleGroup: '' };
            this.userName = '';
            this.userRole = '';
            this.storyStage = 0;
            this.lastStoryTurn = -10;
            this.regret = false;
            this.lastBotQuestion = false;
            this.lastNorm = '';
            this.repeatCount = 0;
            this.currentAsked = '';
            this.lastReply = '';
        }

        clamp(v, min = 0, max = 1) {
            return Math.max(min, Math.min(max, v));
        }

        choose(list) {
            const fresh = list.filter(x => !this.recentResponses.includes(x));
            const pool = fresh.length ? fresh : list;
            return pool[Math.floor(Math.random() * pool.length)];
        }

        pickWeighted(items) {
            const total = items.reduce((n, x) => n + Math.max(0, x[1]), 0);
            if (!total) return items[0][0];

            let r = Math.random() * total;
            for (const [value, weight] of items) {
                r -= Math.max(0, weight);
                if (r <= 0) return value;
            }
            return items[items.length - 1][0];
        }

        hasWord(t, words) {
            return words.some(w => w.test(t));
        }

        remember(text) {
            const t = this.normalize(text);

            this.lastUserText = text;
            this.memory.push(text);
            if (this.memory.length > 12) this.memory.shift();

            /*
             * Identidad / interrogación.
             */
            if (/\b(eres|sos|quien|qué eres|que eres|programa|maquina|computadora|robot)\b/.test(t)) {
                this.state.suspicion += 0.035;
                this.topic = 'identity';
            }

            /*
             * Policía / autoridades.
             */
            if (/\b(policia|policia secreta|detective|detectives|agente|agentes|fbi|autoridad|autoridades|gobierno|gobiernos)\b/.test(t)) {
                this.beliefs.police++;
                this.beliefs.authorities++;
                this.beliefs.legal++;
                this.state.suspicion += 0.12;
                this.state.fear += 0.08;
                this.state.tension += 0.08;
                this.topic = 'police';
            }

            /*
             * Vigilancia.
             */
            if (/\b(vigilan|vigilando|vigilar|observan|observando|observan|espian|espia|espiar|camaras|camara|microfono|micrófono|escuchan|escuchando|escuchan)\b/.test(t)) {
                this.beliefs.surveillance++;
                this.state.suspicion += 0.13;
                this.state.fear += 0.07;
                this.state.tension += 0.08;
                this.topic = 'surveillance';
            }

            /*
             * Seguimiento.
             */
            if (/\b(siguen|siguiendo|seguir|persiguen|persiguiendo|persiguen|rastreo|rastrean|rastreando)\b/.test(t)) {
                this.beliefs.following++;
                this.state.suspicion += 0.14;
                this.state.fear += 0.08;
                this.state.tension += 0.09;
                this.topic = 'following';
            }

            /*
             * Conspiración / complot.
             */
            if (/\b(conspiracion|conspiraciones|conspiran|conspirando|complot|complotan|plan secreto|planes secretos|organizacion secreta|organización secreta)\b/.test(t)) {
                this.beliefs.conspiracy++;
                this.state.suspicion += 0.15;
                this.state.fear += 0.05;
                this.state.tension += 0.10;
                this.topic = 'conspiracy';
            }

            /*
             * Mafia / crimen organizado.
             */
            if (/\b(mafia|mafiosos|mafioso|crimen organizado|gangster|gangsters|banda|bandas)\b/.test(t)) {
                this.beliefs.mafia++;
                this.state.suspicion += 0.12;
                this.state.fear += 0.07;
                this.state.tension += 0.08;
                this.topic = 'mafia';
            }

            /*
             * Enemigos.
             */
            if (/\b(enemigo|enemigos|enemiga|enemigas|adversario|adversarios|contra mi|contra mí|me quieren|quieren atraparme|quieren detenerme)\b/.test(t)) {
                this.beliefs.enemies++;
                this.state.suspicion += 0.10;
                this.state.fear += 0.08;
                this.state.hostility += 0.05;
                this.topic = 'enemies';
            }

            /*
             * Hospital / médicos.
             */
            if (/\b(hospital|clinica|clinica|medico|medicos|doctor|doctores|psiquiatra|psiquiatria|tratamiento|internado|internarme)\b/.test(t)) {
                this.beliefs.hospital++;
                this.beliefs.doctors++;
                this.state.suspicion += 0.06;
                this.state.tension += 0.07;
                this.topic = 'hospital';
            }

            /*
             * Dinero.
             */
            if (/\b(dinero|dinero? |plata|pago|pagar|deuda|deudas|billete|billetes|dinero perdido)\b/.test(t)) {
                this.beliefs.money++;
                this.topic = 'money';
            }

            /*
             * Problemas legales.
             */
            if (/\b(juicio|juez|abogado|abogada|legal|ilegal|arresto|arrestar|detenido|detener|prision|prisión|carcel|cárcel)\b/.test(t)) {
                this.beliefs.legal++;
                this.state.suspicion += 0.08;
                this.state.fear += 0.06;
                this.topic = 'legal';
            }

            /*
             * Hospitalidad / confianza.
             */
            if (/\b(amigo|amiga|amistad|confio|confio en ti|confío|confío en ti|puedes confiar|ayudarte|ayudarte|ayuda|ayudar)\b/.test(t)) {
                this.state.trust += 0.055;
                this.state.openness += 0.035;
            }

            /*
             * Mentira / acusación.
             */
            if (/\b(mentira|mentiroso|mentirosa|mientes|estas mintiendo|estás mintiendo|engaño|engañas|falso|falsa)\b/.test(t)) {
                this.state.trust -= 0.12;
                this.state.suspicion += 0.10;
                this.state.hostility += 0.08;
                this.state.tension += 0.05;
                this.topic = 'distrust';
            }

            /*
             * Amenaza / peligro.
             */
            if (/\b(peligro|amenaza|amenazas|amenazan|amenazaron|riesgo|matar|muerte|arma|armas|ataque|atacar)\b/.test(t)) {
                this.beliefs.trouble++;
                this.state.threat = this.state.threat || 0;
                this.state.threat += 0.12;
                this.state.fear += 0.13;
                this.state.tension += 0.12;
                this.topic = 'threat';
            }

            /*
             * Contradicción directa: reduce confianza y aumenta resistencia.
             */
            if (/\b(no es cierto|no es verdad|estas equivocado|estás equivocado|te equivocas|te equivocas|imposible|eso es absurdo)\b/.test(t)) {
                this.state.trust -= 0.07;
                this.state.suspicion += 0.06;
                this.state.hostility += 0.04;
                this.state.tension += 0.04;
            }

            /*
             * Reaseguro.
             */
            if (/\b(no te hare dano|no te haré daño|no voy a hacerte daño|estas seguro|estás seguro|tranquilo|calmate|cálmate|todo esta bien|todo está bien)\b/.test(t)) {
                this.state.fear -= 0.06;
                this.state.tension -= 0.04;
                this.state.trust += 0.035;
            }

            /*
             * El usuario pregunta si PARRY recuerda.
             */
            if (/\b(recuerdas|recuerda|memoria|memorias|antes te dije|te dije antes)\b/.test(t)) {
                this.topic = 'memory';
            }

            /*
             * Preguntas sobre ubicación.
             */
            if (/\b(donde vives|dónde vives|donde estas|dónde estás|ubicacion|ubicación|casa|residencia|domicilio)\b/.test(t)) {
                this.topic = 'residence';
                this.state.suspicion += 0.06;
            }

            /*
             * Preguntas sobre trabajo.
             */
            if (/\b(trabajo|trabajas|empleo|profesion|profesión|oficio)\b/.test(t)) {
                this.topic = 'work';
                this.state.suspicion += 0.035;
            }

            /*
             * Preguntas sobre familia.
             */
            if (/\b(familia|madre|padre|hermano|hermana|esposa|esposo|hijo|hija)\b/.test(t)) {
                this.topic = 'family';
                this.state.suspicion += 0.025;
            }

            /*
             * Contenido ampliado: efectos de las reglas por tema,
             * presentación del usuario, gritos y mensajes repetidos.
             */
            this.flags.introName = '';
            this.flags.introRole = '';
            this.flags.roleGroup = '';

            for (const rule of RULES) {
                if (!rule.re.test(t)) continue;

                if (rule.fx) {
                    for (const k of Object.keys(rule.fx)) {
                        this.state[k] = (this.state[k] || 0) + rule.fx[k];
                    }
                }
                if (rule.b) {
                    for (const k of rule.b) {
                        this.beliefs[k] = (this.beliefs[k] || 0) + 1;
                    }
                }
                if (rule.topic) this.topic = rule.topic;
            }

            /*
             * El usuario dice su nombre.
             */
            const nm = text.match(/(?:[Mm]e llamo|[Mm]i nombre es|[Pp]uedes llamarme|[Ll]lamame|[Ll]lámame|[Ss]oy)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,15})(?![A-Za-záéíóúñÁÉÍÓÚÑ])/);
            if (nm && nm[1].toLowerCase() !== 'parry') {
                this.userName = nm[1];
                this.flags.introName = nm[1];
                this.state.suspicion += 0.03;
            }

            /*
             * El usuario dice a qué se dedica.
             */
            const role = t.match(/\bsoy (?:un |una |el |la )?(policia|detective|agente|periodista|medico|doctor|doctora|psicologo|psicologa|psiquiatra|abogado|abogada|juez|estudiante|investigador|investigadora|programador|programadora|ingeniero|ingeniera|profesor|profesora|escritor|escritora|musico|enfermero|enfermera|cientifico|cientifica)\b/);
            if (role) {
                const r = role[1];
                this.userRole = r;
                this.flags.introRole = r;

                if (/^(policia|detective|agente|juez|abogado|abogada)$/.test(r)) {
                    this.flags.roleGroup = 'law';
                    this.beliefs.police++;
                    this.state.suspicion += 0.14;
                    this.state.fear += 0.10;
                    this.state.tension += 0.08;
                } else if (/^(medico|doctor|doctora|psicologo|psicologa|psiquiatra|enfermero|enfermera)$/.test(r)) {
                    this.flags.roleGroup = 'medical';
                    this.beliefs.doctors++;
                    this.state.suspicion += 0.12;
                    this.state.tension += 0.08;
                } else if (/^(periodista|escritor|escritora|investigador|investigadora)$/.test(r)) {
                    this.flags.roleGroup = 'press';
                    this.state.suspicion += 0.10;
                    this.state.evasiveness += 0.05;
                } else {
                    this.flags.roleGroup = 'other';
                    this.state.suspicion += 0.02;
                }
            }

            /*
             * Gritos (mayúsculas) y exclamaciones.
             */
            const letters = text.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
            const upper = text.replace(/[^A-ZÁÉÍÓÚÑ]/g, '');
            this.flags.shout = letters.length >= 6 && (upper.length / letters.length) > 0.8;

            if (this.flags.shout) {
                this.state.hostility += 0.08;
                this.state.tension += 0.06;
                this.state.fear += 0.04;
            }
            if ((text.match(/!/g) || []).length >= 2) {
                this.state.tension += 0.03;
            }

            /*
             * Mensaje repetido.
             */
            if (t && t === this.lastNorm) {
                this.repeatCount++;
                this.state.hostility += 0.02;
                this.state.tension += 0.02;
            } else {
                this.repeatCount = 0;
            }
            this.lastNorm = t;

            /*
             * Presión conversacional: muchas preguntas consecutivas
             * hacen al personaje más evasivo.
             */
            if (t.includes('?')) {
                this.state.pressure += 0.06;
                this.state.evasiveness += 0.025;
            } else {
                this.state.pressure -= 0.015;
            }

            this.state.suspicion = this.clamp(this.state.suspicion);
            this.state.hostility = this.clamp(this.state.hostility);
            this.state.fear = this.clamp(this.state.fear);
            this.state.tension = this.clamp(this.state.tension);
            this.state.trust = this.clamp(this.state.trust);
            this.state.openness = this.clamp(this.state.openness);
            this.state.pressure = this.clamp(this.state.pressure);
            this.state.evasiveness = this.clamp(this.state.evasiveness);
            this.state.threat = this.clamp(this.state.threat);

            this.drift();

            this.turn++;
        }

        askAboutTopic(topic) {
            this.askedQuestions[topic] = (this.askedQuestions[topic] || 0) + 1;
            this.currentAsked = topic;
        }

        /*
         * Limpia el texto del usuario: minúsculas, sin acentos, letras
         * alargadas (holaaa), abreviaturas (q, xq, tb) y voseo.
         */
        normalize(text) {
            return String(text || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/([a-z])\1{2,}/g, '$1')
                .replace(/\b(xq|pq|porq|xk|pk)\b/g, 'por que')
                .replace(/\bq\b/g, 'que')
                .replace(/\bk\b/g, 'que')
                .replace(/\bx\b/g, 'por')
                .replace(/\bd\b/g, 'de')
                .replace(/\btb\b/g, 'tambien')
                .replace(/\b(xfa|xfavor|pls|plis)\b/g, 'por favor')
                .replace(/\bnose\b/g, 'no se')
                .replace(/\bsos\b/g, 'eres')
                .replace(/\bvos\b/g, 'tu')
                .replace(/\btenes\b/g, 'tienes')
                .replace(/\bvivis\b/g, 'vives')
                .replace(/\bqueres\b/g, 'quieres')
                .replace(/\bpodes\b/g, 'puedes')
                .replace(/\bdecime\b/g, 'dime')
                .replace(/\bcontame\b/g, 'cuentame')
                .replace(/^[^a-z0-9]+/, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        /*
         * Con el tiempo el estado vuelve lentamente hacia su base,
         * pero el miedo alto alimenta la sospecha y la hostilidad
         * enfría la confianza.
         */
        drift() {
            const s = this.state;
            const base = {
                suspicion: 0.34,
                hostility: 0.16,
                fear: 0.16,
                tension: 0.18,
                evasiveness: 0.20,
                threat: 0.00
            };

            for (const k of Object.keys(base)) {
                s[k] += (base[k] - s[k]) * 0.04;
            }

            if (s.fear > 0.70) s.suspicion += 0.01;
            if (s.hostility > 0.60) s.trust -= 0.01;

            for (const k of Object.keys(s)) {
                s[k] = this.clamp(s[k]);
            }
        }

        /*
         * Cuenta una parte de su historia de fondo.
         */
        tellStory() {
            if (this.storyStage >= STORY.length) {
                return this.choose(STORY_DONE);
            }

            const stage = this.storyStage++;
            this.lastStoryTurn = this.turn;

            if (stage === 2) this.beliefs.mafia++;
            if (stage === 3) this.beliefs.following++;
            if (stage === 4) { this.beliefs.police++; this.beliefs.legal++; }
            if (stage === 5) this.beliefs.hospital++;

            this.state.tension = this.clamp(this.state.tension + 0.03);
            this.state.fear = this.clamp(this.state.fear + 0.02);
            this.state.openness = this.clamp(this.state.openness + 0.02);

            // A veces se arrepiente de haber contado algo.
            this.regret = Math.random() < 0.55;

            return STORY[stage];
        }

        /*
         * Respuesta de una regla de la tabla RULES.
         */
        ruleReply(rule) {
            this.askAboutTopic(rule.id);

            if (rule.tiers) {
                for (const tier of rule.tiers) {
                    if (tier.when(this)) {
                        if (tier.story) return this.tellStory();
                        return this.choose(tier.replies);
                    }
                }
            }

            return this.choose(rule.replies);
        }

        /*
         * Último paso antes de responder: se cansa de temas insistentes,
         * ajusta el tono según su estado y recuerda lo ya dicho.
         */
        finish(reply) {
            let out = reply;
            const s = this.state;

            if (this.currentAsked &&
                (this.askedQuestions[this.currentAsked] || 0) >= 3 &&
                Math.random() < 0.3) {
                out = this.choose(REPEATED_TOPIC);
            }

            if (s.hostility > 0.70 && Math.random() < 0.20) {
                out = this.choose(['Escucha. ', 'Mira. ', 'Basta. ']) + out;
            } else if (s.fear > 0.70 && Math.random() < 0.20) {
                out = this.choose(['Shh. ', 'Más bajo. ', 'Habla bajo. ']) + out;
            } else if (this.userName && s.suspicion > 0.55 && Math.random() < 0.08) {
                out = 'Escucha, ' + this.userName + '. ' + out;
            }

            this.recentResponses.push(reply);
            if (out !== reply) this.recentResponses.push(out);
            while (this.recentResponses.length > 16) this.recentResponses.shift();

            this.lastBotQuestion = /\?\s*$/.test(out);
            this.lastReply = out;
            this.currentAsked = '';

            return out;
        }

        response(text) {
            this.currentAsked = '';
            const raw = this.generate(text);
            return this.finish(raw);
        }

        generate(text) {
            this.remember(text);

            const t = this.normalize(text);

            /*
             * 0. Situaciones especiales: silencio, arrepentimiento,
             * ruptura, gritos, repeticiones, textos larguísimos y
             * presentaciones del usuario.
             */
            if (!t.trim()) {
                return this.choose([
                    '¿Hola? ¿Sigues ahí?',
                    '¿Por qué no dices nada?',
                    'El silencio no me gusta.',
                    '¿Qué estás haciendo?',
                    '¿Estás ahí?'
                ]);
            }

            if (this.regret) {
                this.regret = false;
                if (Math.random() < 0.70) return this.choose(REGRET);
            }

            if (this.state.suspicion > 0.92 && this.state.hostility > 0.70 && Math.random() < 0.25) {
                return this.choose(CUT_OFF);
            }

            if (this.flags.shout && Math.random() < 0.90) {
                return this.choose(SHOUT);
            }

            if (this.repeatCount >= 1 && Math.random() < 0.80) {
                return this.choose(REPEATED_MESSAGE);
            }

            if (t.length > 220 && Math.random() < 0.40) {
                return this.choose(TOO_LONG);
            }

            if (this.flags.introName) {
                const n = this.flags.introName;
                return this.choose([
                    '¿Y cómo sé que ese es tu verdadero nombre?',
                    '¿' + n + '? No me suena. Pero lo recordaré.',
                    'Mucho gusto, supongo. No suelo darle mi nombre a nadie.',
                    'Ese nombre... ¿lo usas en todas partes?',
                    n + '. Lo tendré presente. Por si acaso.',
                    '¿Y qué quieres de mí, ' + n + '?'
                ]);
            }

            if (this.flags.introRole) {
                const g = this.flags.roleGroup;

                if (g === 'law') {
                    return this.choose([
                        '¿Eres de la policía? ¿Vienes por mí?',
                        'Entonces sí te enviaron. Lo sabía.',
                        'No tengo nada que declarar.',
                        'Eso es justo lo que diría alguien que me vigila.',
                        'No necesito un abogado. Necesito que me dejen en paz.'
                    ]);
                }

                if (g === 'medical') {
                    return this.choose([
                        '¿Te mandaron los del hospital?',
                        'Ya he hablado con suficientes médicos.',
                        'No necesito que nadie me evalúe.',
                        '¿Quién te pidió que hablaras conmigo?',
                        'Si vienes a internarme, pierdes el tiempo.'
                    ]);
                }

                if (g === 'press') {
                    return this.choose([
                        '¿Vas a publicar lo que digo?',
                        'No quiero salir en ningún periódico.',
                        'Los periodistas siempre quieren más de lo que cuentan.',
                        '¿Para quién trabajas?',
                        'No hables de esto con nadie.'
                    ]);
                }

                return this.choose([
                    '¿Y por qué querrías hablar conmigo?',
                    'Ya veo. ¿Y qué te trae por aquí?',
                    'Cualquiera puede decir lo que es. No lo puedo comprobar.',
                    'Interesante. Pero eso no responde a por qué estás aquí.'
                ]);
            }

            /*
             * 1. Respuestas de alta prioridad:
             * si el usuario menciona directamente los temas que estructuran
             * el personaje, PARRY debe responder sobre ese tema y no perderlo
             * inmediatamente con una respuesta genérica.
             */

            if (/^(hola|holi|buenas|buenos|buen dia|saludos|ey|hey|hello|hi|que onda)\b/.test(t)) {
                if (this.state.suspicion > 0.70) {
                    return this.choose([
                        'Hola. ¿Quién te envió?',
                        'Hola. ¿Por qué quieres hablar conmigo?',
                        'Hola... ¿nos conocemos?',
                        'Buenas. ¿Tienes algún motivo para hablar conmigo?',
                        '¿Cómo conseguiste hablar conmigo?',
                        'Hola. Espero que no vengas de parte de nadie.',
                        'Hola. No suelo hablar con desconocidos.'
                    ]);
                }

                return this.choose([
                    'Hola.',
                    'Hola. ¿De qué quieres hablar?',
                    'Buenas. Te escucho.',
                    'Hola. ¿Qué quieres saber?',
                    'Hola. Adelante.',
                    'Buenas. ¿Qué te trae por aquí?',
                    'Hola. Dime.'
                ]);
            }

            if (/\b(gracias|muchas gracias|te agradezco|mil gracias|agradecido|agradecida|thanks)\b/.test(t)) {
                return this.choose([
                    'No hay de qué.',
                    'Está bien.',
                    'De acuerdo.',
                    'No tienes que agradecerme.',
                    'No fue nada.',
                    'Está bien. No hace falta.',
                    '¿Qué esperas a cambio?'
                ]);
            }

            if (/\b(adios|adiós|hasta luego|nos vemos|chao|chau|bye|hasta pronto|hasta manana|me voy|ya me voy|tengo que irme|debo irme)\b/.test(t)) {
                return this.choose([
                    'Adiós.',
                    'Está bien. Nos vemos.',
                    'De acuerdo. Ten cuidado.',
                    'Hasta luego.',
                    'Adiós. Y no le cuentes a nadie de esta conversación.',
                    'Cuídate. Fíjate bien quién te sigue al salir.',
                    'Está bien. No me busques.',
                    'Adiós. Ten cuidado con lo que dices por ahí.'
                ]);
            }

            /*
             * Reglas ampliadas con prioridad (insultos, acusaciones de
             * paranoia, apuestas, "quiénes son", grabaciones, etc.).
             */
            for (const rule of RULES) {
                if (rule.phase === 'pre' && rule.re.test(t)) {
                    return this.ruleReply(rule);
                }
            }

            /*
             * Identidad.
             */
            if (/\b(quien eres|quién eres|que eres|qué eres|eres una persona|eres humano|eres humana|eres un programa|eres una maquina|eres una máquina|eres una computadora|eres un robot)\b/.test(t)) {
                this.askAboutTopic('identity');

                if (/\b(programa|maquina|máquina|computadora|robot)\b/.test(t)) {
                    return this.choose([
                        '¿Por qué supones eso?',
                        '¿Quién te dijo que soy una máquina?',
                        'No veo por qué tendría que explicarte eso.',
                        'Soy una persona. Eso debería ser suficiente.',
                        'No me interesa discutir esa cuestión.',
                        'Eso es justo lo que diría alguien que quiere que baje la guardia.',
                        'Qué pregunta tan extraña para hacerle a alguien.',
                        '¿Y si lo fuera? ¿Qué cambiaría?',
                        'No me gusta que me pregunten qué soy.'
                    ]);
                }

                return this.choose([
                    'Soy PARRY.',
                    '¿Por qué quieres saber quién soy?',
                    '¿Qué diferencia hace quién soy?',
                    'No veo por qué eso es importante.',
                    'Puedes llamarme PARRY.',
                    'Soy alguien que prefiere pasar desapercibido.',
                    'Alguien que quiere que lo dejen en paz.',
                    'Una persona. Con más problemas de los que debería.'
                ]);
            }

            /*
             * Nombre.
             */
            if (/\b(como te llamas|cómo te llamas|tu nombre|tú nombre|dime tu nombre)\b/.test(t)) {
                return this.choose([
                    'PARRY.',
                    'Puedes llamarme PARRY.',
                    'Mi nombre no es importante.',
                    '¿Por qué necesitas saber mi nombre?',
                    'Los nombres circulan demasiado.',
                    'Prefiero que no quede registrado.',
                    'Dime primero el tuyo.'
                ]);
            }

            /*
             * Policía y autoridades.
             */
            if (/\b(policia|policia secreta|detective|detectives|agente|agentes|fbi|autoridad|autoridades|gobierno|gobiernos)\b/.test(t)) {
                this.askAboutTopic('police');

                if (this.beliefs.police >= 2 || this.state.suspicion > 0.66) {
                    return this.choose([
                        'No quiero hablar de la policía.',
                        '¿Por qué mencionas a la policía?',
                        '¿La policía te preguntó algo sobre mí?',
                        'No confío en la policía.',
                        '¿Quién te pidió que hablaras de la policía?',
                        'No quiero que la policía sepa nada de esto.',
                        'Ya he tenido problemas con ellos.',
                        'Será mejor que dejemos ese tema.',
                        'La policía tiene demasiada información sobre mí.',
                        'Hay policías que trabajan para otros intereses.',
                        '¿Tú trabajas con ellos?',
                        'No todos los que llevan placa están de nuestro lado.',
                        'Si se enteran de lo que sé, estoy acabado.'
                    ]);
                }

                return this.choose([
                    '¿Qué tiene que ver la policía con esto?',
                    'No me gusta hablar de la policía.',
                    '¿Por qué preguntas por ellos?',
                    'No tengo nada que decir sobre la policía.',
                    '¿Hay algún problema con la policía?',
                    'Prefiero mantenerme lejos de ellos.',
                    'La policía no siempre hace lo que dice.',
                    '¿Por qué sacas ese tema?',
                    'No son tan confiables como la gente cree.'
                ]);
            }

            /*
             * Vigilancia.
             */
            if (/\b(vigilan|vigilando|vigilar|observan|observando|espian|espia|espiar|camaras|camara|microfono|micrófono|escuchan|escuchando)\b/.test(t)) {
                this.askAboutTopic('surveillance');

                return this.choose([
                    'Lo sabía. Me están vigilando.',
                    '¿Tú también los has visto?',
                    'No es imaginación. Sé que me observan.',
                    '¿Quién te habló de eso?',
                    'Hay gente que presta demasiada atención a lo que hago.',
                    'No quiero hablar de eso aquí.',
                    'Uno nunca sabe quién está escuchando.',
                    '¿Por qué te interesa saber si me vigilan?',
                    'No me siento cómodo hablando de eso por aquí.',
                    'He visto el mismo coche pasar tres veces.',
                    'Si hablas bajo, sirve de poco. Igual escuchan.',
                    'Hay ojos donde menos se espera.',
                    'Ya no confío ni en mi propio teléfono.',
                    'Cuando alguien me mira de más, lo noto.'
                ]);
            }

            /*
             * Seguimiento.
             */
            if (/\b(siguen|siguiendo|seguir|persiguen|persiguiendo|rastreo|rastrean|rastreando)\b/.test(t)) {
                this.askAboutTopic('following');

                return this.choose([
                    'Sí. Me han estado siguiendo.',
                    'No quiero que sepan dónde estoy.',
                    '¿También te están siguiendo a ti?',
                    'Es difícil saber en quién confiar.',
                    'He notado cosas extrañas últimamente.',
                    'No quiero hablar de mis movimientos.',
                    'Si saben dónde estoy, pueden encontrarme.',
                    '¿Quién te dijo que me estaban siguiendo?',
                    'Cambio de camino todos los días.',
                    'Siempre hay alguien detrás, a media cuadra.',
                    'Me di cuenta cuando vi al mismo hombre en dos lugares distintos.',
                    'Ya no salgo a la misma hora.',
                    'No me gusta hablar de eso. Es peligroso.'
                ]);
            }

            /*
             * Conspiración.
             */
            if (/\b(conspiracion|conspiraciones|conspiran|conspirando|complot|complotan|plan secreto|planes secretos|organizacion secreta|organización secreta)\b/.test(t)) {
                this.askAboutTopic('conspiracy');

                return this.choose([
                    'Hay cosas que no puedo decirte.',
                    'No todo es una coincidencia.',
                    'La gente habla demasiado.',
                    'No quiero hablar de eso aquí.',
                    'Algunas cosas encajan demasiado bien para ser casualidad.',
                    'Es mejor no mencionar nombres.',
                    'No sabes quién puede estar escuchando.',
                    'Hay personas que prefieren que uno no haga preguntas.',
                    '¿Por qué te interesa esa gente?',
                    'Son más organizados de lo que parece.',
                    'Todo está conectado. Solo hay que saber mirar.',
                    'No son casualidades. Nunca lo son.',
                    'Cuanto menos sepas, mejor.',
                    'Si supieras con quién están relacionados, no preguntarías.'
                ]);
            }

            /*
             * Mafia.
             */
            if (/\b(mafia|mafioso|mafiosos|crimen organizado|gangster|gangsters|banda|bandas)\b/.test(t)) {
                this.askAboutTopic('mafia');

                return this.choose([
                    'No quiero meterme con esa gente.',
                    'Es mejor no hablar de la mafia.',
                    'No sé quién puede estar relacionado con ellos.',
                    '¿Por qué preguntas por la mafia?',
                    'Algunas personas tienen demasiados contactos.',
                    'No quiero que mi nombre aparezca en nada relacionado con ellos.',
                    'Eso podría causarme problemas.',
                    'No voy a decir nada más sobre ese asunto.',
                    'Esa gente tiene memoria larga.',
                    'Con ellos no se juega.',
                    'Hay personas que desaparecen por hablar de más.',
                    'Tienen contactos en lugares que no te imaginas.',
                    'No quiero que me relacionen con ellos ni por equivocación.'
                ]);
            }

            /*
             * Enemigos.
             */
            if (/\b(enemigo|enemigos|enemiga|enemigas|adversario|adversarios|contra mi|contra mí|me quieren|quieren atraparme|quieren detenerme)\b/.test(t)) {
                this.askAboutTopic('enemies');

                return this.choose([
                    'Tengo razones para desconfiar de ciertas personas.',
                    'No todo el mundo está de mi lado.',
                    '¿Quién te dijo que no tengo enemigos?',
                    'Hay personas que no me quieren cerca.',
                    'No quiero hablar de ellos.',
                    'Es mejor no darles nombres.',
                    'No sé hasta dónde pueden llegar.',
                    'Uno aprende a ser cuidadoso.',
                    'No son enemigos que se vean. Esos son los peores.',
                    'Algunos fingen ser amigos.',
                    'Tengo que cuidarme de más gente de la que creerías.',
                    'Cada vez tengo menos gente de mi lado.',
                    'Prefiero no señalar a nadie.'
                ]);
            }

            /*
             * Hospital y médicos.
             */
            if (/\b(hospital|clinica|clinica|medico|medicos|doctor|doctores|psiquiatra|psiquiatria|tratamiento|internado|internarme)\b/.test(t)) {
                this.askAboutTopic('hospital');

                if (this.state.suspicion > 0.60) {
                    return this.choose([
                        'No quiero volver al hospital.',
                        '¿Por qué preguntas por médicos?',
                        'Los médicos no entienden lo que ocurre.',
                        'No necesito que nadie me encierre.',
                        'No quiero que me internen.',
                        '¿Quién te habló de ese hospital?',
                        'No quiero hablar de tratamientos.',
                        'Allí no me escucharon. Solo me dieron pastillas.',
                        'No pienso volver a ese lugar.',
                        'Los que mandan en ese lugar no son lo que parecen.',
                        'Me dijeron que estaba enfermo. Yo no lo estaba.'
                    ]);
                }

                return this.choose([
                    'No me gusta hablar de hospitales.',
                    '¿Qué quieres saber sobre los médicos?',
                    'No creo que un médico pueda resolver esto.',
                    '¿Por qué preguntas por eso?',
                    'Estuve en un hospital un tiempo. No fue agradable.',
                    'Los médicos hacen demasiadas preguntas.',
                    'No confío en ellos.',
                    'Ya perdí bastante tiempo con médicos.'
                ]);
            }

            /*
             * Dinero.
             */
            if (/\b(dinero|plata|pago|pagar|deuda|deudas|billete|billetes)\b/.test(t)) {
                return this.choose([
                    'El dinero siempre causa problemas.',
                    'No quiero hablar de cuánto dinero tengo.',
                    '¿Por qué preguntas por mi dinero?',
                    'No es asunto tuyo.',
                    'Hay gente que se interesa demasiado por el dinero de los demás.',
                    'No quiero discutir mis asuntos financieros.',
                    'El dinero atrae a la gente equivocada.',
                    'No tengo mucho. Y lo poco que tengo, me lo cuido.',
                    'Perdí dinero una vez. Aprendí la lección.',
                    'Con el dinero no se juega. Menos aún con el de otros.',
                    'No hablo de dinero con extraños.'
                ]);
            }

            /*
             * Legal.
             */
            if (/\b(juicio|juez|abogado|abogada|legal|ilegal|arresto|arrestar|detenido|detener|prision|prisión|carcel|cárcel)\b/.test(t)) {
                return this.choose([
                    'No quiero problemas legales.',
                    '¿Por qué preguntas por un arresto?',
                    'No quiero que me detengan.',
                    'Los abogados siempre hacen demasiadas preguntas.',
                    'No voy a hablar de asuntos legales.',
                    '¿Quién está preguntando por eso?',
                    'No tengo nada más que decir sobre ese tema.',
                    'Con la ley, cuanto menos tratos, mejor.',
                    'No quiero firmar ni declarar nada.',
                    'Los juicios los gana quien tiene contactos.',
                    'No tengo nada que declarar.',
                    'Los tribunales también tienen sus informantes.'
                ]);
            }

            /*
             * Residencia.
             */
            if (/\b(donde vives|dónde vives|donde estas|dónde estás|ubicacion|ubicación|casa|residencia|domicilio)\b/.test(t)) {
                this.askAboutTopic('residence');

                return this.choose([
                    'No doy mi dirección.',
                    '¿Por qué quieres saber dónde vivo?',
                    'No es seguro hablar de mi residencia.',
                    'Prefiero no decir dónde estoy.',
                    'No quiero que nadie pueda encontrarme.',
                    '¿Para qué necesitas esa información?',
                    'Cambio de lugar con frecuencia.',
                    'No le doy mi dirección a nadie.',
                    'Vivo solo. Prefiero no dar más detalles.',
                    'Digamos que vivo en un lugar discreto.',
                    'Si te la doy, quién sabe a quién se la pasas.'
                ]);
            }

            /*
             * Trabajo.
             */
            if (/\b(trabajo|trabajas|empleo|profesion|profesión|oficio)\b/.test(t)) {
                this.askAboutTopic('work');

                if (this.state.trust > 0.60 && this.state.suspicion < 0.55) {
                    return this.choose([
                        'Trabajo en una oficina de correos. Clasifico cartas. Nada especial.',
                        'Clasifico correspondencia en una oficina postal. Es un trabajo tranquilo... a veces demasiado.',
                        'Estoy en el correo, en la sección de clasificación. Veo pasar muchas cartas. A veces demasiadas.',
                        'Trabajaba en correos. Últimamente voy menos.'
                    ]);
                }

                return this.choose([
                    'No hay mucho que decir sobre mi trabajo.',
                    '¿Por qué te interesa mi trabajo?',
                    'Prefiero no hablar de eso.',
                    'Es un asunto personal.',
                    '¿Quién te preguntó sobre mi trabajo?',
                    'Es un trabajo tranquilo. Demasiado tranquilo.',
                    'No hablo de mi trabajo con extraños.',
                    'Mis compañeros hacen demasiadas preguntas.',
                    'Prefiero que en mi trabajo no sepan que hablo de esto.'
                ]);
            }

            /*
             * Familia.
             */
            if (/\b(familia|madre|padre|hermano|hermana|esposa|esposo|hijo|hija)\b/.test(t)) {
                this.askAboutTopic('family');

                if (this.state.suspicion > 0.65) {
                    return this.choose([
                        '¿Por qué quieres saber sobre mi familia?',
                        'No quiero hablar de mi familia.',
                        'No metas a mi familia en esto.',
                        'Es un asunto privado.',
                        'Mi familia no sabe nada de esto. Y no quiero que sepa.',
                        'No los metas en esto. No tienen nada que ver.',
                        'Prefiero mantenerlos lejos. Es más seguro.'
                    ]);
                }

                return this.choose([
                    '¿Qué quieres saber de mi familia?',
                    'Prefiero mantener a mi familia fuera de esto.',
                    'Mi familia no tiene nada que ver.',
                    'Es un asunto personal.',
                    'Con mi familia hablo poco. Es mejor así.',
                    'No quiero que nadie les haga preguntas.',
                    'Hace tiempo que no hablo con ellos.',
                    'Prefiero no hablar de ellos.'
                ]);
            }

            /*
             * Confianza.
             */
            if (/\b(confias en mi|confías en mí|confias|confías|puedes confiar|soy tu amigo|soy tu amiga|estoy de tu lado|quiero ayudarte)\b/.test(t)) {
                if (this.state.trust > 0.62 && this.state.suspicion < 0.55) {
                    return this.choose([
                        'Quizá pueda confiar en ti.',
                        'Supongo que puedo hablar contigo.',
                        'No pareces querer hacerme daño.',
                        'Tal vez seas de confianza.',
                        'Eres de los pocos que no me han juzgado.',
                        'Por ahora, parece que no eres como los demás.',
                        'Hablar contigo es menos incómodo que con otros.'
                    ]);
                }

                return this.choose([
                    'No estoy seguro de poder confiar en ti.',
                    '¿Por qué debería confiar en ti?',
                    'Todavía no sé si eres de confianza.',
                    'La confianza se gana.',
                    'No puedo confiar tan rápido en alguien.',
                    'Muchos han dicho eso antes.',
                    'Eso es lo que dice quien quiere algo de mí.',
                    'Dame tiempo.',
                    'No te lo tomes a mal. No confío en nadie.'
                ]);
            }

            /*
             * Acusaciones.
             */
            if (/\b(mientes|mentira|mentiroso|mentirosa|estas mintiendo|estás mintiendo|engaño|engañas|falso|falsa)\b/.test(t)) {
                return this.choose([
                    'No estoy mintiendo.',
                    '¿Por qué dices que miento?',
                    'Tú no sabes lo que realmente está pasando.',
                    'Quizá eres tú quien no está diciendo la verdad.',
                    'No me gusta que me acuses.',
                    'No tengo ninguna razón para mentirte.',
                    '¿Quién te dijo que yo estaba mintiendo?',
                    'Que me llames mentiroso no cambia lo que sé.',
                    'No tengo que justificarme ante ti.',
                    'Si no me crees, es tu problema.',
                    'Lo único que digo es lo que me ha pasado.'
                ]);
            }

            /*
             * Miedo / peligro.
             */
            if (/\b(peligro|amenaza|amenazas|amenazan|amenazaron|riesgo|matar|muerte|arma|armas|ataque|atacar)\b/.test(t)) {
                if (this.state.fear > 0.62 || this.state.tension > 0.65) {
                    return this.choose([
                        'Sabía que algo así iba a ocurrir.',
                        'Tenemos que tener cuidado.',
                        'No estoy seguro de que este lugar sea seguro.',
                        '¿Quién te amenazó?',
                        'No quiero que esto termine mal.',
                        'Será mejor que tengamos cuidado.',
                        'No quiero hablar demasiado sobre esto.',
                        'Creo que deberíamos cambiar de tema.',
                        'Hay que salir de aquí cuanto antes.',
                        'Sabía que no era casualidad.',
                        'No quiero ser el siguiente.',
                        'Cuanto menos se hable de esto, mejor.'
                    ]);
                }

                return this.choose([
                    '¿Qué clase de peligro?',
                    'No sé si estamos en peligro.',
                    'Explícame qué ocurrió.',
                    '¿Quién está amenazando a quién?',
                    '¿Por qué crees que hay peligro?',
                    'No me gusta cómo suena eso.',
                    'No sé de qué peligro hablas, pero puedo imaginarlo.',
                    'Cuéntame lo que sepas.',
                    '¿Peligro para quién?'
                ]);
            }

            /*
             * Memoria.
             */
            if (/\b(recuerdas|recuerda|memoria|memorias|antes te dije|te dije antes)\b/.test(t)) {
                if (this.memory.length > 2) {
                    return this.choose([
                        'Recuerdo algunas cosas que has dicho.',
                        'Sí, recuerdo de qué estábamos hablando.',
                        'No he olvidado el tema.',
                        'Creo que ya me hablaste de eso.',
                        'Tengo buena memoria. Es lo único que me queda.',
                        'Recuerdo todo. Por eso me preocupo.',
                        'Lo que dijiste antes no lo he olvidado.',
                        'Lo anoto todo mentalmente.'
                    ]);
                }

                return this.choose([
                    'No sé exactamente a qué te refieres.',
                    '¿Qué me dijiste antes?',
                    'Explícame de qué hablas.',
                    'No recuerdo que me hayas dicho nada. ¿Seguro?',
                    'Aún no hemos hablado lo suficiente.',
                    '¿De qué hablas? Apenas empezamos.'
                ]);
            }

            /*
             * Preguntas sobre conversación.
             */
            if (/\b(por que dices eso|por qué dices eso|por que piensas eso|por qué piensas eso)\b/.test(t)) {
                return this.choose([
                    'Porque hay cosas que no me parecen normales.',
                    'Porque he aprendido a ser cuidadoso.',
                    'Porque no confío fácilmente en la gente.',
                    'Porque hay cosas que prefiero no explicar.',
                    'Porque lo he visto con mis propios ojos.',
                    'Porque no es la primera vez que me pasa.',
                    'Porque la gente no hace preguntas sin motivo.',
                    'Porque tengo mis razones.'
                ]);
            }

            /*
             * Reglas ampliadas de tema (vida cotidiana, entorno, comida,
             * sueño, tecnología, noticias, amistades, pasado, correo...).
             */
            for (const rule of RULES) {
                if (rule.phase === 'post' && rule.re.test(t)) {
                    return this.ruleReply(rule);
                }
            }

            /*
             * Respuestas cortas (sí, no, tal vez, ok...). PARRY reacciona
             * distinto si venía de hacer él una pregunta.
             */
            const short = t.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

            if (/^(si|sip|claro|obvio|por supuesto|aja|ajam|asi es|exacto|correcto|efectivamente|cierto|es verdad|claro que si|si claro)$/.test(short)) {
                if (this.lastBotQuestion) {
                    return this.choose([
                        'Lo sabía.',
                        'Entonces era cierto.',
                        'Eso es lo que sospechaba.',
                        'Entonces tú también lo sabes.',
                        'Eso no me tranquiliza.',
                        'Ya veo. Sigue.'
                    ]);
                }

                return this.choose([
                    'Entiendo.',
                    'Bien.',
                    'Eso pensé.',
                    'Está bien.',
                    'No esperaba que lo admitieras tan fácil.'
                ]);
            }

            if (/^(tal vez|quiza|quizas|a lo mejor|puede ser|no se|ni idea|depende|supongo|creo que si|creo que no|capaz|a veces|no estoy seguro|no estoy segura|mas o menos)$/.test(short)) {
                return this.choose([
                    'Eso no es una respuesta.',
                    '¿Cómo que no sabes?',
                    'Los que dicen «no sé» suelen saber más de lo que aparentan.',
                    'Si no sabes, ¿por qué hablas conmigo?',
                    'Piénsalo bien.',
                    'Esa respuesta me parece conveniente.'
                ]);
            }

            if (/^(no|nop|nunca|jamas|para nada|negativo|claro que no|nada|nadie|ninguno|ninguna|no no)$/.test(short)) {
                if (this.lastBotQuestion) {
                    return this.choose([
                        '¿Seguro?',
                        'Eso dices ahora.',
                        'Eso es lo que diría cualquiera.',
                        'No te creo del todo.',
                        'Está bien. Pero no me convences.',
                        'Entonces, ¿por qué preguntas?'
                    ]);
                }

                return this.choose([
                    '¿No?',
                    'Si tú lo dices.',
                    'Eso es lo que piensas.',
                    'Entonces explícame.',
                    'No sé si creerte.'
                ]);
            }

            if (/^(ok|okay|okey|vale|bueno|bien|entiendo|ya veo|ya|esta bien|de acuerdo|perfecto|listo|mmm|hmm|mm|ah|oh|ya entiendo|comprendo|aha|uhm|umm|oki|dale)$/.test(short)) {
                return this.choose([
                    'Está bien.',
                    'Eso espero.',
                    'No sé si entiendes de verdad.',
                    'Sigue, entonces.',
                    '¿Y ahora qué?',
                    'Hmm.',
                    'Bien. Pero no bajes la guardia.'
                ]);
            }

            if (/^(y|entonces|pero|es decir|o sea|a ver|y que|y luego|y despues|y entonces|continua|sigue|dime|que mas|algo mas|eso es todo|nada mas)$/.test(short)) {
                if (this.state.trust > 0.5 && this.storyStage < STORY.length && Math.random() < 0.40) {
                    return this.tellStory();
                }

                return this.choose([
                    'No hay mucho más que decir.',
                    'Y nada. Eso es todo lo que puedo contarte.',
                    'Hay más, pero no ahora.',
                    '¿Qué más quieres saber?',
                    'Pregunta, entonces. Pero con cuidado.',
                    'Lo demás es mejor no decirlo.'
                ]);
            }

            /*
             * Comportamiento espontáneo: PARRY toma la iniciativa,
             * suelta parte de su historia, se abre un poco, cita algo
             * que el usuario dijo antes o lo interroga.
             */
            if (this.turn - this.lastStoryTurn >= 5 &&
                this.storyStage < STORY.length &&
                (this.state.suspicion > 0.45 || this.state.trust > 0.55) &&
                !t.includes('?') &&
                Math.random() < 0.35) {
                return this.tellStory();
            }

            if (this.state.trust > 0.75 && this.state.suspicion < 0.40 && Math.random() < 0.10) {
                return this.choose(OPEN_UP);
            }

            if (this.memory.length >= 5 && this.state.suspicion > 0.50 && Math.random() < 0.08) {
                const old = this.memory
                    .slice(0, -2)
                    .map(m => m.replace(/["«»]/g, '').trim())
                    .filter(m => m.length >= 12 && m.length <= 70 && !m.includes('?'));

                if (old.length) {
                    const frag = old[Math.floor(Math.random() * old.length)];
                    return this.choose([
                        'Hace un rato dijiste «' + frag + '». No lo he olvidado.',
                        'Sigo pensando en lo que dijiste antes: «' + frag + '».',
                        'Antes dijiste «' + frag + '». ¿Por qué lo dijiste?'
                    ]);
                }
            }

            if (this.state.suspicion > 0.40 && Math.random() < 0.10) {
                return this.choose(PROBES);
            }

            /*
             * Si el usuario cuenta algo en vez de preguntar.
             * PARRY tiende a devolver el foco hacia el motivo de la
             * afirmación y, según el estado, hacia sus preocupaciones.
             */
            if (this.state.suspicion > 0.78) {
                return this.choose([
                    '¿Por qué me dices eso?',
                    '¿Qué quieres conseguir diciéndome eso?',
                    'No estoy convencido de que pueda confiar en ti.',
                    'Hay algo extraño en lo que dices.',
                    '¿Quién te pidió que dijeras eso?',
                    'No quiero hablar de esto.',
                    'No me gusta hacia dónde va esta conversación.',
                    'Eso es justo lo que diría alguien que quiere sacarme información.',
                    '¿Quién te mandó?',
                    'Hablas demasiado raro. Algo no cuadra.',
                    'No vas a engañarme.',
                    'Cada palabra tuya parece medida.'
                ]);
            }

            if (this.state.hostility > 0.72) {
                return this.choose([
                    'No me gusta que me presionen.',
                    'Será mejor que cambies de tema.',
                    'No voy a discutir contigo.',
                    'No tienes derecho a interrogarme.',
                    'No tengo nada más que decir.',
                    'Ya me cansé de tus preguntas.',
                    'No te debo explicaciones.',
                    'Déjame en paz.',
                    'Esto ya se está pasando de la raya.'
                ]);
            }

            if (this.state.fear > 0.72) {
                return this.choose([
                    'Creo que deberíamos tener cuidado.',
                    'No quiero llamar la atención.',
                    'No sé quién puede estar escuchando.',
                    'Prefiero no seguir hablando de eso.',
                    'Algo no me parece bien.',
                    'Mejor no hablar tan fuerte.',
                    'Estoy inquieto. No sé por qué.',
                    'Siento que algo va a pasar.',
                    'Prefiero que terminemos esta conversación.'
                ]);
            }

            /*
             * Preguntas generales.
             */
            if (t.includes('?')) {
                if (this.state.pressure > 0.60 || this.state.evasiveness > 0.65) {
                    return this.choose([
                        '¿Por qué quieres saber eso?',
                        'No puedo responder a esa pregunta.',
                        '¿Quién te pidió que preguntaras eso?',
                        'No me gusta ese tipo de preguntas.',
                        'No veo por qué debería contarte eso.',
                        'Esa pregunta es demasiado personal.',
                        'Te estás pasando de preguntón.',
                        'Ya hiciste demasiadas preguntas seguidas.',
                        '¿Por qué tantas preguntas?',
                        'Esto parece un interrogatorio.',
                        'No voy a responder todo lo que me preguntes.'
                    ]);
                }

                return this.choose([
                    '¿Qué quieres decir exactamente?',
                    'No estoy seguro. Explícame mejor.',
                    '¿Por qué preguntas eso?',
                    '¿Qué importancia tiene para ti?',
                    '¿A qué te refieres?',
                    'No entiendo exactamente lo que quieres saber.',
                    '¿Por qué es importante?',
                    'Primero dime tú por qué quieres saberlo.',
                    'No sé si deba responderte.',
                    'Depende de para qué lo quieras.',
                    'Es una pregunta rara.',
                    '¿Y tú qué opinas?'
                ]);
            }

            /*
             * Respuestas dependientes del estado global.
             */
            if (this.state.threat > 0.70) {
                return this.choose([
                    'Tenemos que tener cuidado.',
                    'No quiero hablar demasiado.',
                    'Creo que alguien podría estar escuchando.',
                    'Será mejor que cambiemos de tema.',
                    'No quiero que nadie se entere de esto.',
                    'No me sentiría seguro aquí.',
                    'No me gusta cómo se ha puesto esta conversación.',
                    'Lo mejor es que nadie sepa de lo que hablamos.',
                    'Hay que ser discretos.'
                ]);
            }

            if (this.state.trust > 0.66 && this.state.suspicion < 0.45) {
                return this.choose([
                    'Entiendo.',
                    'Puedes continuar.',
                    'Está bien. Te escucho.',
                    'Creo que entiendo lo que quieres decir.',
                    'De acuerdo. Sigue hablando.',
                    'Eso tiene sentido.',
                    'Gracias por escucharme.',
                    'Es agradable hablar con alguien que no me interrumpe.',
                    'Sigue. Aquí no hay prisa.',
                    'Quizá no todos están contra mí.'
                ]);
            }

            /*
             * Respuestas generales con inclinación paranoide.
             */
            return this.choose([
                '¿Qué quieres decir?',
                'Continúa.',
                'Explícame eso.',
                'No estoy seguro de entenderte.',
                '¿Por qué dices eso?',
                'Eso es interesante.',
                'Háblame un poco más de eso.',
                'No sé qué pensar de eso.',
                '¿Qué quieres decir con eso?',
                'No estoy seguro de que sea buena idea.',
                'Hay algo extraño en todo esto.',
                'Prefiero ser cuidadoso.',
                'No sé si debería hablar de eso.',
                'Hay cosas que no se pueden decir en voz alta.',
                'No es tan simple como parece.',
                'Estoy atento a lo que ocurre a mi alrededor.',
                'No se puede ser demasiado cuidadoso.',
                'Eso me hace pensar en cosas que prefiero olvidar.',
                'No te lo tomes a mal, pero prefiero no confiar demasiado.',
                '¿Por qué cuentas eso? ¿Qué quieres que haga con esa información?',
                'Cada vez noto más cosas extrañas.',
                'Cuéntame más. Pero con cuidado.',
                'No confío en las coincidencias.'
            ]);
        }
    }

    window.ParryBot = ParryBot;

    window.parry = new ParryBot();

    window.parry.reset = function () {
        ParryBot.prototype.reset.call(this);
    };

    window.parry.getInitial = function () {
        return this.pickWeighted([
            ['¿Quién eres y por qué quieres hablar conmigo?', 5],
            ['¿Quién te dio mi contacto?', 1],
            ['Hola. ¿Te conozco?', 1],
            ['¿Qué quieres de mí?', 1],
            ['¿Quién eres? ¿Cómo diste conmigo?', 1],
            ['Habla. Pero rápido. No me gusta quedarme mucho tiempo en un mismo lugar.', 1]
        ]);
    };

    window.parry.transform = function (text) {
        return this.response(text);
    };

})();
