# Accessibility

OSS Proof aims to meet [WCAG 2.2 level AA](https://www.w3.org/TR/WCAG22/). This page says what is in place, how it was checked, and what is still missing. It is a statement of effort, not a certification: nobody has done a formal third-party audit.

Last reviewed: 2026-11-09.

## What is in place

- **Keyboard.** Every control can be reached and used with the keyboard. A "Skip to content" link is the first tab stop. Focus is always visible (a 2 px outline).
- **Page changes are announced.** Navigation uses hash routes, which browsers do not announce. On each page change the document title updates and focus moves to the main area, so a screen reader reads the new page.
- **Structure.** One `main` landmark per page, a proper heading order, labelled regions, and `lang="en"` on the page.
- **Reduced motion.** With "reduce motion" turned on in your system settings, all animation is removed: no 3D scenes, no drifting symbols, no reveal effects, no count-up. Content is simply there. The 3D scenes are decorative and carry no information that is not also in text.
- **Colour and contrast.** Dark and light themes, switchable from the header. Text colours were checked against the 4.5:1 ratio with an automated tool in both themes. Status never relies on colour alone: results use words, icons and numbers as well.
- **Text alternatives.** Badge images have a text name (for example "OSS Proof grade S, 91.3 out of 100"). The "Open source universe" diagram has a text description, and the same projects are listed with links in the page's repository list.
- **Forms.** Every input has a visible label. Errors and progress messages are announced politely (`aria-live`) instead of stealing focus.
- **Zoom and reflow.** Layouts reflow down to a 320 px width without horizontal scrolling, and text can be enlarged to 200%.

## How it is checked

- [axe-core](https://github.com/dequelabs/axe-core) (rule sets WCAG 2.0, 2.1 and 2.2 A and AA, plus best practices) was run against the home, check, developers and certificate pages, in dark and light themes, with sample data. It reports no violations.
- Keyboard-only walk-through of the skip link, page changes and focus handling, and a check that pages work with reduced motion on.

Automated tools find only part of the problems. These have **not** been done yet:

- Testing with screen readers (NVDA, JAWS, VoiceOver, TalkBack) by hand.
- Voice control and switch access testing.
- A review by people who use assistive technology every day.

## Known gaps

- The "Open source universe" star hover label is mouse and touch only. The same information is available as a list, but there is no keyboard way to inspect a single star in the diagram itself.
- Code samples scroll sideways on narrow screens. They are focusable, so they can be scrolled with the keyboard, but long lines are still awkward on a phone.
- Colour contrast inside the generated SVG badge themes has not been audited for every theme. The default grade theme and the high contrast themes (`terminal`, `paper`) are the safest choices.
- The site loads fonts from Google Fonts. If they are blocked, a system font is used and the layout still works.

## Tell us about a problem

If something does not work for you, please [open an accessibility issue](https://github.com/PUSHPAK-JAISWAL/OSS-Proof/issues/new?labels=accessibility&title=Accessibility%3A+) and say which page, which browser and assistive technology you use, and what happened. You can also email pushpakmjaiswal@gmail.com. Accessibility problems are treated as bugs, and fixes are welcome as pull requests: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Checking changes yourself

When you change the UI, please:

1. Tab through the page and make sure focus is visible and the order makes sense.
2. Turn on "reduce motion" in your operating system and confirm nothing important depends on animation.
3. Run axe (the browser extension, or the `axe-core` package) on the pages you touched, in both themes.
4. Keep text contrast at 4.5:1 or better and tap targets at least 24 px.
