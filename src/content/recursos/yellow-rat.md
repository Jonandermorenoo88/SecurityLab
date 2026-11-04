---
title: "Yellow RAT – Un hash, tres fuentes y un nombre de pájaro"
description: "Cómo identifiqué un troyano de acceso remoto (Yellow Cockatoo / SolarMarker) usando solo inteligencia de amenazas pública: VirusTotal, Red Canary y Malpedia."
date: 2026-10-30
type: laboratorio
category: threat-hunting
platform: CyberDefenders
difficulty: Fácil
topic: Malware
tools: [VirusTotal, Red Canary, Malpedia]
tags: [threat-intel, osint, rat, yellow-cockatoo, solarmarker, mitre-attack]
labUrl: https://cyberdefenders.org/blueteam-ctf-challenges/yellow-rat/
---

| Herramientas | Tipo de análisis | Malware |
|---|---|---|
| VirusTotal, blog de Red Canary, Malpedia | Inteligencia de amenazas (sin ejecutar la muestra) | Yellow Cockatoo / Jupyter / SolarMarker |

## Por qué hice este laboratorio

Este lab es corto, pero me interesaba por una razón: aquí no hay PCAP, ni volcado de memoria,
ni teléfono. Solo te dan un hash y tienes que tirar del hilo con fuentes públicas. Es
exactamente lo que hace un analista de threat intelligence cuando le llega un indicador y tiene
que contestar rápido "¿qué es esto y qué hago?".

## El caso

> **Escenario del laboratorio**
>
> En una revisión rutinaria en GlobalTech Industries se detecta tráfico de red anómalo en
> varias estaciones de trabajo. Al investigar, se descubre que las búsquedas de algunos
> empleados en internet se estaban redirigiendo a sitios desconocidos. Mi tarea: investigar el
> incidente y reunir toda la información posible.

Lo único que había dentro del ZIP del laboratorio era un `hash.txt` con esto:

![Contenido de hash.txt](/SecurityLab/images/recursos/yellow-rat/hash-txt.png)

*hash.txt: el SHA256 de la muestra y la sugerencia de usar VirusTotal o Hybrid Analysis.*

## Lo que saqué en claro

<details>
<summary>Ver resumen de respuestas (spoiler)</summary>

| Pregunta | Respuesta | Fuente |
|---|---|---|
| Nombre del grupo según Red Canary | Yellow Cockatoo | VirusTotal (pista) + Red Canary |
| Nombre de archivo habitual | `111bc461-1ca8-43c6-97ed-911e0e69fdf8.dll` | VirusTotal · cabecera |
| Fecha de compilación | 2020-09-24 18:26 UTC | VirusTotal · Details |
| Primera subida a VirusTotal | 2020-10-15 02:47 UTC | VirusTotal · Details |
| Archivo .dat que deja en AppData | `solarmarker.dat` | Blog de Red Canary |
| Servidor C2 | `https://gogohid.com` | Blog de Red Canary |

</details>

## Cómo lo fui resolviendo

Lo cuento en el orden en que lo hice, incluidos los tropiezos, con la página exacta de cada
dato.

### 1. Primer vistazo en VirusTotal

Pegué el hash en el buscador de VirusTotal. El veredicto no dejaba dudas: **54 de 71 motores**
lo marcaban como malicioso. Además, la cabecera da varios datos útiles de un vistazo: es una
**DLL de 68 KB**, las etiquetas `assembly` indican que está hecha en **.NET** y aparece con un
nombre de archivo con formato de identificador único (GUID).

![VirusTotal: detecciones, nombre de archivo y etiquetas](/SecurityLab/images/recursos/yellow-rat/vt-cabecera.png)

*VirusTotal: 54/71 detecciones, nombre de archivo y etiquetas de la muestra.*

Ese nombre, `111bc461-1ca8-43c6-97ed-911e0e69fdf8.dll`, era la respuesta a la pregunta del
nombre de archivo común. Tiene sentido apuntarlo: si otro equipo de la empresa tiene una DLL
con ese nombre, es candidato a estar infectado.

<div class="callout info">

**Dónde lo encontré:** VirusTotal → buscar el SHA256 → cabecera del informe (debajo del hash).

</div>

### 2. El nombre del grupo (y mi primer error)

La primera pregunta pedía el nombre que Red Canary da al grupo. Mi primer intento fue escribir
"Trojan Dropper", que es lo que más se repetía en las detecciones de los antivirus. Error: eso
es una **categoría** (un troyano que suelta otros programas), no el nombre de una amenaza. Los
antivirus describen qué tipo de malware es; los equipos de inteligencia le ponen nombre propio.

