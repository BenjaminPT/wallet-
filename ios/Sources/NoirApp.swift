// Минимальная iOS-оболочка для Noir Wallet: WKWebView с постоянным хранилищем.
// Данные живут внутри приложения и не стираются Safari (ITP). Сборка и установка: см. ios/README.md.
import SwiftUI
import WebKit

private let appURL = URL(string: "https://benjaminpt.github.io/wallet-/")!

struct WebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()               // постоянное хранилище приложения
        cfg.allowsInlineMediaPlayback = true            // камера для сканера QR
        let v = WKWebView(frame: .zero, configuration: cfg)
        v.navigationDelegate = context.coordinator
        v.scrollView.contentInsetAdjustmentBehavior = .never
        v.isOpaque = false
        v.backgroundColor = .black
        v.scrollView.backgroundColor = .black
        v.load(URLRequest(url: appURL))
        return v
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        // Внутри оболочки открывается только наш сайт. Остальные ссылки уходят в Safari.
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { return decisionHandler(.cancel) }
            if url.host == appURL.host || url.scheme == "about" || url.scheme == "blob" { return decisionHandler(.allow) }
            if action.navigationType == .linkActivated { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        }
    }
}

@main
struct NoirApp: App {
    var body: some Scene {
        WindowGroup {
            WebView().ignoresSafeArea().background(Color.black).preferredColorScheme(.dark)
        }
    }
}
