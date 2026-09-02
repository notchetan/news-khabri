import { Gesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

// Same Pan-gesture threshold/shape as article-detail-screen.tsx's own
// related-article swipe (see that file's SWIPE_THRESHOLD) - no edge-exclusion
// hitSlop needed here the way that screen's is, since onboarding/_layout.tsx
// already disables the OS's own edge-swipe-back gesture for this whole
// stack, so there's nothing competing for the same touch.
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
