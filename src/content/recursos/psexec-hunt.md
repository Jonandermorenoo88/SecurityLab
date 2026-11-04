---
title: "PsExec Hunt – Investigación de movimiento lateral"
description: "Reconstrucción de un ataque con PsExec a partir del tráfico SMB y NTLM de una captura de red: origen, víctimas, credenciales y pivote."
date: 2026-10-28
type: laboratorio
category: blue-team
platform: CyberDefenders
difficulty: Fácil
topic: Redes
tools: [Wireshark, 7-Zip]
tags: [pcap, smb, ntlm, dcerpc, psexec, movimiento-lateral, mitre-attack]
labUrl: https://cyberdefenders.org/blueteam-ctf-challenges/psexec-hunt/
---

| Herramientas | Entorno | Técnicas analizadas |
|---|---|---|
| Wireshark, 7-Zip | Parrot OS en VirtualBox | SMB2, NTLM, DCERPC, PsExec |

## Resumen ejecutivo

Partí de una alerta del IDS que apuntaba a actividad de PsExec en la red y de una captura de
tráfico (PCAP) para investigarla. El objetivo era responder a lo que preguntaría cualquier
responsable de un SOC: desde dónde entró el atacante, a qué equipos llegó, con qué credenciales
y cómo se movió.

Analizando solo el tráfico de red, reconstruí la cadena completa del ataque:

<details>
<summary>Ver hallazgos (spoiler)</summary>

| Pregunta | Hallazgo |
|---|---|
| Equipo de origen del ataque | `10.0.0.130` (HR-PC) |
| Primera máquina comprometida | SALES-PC (`10.0.0.133`) |
| Cuenta utilizada | `ssales` |
| Ejecutable desplegado | `PSEXESVC.exe` |
| Recurso usado para instalarlo | `ADMIN$` |
| Recurso usado para el control remoto | `IPC$` |
| Segunda máquina (pivote) | MARKETING-PC (`10.0.0.131`) |

</details>

<div class="callout tip">

**Conclusión en una frase:** con una única cuenta válida, el atacante usó una herramienta
legítima de administración para ejecutar código en dos equipos de la red en unos cuatro
minutos, sin necesidad de malware.

</div>

## Contexto y alcance

**PsExec** (Sysinternals) es una herramienta de Microsoft para ejecutar comandos en equipos
remotos. Al ser legítima y estar firmada, es una de las favoritas de los atacantes para el
movimiento lateral: no salta como malware y se confunde con la administración habitual. Por eso
es importante saber reconocer su huella en la red.

**Alcance:** una captura de unos 40.000 paquetes. Me centré en el tráfico SMB (puerto 445), la
autenticación NTLM que viaja dentro de SMB y las llamadas DCERPC al administrador de servicios
de Windows.

## Cómo funciona PsExec por dentro

Antes de abrir la captura, repasé qué rastro debería dejar. Esa hipótesis es la que guió todo el
análisis:

1. **Autenticación por SMB con NTLM** contra la máquina objetivo.
2. **Copia de `PSEXESVC.exe`** al recurso `ADMIN$` (`C:\Windows`).
3. **Creación del servicio** mediante DCERPC (interfaz `svcctl`) a través de `IPC$`.
4. **Control remoto por tuberías con nombre:** `PSEXESVC-<equipo origen>-<PID>-stdin/stdout/stderr`.

## Preparación del entorno

Trabajé en una máquina virtual Parrot OS sobre VirtualBox para aislar el material del
laboratorio. Lo primero fue extraer la captura del archivo protegido y abrirla en Wireshark:

```bash
7z x 143-psexec-hunt.zip
wireshark psexec-hunt.pcapng &
```

![Primer vistazo a la captura](/SecurityLab/images/recursos/psexec-hunt/primer-vistazo.png)

*Primer vistazo a la captura: 10.0.0.130 negocia SMB con 10.0.0.133 y se autentica.*

## Análisis paso a paso

### 1. Identificación del origen y de la primera víctima

Con **Statistics → Conversations** y un filtro sobre SMB vi que todas las sesiones las iniciaba
`10.0.0.130`. Para saber contra qué equipo, filtré el mensaje **NTLM CHALLENGE (tipo 2)**,
porque es el que envía la víctima e incluye su nombre de host:

```text
ip.src == 10.0.0.133 && ntlmssp.messagetype == 0x00000002
```

![NTLM Challenge: SALES-PC](/SecurityLab/images/recursos/psexec-hunt/ntlm-challenge-sales-pc.png)

*Paquete 131: Target Name = SALES-PC. El nombre se confirma también en el panel hexadecimal.*

### 2. Cuenta comprometida

El usuario va en el mensaje **NTLM AUTH (tipo 3)**, que envía el atacante justo después.
Wireshark lo muestra en la propia columna Info:

```text
ip.src == 10.0.0.130 && ntlmssp.messagetype == 0x00000003
```

![NTLM Auth con la cuenta ssales](/SecurityLab/images/recursos/psexec-hunt/ntlm-auth-ssales.png)

*Paquete 132: autenticación con la cuenta ssales, sin dominio.*

### 3. Despliegue del servicio

Busqué nombres de archivo dentro de SMB y apareció la creación de `PSEXESVC.exe`, seguida de
las peticiones *Write* que suben el binario por bloques de 64 KB:

```text
smb2.filename contains "PSEXESVC"
```

![Create y Write de PSEXESVC.exe](/SecurityLab/images/recursos/psexec-hunt/psexesvc-create-write.png)

*Paquetes 144-238: Create Request y Write Request de PSEXESVC.exe.*

### 4. Recursos compartidos utilizados

