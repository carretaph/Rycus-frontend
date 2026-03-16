import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        makeWebViewTransparent()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }

    private func makeWebViewTransparent() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            guard let window = self.getKeyWindow(),
                  let rootViewController = window.rootViewController else {
                print("❌ No window/rootViewController found")
                return
            }

            print("✅ Found root view controller: \(type(of: rootViewController))")

            rootViewController.view.backgroundColor = .clear
            self.makeViewsTransparent(in: rootViewController.view)
        }
    }

    private func getKeyWindow() -> UIWindow? {
        if let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first {
            return windowScene.windows.first(where: { $0.isKeyWindow }) ?? windowScene.windows.first
        }

        return UIApplication.shared.windows.first(where: { $0.isKeyWindow })
    }

    private func makeViewsTransparent(in view: UIView) {
        let className = String(describing: type(of: view))

        if let webView = view as? WKWebView {
            print("✅ WKWebView found")
            webView.isOpaque = false
            webView.backgroundColor = .clear
            webView.scrollView.backgroundColor = .clear
        }

        if className.contains("WKChildScrollView")
            || className.contains("WKContentView")
            || className.contains("CAPBridgeViewController")
            || className.contains("UIView")
        {
            view.isOpaque = false
            view.backgroundColor = .clear
        }

        for subview in view.subviews {
            makeViewsTransparent(in: subview)
        }
    }
}