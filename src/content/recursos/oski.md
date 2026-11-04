---
title: "Oski – Siguiendo la pista a un infostealer"
description: "Cómo analicé el infostealer Oski / Stealc sin ejecutarlo, solo con sandboxes e inteligencia pública: VirusTotal, ANY.RUN, Recorded Future Triage y MITRE ATT&CK."
date: 2026-10-29
type: laboratorio
category: threat-hunting
platform: CyberDefenders
difficulty: Fácil
topic: Malware
tools: [VirusTotal, ANY.RUN, Recorded Future Triage, MITRE ATT&CK]
tags: [infostealer, stealc, sandbox, threat-intel, mitre-attack, rc4]
labUrl: https://cyberdefenders.org/blueteam-ctf-challenges/oski/
---

| Herramientas | Tipo de análisis | Malware |
|---|---|---|
| VirusTotal, ANY.RUN, Recorded Future Triage, MITRE ATT&CK | Inteligencia de amenazas y sandbox (sin ejecutar nada en local) | Oski / Stealc, un infostealer |

## Por qué hice este laboratorio

Hasta ahora casi todos los labs que había hecho eran de capturas de red con Wireshark. Esta vez
quería probar el otro lado: qué se puede saber de un malware sin tocarlo, solo leyendo lo que
otros sandboxes ya han visto. En un SOC es lo primero que se hace cuando salta una alerta con un
hash, así que me parecía lo más útil.

## El caso

> **Escenario del laboratorio**
>
> El contable de una empresa recibe a última hora de la tarde un correo de un "cliente" con el
> asunto "Nuevo pedido urgente". Abre la factura adjunta y ve que los datos del pedido son
> falsos. Poco después el SIEM salta con la descarga de un archivo sospechoso, y la
> investigación inicial apunta a un PowerPoint. Mi tarea: analizar ese archivo.

Lo único que tenía era el hash MD5 de la muestra:

```text
12c1842c3ccafe7408c23ebf292ee3d9
```

## Lo que saqué en claro

<details>
<summary>Ver resumen de respuestas (spoiler)</summary>

| Pregunta | Respuesta | Fuente |
|---|---|---|
| ¿Cuándo se creó el malware? | 2022-09-28 17:40 UTC | VirusTotal · Details |
| ¿Con qué C2 se comunica? | `http://171.22.28.221/5c06c05b7b34e8e6.php` | VirusTotal · Behavior |
| ¿Primera librería que pide? | `sqlite3.dll` | VirusTotal · Relations |
| ¿Clave RC4 para descifrar sus cadenas? | `5329514621441247975720749009` | Recorded Future Triage |
| ¿Técnica MITRE para robar contraseñas? | T1555 (subtécnica T1555.003) | ANY.RUN + MITRE ATT&CK |
| ¿Qué carpeta limpia al borrar las DLL? | `C:\ProgramData` | ANY.RUN · Process details |
| ¿Cuántos segundos espera para autoborrarse? | 5 | ANY.RUN · árbol de procesos |

</details>

## Cómo lo fui resolviendo

Lo cuento en el orden en que lo hice, con las capturas que fui sacando y la página exacta de
donde salió cada dato. Así cualquiera puede repetirlo.

### 1. Cuándo se creó el malware

Empecé por lo más básico: buscar el hash en VirusTotal. En la pestaña **Details**, el bloque
**History** enseña varias fechas. La que me interesaba era **Creation Time**, que sale de la
cabecera del ejecutable (el momento en que se compiló).

![VirusTotal: Creation Time](/images/recursos/oski/vt-creation-time.png)

*VirusTotal, pestaña Details: Creation Time 2022-09-28 17:40:46 UTC.*

Me llamó la atención que se compiló un año antes de que se viera por primera vez "en la calle"
(*First Seen In The Wild*: 23/09/2023). Eso sí, he aprendido que esta fecha la puede falsificar
el atacante, así que es una pista, no una prueba.

<div class="callout info">

**Dónde lo encontré:** VirusTotal → buscar el hash → pestaña Details → sección History →
Creation Time.

</div>

### 2. El servidor de mando y control (C2)

En la pestaña **Behavior** de VirusTotal están las peticiones de red que hizo el malware dentro
de los sandboxes. Hay un **POST a un .php en una IP directa**, sin dominio. Para mí, una IP sin
nombre de dominio recibiendo datos por POST es de lo más sospechoso que se puede ver.

![VirusTotal: HTTP Requests](/images/recursos/oski/vt-http-requests.png)

*VirusTotal, pestaña Behavior → HTTP Requests.*

Después lo confirmé en ANY.RUN: decenas de POST desde `VPN.exe` a la misma URL, uno detrás de
otro. Ahí es donde el malware va mandando lo que roba.

<div class="callout info">

