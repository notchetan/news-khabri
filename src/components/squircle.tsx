import { getSvgPath } from "figma-squircle";
import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

// How rounded the corners feel between "plain circular arc" (0) and a full
// superellipse (1) - 0.6 matches the smoothing most iOS UI (not app icons,
// which go higher) actually uses.
const CORNER_SMOOTHING = 0.6;
const PRESSED_OPACITY = 0.85;

type Props = {
  radius: number;
  backgroundColor: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  // When provided, the whole squircle (background included) becomes
  // pressable and dims together on press - see the note below on why this
  // can't be a plain TouchableOpacity wrapping a separately-rendered
  // background.
  onPress?: () => void;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
};

// Renders `children` over a continuous-curvature ("squircle") background
// shape instead of relying on React Native's plain circular-arc
// borderRadius - used for the app's genuinely partially-rounded rectangles
// (cards, images, inputs). Fully-round elements (buttons, badges, capsule
// pills) don't need this: a circle and a squircle are the same shape once
// the radius reaches half the box's shortest side, so those keep plain
// borderRadius (see Radius.full in constants/theme.ts).
//
// SVG needs concrete pixel dimensions to generate a path (unlike
// borderRadius, which works at any size) - onLayout measures the box on
// first render; until then this renders a plain rounded View at the same
// radius so there's no flash of an unrounded box.
//
// `onPress` renders a Pressable as the root (rather than the more common
// pattern of a TouchableOpacity wrapping a separately-positioned
// background) specifically so the press-opacity applies to the SVG
// background too - TouchableOpacity's dimming only affects its own
// subtree, and the squircle background here would otherwise be a sibling
// layer that never dims, leaving only the content on top fading while the
// card's own surface color stayed fully opaque.
export default function Squircle({
  radius,
  backgroundColor,
  children,
  style,
  testID,
  onPress,
  accessibilityRole,
  accessibilityLabel,
}: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const path = useMemo(() => {
    if (!size) return null;
    return getSvgPath({
      width: size.width,
      height: size.height,
      cornerRadius: radius,
      cornerSmoothing: CORNER_SMOOTHING,
    });
  }, [size, radius]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const background = path && (
    <Svg
      testID={testID ? `${testID}-svg` : undefined}
      style={StyleSheet.absoluteFill}
      width={size!.width}
      height={size!.height}
    >
      <Path d={path} fill={backgroundColor} />
    </Svg>
  );
  const fallbackStyle = !path && { borderRadius: radius, backgroundColor };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onLayout={handleLayout}
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [style, fallbackStyle, pressed && { opacity: PRESSED_OPACITY }]}
      >
        {background}
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} onLayout={handleLayout} style={[style, fallbackStyle]}>
      {background}
      {children}
    </View>
  );
}
