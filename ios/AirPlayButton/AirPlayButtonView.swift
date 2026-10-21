import AVKit
import UIKit

/// Vue native qui affiche le bouton système AirPlay (AVRoutePickerView).
/// C'est le composant standard fourni par Apple pour laisser l'utilisateur
/// choisir une route AirPlay (TV, HomePod, etc.) — il n'y a pas d'API
/// publique pour lister/choisir les routes soi-même, il faut passer par
/// ce composant système.
@objc(AirPlayButtonView)
class AirPlayButtonView: UIView {

  private let routePickerView = AVRoutePickerView()

  @objc var tintColor2: UIColor? {
    didSet {
      routePickerView.tintColor = tintColor2 ?? .label
    }
  }

  @objc var activeTintColor: UIColor? {
    didSet {
      routePickerView.activeTintColor = activeTintColor ?? .systemBlue
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    setup()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  private func setup() {
    routePickerView.translatesAutoresizingMaskIntoConstraints = false
    // On privilégie les appareils vidéo (Apple TV, TV AirPlay) dans la liste.
    routePickerView.prioritizesVideoDevices = true

    addSubview(routePickerView)
    NSLayoutConstraint.activate([
      routePickerView.topAnchor.constraint(equalTo: topAnchor),
      routePickerView.bottomAnchor.constraint(equalTo: bottomAnchor),
      routePickerView.leadingAnchor.constraint(equalTo: leadingAnchor),
      routePickerView.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])
  }
}