Filtrando los **Tree Connect** (comando SMB2 número 3) se ve el patrón completo: primero
`IPC$`, para la comunicación y la creación del servicio, y después `ADMIN$`, para copiar el
ejecutable.

```text
ip.addr == 10.0.0.130 && smb2.cmd == 3
```

![Tree Connect a ADMIN$ e IPC$](/SecurityLab/images/recursos/psexec-hunt/tree-connect.png)

*Tree Connect a ADMIN$ en 10.0.0.133 y, más abajo, el mismo patrón contra 10.0.0.131.*

### 5. Movimiento lateral a una segunda máquina

En la misma lista apareció una IP nueva. Repitiendo el análisis del mensaje NTLM tipo 2, esta
vez con origen `10.0.0.131`, obtuve el nombre del segundo equipo comprometido:

```text
ip.src == 10.0.0.131 && ntlmssp.messagetype == 0x00000002
```

![NTLM Challenge: MARKETING-PC](/SecurityLab/images/recursos/psexec-hunt/ntlm-challenge-marketing-pc.png)

*Paquete 38514: Target Name = MARKETING-PC.*

## Cronología del ataque

Horas calculadas a partir del *Arrival Time* de la captura (11/10/2023) y expresadas en UTC.

| Hora (UTC) | Paquete | Evento |
|---|---|---|
| 07:42:08 | 126-133 | HR-PC (10.0.0.130) se autentica en SALES-PC con la cuenta ssales |
| 07:42:08 | 134-139 | Conexión a IPC$ y ADMIN$ en SALES-PC |
| 07:42:08 | 144-238 | Subida de PSEXESVC.exe y creación del servicio |
| 07:45:56 | 38470 | Nueva conexión a ADMIN$ en SALES-PC |
| 07:46:19 | 38514-38537 | Autenticación y conexión a ADMIN$ en MARKETING-PC (10.0.0.131) |

## Mapeo MITRE ATT&CK

| Táctica | Técnica | Evidencia observada |
|---|---|---|
| Acceso inicial / Persistencia | T1078 – Valid Accounts | Autenticación NTLM correcta con la cuenta ssales |
| Movimiento lateral | T1021.002 – SMB/Windows Admin Shares | Tree Connect a ADMIN$ e IPC$ en dos equipos |
| Movimiento lateral | T1570 – Lateral Tool Transfer | Copia de PSEXESVC.exe por SMB |
| Persistencia / Escalada | T1543.003 – Windows Service | Creación del servicio PSEXESVC vía svcctl |
| Ejecución | T1569.002 – Service Execution | Ejecución de comandos a través del servicio |

## Indicadores de compromiso (IOC)

| Tipo | Valor | Contexto |
|---|---|---|
| IP | `10.0.0.130` | Equipo de origen (HR-PC) |
| Host | SALES-PC / `10.0.0.133` | Primera víctima |
| Host | MARKETING-PC / `10.0.0.131` | Segunda víctima (pivote) |
| Cuenta | `ssales` | Credencial comprometida |
| Archivo | `PSEXESVC.exe` | Servicio de PsExec en `C:\Windows` |
| Tubería | `PSEXESVC-HR-PC-7980-*` | Canal de stdin/stdout/stderr |

## Detección y recomendaciones

Más allá de resolver el caso, me interesaba saber cómo se detectaría y frenaría en un entorno
real.

### Detección

- **Evento 7045 (System):** instalación de un servicio llamado PSEXESVC o con un nombre
  aleatorio desde `ADMIN$`.
- **Evento 4624, tipo de inicio 3** (inicio de sesión de red) de una misma cuenta en varios
  equipos en pocos minutos.
- **Eventos 5140/5145:** accesos a `ADMIN$` desde estaciones de trabajo y no desde servidores de
  administración.
- **Sysmon 17/18:** creación y conexión de tuberías con el patrón `PSEXESVC-*`.
- **En red:** escritura de ejecutables por SMB entre equipos de usuario y llamadas DCERPC a
  `svcctl`.

### Mitigación

- **Bloquear SMB entrante entre estaciones de trabajo** con el firewall de Windows. Un equipo de
  ventas no tiene por qué administrar otro de marketing.
- Aplicar **mínimo privilegio** y usar **LAPS** para que las contraseñas de administrador local
  sean únicas en cada equipo.
- **Restringir PsExec** a equipos de administración autorizados (lista blanca de aplicaciones).
- **Reducir el uso de NTLM** en favor de Kerberos y reforzar la monitorización de cuentas con
  accesos anómalos.

En términos de **NIST CSF 2.0**, el caso toca sobre todo **PR.AA** (gestión de identidades y
control de acceso) y **DE.CM** (monitorización continua).

## Lo que aprendí

- **Los filtros mal escritos engañan.** `ip.addr == X && smb || smb2` sin paréntesis me mostraba
  el 93 % de la captura. Desde entonces escribo siempre `ip.addr == X && (smb || smb2)`.
- **NTLM habla mucho.** El tipo 2 identifica a la víctima y el tipo 3, la cuenta. Son dos filtros
  que reutilizaré en cualquier investigación sobre Windows.
- **Cuidado con las suposiciones.** El nombre que aparece en las tuberías `PSEXESVC-HR-PC-...` es
  el del atacante, no el de la víctima.
- **Una herramienta legítima es una amenaza silenciosa.** No hubo malware: solo una cuenta válida
  y una utilidad de Microsoft.

<div class="callout tip">

**Siguientes pasos:** ampliar el análisis a otras técnicas de movimiento lateral (WMI, WinRM,
RDP), contrastar la huella de red con los eventos de Windows en un SIEM y traducir estos
hallazgos a reglas de detección.

</div>
