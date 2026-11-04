---
title: "The Crime – Lo que contaba el móvil de la víctima"
description: "Reconstrucción de los últimos días de una víctima a partir de la extracción de su teléfono Android con ALEAPP: deudas, amenazas, ubicación y huida."
date: 2026-10-29
type: laboratorio
category: dfir
platform: CyberDefenders
difficulty: Fácil
topic: Android
tools: [ALEAPP, LibreOffice Calc, grep, find]
tags: [android, forense-movil, aleapp, cronologia, discord]
labUrl: https://cyberdefenders.org/blueteam-ctf-challenges/the-crime/
---

| Herramientas | Entorno | Tipo de análisis |
|---|---|---|
| ALEAPP, LibreOffice Calc, grep, find | Parrot OS en VirtualBox | Forense de dispositivo Android |

## Por qué hice este laboratorio

Después de varios labs de red y de malware quería probar algo distinto: el forense móvil. Un
teléfono es probablemente la fuente de pruebas más completa que existe sobre una persona: con
quién habla, qué apps usa, dónde ha estado y qué planes tiene. Además era la excusa perfecta
para aprender ALEAPP, una herramienta que no había usado nunca.

## El caso

> **Escenario del laboratorio**
>
> Se investiga un homicidio y la policía ha recuperado el teléfono de la víctima. Testigos y
> personas cercanas aportan pistas sueltas: que estaba metido en el trading, que debía dinero,
> que salió de casa sin decir a dónde… Mi trabajo era contrastar cada declaración con lo que
> había en el móvil y reconstruir la secuencia de los hechos.

## Lo que reconstruí

<details>
<summary>Ver resumen de respuestas (spoiler)</summary>

| Pregunta | Respuesta | Fuente en el móvil |
|---|---|---|
| App de trading que usaba (SHA256) | Olymp Trade (`com.ticno.olymptrade`) | `installedappsGass.tsv` |
| ¿Cuánto debía? | 250.000 EGP | `SMS Messages.tsv` |
| ¿A quién? | Shady Wahab | `GoogleMessages.tsv` |
| ¿Dónde estaba el 20/09/2023? | The Nile Ritz-Carlton (El Cairo) | `Recent Activity.tsv` + captura de Maps |
| ¿A dónde pensaba viajar? | Las Vegas | Imagen `Plane Ticket.png` |
| ¿Dónde había quedado con un amigo? | The Mob Museum | Discord - Cached Messages |

</details>

## Preparación: aprender ALEAPP sobre la marcha

**ALEAPP** (Android Logs Events And Protobuf Parser) es una herramienta gratuita de Alexis
Brignoni. Recorre una extracción de Android y convierte cientos de bases de datos, XML y
archivos internos en un informe ordenado: apps, mensajes, llamadas, navegador, actividad
reciente… Sin ella, revisar todo eso a mano llevaría días.

Primero descomprimí la evidencia, que traía casi 3.300 archivos de un teléfono real:

```bash
7z x 138-The-Crime.zip
```

![Extracción del laboratorio](/SecurityLab/images/recursos/the-crime/extraccion.jpg)

*Extracción del laboratorio: 1.781 carpetas y 3.286 archivos.*

Después cloné ALEAPP e instalé sus dependencias. Aquí cometí el primer fallo tonto: escribí
`clone` sin `git` delante, y la terminal me respondió, con toda la razón, que ese comando no
existía.

```bash
git clone https://github.com/abrignoni/ALEAPP.git
cd ALEAPP
pip install -r requirements.txt --break-system-packages
```

Para lanzarlo hacen falta tres cosas: el tipo de entrada (`-t fs`, una carpeta), la evidencia
(`-i`) y dónde guardar el informe (`-o`). Me equivoqué dos veces más: primero olvidé el `-o` y
luego descubrí que ALEAPP no crea la carpeta de salida por su cuenta. Con un `mkdir` antes,
funcionó:

```bash
mkdir -p ~/Desktop/Labs/Lab14/informe
python3 aleapp.py -t fs -i .../temp_extract_dir/data/ -o .../informe
```

![ALEAPP procesando la extracción](/SecurityLab/images/recursos/the-crime/aleapp-procesando.png)

*ALEAPP procesando la extracción.*

El resultado es un `index.html` navegable y, lo que más usé, la carpeta **_TSV Exports**: todos
los artefactos en texto plano, perfectos para buscar con `grep` y abrir con LibreOffice.

![Salida de ALEAPP](/SecurityLab/images/recursos/the-crime/aleapp-salida.png)

*Salida de ALEAPP: informe HTML, exportaciones TSV, línea de tiempo y la carpeta media.*

## La investigación, pista a pista

Mi método fue siempre el mismo: tomar la declaración de un testigo, convertirla en una palabra
clave y buscarla en todos los informes con `grep -ril`, que te dice en qué archivos aparece.
Luego abría el más prometedor y leía.

### 1. La app de trading

Los testigos decían que la víctima se había metido en el trading hasta endeudarse. La pista del
laboratorio daba el paquete de la app, así que lo busqué en todo el informe:

```bash
grep -ril "olymptrade" .
```

![grep olymptrade](/SecurityLab/images/recursos/the-crime/grep-olymptrade.jpg)

*La app aparece en 14 informes distintos.*

Salía en 14 archivos, pero solo uno tenía un hash: `installedappsGass.tsv`. Viene de una base
de datos de Google Play Services que registra cada app instalada con su versión y su SHA-256,
que es lo que pedía la pregunta.

![installedappsGass.tsv](/SecurityLab/images/recursos/the-crime/installedappsgass.png)

*installedappsGass.tsv: Olymp Trade con su hash SHA-256.*

```text
4f168a772350f283a1c49e78c1548d7c2c6c05106d8b9feb825fdc3466e9df3c
```

Me picó la curiosidad y busqué qué era Olymp Trade: una plataforma de operaciones de tiempo
fijo, muy parecidas a las opciones binarias, que en la UE están prohibidas para inversores
minoristas por lo arriesgadas que son. Encajaba con la historia.

<div class="callout info">

**Dónde lo encontré:** Informe ALEAPP → `_TSV Exports/installedappsGass.tsv` → columna SHA-256
Hash de `com.ticno.olymptrade`.

</div>

### 2. La deuda

Un amigo contó que la víctima evitaba unas llamadas porque debía mucho dinero. Busqué "money":

```bash
grep -ril "money" .
```

![grep money](/SecurityLab/images/recursos/the-crime/grep-money.png)

En los SMS estaba el mensaje. Lo copio entero porque cambia el tono del caso:

> **SMS recibido**
>
> "It's time for you to pay back the money you owe me, but you're not picking up my calls. You
> better think twice about not paying, because it won't end well for you. Prepare the sum of
> 250,000 EGP, and I'll expect your call within an hour at most."

Ya no era solo una deuda: era **una amenaza con plazo de una hora**. Además, la moneda (EGP,
libra egipcia) fue mi primera pista de que todo pasaba en Egipto.

<div class="callout info">

**Dónde lo encontré:** Informe ALEAPP → `_TSV Exports/SMS Messages.tsv` → columna Body.

</div>

### 3. Quién le reclamaba el dinero

El mismo mensaje aparecía en `GoogleMessages.tsv`, pero con más contexto: remitente, número y
hora exacta.

![GoogleMessages.tsv](/SecurityLab/images/recursos/the-crime/googlemessages.png)

*GoogleMessages.tsv: el mensaje lo envía Shady Wahab.*

| Campo | Valor |
|---|---|
| Remitente | Shady Wahab |
| Número | +20 117 213 7258 (prefijo +20, Egipto) |
| Fecha y hora | 20/09/2023, 20:09 UTC (23:09 en El Cairo) |

<div class="callout info">