La pista buena la encontré en la sección **Contained in Graphs** de VirusTotal: grafos de
investigación que otros analistas han creado con este hash. Uno de ellos se titulaba
"Yellow Cockatoo RAT".

![VirusTotal: Contained in Graphs](/SecurityLab/images/recursos/yellow-rat/vt-grafos.png)

*VirusTotal → Contained in Graphs: uno de los grafos se titula "Yellow Cockatoo RAT".*

Como esos títulos los escribe cualquier usuario, no lo di por bueno hasta confirmarlo en el
blog de Red Canary, donde efectivamente usan ese nombre. La pregunta pedía quitar el sufijo de
malware, así que la respuesta era **Yellow Cockatoo**, sin el "RAT".

<div class="callout info">

**Dónde lo encontré:** VirusTotal → pestaña Community → Contained in Graphs (pista).
Blog de Red Canary sobre Yellow Cockatoo (confirmación).

</div>

### 3. Fecha de compilación

En la pestaña **Details**, el bloque **History** muestra varias fechas. La de compilación es
**Creation Time**, que se lee de la cabecera del ejecutable:

![VirusTotal: Creation Time](/SecurityLab/images/recursos/yellow-rat/vt-creation-time.png)

*VirusTotal → Details → History → Creation Time: 2020-09-24 18:26:47 UTC.*

Como ya aprendí en otro lab, esta fecha la puede falsificar el atacante, así que la trato como
una pista y no como una prueba.

<div class="callout info">

**Dónde lo encontré:** VirusTotal → pestaña Details → History → Creation Time.

</div>

### 4. Primera vez que se vio en VirusTotal

En el mismo bloque, **First Submission** indica cuándo lo subió alguien a VirusTotal por
primera vez:

![VirusTotal: First Submission](/SecurityLab/images/recursos/yellow-rat/vt-first-submission.png)

*VirusTotal → Details → History → First Submission: 2020-10-15 02:47:37 UTC.*

Al poner las fechas en orden sale algo interesante: se compiló el 24/09/2020, llegó a
VirusTotal tres semanas después y no se vio "en la calle" (*First Seen In The Wild*) hasta
enero de 2021. Es decir, hubo un margen en el que circulaba sin que casi nadie lo tuviera
fichado.

<div class="callout info">

**Dónde lo encontré:** VirusTotal → pestaña Details → History → First Submission.

</div>

### 5. El archivo .dat que deja en AppData

Esta fue la que más me costó. Mi primer impulso fue buscar en la pestaña **Behavior** de
VirusTotal, en *Files Opened*… pero esa sección solo recoge los archivos que el malware lee, no
los que crea. Pasé a *Files Written* y *Files Dropped* y tampoco estaba: los sandboxes de
VirusTotal simplemente no llegaron a ver al malware escribir ese archivo.

Aquí entendí algo importante: **un sandbox no siempre lo ve todo**. Hay malware que solo se
comporta del todo si pasa cierto tiempo o si consigue hablar con su servidor. Cuando eso pasa,
toca ir a la inteligencia de un proveedor. En el análisis técnico de Red Canary describen paso a
paso lo que hace al ejecutarse:

![Red Canary: solarmarker.dat](/SecurityLab/images/recursos/yellow-rat/redcanary-solarmarker-dat.png)

*Blog de Red Canary (traducido): el malware guarda un identificador único del equipo en solarmarker.dat.*

El archivo es `solarmarker.dat`, en `%USERPROFILE%\AppData\Roaming`, y guarda una cadena
aleatoria que sirve para identificar a cada víctima. El nombre no es casualidad: **SolarMarker**
es otro de los nombres con los que se conoce a esta familia.

<div class="callout info">

**Dónde lo encontré:** VirusTotal → Behavior → Files Written / Files Dropped (no aparecía).
Blog de Red Canary → descripción de la ejecución → punto 2.

</div>

### 6. El servidor de mando y control

En el siguiente paso del mismo artículo explican que el malware se conecta a su C2 enviando
información del equipo y recibiendo su primera orden:

![Red Canary: conexión al C2](/SecurityLab/images/recursos/yellow-rat/redcanary-c2.png)

*Blog de Red Canary: conexión al C2 gogohid[.]com.*

Red Canary lo escribe como `gogohid[.]com`. Los corchetes son una práctica habitual en
inteligencia para "desactivar" los enlaces maliciosos y que nadie los abra por error. Para la
respuesta había que quitarlos: `https://gogohid.com`.

<div class="callout info">