**Dónde lo encontré:** VirusTotal → pestaña Behavior → Network Communication → HTTP Requests.
ANY.RUN → panel inferior → pestaña HTTP Requests.

</div>

### 3. La primera librería que descarga

En **Relations → Contacted URLs** aparecen las dos URLs a las que se conecta. Además del
`.php`, hay un GET a `sqlite3.dll`.

![VirusTotal: Contacted URLs](/images/recursos/oski/vt-contacted-urls.png)

*VirusTotal, pestaña Relations → Contacted URLs.*

Al principio no entendía para qué quería un malware una librería tan normal. Tiene todo el
sentido: Chrome, Edge y Firefox guardan las contraseñas y las cookies en **bases de datos
SQLite**. Con esa DLL, el malware puede abrirlas y leerlas sin traer código propio. Es la
primera señal clara de que se trata de un ladrón de credenciales.

<div class="callout info">

**Dónde lo encontré:** VirusTotal → pestaña Relations → Contacted URLs.

</div>

### 4. La clave RC4 de la configuración

Para esta pregunta usé el informe de **Recorded Future Triage** que enlaza el laboratorio.
Triage extrae automáticamente la configuración del malware en el apartado *Configuración de
malware*: el C2, la ruta del `.php` y la clave RC4 con la que descifra sus cadenas, que están en
base64.

![Recorded Future Triage: configuración del malware](/images/recursos/oski/triage-config.png)

*Recorded Future Triage → Configuración de malware.*

Una anécdota: la familia salía como "robar". Era el traductor automático del navegador
traduciendo *Stealc* (*steal* = robar). Me hizo gracia, pero también me recordó que conviene
leer estas herramientas en inglés.

<div class="callout info">

**Dónde lo encontré:** Recorded Future Triage (tria.ge) → informe enlazado en el laboratorio →
Malware Config / Configuración de malware → campo `rc4.plain`.

</div>

### 5. La técnica MITRE para robar contraseñas

Aquí me atasqué un rato. En ANY.RUN, como usuario invitado, la matriz ATT&CK sale bloqueada. En
VirusTotal busqué T1555 en su matriz y no aparecía, porque sus sandboxes no la habían
etiquetado.

La solución fue **hacer el mapeo yo mismo**. En el *Text report* de ANY.RUN, la sección
*Behavior activities* marca como MALICIOUS "Steals credentials from Web Browsers".

![ANY.RUN: Text report, Behavior activities](/images/recursos/oski/anyrun-text-report.png)

*ANY.RUN → Results → Text report → Behavior activities.*

Busqué esa frase en la web de MITRE y la descripción encajaba palabra por palabra:

![MITRE ATT&CK: T1555.003](/images/recursos/oski/mitre-t1555-003.png)

*attack.mitre.org: Credentials from Password Stores: Credentials from Web Browsers (T1555.003).*

La pregunta pedía la técnica principal, sin subtécnica, así que la respuesta era **T1555**. Más
tarde descubrí que si pinchas en un proceso de ANY.RUN, el panel *Process details* ya muestra
los IDs de MITRE de cada comportamiento. Lo apunto para la próxima.

<div class="callout info">

