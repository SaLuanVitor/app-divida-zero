/**
 * Stub do react-native-webview para o ambiente de teste.
 *
 * O pacote real registra o TurboModule nativo `RNCWebViewModule`, que nao existe
 * no Jest. Como o navigator raiz importa o BankConnectScreen (que carrega o
 * react-native-pluggy-connect, e este o WebView), qualquer teste que monte a
 * navegacao quebraria no import. Este stub entrega apenas a superficie usada
 * pelo wrapper: um componente com ref e `injectJavaScript`.
 */
const React = require('react');

const WebView = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    injectJavaScript: jest.fn(),
    reload: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    stopLoading: jest.fn(),
    postMessage: jest.fn(),
  }));

  return React.createElement('WebView', props, props.children);
});

WebView.displayName = 'WebView';

module.exports = {
  WebView,
  default: WebView,
  WebViewMessageEvent: undefined,
};
