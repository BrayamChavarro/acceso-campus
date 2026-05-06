const React = require('react');
const ReactDOMServer = require('react-dom/server');
const QRCode = require('react-qr-code').default || require('react-qr-code');

try {
  const element = React.createElement(QRCode, { value: "test" });
  const html = ReactDOMServer.renderToString(element);
  console.log("RENDER SUCCESS:", html);
} catch (e) {
  console.error("RENDER ERROR:", e);
}
