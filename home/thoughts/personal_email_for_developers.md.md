---
title: Personal Email Without Running a Mail Server
brief: A practical way to use a domain-based personal address without maintaining a full mail stack.
date: 2026-04-25
lang: en
tags:
  - email
  - personal-infrastructure
  - cloudflare
  - resend
categories:
  - infrastructure
---

I wanted a personal email address that felt like mine, rather than one tied to a provider. Using a custom domain solves that part. The harder question is what should happen behind the address.

My first instinct was to run everything myself: an inbox, an SMTP server, an IMAP server, backups, spam filtering, and the rest of the machinery that makes email work. That is possible, but it is a lot of responsibility for something I mainly want to be dependable.

The better approach is to own the address while letting specialised services handle the difficult parts.

## The simple split

The setup has three separate jobs:

- **The domain** is the identity. DNS records tell other mail providers which services are allowed to send messages for it.
- **A routing service** receives mail for the domain and forwards it to an inbox I already use.
- **An outbound provider** sends messages on my behalf through an API or SMTP relay.

For my setup, Cloudflare handles routing and Resend handles outgoing mail. The important idea is not the particular vendors, though. It is the separation of responsibilities.

I do not need to operate a complete mail server just to have a professional address. I can keep the storage and day-to-day inbox experience with a mature email provider, while keeping the address itself independent.

## Why I chose not to self-host the inbox

Running a mail server sounds straightforward until deliverability becomes part of the job. A self-hosted server needs a stable reputation, careful DNS configuration, spam protection, monitoring, backups, and a plan for outages. Even then, messages can still be rejected or sent to spam because the server's IP address has little history.

That work is worthwhile for some organisations. For a personal mailbox, it adds operational overhead without adding much value. Forwarding incoming mail and using a managed relay for outgoing mail gives me most of the control I want with much less maintenance.

## The part that still matters: domain authentication

Delegating delivery does not mean ignoring security. The domain still needs the usual authentication records:

- **SPF** lists the services allowed to send mail for the domain.
- **DKIM** adds a cryptographic signature to outgoing messages.
- **DMARC** tells receiving providers what to do when a message fails authentication.

These records do not guarantee that every message reaches the inbox, but they make the sending identity clear and reduce the chance of someone impersonating the domain.

## A small system that stays out of the way

This setup keeps the visible experience simple: people can write to one address, and I can reply from the same address. Behind it, routing and delivery are handled by services built for those jobs, while the domain remains mine.

It also leaves room for small automations later, without turning the mailbox into a larger software project. The system can stay quiet when I am just using email, and become programmable only when there is a real reason to automate something.

That is the balance I was looking for: a personal address with a little more independence, without taking on the maintenance of an entire email platform.
