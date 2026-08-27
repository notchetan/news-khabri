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

// See docs/squircle-component.md.
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

// Continuous-curvature ("squircle") background instead of React Native's
// plain circular-arc borderRadius - see docs/squircle-component.md.
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