**Dónde lo encontré:** Informe ALEAPP → `_TSV Exports/GoogleMessages.tsv` → columnas Other
Participant y Message Timestamp.

</div>

### 4. Dónde estaba la noche del 20 de septiembre

La familia decía que ese día salió de casa sin decir a dónde. Esta fue la parte que más me costó
y la que más me gustó.

Primero busqué "location" y me salieron más de 20 archivos… todos por los permisos de ubicación
de Android, no por ubicaciones reales. Lección aprendida: **hay que pensar qué deja rastro de un
lugar en un móvil, no buscar la palabra literal**.

Probé con "maps" y apareció `Recent Activity.tsv`. Android guarda una captura de pantalla de
cada app que queda en la vista de recientes, y había una de Google Maps:

![Recent Activity.tsv](/SecurityLab/images/recursos/the-crime/recent-activity.jpg)

*Recent Activity: Google Maps en segundo plano el 20/09/2023 a las 23:50 UTC, con dos imágenes asociadas.*

Abrí la imagen de la carpeta `media` del informe y ahí estaba el punto azul:

![Captura de Google Maps](/SecurityLab/images/recursos/the-crime/maps-ritz-carlton.jpg)

*Captura de Google Maps recuperada del teléfono: la víctima está en The Nile Ritz-Carlton, El Cairo.*

23:50 UTC son las 02:50 de la madrugada en El Cairo. Menos de cuatro horas después del mensaje
de amenaza, la víctima estaba en **The Nile Ritz-Carlton**, junto al Museo Egipcio.

<div class="callout info">

**Dónde lo encontré:** Informe ALEAPP → `_TSV Exports/Recent Activity.tsv` → fila de
`com.google.android.apps.maps` → columna Snapshot.
Carpeta `media/` del informe → `a3f43472d6f21bc2b5633473ad3946c19652833a.jpg`.

</div>

### 5. El vuelo

La recepcionista del hotel declaró que había reservado 10 días y que tenía un vuelo después.
Entre las imágenes del teléfono había una tarjeta de embarque:

![Plane Ticket.png](/SecurityLab/images/recursos/the-crime/plane-ticket.jpg)

*Plane Ticket.png, guardada en el teléfono.*

| Campo | Valor |
|---|---|
| Pasajero | Mohamed Ahmed |
| Vuelo | Egypt Airlines 310, asiento 20, clase C |
| Fecha y hora | 01/10/2023, 09:00 |
| Ruta | El Cairo → Las Vegas |

Cuadra con la estancia en el hotel: del 20 de septiembre al 1 de octubre son justo unos 10 días.

<div class="callout info">

**Dónde lo encontré:** Imágenes del teléfono (carpeta media / almacenamiento interno) →
`Plane Ticket.png`.

</div>

### 6. La cita en Las Vegas

La última pieza estaba en la caché de Discord. La víctima (usuario `infern0_o`) le cuenta a un
amigo (`rob1ns0n`) que ha cambiado de planes y ha reservado el vuelo del 01/10 a las 9:00. La
respuesta:

![Discord - Cached Messages](/SecurityLab/images/recursos/the-crime/discord-cached.png)

*Discord - Cached Messages: la cita en The Mob Museum.*

> **Mensaje de Discord**
>
> "What a wonderful news! We'll meet at The Mob Museum, I'll await your call when you arrive.
> Enjoy you flight bro ❤"

**The Mob Museum** está en Las Vegas, así que encaja con el billete. Lo curioso es que estos
mensajes no venían de una base de datos de chats, sino de la caché de la API que Discord deja en
el dispositivo. Muchas veces los datos útiles están donde menos lo esperas.

<div class="callout info">

**Dónde lo encontré:** Informe ALEAPP → `_TSV Exports/Discord - Cached Messages (API cache).tsv`
→ columna Content.

</div>

## Cronología reconstruida

Horas en UTC y en hora local de El Cairo (UTC+3 en esas fechas).

