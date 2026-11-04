---
# PLANTILLA — copia este archivo, quítale el guion bajo y renómbralo
# (p. ej. `mi-laboratorio.md`). El nombre del archivo será la URL:
# /recursos/mi-laboratorio/
# Los archivos que empiezan por "_" no se publican.
title: "Nombre del laboratorio – Qué se analiza"
description: "Una o dos frases que resuman el laboratorio. Aparece en la tarjeta."
date: 2026-11-04
type: laboratorio          # laboratorio | guia
category: blue-team        # blue-team | dfir | threat-hunting | cloud | grc
platform: CyberDefenders   # CyberDefenders | Blue Team Labs Online | Propio | ...
difficulty: Fácil          # Fácil | Medio | Difícil
topic: Redes               # Palabra corta para la tarjeta: Malware, Redes, Android, Memoria...
tools: [Wireshark]
tags: [pcap, smb]
labUrl: https://cyberdefenders.org/blueteam-ctf-challenges/
draft: true                # true = solo se ve en local (npm run dev)
---

## Escenario

Resume el enunciado del laboratorio con tus palabras.

## Herramientas y entorno

- **Wireshark** — para qué la usé
- VM Parrot OS en VirtualBox

## Metodología

Explica cómo enfocaste el análisis antes de entrar en las preguntas.

## Preguntas

### Q1 — Enunciado de la pregunta

Cómo llegué a la respuesta: filtro, captura, razonamiento…

```bash
# comandos o filtros que usaste
```

![Descripción de la captura](/images/recursos/mi-laboratorio/q1.png)

<details>
<summary>Ver respuesta</summary>

`respuesta`

</details>

### Q2 — …

## IOCs

| Tipo | Valor | Contexto |
|------|-------|----------|
| IP   | `x.x.x.x` | Servidor C2 |
| Hash | `sha256…` | Muestra |

## Lecciones aprendidas

- Qué aprendiste / qué harías distinto.

<div class="callout tip">

**Consejo:** también puedes usar cajas `tip`, `warn` o `info` como esta.

</div>