**Dónde lo encontré:** Blog de Red Canary → descripción de la ejecución → punto 3.

</div>

## Cómo funciona Yellow Cockatoo, en resumen

1. **Entrada: envenenamiento de resultados de búsqueda (SEO poisoning).** La víctima busca algo
   normal en Google y acaba en una web falsa que le descarga el malware. Encaja con el
   escenario: "búsquedas redirigidas a sitios desconocidos".
2. **Ejecución:** una DLL hecha en .NET que se lanza con `rundll32.exe`, una herramienta
   legítima de Windows (lo vi en el árbol de procesos de VirusTotal).
3. **Huella en el equipo:** crea `solarmarker.dat` en AppData con un identificador único de la
   víctima.
4. **Control remoto:** se conecta a `gogohid.com`, envía datos del equipo y espera órdenes. Es
   un RAT: el atacante puede descargar y ejecutar lo que quiera.

## Indicadores de compromiso (IOC)

| Tipo | Valor |
|---|---|
| SHA256 | `30e527e45f50d2ba82865c5679a6fa998ee0a1755361ab01673950810d071c85` |
| Nombre de archivo | `111bc461-1ca8-43c6-97ed-911e0e69fdf8.dll` |
| Archivo en disco | `%USERPROFILE%\AppData\Roaming\solarmarker.dat` |
| Dominio C2 | `gogohid[.]com` |

## Mapeo MITRE ATT&CK

| Técnica | Relación con el caso |
|---|---|
| T1608.006 – SEO Poisoning | Búsquedas de los empleados redirigidas a webs maliciosas |
| T1204.002 – User Execution: Malicious File | La víctima descarga y abre el archivo |
| T1218.011 – System Binary Proxy Execution: Rundll32 | La DLL se ejecuta con `rundll32.exe` |
| T1082 – System Information Discovery | Envía información del equipo al C2 |
| T1071.001 – Application Layer Protocol: Web Protocols | Comunicación con el C2 por HTTPS |

## Recomendaciones

- **Contención:** bloquear `gogohid[.]com` en el proxy y el DNS, y buscar el hash y el nombre
  de la DLL en el resto de equipos con el EDR.
- **Erradicación:** eliminar la DLL y `solarmarker.dat` de los equipos afectados. La presencia
  de ese `.dat` es un indicador rápido de infección.
- **Prevención:** filtrado web de dominios recién registrados y concienciación sobre descargas
  desde resultados de búsqueda, que es por donde entra esta familia.

## Páginas que usé

- **Laboratorio:** [CyberDefenders – Yellow RAT](https://cyberdefenders.org/blueteam-ctf-challenges/yellow-rat/)
- **VirusTotal:** [informe del hash de la muestra](https://www.virustotal.com/gui/file/30e527e45f50d2ba82865c5679a6fa998ee0a1755361ab01673950810d071c85)
  - Cabecera del informe: detecciones y nombre de archivo.
  - Pestaña Details → History: fecha de compilación y primera subida.
  - Pestaña Community → Contained in Graphs: primera pista del nombre del grupo.
  - Pestaña Behavior: comprobé que el `.dat` no aparecía en los sandboxes.
- **Red Canary:** Yellow Cockatoo (análisis técnico): nombre del grupo, archivo
  `solarmarker.dat` y servidor C2.
- **Red Canary:** Yellow Cockatoo en el Threat Detection Report.
- **Malpedia:** ficha de Yellow Cockatoo y sus alias.

## Lo que me llevo

- **Categoría no es lo mismo que nombre.** "Trojan Dropper" describe qué tipo de malware es;
  "Yellow Cockatoo" es quién es. Me equivoqué una vez y ya no se me olvida.
- **Leer bien la sección.** *Files Opened* no es *Files Written*. Que el malware abra un archivo
  no significa que lo haya creado.
- **Los sandboxes tienen puntos ciegos.** Cuando no ven algo, la inteligencia de los
  proveedores (Red Canary, en este caso) completa el cuadro.
- **Una pista no es una prueba.** El título de un grafo en VirusTotal me orientó, pero la
  respuesta la confirmé en la fuente oficial.
- **Un mismo malware, muchos nombres.** Yellow Cockatoo, Jupyter y SolarMarker son la misma
  familia vista por distintas empresas. Conocer los alias ayuda a encontrar más información y a
  entender detalles como el nombre de `solarmarker.dat`.

<div class="callout tip">

**Siguiente paso:** quiero repetir este flujo con otras plataformas como Hybrid Analysis,
MalwareBazaar o AlienVault OTX, y comparar qué información da cada una sobre la misma muestra.

</div>
