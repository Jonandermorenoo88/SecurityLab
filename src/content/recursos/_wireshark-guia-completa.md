---
title: "Wireshark – Guía completa"
description: "Uso de Wireshark para análisis de tráfico, filtros, seguimiento de conexiones y detección de actividad sospechosa."
date: 2026-10-28
type: guia
category: blue-team
difficulty: Medio
topic: Redes
tools: [Wireshark, tshark]
tags: [pcap, filtros, smb, ntlm, http, dns]
---

Wireshark es la herramienta que más uso en los laboratorios de análisis de red. Esta guía
recoge lo que necesito tener a mano cada vez que abro un PCAP: cómo orientarme, qué filtros
usar y cómo extraer evidencias.

## Primeros pasos con un PCAP

Antes de filtrar nada conviene tener una visión general de la captura:

1. **Statistics → Capture File Properties**: duración, número de paquetes y fecha de inicio.
2. **Statistics → Protocol Hierarchy**: qué protocolos predominan (HTTP, SMB, DNS, TLS…).
3. **Statistics → Conversations** (pestaña *IPv4* y *TCP*): quién habla con quién y cuántos
   bytes se intercambian. Las conversaciones con mucho volumen suelen ser las interesantes.
4. **Statistics → Endpoints**: listado de IPs; útil para identificar el equipo víctima.

> Cambia el formato de tiempo en **View → Time Display Format → UTC Date and Time of Day**.
> Muchas preguntas de laboratorio piden horas exactas y por defecto Wireshark muestra segundos
> desde el inicio de la captura.

## Filtros de visualización esenciales

Los *display filters* se escriben en la barra superior y no modifican la captura, solo lo que
ves.

| Objetivo | Filtro |
|----------|--------|
| Tráfico de/hacia una IP | `ip.addr == 10.0.0.5` |
| Solo origen / destino | `ip.src == 10.0.0.5` · `ip.dst == 10.0.0.5` |
| Un puerto concreto | `tcp.port == 445` |
| Peticiones HTTP | `http.request` |
| Métodos POST | `http.request.method == "POST"` |
| Consultas DNS | `dns.flags.response == 0` |
| Inicio de conexiones TCP | `tcp.flags.syn == 1 && tcp.flags.ack == 0` |
| Conexiones rechazadas | `tcp.flags.reset == 1` |
| Buscar texto en el paquete | `frame contains "password"` |
| Nombre de host en TLS (SNI) | `tls.handshake.extensions_server_name` |
| Excluir ruido | `!(arp || dns || icmp)` |

Los operadores se combinan con `&&`, `||` y `!`. Con `matches` puedes usar expresiones
regulares:

```text
http.host matches "\.(xyz|top|ru)$"
```

## Seguir conexiones

Clic derecho en un paquete → **Follow → TCP Stream** (o `Ctrl+Alt+Shift+T`). Reconstruye la
conversación completa en texto, con el cliente en rojo y el servidor en azul. También existe
*Follow HTTP Stream*, útil cuando hay compresión o *chunked encoding*.

El filtro equivalente es `tcp.stream eq N`, que permite saltar de una conversación a otra
cambiando el número.

## Extraer ficheros

**File → Export Objects → HTTP / SMB / TFTP / IMF** muestra los ficheros transferidos y
permite guardarlos. Después:

```bash
sha256sum fichero_extraido
file fichero_extraido
```

El hash se puede consultar en VirusTotal sin necesidad de subir la muestra.

## Análisis de SMB y NTLM

Típico en movimientos laterales (PsExec, acceso a recursos compartidos):

```text
smb2                              # todo el tráfico SMB2
smb2.cmd == 1                     # Session Setup (autenticación)
ntlmssp.messagetype == 0x00000003 # NTLM AUTH: usuario, dominio y equipo
smb2.cmd == 3                     # Tree Connect: a qué recurso compartido accede
smb2.cmd == 5                     # Create: ficheros que se abren o crean
smb2.filename contains ".exe"
```

En el paquete `NTLMSSP_AUTH` aparecen los campos **Domain name**, **User name** y **Host name**,
que identifican desde qué máquina y con qué cuenta se autentica el atacante.

## Detección de actividad sospechosa

Algunos patrones que conviene buscar:

- **Beaconing**: conexiones periódicas a la misma IP. *Statistics → Conversations* ordenado por
  número de paquetes, y luego *Statistics → I/O Graphs* con el filtro de esa IP.
- **Descargas de ejecutables por HTTP**: `http.content_type contains "application"` o
  `http.request.uri matches "\.(exe|dll|ps1|hta|bat)$"`.
- **User-Agent poco habituales**: `http.user_agent` y añadirlo como columna.
- **DNS sospechoso**: dominios muy largos o aleatorios, `dns.qry.name.len > 40`.
- **Escaneos**: muchos SYN sin respuesta desde la misma IP origen.

## Columnas personalizadas

Clic derecho sobre cualquier campo en el panel de detalles → **Apply as Column**. Las que más
uso: `http.host`, `http.user_agent`, `dns.qry.name`, `tls.handshake.extensions_server_name` y
`tcp.stream`.

## tshark: Wireshark en la terminal

Para capturas grandes o para automatizar:

```bash
# Peticiones HTTP: host y URI
tshark -r captura.pcap -Y http.request -T fields -e ip.src -e http.host -e http.request.uri

# Top de dominios consultados
tshark -r captura.pcap -Y "dns.flags.response == 0" -T fields -e dns.qry.name \
  | sort | uniq -c | sort -rn | head

# Exportar objetos HTTP a una carpeta
tshark -r captura.pcap --export-objects http,./objetos
```

## Chuleta rápida

- `Ctrl + F` → buscar cadena / hex / filtro dentro de los paquetes.
- `Ctrl + G` → ir a un número de paquete.
- **Edit → Find Packet → String + Packet bytes** para buscar texto que no está en un campo
  disseccionado.
- **Analyze → Expert Information** para ver errores, retransmisiones y avisos.
