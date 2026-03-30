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
        window?.backgroundColor = .clear

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            self.makeWebViewTransparent()
        }

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
            guard
                let window = self.getKeyWindow(),
                let rootViewController = window.rootViewController
            else {
                print("❌ No window/rootViewController found")
                return
            }

            window.backgroundColor = .clear

            print("✅ Found root view controller: \(type(of: rootViewController))")
            self.configureWebView(in: rootViewController.view)
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

    private func configureWebView(in view: UIView) {
        if let webView = findWebView(in: view) {
            print("✅ WKWebView found")

            webView.isOpaque = false
            webView.backgroundColor = .clear

            webView.scrollView.isOpaque = false
            webView.scrollView.backgroundColor = .clear

            if let superview = webView.superview {
                superview.backgroundColor = .clear
            }

            view.backgroundColor = .clear
            return
        }

        print("❌ WKWebView not found")
    }

    private func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView {
            return webView
        }

        for subview in view.subviews {
            if let found = findWebView(in: subview) {
                return found
            }
        }

        return nil
    }
}