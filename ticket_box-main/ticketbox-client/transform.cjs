const fs = require('fs');

function convertToJSX(html) {
  let jsx = html.replace(/class=/g, 'className=')
                .replace(/for=/g, 'htmlFor=')
                .replace(/<!--(.*?)-->/gs, '{/* $1 */}');
  
  // Convert style strings to objects
  jsx = jsx.replace(/style="(.*?)"/g, (match, p1) => {
      const styles = p1.split(';').filter(s => s.trim()).map(s => {
          const [key, val] = s.split(':');
          if (!key || !val) return '';
          const camelKey = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          return camelKey + ': "' + val.trim().replace(/"/g, '\\"') + '"';
      }).join(', ');
      return 'style={{ ' + styles + ' }}';
  });

  // Self close some tags
  ['img', 'input', 'hr', 'br'].forEach(tag => {
      const regex = new RegExp('<' + tag + '([^>]*?)(?<!/)>', 'gi');
      jsx = jsx.replace(regex, '<' + tag + '$1 />');
  });
  
  jsx = jsx.replace(/<input([^>]*?[^\/])>/gi, '<input$1 />');
  jsx = jsx.replace(/<img([^>]*?[^\/])>/gi, '<img$1 />');
  return jsx;
}

function processFile(name, componentName) {
  const content = fs.readFileSync(name + '.html', 'utf8');
  
  // Find where head ends
  const headEnd = content.indexOf('</head>');
  let bodyContent = content;
  if (headEnd !== -1) {
    // Check if there is a <body> tag
    const bodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    } else {
      bodyContent = content.substring(headEnd + 7);
      bodyContent = bodyContent.replace(/<\/body>/gi, '').replace(/<\/html>/gi, '');
      // Some html might have <body ... > without a closing tag in the match, just remove it
      bodyContent = bodyContent.replace(/<body[^>]*>/gi, '');
    }
  }
  
  // Remove script tags from body
  bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  const jsxContent = convertToJSX(bodyContent);
  
  const tsx = `import React from 'react';

export const ${componentName}: React.FC = () => {
  return (
    <>
      ${jsxContent}
    </>
  );
};
`;
  fs.writeFileSync('src/pages/' + componentName + '.tsx', tsx);
  
  // Create entry point
  const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { ${componentName} } from './pages/${componentName}';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <${componentName} />
    </React.StrictMode>
  );
}
`;
  fs.writeFileSync('src/' + name + '.tsx', entry);

  // Update HTML file
  const newHtml = `<!DOCTYPE html>
<html class="dark" lang="vi">
<head>
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <title>Ticketbox</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    <style>
        body { background-color: #000000; color: #e5e2e1; }
        .glass-effect { backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
    </style>
</head>
<body class="font-body-md text-body-md overflow-x-hidden bg-background">
    <div id="root"></div>
    <script type="module" src="/src/${name}.tsx"></script>
</body>
</html>`;
  fs.writeFileSync(name + '.html', newHtml);
}

processFile('event', 'EventPage');
processFile('checkout', 'CheckoutPage');
processFile('payment', 'PaymentPage');
console.log('Done mapping bodies to components.');
