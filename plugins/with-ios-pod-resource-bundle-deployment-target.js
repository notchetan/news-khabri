const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// React Native's own CocoaPods helper (scripts/cocoapods/utils.rb,
// updateOSDeploymentTarget) only raises each pod's *main* native_target
// deployment target - it never touches a pod's resource_bundle_targets
// (a separate accessor CocoaPods generates for podspecs with
// s.resource_bundles, e.g. RNCAsyncStorage's own resources bundle,
// RNSVG's filters bundle, SDWebImage's bundle). Those are left at
// whatever ancient floor the original podspec declared (seen as low as
// 9.0) - harmless normally, but a sufficiently new Xcode's own minimum
// supported deployment target can end up above that, failing the build
// even though every *app-relevant* target (including expo-build-properties'
// own ios.deploymentTarget, which has the identical native_target-only
// gap) is already correct. Confirmed by reading
// node_modules/react-native/scripts/cocoapods/utils.rb directly - this
// isn't a guess.
const MARKER = "# WITH_IOS_POD_RESOURCE_BUNDLE_DEPLOYMENT_TARGET_FIX";

module.exports = function withIosPodResourceBundleDeploymentTarget(config, { deploymentTarget }) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf8");
      if (contents.includes(MARKER)) return config;

      const anchor = "post_install do |installer|";
      const index = contents.indexOf(anchor);
      if (index === -1) {
        throw new Error(
          "with-ios-pod-resource-bundle-deployment-target: couldn't find 'post_install do |installer|' in the generated Podfile - template may have changed, update the anchor string."
        );
      }

      // Runs alongside react_native_post_install's own (incomplete) pass -
      // both only ever raise a target's deployment target, never lower
      // one, so it's safe regardless of which runs first.
      const snippet = `${anchor}
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current && current.to_f < ${deploymentTarget}.to_f
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
        end
      end
    end
`;
      contents = contents.slice(0, index) + snippet + contents.slice(index + anchor.length + 1);
      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
