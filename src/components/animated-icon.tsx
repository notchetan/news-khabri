import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/hooks/use-theme';

const DURATION = 600;

// Plays once, right after the native splash screen (see app.json's
// expo-splash-screen plugin config) hands off to JS - the native one shows
// instantly at OS launch before any JS runs, this one carries the same
// look through a brief branded moment (the mark + wordmark, ~0.6s) before
// revealing the real app. Theme-aware like the native splash's own `dark`
// config, using the app's actual theme rather than a hardcoded light-only
// look.
export function AnimatedSplashOverlay() {
  const theme = useTheme();
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const content = (
    <View style={styles.imageContainer}>
      <Image style={styles.image} source={require('@/assets/images/splash-icon.png')} />
      <Animated.Text style={[styles.wordmark, { color: theme.tint }]}>
        News Khabri
      </Animated.Text>
    </View>
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      {content}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 180,
    height: 180,
  },
  wordmark: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  splashOverlay: {
    // absoluteFillObject specifically, not absoluteFill - the latter is
    // typed as an opaque RegisteredStyle (a StyleSheet.create() id, not a
    // plain object), so TypeScript can't spread it. absoluteFillObject is
    // the same {position:'absolute', top/left/right/bottom:0} as a real
    // ViewStyle object, made exactly for cases like this.
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