**Dónde lo encontré:** ANY.RUN → Results → Text report → Behavior activities.
MITRE ATT&CK → [attack.mitre.org/techniques/T1555/003/](https://attack.mitre.org/techniques/T1555/003/)

</div>

### 6. Qué borra al terminar

Las dos últimas preguntas iban de los procesos secundarios, es decir, de lo que lanza el
malware después de hacer su trabajo. En el árbol de procesos de ANY.RUN, `VPN.exe` lanza un
`cmd.exe`. Haciendo clic en él, el panel *Process details* muestra la línea de comandos
completa:

![ANY.RUN: Process details de cmd.exe](/images/recursos/oski/anyrun-process-details.png)

*ANY.RUN → árbol de procesos → cmd.exe (PID 2780) → Process details.*

```bat
"C:\Windows\system32\cmd.exe" /c timeout /t 5 & del /f /q "C:\Users\admin\AppData\Local\Temp\VPN.exe" & del "C:\ProgramData\*.dll" & exit
```

Leído por partes: espera, borra el propio ejecutable y después **borra todas las DLL de
`C:\ProgramData`**, que es donde había dejado `sqlite3.dll` y compañía. Es decir, limpia sus
huellas.

<div class="callout info">

**Dónde lo encontré:** ANY.RUN → panel derecho Processes → clic en cmd.exe → Process details →
Command line.

</div>

### 7. Cuánto tarda en autoborrarse

En la misma línea, `timeout /t 5` hace que espere **5 segundos** antes de borrar nada. Lo hace
así porque Windows no deja borrar un ejecutable mientras está en marcha: el malware lanza un
`cmd` que espera a que él se cierre y luego lo elimina.

![Línea de comandos con timeout /t 5](/images/recursos/oski/anyrun-timeout.png)

Confieso que aquí me lié. Primero respondí con tiempos en milisegundos que veía en la pestaña
de red (29031 ms, 1703 ms). Esos números indican cuándo ocurrió algo dentro del análisis, no
cuánto espera el malware. La respuesta estaba en la línea de comandos, no en la red.

<div class="callout info">

**Dónde lo encontré:** ANY.RUN → árbol de procesos → cmd.exe y `timeout.exe /t 5` (justo
debajo).

</div>

## Cómo funciona Oski / Stealc, en resumen

1. Llega a través de un **PowerPoint adjunto** en un correo de "pedido urgente".
2. Se ejecuta como `VPN.exe` y contacta con su C2 en `171.22.28.221`.
3. Descarga `sqlite3.dll` y otras librerías legítimas en `C:\ProgramData`.
4. Lee contraseñas, cookies y datos de los navegadores y los envía por POST al `.php`.
5. Espera 5 segundos, se borra a sí mismo y elimina las DLL para no dejar rastro.

## Indicadores de compromiso (IOC)

| Tipo | Valor |
|---|---|
| MD5 | `12c1842c3ccafe7408c23ebf292ee3d9` |
| IP del C2 | `171.22.28.221` |
| URL de exfiltración | `http://171.22.28.221/5c06c05b7b34e8e6.php` |
| URL de descarga | `http://171.22.28.221/9e226a84ec50246d/sqlite3.dll` |
| Clave RC4 | `5329514621441247975720749009` |
| Comando de autoborrado | `timeout /t 5 & del /f /q ... & del "C:\ProgramData\*.dll"` |

## Mapeo MITRE ATT&CK

| Técnica | Qué vi |
|---|---|
| T1555.003 – Credentials from Web Browsers | "Steals credentials from Web Browsers" en ANY.RUN |
| T1539 – Steal Web Session Cookie | "Reads browser cookies" |
| T1071.001 – Web Protocols | Comunicación con el C2 por HTTP (POST) |
| T1105 – Ingress Tool Transfer | Descarga de `sqlite3.dll` desde el C2 |
| T1518 – Software Discovery | "Searches for installed software" |
| T1059.003 – Windows Command Shell | `cmd.exe` para lanzar el autoborrado |
| T1070.004 – File Deletion | Borrado del ejecutable y de las DLL |

## Páginas que usé

Todo el análisis se hizo con información pública. Estas son las páginas exactas que consulté:

- **Laboratorio:** [CyberDefenders – Oski](https://cyberdefenders.org/blueteam-ctf-challenges/oski/)
- **VirusTotal:** [búsqueda del hash de la muestra](https://www.virustotal.com/gui/file/12c1842c3ccafe7408c23ebf292ee3d9)
  - Pestaña Details → History (fecha de creación).
  - Pestaña Behavior → HTTP Requests (C2).
  - Pestaña Relations → Contacted URLs (`sqlite3.dll`).
- **ANY.RUN:** informe del sandbox enlazado en el laboratorio (any.run)
  - Results → Text report → Behavior activities (técnica de robo de credenciales).
  - Árbol de Processes → cmd.exe → Process details (autoborrado y carpeta de DLL).
- **Recorded Future Triage:** informe enlazado en el laboratorio (tria.ge)
  - Malware Config → `rc4.plain` (clave RC4).
- **MITRE ATT&CK:** [T1555 – Credentials from Password Stores](https://attack.mitre.org/techniques/T1555/)
- **MITRE ATT&CK:** [T1555.003 – Credentials from Web Browsers](https://attack.mitre.org/techniques/T1555/003/)

## Lo que me llevo

- **No hace falta ejecutar un malware para entenderlo.** Con un hash y tres webs públicas
  reconstruí qué hace, a dónde habla y cómo se esconde.
- **Cada herramienta ve una parte.** VirusTotal me dio fechas y URLs, ANY.RUN el comportamiento
  y los procesos, y Triage la configuración interna. Ninguna sola tenía todas las respuestas.
- **El mapeo a MITRE es trabajo del analista.** Cuando la herramienta no te da el ID, lo sacas
  tú leyendo el comportamiento y buscándolo en attack.mitre.org.
- **Leer bien la pregunta.** "Procesos secundarios" significa árbol de procesos y líneas de
  comandos, no tiempos de red. Me costó dos intentos aprenderlo.
- **Una DLL legítima también puede ser un indicador.** `sqlite3.dll` descargada desde una IP
  sin dominio no tiene nada de normal.

<div class="callout tip">

**Siguiente paso:** quiero pasar del análisis a la detección: escribir una regla Sigma o YARA
que detecte este patrón (descarga de `sqlite3.dll` en ProgramData seguida de un autoborrado
con `timeout`) y probarla en un SIEM.

</div>