| Fecha (UTC) | Hora local | Evento | Evidencia |
|---|---|---|---|
| Antes del 19/09/2023 | — | Usa Olymp Trade y acumula deudas | installedappsGass, Usage Stats |
| 20/09/2023 20:09 | 23:09 | Shady Wahab le exige 250.000 EGP en una hora | SMS / GoogleMessages |
| 20/09/2023 23:50 | 02:50 (21/09) | Está en The Nile Ritz-Carlton, con Maps abierto | Recent Activity + captura |
| Durante su estancia | — | Reserva un vuelo y queda con rob1ns0n | Discord (caché) |
| 01/10/2023 09:00 | 09:00 | Vuelo previsto El Cairo → Las Vegas | Plane Ticket.png |

<div class="callout tip">

**Mi lectura del caso:** endeudado por el trading y amenazado, la víctima abandona su casa sin
avisar, se aloja en un hotel de El Cairo y prepara su salida del país hacia Las Vegas, donde le
espera un amigo. Todo ello sale solo del teléfono, sin una sola declaración extra.

</div>

## Páginas y archivos que usé

- **Laboratorio:** [CyberDefenders – The Crime](https://cyberdefenders.org/blueteam-ctf-challenges/the-crime/)
- **Herramienta:** [ALEAPP en GitHub](https://github.com/abrignoni/ALEAPP) (Alexis Brignoni)

Archivos del informe de ALEAPP (carpeta _TSV Exports) de los que salió cada respuesta:

| Archivo | Para qué me sirvió |
|---|---|
| `installedappsGass.tsv` | Apps instaladas con su SHA-256 (Olymp Trade) |
| `SMS Messages.tsv` | Texto del mensaje de amenaza y la cantidad |
| `GoogleMessages.tsv` | Remitente, número y hora del mensaje |
| `Recent Activity.tsv` | Captura de Google Maps en segundo plano |
| `media/` (carpeta del informe) | La imagen del mapa con la ubicación |
| `Plane Ticket.png` | Destino, fecha y vuelo de la víctima |
| `Discord - Cached Messages (API cache).tsv` | Conversación con el amigo y punto de encuentro |

## Comandos que más usé

| Comando | Para qué |
|---|---|
| `grep -ril "texto" .` | Saber en qué archivos aparece algo (en todas las subcarpetas) |
| `grep -i "texto" archivo.tsv` | Ver las líneas exactas dentro de un archivo |
| `find . -iname "*olymp*"` | Buscar archivos o carpetas por su nombre |
| `libreoffice archivo.tsv &` | Abrir un TSV como tabla para leerlo cómodamente |

## Lo que me llevo

- **ALEAPP ahorra días de trabajo.** En unos minutos convierte un teléfono entero en informes
  que se pueden buscar y leer. Y su "familia" (iLEAPP para iPhone, WLEAPP para Windows)
  funciona igual.
- **Hay que pensar en lo que deja rastro, no en la palabra literal.** Buscar "location" solo me
  dio permisos. La ubicación real estaba en una captura de pantalla de la vista de apps
  recientes.
- **Cruzar fuentes es lo que convierte datos en una historia.** Un SMS dice cuánto, Google
  Messages dice quién y cuándo, Maps dice dónde, una imagen dice a dónde iba y Discord, con
  quién.
- **Ojo con las zonas horarias.** ALEAPP da todo en UTC. La captura del "20 de septiembre" se
  hizo en realidad de madrugada del 21 en El Cairo.
- **Los errores de terminal también enseñan.** `git` olvidado, un `-o` que faltaba, un `grep`
  sin ruta que se quedaba esperando o un `find` con `name` en lugar de `-name`. Todos me
  pasaron en este lab, y ya no se me olvidan.

<div class="callout tip">

**Siguiente paso:** quiero repetir el ejercicio con una extracción de iPhone usando iLEAPP y
aprender a consultar directamente las bases de datos SQLite (con DB Browser for SQLite) para no
depender solo de lo que ALEAPP ya interpreta.

</div>
