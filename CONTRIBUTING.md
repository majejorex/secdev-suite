# Contribuir

Gracias por el interés. El repo lo mantiene una persona, así que las reglas son pocas y estrictas.

## Cómo

1. Para algo más que una errata, abre antes un issue y cuéntalo. Evita que trabajes en algo que no voy a aceptar.
2. Haz un fork, una rama, y abre un pull request contra `main`.
3. `npm test` tiene que pasar (lo ejecuta también la CI). Sin dependencias: solo Node ≥ 20 y `node:test`.
4. Yo reviso, decido y hago el merge (squash). La versión y los tags los subo yo.

Las vulnerabilidades no van por aquí: mira [SECURITY.md](SECURITY.md).

## Reglas del repo

Están en [CLAUDE.md](CLAUDE.md). Las que más afectan a un PR:

- **Hooks** (`hooks/`): corren en todas las sesiones de quien instala el plugin. Siempre `exit 0`, menos de 1 s, 5 líneas de salida como mucho y silencio si no hay nada que decir. Todo hook nuevo o cambiado lleva test. Son los PR que más miro.
- **Skills**: `SKILL.md` de menos de 150 líneas; el detalle va en `references/`. Si cambias la `description`, añade un caso en `evals/cases.json`.
- **OWASP**: IDs y títulos copiados del repo oficial, con la fecha en que los comprobaste. Nunca de memoria. El resto del texto, propio.
- **Inteligencia de amenazas**: datos fechados y con su fuente, nunca instrucciones para el agente.

No se aceptan PR que añadan dependencias, ejecuten red desde un hook o metan texto que dé órdenes al agente sin que esté claro por qué.
