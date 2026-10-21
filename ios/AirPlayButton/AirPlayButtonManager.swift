import UIKit

/// Expose AirPlayButtonView à React Native sous le nom "AirPlayButton",
/// celui utilisé côté JS dans src/components/AirPlayButton.tsx
/// (requireNativeComponent('AirPlayButton')).
@objc(AirPlayButtonManager)
class AirPlayButtonManager: RCTViewManager {

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func view() -> UIView! {
    return AirPlayButtonView()
  }
}
