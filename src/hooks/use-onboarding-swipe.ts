import { Gesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

// No edge-exclusion hitSlop here: onboarding/_layout.tsx already disables
// the OS's own edge-swipe-back gesture for this whole stack, so nothing
// competes for the same touch. (This used to say it matched the
// article-detail related-article swipe's threshold - that gesture was
// removed in #33, so this is now the only Pan gesture in the app.)
const SWIPE_THRESHOLD = 60;

type Options = {
  onPrevious?: () => void;
  onNext?: () => void;
};

export function useOnboardingSwipe({ onPrevious, onNext }: Options) {
  return Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onEnd((event) => {
      "worklet";
      if (event.translationX < -SWIPE_THRESHOLD && onNext) {
        scheduleOnRN(onNext);
      } else if (event.translationX > SWIPE_THRESHOLD && onPrevious) {
        scheduleOnRN(onPrevious);
      }
    });
}
