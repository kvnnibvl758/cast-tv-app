#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>

// Ce fichier .m est nécessaire car le bridge RN (ancienne architecture)
// découvre les modules/ViewManagers via des macros Objective-C. Sans lui,
// AirPlayButtonManager.swift ne serait pas visible depuis le JS, même si
// le code Swift compile très bien tout seul.

@interface RCT_EXTERN_REMAP_MODULE(AirPlayButton, AirPlayButtonManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(tintColor2, UIColor)
RCT_EXPORT_VIEW_PROPERTY(activeTintColor, UIColor)

@end
