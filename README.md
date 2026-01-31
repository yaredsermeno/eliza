# Eliza en Español

**Eliza** es el primer chatbot de la historia (1964-1966), creado por **Joseph Weizenbaum** en el MIT. Simula a un terapeuta rogeriano: no "entiende" realmente, pero refleja y reformula lo que dice el usuario, creando una poderosa ilusión de escucha empática.

Esta versión es una implementación en JavaScript (basada en **elizabot.js** de Norbert Landsteiner, 2005), adaptada y ampliada al español latino.

## ¿Cómo funciona Eliza?

Eliza **no usa inteligencia artificial moderna**. Funciona con un sistema de reglas muy simple pero sorprendentemente efectivo:

1. Busca **palabras clave** en la entrada del usuario.
2. Cada palabra clave tiene una **prioridad** (número más alto = se evalúa primero).
3. Aplica **patrones de descomposición** (usando `*` como comodín).
4. Captura fragmentos de la frase y los **reensambla** usando reglas de transformación de pronombres.
5. Selecciona una respuesta al azar de una lista predefinida.
6. Si no hay coincidencia → usa respuestas por defecto (`xnone`).

### Componentes principales del archivo `eliza-espanol.js`

| Variable                  | Qué controla                                      |
|---------------------------|----------------------------------------------------|
| `elizaInitials`           | Mensajes de bienvenida (elige uno al azar)         |
| `elizaFinals`             | Mensajes de despedida                              |
| `elizaQuits`              | Palabras/frases que terminan la conversación       |
| `elizaPres` / `elizaPosts`| Transformación de pronombres (yo → tú, mi → tu…)   |
| `elizaSynons`             | Grupos de sinónimos (@triste, @familia, @ansiedad…)|
| `elizaKeywords`           | **El corazón del sistema** – todas las reglas      |
| `elizaPostTransforms`     | Limpieza final del texto (mayúsculas, espacios…)   |

## Estructura de una regla (elizaKeywords)

```javascript
["palabra_clave", prioridad, [
  ["patrón_de_descomposición", [
    "respuesta 1",
    "respuesta 2 con (2)",
    "respuesta 3"
  ]],
  // más patrones para la misma palabra clave...
]]
