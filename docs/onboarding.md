# Onboarding flow layout details

Three screens under `src/app/onboarding/` (`index.tsx` -> `features.tsx`
-> `sign-in.tsx`), navigated by a horizontal swipe (`use-onboarding-swipe.ts`)
*and* a visible `OnboardingNextButton` on screens 1-2 (the gesture alone
isn't discoverable; screen 3 has its own sign-in / skip buttons).
`OnboardingDots` tracks position - an indicator, not a control. Rationale
specific to that flow, extracted out of the components per this repo's
comment convention.

## Why the language picker lives on screen 1, not later

`OnboardingLanguagePicker` renders on `index.tsx` (screen 1 of 3)
specifically so every screen after it - including its own screen 2/3
neighbors - already renders in whatever language gets picked, rather than
showing English (or a guessed device locale) through part of the flow and
switching mid-onboarding.

## Dots are a layout sibling of the content block, not a child

`OnboardingDots` sits alongside each screen's centered content `View`,
not nested inside it, on all three screens - see each screen's own JSX.
That keeps the dots at the same bottom position across every screen, even
`sign-in.tsx`, whose extra actions block would otherwise push a
dots-as-child down further than the other two screens'.
