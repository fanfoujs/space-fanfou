# Space Fanfou 2.0 Fork Differences

This repository is a long-lived fork of the original
[`fanfoujs/space-fanfou`](https://github.com/fanfoujs/space-fanfou).

After years without upstream updates, this fork focuses on restoring the
extension to a usable modern baseline while keeping the original product spirit
and interaction model intact.

For communication and release notes, this fork can be referred to as
**Space Fanfou 2.0**.

## Overview

Compared with the upstream project, this fork makes three broad kinds of
changes:

- updates the extension to work in the current Chrome extension platform
- restores broken features whose old web integrations had stopped working
- adds a small set of practical quality-of-life improvements without turning
  the project into a different product

## Platform Migration

The original project was built for Manifest V2 era browser APIs.

This fork migrates the extension to a **Manifest V3** architecture, including:

- Service Worker based background runtime
- updated background/content/page bridge communication
- offscreen/background entry support required by modern Chrome extension rules
- follow-up fixes for lifecycle issues caused by MV3 cold starts and port
  disconnects

The goal of this work is compatibility first: keep the extension alive on
modern Chrome while minimizing unnecessary behavior changes.

## OAuth and API Recovery

Some legacy features relied on old DOM scraping, JSONP, or page structures that
are no longer reliable.

This fork adds a built-in **OAuth-based integration path** and migrates key
features toward API-backed behavior where needed.

Notable results include:

- built-in OAuth flow inside the extension
- reduced reliance on brittle page scraping
- restored friendship checks and related user info retrieval
- restored sidebar statistics and other data paths that depended on outdated web
  behavior

## Posting and Image Upload Improvements

Posting flows received targeted reliability and UX updates, especially for
multi-form contexts such as PopupBox reply forms.

This fork includes:

- more robust Ajax posting flow
- safer image upload handling across file selection, drag-and-drop, and paste
- draft auto-save for unfinished posts
- word-count warning and danger feedback
- follow-up fixes for PopupBox upload button placement and reply-form behavior

## New Features in This Fork

This fork also introduces a few opt-in or low-risk enhancements:

- **Avatar Wallpaper** for user pages
- **Draft Save** for status composition
- **Word Count Warning** improvements
- expanded OAuth-related settings and supporting UI

The goal is not to redesign Space Fanfou, but to keep it pleasant and practical
to use in its current environment.

## What This Fork Tries Not To Do

Even with substantial internal changes, this fork intentionally avoids:

- rewriting the product into a new UI paradigm
- replacing the original page structure unless necessary
- bundling private workflow artifacts or temporary debugging outputs into the
  long-term project surface

## Recommended Reviewer Focus

If this fork is reviewed or merged upstream, the most important areas to review
are:

- MV3 runtime correctness
- OAuth setup and API migration safety
- posting and image upload regressions
- behavior differences introduced by new optional features

## Status

At a high level, this fork aims to be:

- compatible with modern Chrome extension requirements
- testable with current lint/build/test workflows
- closer to a maintained continuation than a frozen historical snapshot
