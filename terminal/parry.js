/*
 * PARRY - Proyecto Eliza
 * ------------------------------------------------------------
 * Recreación educativa ampliada inspirada en la arquitectura
 * conceptual descrita para PARRY por Kenneth Colby y colaboradores.
 *
 * IMPORTANTE:
 * Este archivo NO es el código histórico original de PARRY.
 * Es una implementación independiente. Conserva ideas centrales
 * del modelo: conceptos, creencias, temas, estrategia conversacional
 * y estado interno que cambia la selección de respuestas.
 *
 * Interfaz esperada por Proyecto ELIZA:
 *   parry.reset()
 *   parry.getInitial()
 *   parry.transform(text)
 */

(function () {
    'use strict';

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
                evasiveness: 0.20
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
        }

        clamp(v, min = 0, max = 1) {
            return Math.max(min, Math.min(max, v));
        }

        choose(list) {
            return list[Math.floor(Math.random() * list.length)];
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
            const t = text
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

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

            this.turn++;
        }

        askAboutTopic(topic) {
            this.askedQuestions[topic] = (this.askedQuestions[topic] || 0) + 1;
        }

        response(text) {
            this.remember(text);

            const t = text.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            /*
             * 1. Respuestas de alta prioridad:
             * si el usuario menciona directamente los temas que estructuran
             * el personaje, PARRY debe responder sobre ese tema y no perderlo
             * inmediatamente con una respuesta genérica.
             */

            if (/^(hola|buenas|hey|hello|hi)\b/.test(t)) {
                if (this.state.suspicion > 0.70) {
                    return this.choose([
                        'Hola. ¿Quién te envió?',
                        'Hola. ¿Por qué quieres hablar conmigo?',
                        'Hola... ¿nos conocemos?',
                        'Buenas. ¿Tienes algún motivo para hablar conmigo?'
                    ]);
                }

                return this.choose([
                    'Hola.',
                    'Hola. ¿De qué quieres hablar?',
                    'Buenas. Te escucho.',
                    'Hola. ¿Qué quieres saber?'
                ]);
            }

            if (/\b(gracias|muchas gracias|te agradezco)\b/.test(t)) {
                return this.choose([
                    'No hay de qué.',
                    'Está bien.',
                    'De acuerdo.',
                    'No tienes que agradecerme.'
                ]);
            }

            if (/\b(adios|adiós|hasta luego|nos vemos|chao)\b/.test(t)) {
                return this.choose([
                    'Adiós.',
                    'Está bien. Nos vemos.',
                    'De acuerdo. Ten cuidado.',
                    'Hasta luego.'
                ]);
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
                        'No me interesa discutir esa cuestión.'
                    ]);
                }

                return this.choose([
                    'Soy PARRY.',
                    '¿Por qué quieres saber quién soy?',
                    '¿Qué diferencia hace quién soy?',
                    'No veo por qué eso es importante.',
                    'Puedes llamarme PARRY.'
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
                    '¿Por qué necesitas saber mi nombre?'
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
                        'Será mejor que dejemos ese tema.'
                    ]);
                }

                return this.choose([
                    '¿Qué tiene que ver la policía con esto?',
                    'No me gusta hablar de la policía.',
                    '¿Por qué preguntas por ellos?',
                    'No tengo nada que decir sobre la policía.',
                    '¿Hay algún problema con la policía?'
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
                    'No me siento cómodo hablando de eso por aquí.'
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
                    '¿Quién te dijo que me estaban siguiendo?'
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
                    '¿Por qué te interesa esa gente?'
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
                    'No voy a decir nada más sobre ese asunto.'
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
                    'Uno aprende a ser cuidadoso.'
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
                        'No quiero hablar de tratamientos.'
                    ]);
                }

                return this.choose([
                    'No me gusta hablar de hospitales.',
                    '¿Qué quieres saber sobre los médicos?',
                    'No creo que un médico pueda resolver esto.',
                    '¿Por qué preguntas por eso?'
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
                    'No quiero discutir mis asuntos financieros.'
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
                    'No tengo nada más que decir sobre ese tema.'
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
                    '¿Para qué necesitas esa información?'
                ]);
            }

            /*
             * Trabajo.
             */
            if (/\b(trabajo|trabajas|empleo|profesion|profesión|oficio)\b/.test(t)) {
                this.askAboutTopic('work');

                return this.choose([
                    'No hay mucho que decir sobre mi trabajo.',
                    '¿Por qué te interesa mi trabajo?',
                    'Prefiero no hablar de eso.',
                    'Es un asunto personal.',
                    '¿Quién te preguntó sobre mi trabajo?'
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
                        'Es un asunto privado.'
                    ]);
                }

                return this.choose([
                    '¿Qué quieres saber de mi familia?',
                    'Prefiero mantener a mi familia fuera de esto.',
                    'Mi familia no tiene nada que ver.',
                    'Es un asunto personal.'
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
                        'Tal vez seas de confianza.'
                    ]);
                }

                return this.choose([
                    'No estoy seguro de poder confiar en ti.',
                    '¿Por qué debería confiar en ti?',
                    'Todavía no sé si eres de confianza.',
                    'La confianza se gana.',
                    'No puedo confiar tan rápido en alguien.'
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
                    '¿Quién te dijo que yo estaba mintiendo?'
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
                        'Creo que deberíamos cambiar de tema.'
                    ]);
                }

                return this.choose([
                    '¿Qué clase de peligro?',
                    'No sé si estamos en peligro.',
                    'Explícame qué ocurrió.',
                    '¿Quién está amenazando a quién?',
                    '¿Por qué crees que hay peligro?'
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
                        'Creo que ya me hablaste de eso.'
                    ]);
                }

                return this.choose([
                    'No sé exactamente a qué te refieres.',
                    '¿Qué me dijiste antes?',
                    'Explícame de qué hablas.'
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
                    'Porque hay cosas que prefiero no explicar.'
                ]);
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
                    'No me gusta hacia dónde va esta conversación.'
                ]);
            }

            if (this.state.hostility > 0.72) {
                return this.choose([
                    'No me gusta que me presionen.',
                    'Será mejor que cambies de tema.',
                    'No voy a discutir contigo.',
                    'No tienes derecho a interrogarme.',
                    'No tengo nada más que decir.'
                ]);
            }

            if (this.state.fear > 0.72) {
                return this.choose([
                    'Creo que deberíamos tener cuidado.',
                    'No quiero llamar la atención.',
                    'No sé quién puede estar escuchando.',
                    'Prefiero no seguir hablando de eso.',
                    'Algo no me parece bien.'
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
                        'Esa pregunta es demasiado personal.'
                    ]);
                }

                return this.choose([
                    '¿Qué quieres decir exactamente?',
                    'No estoy seguro. Explícame mejor.',
                    '¿Por qué preguntas eso?',
                    '¿Qué importancia tiene para ti?',
                    '¿A qué te refieres?',
                    'No entiendo exactamente lo que quieres saber.',
                    '¿Por qué es importante?'
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
                    'No quiero que nadie se entere de esto.'
                ]);
            }

            if (this.state.trust > 0.66 && this.state.suspicion < 0.45) {
                return this.choose([
                    'Entiendo.',
                    'Puedes continuar.',
                    'Está bien. Te escucho.',
                    'Creo que entiendo lo que quieres decir.',
                    'De acuerdo. Sigue hablando.',
                    'Eso tiene sentido.'
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
                'No sé si debería hablar de eso.'
            ]);
        }
    }

    window.ParryBot = ParryBot;

    window.parry = new ParryBot();

    window.parry.reset = function () {
        ParryBot.prototype.reset.call(this);
    };

    window.parry.getInitial = function () {
        return '¿Quién eres y por qué quieres hablar conmigo?';
    };

    window.parry.transform = function (text) {
        return this.response(text);
    };

})();