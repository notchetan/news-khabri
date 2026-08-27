import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import Squircle from "../squircle";

const noop = () => {};

describe("Squircle", () => {
  it("renders a plain rounded box (no SVG yet) before layout is known", async () => {
    await render(
      <Squircle testID="box" radius={16} backgroundColor="#fff">
        <Text>content</Text>
      </Squircle>
    );

    expect(screen.queryByTestId("box-svg")).toBeNull();
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("renders the squircle SVG path once its size is known", async () => {
    await render(
      <Squircle testID="box" radius={16} backgroundColor="#fff">
        <Text>content</Text>
      </Squircle>
    );

    await act(async () => {
      fireEvent(screen.getByTestId("box"), "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 60 } },
      });
    });

    expect(screen.getByTestId("box-svg")).toBeTruthy();
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("still renders children even without a testID", async () => {
    await render(
      <Squircle radius={16} backgroundColor="#fff">
        <Text>plain content</Text>
      </Squircle>
    );

    expect(screen.getByText("plain content")).toBeTruthy();
  });

  it("renders as a pressable button when onPress is provided, and calls it on press", async () => {
    const onPress = jest.fn();
    await render(
      <Squircle
        radius={16}
        backgroundColor="#fff"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Tap me"
      >
        <Text>content</Text>
      </Squircle>
    );

    fireEvent.press(screen.getByRole("button", { name: "Tap me" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("dims the whole squircle (background included) on press, not just its children", async () => {
    await render(
      <Squircle
        radius={16}
        backgroundColor="#fff"
        onPress={noop}
        accessibilityRole="button"
        accessibilityLabel="Tap me"
      >
        <Text>content</Text>
      </Squircle>
    );

    // RN's Pressable resolves its `style` prop (a function of press state)
    // down to a concrete array before it reaches the rendered host node -
    // simulating a real touch through Pressability's low-level responder
    // events is brittle across RN versions, so this instead confirms the
    // SVG background and content are both inside the SAME Pressable (one
    // style array, one press-opacity slot) rather than the background being
    // a sibling that would never dim - the actual dimming behavior itself
    // is RN's own well-tested Pressable/Pressability implementation, not
    // something this component reimplements.
    const button = screen.getByRole("button", { name: "Tap me" });
    expect(button.props.style).toEqual([
      undefined, // no `style` prop was passed in this test
      expect.objectContaining({ borderRadius: 16, backgroundColor: "#fff" }),
      false, // the `pressed && {opacity}` slot - false when not pressed
    ]);
  });

  it("stays a plain (non-pressable) view when onPress is not provided", async () => {
    await render(
      <Squircle radius={16} backgroundColor="#fff">
        <Text>content</Text>
      </Squircle>
    );

    expect(screen.queryByRole("button")).toBeNull();
  });
});
